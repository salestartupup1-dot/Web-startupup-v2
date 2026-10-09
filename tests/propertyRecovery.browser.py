"""Fault injection only; never modifies live houses."""
import os
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3004')
HOUSE = {'id': 'recovery-house', 'custom_id': 'recovery', 'project_name': 'Recovery house',
         'house_number': '1/2', 'price': 2500000, 'images': [], 'status': 'available',
         'category': 'ทาวน์เฮาส์', 'bedrooms': 3, 'bathrooms': 2, 'area_wah': 50}

with sync_playwright() as p:
    for engine in [p.chromium, p.webkit]:
        browser = engine.launch(headless=True, **({'channel': 'msedge'} if engine.name == 'chromium' else {}))
        for scenario in ['manual', 'online', 'automatic', 'quota']:
            page = browser.new_page(viewport={'width': 390 if engine.name == 'webkit' else 1365, 'height': 900})
            requests, errors, docs = [], [], []
            page.on('pageerror', lambda error: errors.append(str(error)))
            healthy = [False]
            def route_request(route):
                url = route.request.url
                if '/api/property?' in url:
                    requests.append(url)
                    if healthy[0]:
                        route.fulfill(json={'property': HOUSE})
                    else:
                        route.fulfill(status=503, json={'error': 'offline', 'retryable': scenario != 'quota'})
                elif '/api/public-data' in url:
                    route.fulfill(json={'properties': [{**HOUSE, 'price': 1890000}], 'company': None, 'visual': None, 'popup': None})
                elif url.startswith(BASE):
                    if route.request.resource_type == 'document':
                        docs.append(url)
                        response = route.fetch()
                        headers = dict(response.headers)
                        headers['content-security-policy'] = headers.get('content-security-policy', '').replace('upgrade-insecure-requests', '')
                        route.fulfill(response=response, headers=headers)
                    else:
                        route.continue_()
                else:
                    route.abort()
            page.route('**/*', route_request)
            page.goto(BASE + '/?property=recovery', wait_until='domcontentloaded')
            expect(page.get_by_text('โหลดข้อมูลไม่สำเร็จ', exact=True)).to_be_visible(timeout=15000)
            assert len(requests) == (1 if scenario == 'quota' else 3), requests
            assert page.locator('.sp4-price').count() == 0, 'must not show stale catalogue price'
            healthy[0] = True
            if scenario == 'manual':
                page.get_by_role('button', name='ลองอีกครั้ง', exact=True).click()
            elif scenario == 'online':
                page.evaluate("window.dispatchEvent(new Event('online'))")
            elif scenario == 'quota':
                page.evaluate("window.dispatchEvent(new Event('online'))")
                page.wait_for_timeout(700)
                assert len(requests) == 1, 'quota must not automatically retry'
                page.get_by_role('button', name='ลองอีกครั้ง', exact=True).click()
            expect(page.locator('.sp4-price')).to_contain_text('2,500,000', timeout=22000)
            expect(page.get_by_text('โหลดข้อมูลไม่สำเร็จ', exact=True)).to_have_count(0)
            assert len(docs) == 1, 'retry must not reload the document'
            assert not errors, errors
            print('PASS', engine.name, scenario, 'fresh price; same document', flush=True)
            page.close()
        browser.close()
