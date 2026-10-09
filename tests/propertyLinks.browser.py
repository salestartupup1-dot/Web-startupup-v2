"""Run against npm run start: python tests/propertyLinks.browser.py

Requires Python Playwright and Microsoft Edge. All database responses are
fixtures; the test never creates or edits production houses.
"""
import json
import os
from pathlib import Path
from urllib.parse import quote
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3000')
HOUSE = {
    'id': 'new-house', 'custom_id': 'บ้านใหม่ 12/34',
    'project_name': 'บ้านทดสอบเพิ่มใหม่', 'house_number': '12/34',
    'price': 2500000, 'bedrooms': 3, 'bathrooms': 2, 'area_wah': 50,
    'category': 'ทาวน์เฮาส์', 'status': 'available',
    'images': [], 'property_owner': 'Naphat',
}
OLD_HOUSE = {**HOUSE, 'id': 'old-house', 'custom_id': 'old', 'project_name': 'บ้านเดิม'}
DOCUMENT = {
    'name': 'projects/test/databases/(default)/documents/properties/new-house',
    'fields': {key: {'integerValue': str(value)} if isinstance(value, int)
               else {'stringValue': value} for key, value in HOUSE.items()
               if isinstance(value, (str, int))},
}


def setup(browser, scenario):
    context = browser.new_context(viewport={'width': 1365, 'height': 900})
    page = context.new_page()
    errors, lookups = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def route_request(route):
        url = route.request.url
        if '/api/public-data' in url:
            houses = [{**HOUSE, 'price': 1890000}] if scenario in ['cached', 'cached_deleted', 'card'] else [OLD_HOUSE]
            if scenario == 'card':
                houses[0]['property_owner'] = 'Startup Up'
            route.fulfill(json={'properties': houses, 'company': None, 'visual': None, 'popup': None})
        elif '/api/property?' in url:
            lookups.append({'api': True})
            if scenario in ['missing', 'cached_deleted']:
                route.fulfill(status=404, json={'error': 'not found'})
            elif scenario == 'offline':
                route.fulfill(status=503, json={'error': 'unavailable'})
            else:
                route.fulfill(json={'property': HOUSE})
        elif 'firestore.googleapis.com' in url and '/properties/new-house' in url:
            lookups.append({'document': 'new-house'})
            if scenario == 'cached_deleted':
                route.fulfill(status=404, json={'error': 'not found'})
            else:
                route.fulfill(json=DOCUMENT)
        elif 'firestore.googleapis.com' in url and ':runQuery' in url:
            lookups.append(route.request.post_data_json)
            if scenario == 'offline':
                route.fulfill(status=503, json={'error': 'unavailable'})
            elif scenario == 'missing':
                route.fulfill(json=[{'readTime': '2026-09-21T00:00:00Z'}])
            else:
                route.fulfill(json=[{'document': DOCUMENT}])
        elif url.startswith(BASE):
            route.continue_()
        else:
            route.abort()

    page.route('**/*', route_request)
    return context, page, errors, lookups


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for scenario in ['stale', 'cached', 'cached_deleted', 'missing', 'offline', 'card']:
        context, page, errors, lookups = setup(browser, scenario)
        if scenario == 'card':
            page.goto(f'{BASE}/?tab=all')
            page.wait_for_load_state('networkidle')
            page.locator('a[href^="/api/share?property="]').filter(has_text=HOUSE['project_name']).first.click()
        else:
            page.goto(f'{BASE}/api/share?property={quote(HOUSE["custom_id"], safe="")}')
        page.wait_for_load_state('networkidle')
        if scenario in ['stale', 'cached', 'card']:
            expect(page.get_by_role('heading', name=HOUSE['project_name'], exact=True)).to_be_visible()
            expect(page.get_by_text('ไม่พบข้อมูล', exact=True)).to_have_count(0)
            assert lookups, 'Details must be read from the server even on a cache hit'
            expect(page.locator('.sp4-price')).to_contain_text('2,500,000')
            expect(page.locator('.sp4-price')).not_to_contain_text('1,890,000')
            if scenario == 'stale':
                # Reloading the share URL must work with the same stale list.
                page.reload()
                expect(page.get_by_role('heading', name=HOUSE['project_name'], exact=True)).to_be_visible()
                output = Path('coverage/property-links.png')
                output.parent.mkdir(exist_ok=True)
                page.screenshot(path=str(output))
        elif scenario in ['missing', 'cached_deleted']:
            expect(page.get_by_text('ไม่พบข้อมูล', exact=True)).to_be_visible()
            assert len(lookups) == 1
        else:
            expect(page.get_by_text('โหลดข้อมูลไม่สำเร็จ', exact=True)).to_be_visible()
            expect(page.get_by_text('ไม่พบข้อมูล', exact=True)).to_have_count(0)
            assert 'property=' in page.url
            page.route('**/api/property?*', lambda route: route.fulfill(json={'property': HOUSE}))
            page.get_by_role('button', name='ลองอีกครั้ง', exact=True).click()
            expect(page.get_by_role('heading', name=HOUSE['project_name'], exact=True)).to_be_visible()
        assert not errors, errors
        print(json.dumps({'scenario': scenario, 'passed': True, 'lookups': len(lookups)}))
        context.close()
    browser.close()
