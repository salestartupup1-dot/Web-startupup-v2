"""Local UX regression: python tests/mobileHome.browser.py (dev server on :3000).

Uses fixture data; never writes production data. Requires Playwright and Edge.
"""
from pathlib import Path
import re
import os
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3000')
HOUSE = {
    'id': 'mobile-home-test', 'custom_id': 'mobile-home-test',
    'project_name': 'บ้านทดสอบมือถือ', 'house_number': '12/34',
    'price': 2500000, 'bedrooms': 3, 'bathrooms': 2, 'area_wah': 50,
    'category': 'บ้านเดี่ยว', 'status': 'available', 'main_location': 'คลองหลวง',
    'images': ['/featured/singlehouse.jpg'], 'property_owner': 'Startup Up',
    'lat': 14.05, 'lng': 100.62,
}
DOCUMENT = {
    'name': 'projects/test/databases/(default)/documents/properties/mobile-home-test',
    'fields': {key: {'integerValue': str(value)} if isinstance(value, int)
               else {'stringValue': value} for key, value in HOUSE.items()
               if isinstance(value, (str, int))},
}
HOUSES = [HOUSE, *[{**HOUSE, 'id': f'category-{i}', 'custom_id': f'category-{i}',
                    'category': category, 'project_name': f'บ้านทดสอบ{category}'}
                   for i, category in enumerate(['ทาวน์เฮาส์', 'บ้านแฝด'])]]


def setup(browser, width=390, height=844, touch=True, reduced=False):
    context = browser.new_context(viewport={'width': width, 'height': height},
        is_mobile=touch, has_touch=touch, reduced_motion='reduce' if reduced else 'no-preference')
    page = context.new_page()
    errors, videos = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: videos.append(request.url) if '.mp4' in request.url else None)

    def route_request(route):
        url = route.request.url
        if '/api/public-data' in url:
            route.fulfill(json={'properties': HOUSES, 'company': None, 'visual': None, 'popup': None})
        elif '/api/property?' in url:
            route.fulfill(json={'property': HOUSE})
        elif 'firestore.googleapis.com' in url and ':runQuery' in url:
            route.fulfill(json=[{'document': DOCUMENT}])
        elif 'firestore.googleapis.com' in url and '/properties/mobile-home-test' in url:
            route.fulfill(json=DOCUMENT)
        elif 'firestore.googleapis.com' in url:
            route.abort()
        else:
            route.continue_()
    page.route('**/*', route_request)
    page.goto(BASE)
    return context, page, errors, videos


def home(page):
    page.locator('.v4-logo').click()
    expect(page.locator('#mobile-home-title')).to_be_visible()


def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context, page, errors, videos = setup(browser, reduced=True)
    expect(page.locator('#mobile-home-title')).to_be_visible()
    expect(page.locator('.cinema-scroll')).to_have_count(0)
    expect(page.get_by_role('link', name='ดูรายละเอียดบ้าน')).to_have_count(3)
    no_overflow(page)
    for text in ['ดูบ้านทั้งหมด', 'เลือกทำเล']:
        box = page.get_by_role('link', name=text, exact=True).first.bounding_box()
        assert box['y'] >= 0 and box['y'] + box['height'] <= 844
        assert box['height'] >= 48
    Path('coverage').mkdir(exist_ok=True)
    page.screenshot(path='coverage/mobile-home-tested.png')
    page.get_by_role('link', name='เลือกทำเล', exact=True).click()
    expect(page.locator('#home-locations')).to_be_focused()
    assert 75 <= page.locator('#home-locations').bounding_box()['y'] <= 110
    page.screenshot(path='coverage/mobile-home-locations.png')
    page.get_by_role('link', name='คลองหลวง 3 หลัง').click()
    expect(page).to_have_url(re.compile('tab=search_result'))
    page.get_by_role('button', name='เมนู', exact=True).click()
    page.locator('#site-mobile-menu').get_by_role('button', name='ทำเล', exact=True).click()
    expect(page.locator('#home-locations')).to_be_focused()
    expect(page.get_by_role('button', name='เมนู', exact=True)).to_have_attribute('aria-expanded', 'false')
    home(page)
    page.get_by_role('link', name='ดูบ้านทั้งหมด', exact=True).first.click()
    expect(page).to_have_url(re.compile('tab=all'))
    expect(page.get_by_role('heading', name=re.compile('รายการทั้งหมด'))).to_contain_text('3 รายการ')
    expect(page.locator('.fh-item')).to_have_count(0)
    for house in HOUSES:
        expect(page.get_by_role('heading', name=house['project_name'], exact=True)).to_be_visible()
    home(page)
    page.get_by_role('link', name='บ้านเดี่ยว', exact=True).tap()
    expect(page).to_have_url(re.compile('tab=search_result'))
    home(page)
    page.get_by_label('ค้นหาชื่อโครงการ ทำเล หรือเลขบ้าน').fill('12/34')
    page.locator('form[role="search"]').get_by_role('button', name='ค้นหา').click()
    expect(page).to_have_url(re.compile('tab=search_result'))
    home(page)
    page.get_by_role('link', name='ดูรายละเอียดบ้าน').first.click()
    expect(page.get_by_role('heading', name=HOUSE['project_name'], exact=True)).to_be_visible()
    expect(page.locator('.sp4-price')).to_contain_text('2,500,000')
    home(page)
    page.get_by_role('button', name='เปิดแผนที่บ้าน', exact=True).click()
    expect(page.locator('#home-map .leaflet-container')).to_be_visible()
    assert page.locator('#home-map').bounding_box()['height'] >= 300
    page.get_by_role('button', name='ปิดแผนที่', exact=True).click()
    home(page)
    page.get_by_role('button', name='ชมบรรยากาศบ้าน', exact=True).click()
    expect(page.locator('.cinema-scroll')).to_be_visible()
    page.get_by_role('button', name='กลับหน้าเลือกบ้าน', exact=True).click()
    expect(page.locator('#mobile-home-title')).to_be_visible()
    expect(page.locator('.cinema-scroll')).to_have_count(0)
    assert page.evaluate('getComputedStyle(document.documentElement).scrollSnapType') == 'none'
    no_overflow(page)
    assert not errors, errors
    print('PASS: mobile navigation, location focus, single-tap categories, search, house detail, map, story exit')
    context.close()

    for width, height, touch, reduced in [(320, 568, True, False), (768, 1024, True, False),
            (844, 390, True, False), (1365, 900, False, True), (1365, 900, False, False)]:
        context, page, errors, videos = setup(browser, width, height, touch, reduced)
        simple = reduced
        expect(page.locator('#mobile-home-title' if simple else '.cinema-scroll')).to_be_visible()
        no_overflow(page)
        page.screenshot(path=f'coverage/home-{width}-{height}-reduce-{reduced}.png')
        if not simple:
            title = page.locator('.hero-title').bounding_box()
            assert title['y'] >= 60, 'Opening title must stay below the mobile header'
            box = page.locator('.cine-quick-actions').bounding_box()
            assert box['y'] >= 0 and box['y'] + box['height'] <= height
            assert page.evaluate('''() => {
                const button = getComputedStyle(document.querySelector('.cine-quick-actions button'));
                const stat = getComputedStyle(document.querySelector('.hero-stat'));
                return button.backgroundColor === stat.backgroundColor && button.color === stat.color
                    && button.borderTopColor === stat.borderTopColor;
            }'''), 'CTA must match the stat card colors'
            page.locator('.cine-quick-actions').get_by_role('button', name='ดูบ้านทั้งหมด').click()
            expect(page).to_have_url(re.compile('tab=all'))
            expect(page.get_by_role('heading', name=re.compile('รายการทั้งหมด'))).to_contain_text('3 รายการ')
            for house in HOUSES:
                expect(page.get_by_role('heading', name=house['project_name'], exact=True)).to_be_visible()
            page.screenshot(path='coverage/home-all-houses.png')
            page.locator('.v4-logo').click()
            expect(page.locator('.cinema-scroll')).to_be_visible()
            expect(page.locator('#mobile-home-title')).to_have_count(0)
            expect(page.locator('.v4-exit-story')).to_have_count(0)
            if page.get_by_role('button', name='เมนู', exact=True).is_visible():
                page.get_by_role('button', name='เมนู', exact=True).click()
                page.locator('#site-mobile-menu').get_by_role('button', name='บ้านทั้งหมด', exact=True).click()
            else:
                page.get_by_role('navigation', name='เมนูหลัก').get_by_role('link', name='บ้านทั้งหมด', exact=True).click()
            expect(page).to_have_url(re.compile('tab=all'))
            expect(page.locator('.cinema-scroll')).to_have_count(0)
            expect(page.get_by_role('heading', name=re.compile('รายการทั้งหมด'))).to_contain_text('3 รายการ')
            for house in HOUSES:
                expect(page.get_by_role('heading', name=house['project_name'], exact=True)).to_be_visible()
        assert not errors, errors
        print(f'PASS: {width}x{height}, touch={touch}, reduced_motion={reduced}')
        context.close()
    browser.close()
