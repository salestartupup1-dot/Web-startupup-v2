"""Public map overview, drill-down and Stock Map pill styling; local mocked data only."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

def house(id, area, sub, project, lat, lng):
    return dict(id=id, main_location=area, sub_location=sub, project_name=project,
                lat=lat, lng=lng, house_number=id, property_owner='Startup Up',
                price=2500000, category='บ้านเดี่ยว', status='available')

properties = [
    house('1', 'คลองหลวง', 'คลองสอง', 'Project A', 14.04, 100.65),
    house('2', 'คลองหลวง', 'คลองสอง', 'Project A', 14.045, 100.655),
    house('3', 'คลองหลวง', 'คลองสอง', 'Project B', 14.05, 100.66),
    house('4', 'คลองหลวง', 'คลองสาม', 'Project C', 14.07, 100.70),
    house('5', 'ลำลูกกา', 'คลองสอง', 'Project D', 13.94, 100.66),
]

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    Path('coverage').mkdir(exist_ok=True)
    for mobile in [False, True]:
        context = browser.new_context(viewport={'width': 390 if mobile else 1440, 'height': 844 if mobile else 1000},
                                      is_mobile=mobile, has_touch=mobile)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('**/api/public-data*', lambda route: route.fulfill(json={
            'properties': properties, 'company': None, 'visual': None, 'popup': None}))
        page.route('**/*firestore.googleapis.com/**', lambda route: route.abort())
        page.goto(os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3000'))
        expect(page.locator('.cinema-scroll')).to_be_visible()
        page.wait_for_function("() => document.querySelector('.cine-progress i').style.transform.startsWith('scaleX(')")
        page.evaluate('window.scrollTo(0, 6480)')
        canvas = page.locator('.cine-map-canvas')
        expect(canvas.locator('.property-map-pill')).to_have_count(3)
        page.wait_for_function("() => document.querySelector('.cine-map-wrap') ? !document.querySelector('.cine-map-wrap').inert : true")
        marker = canvas.locator('.property-map-icon[title="คลองหลวง · คลองสอง · 2 โครงการ · 3 หลัง"]')
        expect(marker).to_be_visible()
        pill = marker.locator('.property-map-pill')
        assert pill.evaluate("el => getComputedStyle(el).backgroundColor") == 'rgb(255, 255, 255)'
        expect(pill.locator('.property-map-dot')).to_have_count(1)
        page.wait_for_timeout(800)
        tiles = canvas.locator('.leaflet-tile-pane img')
        assert tiles.count() > 0
        assert tiles.evaluate_all("imgs => imgs.every(img => new URL(img.src).hostname === 'tile.openstreetmap.org')")
        if not mobile:
            zoom = "() => Math.max(...Array.from(document.querySelectorAll('.cine-map-canvas .leaflet-tile-pane img'), img => Number(new URL(img.src).pathname.split('/')[1])))"
            before_zoom = page.evaluate(zoom)
            before_scroll = page.evaluate('scrollY')
            box = canvas.bounding_box()
            page.mouse.move(box['x'] + 100, box['y'] + 100)
            page.mouse.wheel(0, -180)
            page.wait_for_function(f'() => ({zoom})() > {before_zoom}')
            page.wait_for_timeout(700)
            assert abs(page.evaluate('scrollY') - before_scroll) < 3, 'Map zoom must not turn a cinema chapter'
            page.mouse.wheel(0, 180)
            page.wait_for_function(f'() => ({zoom})() === {before_zoom}')
            page.wait_for_timeout(700)
            assert abs(page.evaluate('scrollY') - before_scroll) < 3
        canvas.screenshot(path=f'coverage/property-map-{"mobile" if mobile else "desktop"}.png')
        marker.click()
        expect(canvas.locator('.property-map-pill')).to_have_count(2)
        project = canvas.locator('.property-map-icon[title="Project A (2 หลัง)"]')
        project.click()
        expect(canvas.locator('.property-map-pill.is-house')).to_have_count(2)
        canvas.locator('.property-map-pill.is-house').first.click()
        expect(canvas.locator('.leaflet-popup')).to_be_visible()
        if not mobile:
            page.mouse.move(10, 450)
            page.mouse.wheel(0, 100)
            page.wait_for_function('() => scrollY > 8000')
        canvas.locator('#map-back-btn').click()
        expect(canvas.locator('.property-map-icon[title="Project A (2 หลัง)"]')).to_be_visible()
        canvas.locator('#map-back-btn').click()
        expect(canvas.locator('.property-map-pill')).to_have_count(3)
        canvas.locator('.property-map-icon[title="ลำลูกกา · คลองสอง · 1 โครงการ · 1 หลัง"]').click()
        canvas.locator('.property-map-icon[title="Project D"]').click()
        expect(canvas.locator('.leaflet-popup')).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not errors, errors
        context.close()
        print(f'PASS: {"mobile" if mobile else "desktop"} sub-area pins, dots, project/house drill-down, back and popup')
    browser.close()
