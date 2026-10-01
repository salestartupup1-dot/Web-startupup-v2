"""Fixture-only browser regression. No production writes.

SITE_TEST_BASE_URL=http://localhost:3001 python tests/publicDataFreshness.browser.py
Revision events/races are covered in publicDataFreshness.test.mjs; this checks
the same reload callback through browser focus, plus actual React rendering.
"""
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://127.0.0.1:3001')
HOUSE = {'id': 'fresh-house', 'custom_id': 'fresh-house', 'project_name': 'Freshness test house',
         'price': 2000000, 'category': 'บ้านเดี่ยว', 'property_owner': 'Startup Up',
         'images': ['/featured/singlehouse.jpg'], 'house_number': '12/34'}

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for touch in [False, True]:
        context = browser.new_context(viewport={'width': 390 if touch else 1365, 'height': 844 if touch else 900},
                                      is_mobile=touch, has_touch=touch)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        data = {'properties': [dict(HOUSE)], 'company': {'description': 'Initial company description'},
                'visual': {'navAll': 'บ้านทั้งหมด'},
                'popup': {'imageUrl': '/featured/singlehouse.jpg', 'isActive': True}}
        requests = []
        failing = False
        def route_request(route):
            if '/api/public-data' in route.request.url:
                requests.append(route.request)
                route.fulfill(status=503 if failing else 200, json={'error': 'offline'} if failing else data)
            elif 'firestore.googleapis.com' in route.request.url:
                route.abort()
            else:
                route.continue_()
        page.route('**/*', route_request)
        page.goto(BASE)
        expect(page.locator('.v4-popup-img')).to_have_attribute('src', '/featured/singlehouse.jpg')
        data['popup']['imageUrl'] = '/featured/townhouse.jpg'
        page.evaluate("window.dispatchEvent(new Event('focus'))")
        expect(page.locator('.v4-popup-img')).to_have_attribute('src', '/featured/townhouse.jpg')
        data['popup']['isActive'] = False
        page.evaluate("window.dispatchEvent(new Event('focus'))")
        expect(page.locator('.v4-popup-img')).to_have_count(0)
        data['popup']['isActive'] = True
        page.evaluate("window.dispatchEvent(new Event('focus'))")
        expect(page.locator('.v4-popup-img')).to_be_visible()
        page.get_by_role('button', name='ปิดหน้าต่าง', exact=True).click()
        before = len(requests)
        page.evaluate("window.dispatchEvent(new Event('focus'))")
        page.wait_for_timeout(400)
        assert len(requests) > before
        expect(page.locator('.v4-popup-img')).to_have_count(0)
        data['company']['description'] = 'Updated company description'
        data['visual']['navAll'] = 'รวมบ้านล่าสุด'
        page.evaluate("window.dispatchEvent(new Event('focus'))")
        expect(page.locator('.intro-lead')).to_have_text('Updated company description')
        if touch:
            page.get_by_role('button', name='เมนู', exact=True).click()
            page.locator('#site-mobile-menu').get_by_role('button', name='รวมบ้านล่าสุด', exact=True).click()
        else:
            page.get_by_role('navigation', name='เมนูหลัก').get_by_role('link', name='รวมบ้านล่าสุด', exact=True).click()
        expect(page).to_have_url(re.compile('tab=all'))
        expect(page.get_by_text('2,000,000', exact=False).first).to_be_visible()
        data['properties'][0]['price'] = 1700000
        page.evaluate("window.dispatchEvent(new Event('focus'))")
        expect(page.get_by_text('1,700,000', exact=False).first).to_be_visible()
        expect(page.get_by_text('2,000,000', exact=False)).to_have_count(0)
        if not touch:
            failing = True
            page.evaluate("window.dispatchEvent(new Event('focus'))")
            notice = page.get_by_role('alert').filter(has_text='ยังตรวจสอบข้อมูลและราคาล่าสุดไม่ได้')
            expect(notice).to_be_visible(timeout=25000)
            expect(page.get_by_text('1,700,000', exact=False)).to_have_count(0)
            failing = False
            page.evaluate("window.dispatchEvent(new Event('focus'))")
            expect(notice).to_have_count(0)
            expect(page.get_by_text('1,700,000', exact=False).first).to_be_visible()
        data['properties'] = []
        page.evaluate("window.dispatchEvent(new Event('focus'))")
        expect(page.get_by_role('heading', name=HOUSE['project_name'], exact=True)).to_have_count(0)
        data['popup'] = None
        page.reload()
        expect(page.locator('.v4-popup-img')).to_have_count(0)
        assert not errors, errors
        Path('coverage').mkdir(exist_ok=True)
        page.screenshot(path=f'coverage/freshness-{touch}.png')
        print(f'PASS mobile={touch}: popup replacement/off/on/dismissal, company, visual labels, price, deletion, reload', flush=True)
        context.close()
    browser.close()
