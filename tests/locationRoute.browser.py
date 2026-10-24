"""Verify cinematic location links without reading or writing production data."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3022')


def run(browser, mobile=False, reduced=False):
    context = browser.new_context(viewport={'width': 390 if mobile else 1440, 'height': 900},
                                  has_touch=mobile, is_mobile=mobile,
                                  reduced_motion='reduce' if reduced else 'no-preference')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def intercept(route):
        url = route.request.url
        if '/api/public-data' in url:
            route.fulfill(json={'properties': [], 'company': None, 'visual': None, 'popup': None})
        elif '/api/map-data' in url:
            route.fulfill(json={'properties': []})
        elif 'firestore.googleapis.com' in url:
            # Simulate unavailable live updates without WebKit reporting an abort as a CORS page error.
            route.fulfill(status=204 if route.request.method == 'OPTIONS' else 503,
                          headers={'access-control-allow-origin': BASE,
                                   'access-control-allow-credentials': 'true',
                                   'access-control-allow-methods': 'GET, POST, OPTIONS',
                                   'access-control-allow-headers': route.request.headers.get('access-control-request-headers', '*')})
        elif url.startswith(BASE):
            route.continue_()
        else:
            route.abort()
    page.route('**/*', intercept)

    def at_locations():
        page.wait_for_function("new URL(location.href).searchParams.get('tab') === 'location'")
        if reduced:
            expect(page.locator('#home-locations')).to_be_in_viewport()
        else:
            expect(page.locator('.cinema-scroll')).to_be_visible()
            page.wait_for_function("Math.abs(scrollY - (document.querySelector('.cinema-scroll').offsetTop + 2050)) < 10")
            page.wait_for_function("getComputedStyle(document.querySelector('.sights-slider')).opacity > 0.9")

    def menu(name):
        if mobile:
            page.get_by_role('button', name='เมนู', exact=True).click()
            page.locator('#site-mobile-menu').get_by_role('button', name=name, exact=True).click()
        else:
            page.get_by_role('navigation', name='เมนูหลัก').get_by_role('link', name=name, exact=True).click()

    page.goto(BASE + '/?tab=location', wait_until='networkidle', timeout=120000)
    at_locations()
    page.reload(wait_until='networkidle')
    at_locations()
    menu('บ้านทั้งหมด')
    page.wait_for_function("new URL(location.href).searchParams.get('tab') === 'all'")
    page.go_back(wait_until='networkidle')
    at_locations()
    menu('หน้าหลัก')
    page.wait_for_function("!new URL(location.href).searchParams.has('tab') && scrollY < 10")
    page.get_by_role('link' if reduced else 'button', name='เลือกทำเล', exact=True).click()
    at_locations()
    page.wait_for_timeout(600)  # Old delayed home scroll must not override the newer request.
    at_locations()
    menu('บ้านทั้งหมด')
    menu('ทำเล')
    at_locations()
    if not mobile:
        expect(page.get_by_role('navigation', name='เมนูหลัก').get_by_role('link', name='ทำเล', exact=True)).to_have_attribute('href', '/?tab=location')
    page.goto(BASE + '/v4?tab=location', wait_until='networkidle')
    at_locations()
    if not reduced:
        page.locator('.lg-slot[data-active="1"] .lg-card').click()
        page.wait_for_function("new URL(location.href).searchParams.get('tab') === 'search_result'")
        page.go_back(wait_until='networkidle')
        at_locations()
    assert not errors, errors
    Path('coverage').mkdir(exist_ok=True)
    page.screenshot(path=f'coverage/location-route-{browser.browser_type.name}-{mobile}-{reduced}.png')
    print(f'PASS {browser.browser_type.name}: mobile={mobile}, reduced={reduced}', flush=True)
    context.close()


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    run(browser)
    run(browser, mobile=True, reduced=True)
    browser.close()
    browser = p.webkit.launch(headless=True)
    run(browser, mobile=True)
    browser.close()
