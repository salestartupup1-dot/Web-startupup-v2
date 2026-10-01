"""Read-only browser fixtures against a local dev/start server on port 3001.

To test the editor, copy tests/fixtures/sale-promotion-editor.js.txt to
pages/__sale-promotion-test.js, use a dev server and set TEST_PROMOTION_EDITOR=1.
Remove that temporary page before any production build. No production writes.
The optional coverage/promotion-fixture.png supplies a real poster for screenshots.
"""
import os
from pathlib import Path
import base64
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3001')
IMAGE = 'https://res.cloudinary.com/test/image/upload/promo.jpg'
HOUSE = {'id': 'one', 'custom_id': '5-557', 'project_name': 'บ้านทดสอบโปรโมชั่น', 'price': 2500000,
         'bedrooms': 3, 'bathrooms': 2, 'area_wah': 50, 'category': 'บ้านเดี่ยว', 'status': 'available',
         'images': ['/featured/singlehouse.jpg'], 'highlights': 'รายละเอียดบ้านสำหรับทดสอบ', 'property_owner': 'Startup Up'}
PROMOTION = {'title': 'โปรโมชั่นพิเศษเดือนตุลาคม', 'images': [IMAGE, 'https://res.cloudinary.com/test/image/upload/second.jpg'],
             'isActive': True, 'scope': 'selected', 'propertyIds': ['one'], 'endDate': '2099-10-31'}

def field(value):
    if isinstance(value, bool): return {'booleanValue': value}
    if isinstance(value, int): return {'integerValue': str(value)}
    if isinstance(value, list): return {'arrayValue': {'values': [field(v) for v in value]}}
    return {'stringValue': value}

def document(value):
    return {'name': 'docs/test', 'fields': {key: field(val) for key, val in value.items()}}

def setup(browser, mobile):
    context = browser.new_context(viewport={'width': 390 if mobile else 1440, 'height': 844 if mobile else 1000},
                                  is_mobile=mobile, has_touch=mobile, reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    state = {'promotion': {**PROMOTION}, 'house': {**HOUSE}, 'reads': 0}
    def route_request(route):
        url = route.request.url
        if '/api/public-data' in url:
            route.fulfill(json={'properties': [state['house']], 'company': None, 'visual': None, 'popup': None})
        elif '/site_settings/sale_promotion?' in url:
            state['reads'] += 1
            route.fulfill(json=document(state['promotion']))
        elif '/properties/one?' in url:
            route.fulfill(json=document(state['house']))
        elif 'firestore.googleapis.com' in url and ':runQuery' in url:
            route.fulfill(json=[{'document': document(state['house'])}])
        elif 'res.cloudinary.com/test/' in url:
            route.fulfill(path='coverage/promotion-fixture.png', content_type='image/png')
        elif url.startswith(BASE): route.continue_()
        else: route.abort()
    page.route('**/*', route_request)
    return context, page, state, errors

def run_editor(browser, mobile):
    context, page, state, errors = setup(browser, mobile)
    page.goto(BASE + '/__sale-promotion-test')
    page.wait_for_load_state('networkidle')
    page.get_by_label('เปิดแสดงโปรโมชั่นในหน้าบ้าน').check()
    page.get_by_role('button', name='บันทึกโปรโมชั่นหน้าบ้าน', exact=True).click()
    expect(page.locator('form').get_by_role('alert')).to_contain_text('เพิ่มรูป')
    page.get_by_role('button', name='คัดลอกรูปจากป๊อปอัป').click()
    page.get_by_role('button', name='บันทึกโปรโมชั่นหน้าบ้าน', exact=True).click()
    expect(page.locator('form').get_by_role('alert')).to_contain_text('เลือกบ้าน')
    page.get_by_label('Test House · 5-557', exact=True).check()
    page.get_by_label('เพิ่มรูปโปรโมชั่น (สูงสุด 5 รูป)').set_input_files('coverage/promotion-fixture.png')
    expect(page.get_by_role('img', name='รูปโปรโมชั่น 2')).to_be_visible()
    page.get_by_role('button', name='ใช้รูปที่ 2 เป็นรูปหลัก').click()
    page.get_by_label('วันสิ้นสุดโปรโมชั่น (ไม่บังคับ)').fill('2020-01-01')
    page.get_by_role('button', name='บันทึกโปรโมชั่นหน้าบ้าน', exact=True).click()
    expect(page.locator('form').get_by_role('alert')).to_contain_text('ผ่านไปแล้ว')
    page.get_by_label('วันสิ้นสุดโปรโมชั่น (ไม่บังคับ)').fill('2099-10-31')
    page.evaluate('window.failPromotionSave = true')
    page.get_by_role('button', name='บันทึกโปรโมชั่นหน้าบ้าน', exact=True).click()
    expect(page.locator('form').get_by_role('alert')).to_have_text('Test save failed')
    page.evaluate('window.failPromotionSave = false')
    page.get_by_role('button', name='บันทึกโปรโมชั่นหน้าบ้าน', exact=True).click()
    expect(page.get_by_role('status')).to_contain_text('เรียบร้อยแล้ว')
    saved = page.evaluate('window.savedPromotion')
    assert saved['propertyIds'] == ['one'] and saved['scope'] == 'selected'
    assert saved['images'] == ['https://res.cloudinary.com/test/image/upload/promotion-fixture.png', 'https://res.cloudinary.com/test/image/upload/popup.jpg']
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=f'coverage/promotion-editor-{mobile}.png', full_page=True)
    assert not errors, errors
    context.close()
    print(f'PASS editor mobile={mobile}: copy, upload, main image, scope, expiry, failed save, successful save', flush=True)

Path('coverage').mkdir(exist_ok=True)
fixture = Path('coverage/promotion-fixture.png')
if not fixture.exists():
    fixture.write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='))

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for mobile in [True, False]:
        context, page, state, errors = setup(browser, mobile)
        page.goto(BASE + '/?property=one')
        page.wait_for_load_state('networkidle')
        card = page.locator('.sp4-promotion:visible')
        expect(card).to_have_count(1)
        expect(page.locator('.sp4-price')).to_contain_text('2,500,000')
        if mobile:
            assert card.bounding_box()['y'] > page.locator('.sp4-plate').bounding_box()['y']
            assert page.locator('.sp4-promotion-mobile + .sp4-block').count() == 1
        else:
            assert card.bounding_box()['x'] > page.locator('.sp4-price').bounding_box()['x']
            assert card.bounding_box()['y'] > page.locator('.sp4-rail > .sp4-card').first.bounding_box()['y']
        page.locator('.sp4-promotion-link').click()
        expect(card).to_be_focused()
        expect(card).to_be_in_viewport()
        page.wait_for_function("() => [...document.querySelectorAll('.sp4-promotion:has(img)')].filter(n => n.getClientRects().length).every(n => n.querySelector('img').naturalWidth > 0)")
        if not mobile:
            page.wait_for_function("() => getComputedStyle(document.querySelector('.sp4-rail')).opacity === '1'")
        page.screenshot(path=f'coverage/promotion-sale-{mobile}.png')
        card.get_by_role('button', name='ดูรูปโปรโมชั่นที่ 2', exact=True).click()
        assert (card.locator('.sp4-promotion-image img').get_attribute('src')).endswith('/second.jpg')
        card.get_by_role('button', name='ดูรูปโปรโมชั่นขนาดใหญ่').click()
        expect(page.get_by_role('img', name='Image 2', exact=True)).to_be_visible()
        page.locator('button').filter(has=page.locator('svg.lucide-x')).last.click()
        expect(page.get_by_role('img', name='Image 2', exact=True)).to_have_count(0)
        # Refreshing the independent document updates the existing page and resets its selected image.
        state['promotion'] = {**PROMOTION, 'title': 'โปรโมชั่นอัปเดตแล้ว', 'images': ['https://res.cloudinary.com/test/image/upload/updated.jpg']}
        page.evaluate("window.dispatchEvent(new Event('focus'))")
        expect(card.locator('h2')).to_have_text('โปรโมชั่นอัปเดตแล้ว')
        page.wait_for_function("() => [...document.querySelectorAll('.sp4-promotion-image img')].some(img => img.src.endsWith('/updated.jpg'))")
        for patch in [{'isActive': False}, {'propertyIds': ['two']}, {'endDate': '2020-01-01'}]:
            state['promotion'] = {**PROMOTION, **patch}
            page.evaluate("window.dispatchEvent(new Event('focus'))")
            expect(page.locator('.sp4-promotion')).to_have_count(0)
            state['promotion'] = {**PROMOTION}
            page.evaluate("window.dispatchEvent(new Event('focus'))")
            expect(card).to_have_count(1)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not errors, errors
        context.close()
        print(f'PASS sale mobile={mobile}: placement, jump, gallery, lightbox, live refresh, exclusions, expiry', flush=True)
        if os.environ.get('TEST_PROMOTION_EDITOR'): run_editor(browser, mobile)
    browser.close()
