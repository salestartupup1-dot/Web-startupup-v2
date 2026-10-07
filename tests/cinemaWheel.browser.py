"""Desktop wheel paging through the cinema chapters.

Run: python tests/cinemaWheel.browser.py (localhost:3000, Playwright + Edge).
All house data is mocked; no production writes. Synthetic wheel events do not replace
checking a real mouse and a real trackpad (Windows precision touchpad, macOS momentum).
"""
import os
from playwright.sync_api import sync_playwright, expect

STATIONS = [2050, 3740, 6480]


def setup(browser):
    context = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/api/public-data*', lambda route: route.fulfill(json={
        'properties': [{'id': 'wheel-test', 'project_name': 'Wheel test',
            'category': 'บ้านเดี่ยว', 'price': 2500000, 'property_owner': 'Startup Up'}],
        'company': None, 'visual': None, 'popup': None}))
    page.route('**/*firestore.googleapis.com/**', lambda route: route.abort())
    page.goto(os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3000'))
    expect(page.locator('.cinema-scroll')).to_be_visible()
    page.wait_for_function("() => document.querySelector('.cine-progress i').style.transform.startsWith('scaleX(')")
    page.mouse.move(720, 450)
    return context, page, errors


def distance(page):
    return page.evaluate("() => scrollY - document.querySelector('.cinema-scroll').offsetTop")


def settle(page, target):
    page.wait_for_function(
        "(target) => Math.abs(scrollY - document.querySelector('.cinema-scroll').offsetTop - target) < 4",
        arg=target, timeout=4000)
    # Quiet gap so the next wheel counts as a new scroll action.
    page.wait_for_timeout(450)


def notch(page, dy=100, times=1, every=40):
    for _ in range(times):
        page.mouse.wheel(0, dy)
        page.wait_for_timeout(every)


with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context, page, errors = setup(browser)
    end_at = page.evaluate("() => document.querySelector('.cinema-scroll').offsetHeight - 76")

    # One mouse notch per chapter: locations -> featured homes -> map -> content below.
    for target in STATIONS + [end_at]:
        notch(page)
        settle(page, target)
    # And back up one chapter at a time.
    for target in [6480, 3740, 2050, 0]:
        notch(page, -100)
        settle(page, target)

    # A fast burst of notches is still one scroll action, so it moves exactly one chapter.
    notch(page, 100, times=6, every=35)
    settle(page, 2050)
    page.wait_for_timeout(600)
    assert abs(distance(page) - 2050) < 4, distance(page)

    # Trackpad flick with decaying momentum also moves exactly one chapter.
    for dy in [4, 12, 30, 60, 90, 80, 64, 50, 38, 28, 20, 14, 9, 6, 4, 2, 1]:
        page.mouse.wheel(0, dy)
        page.wait_for_timeout(16)
    settle(page, 3740)
    page.wait_for_timeout(600)
    assert abs(distance(page) - 3740) < 4, distance(page)

    # A very slow trackpad drag scrolls normally and is not pulled to the map afterwards.
    start = distance(page)
    for _ in range(40):
        page.mouse.wheel(0, 4)
        page.wait_for_timeout(40)
    page.wait_for_timeout(900)
    moved = distance(page) - start
    assert 100 < moved < 260, moved

    # Reduced motion keeps the native wheel.
    context.close()
    context = browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
    page = context.new_page()
    page.route('**/api/public-data*', lambda route: route.fulfill(json={
        'properties': [], 'company': None, 'visual': None, 'popup': None}))
    page.route('**/*firestore.googleapis.com/**', lambda route: route.abort())
    page.goto(os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3000'))
    page.mouse.move(720, 450)
    page.wait_for_timeout(800)
    notch(page)
    page.wait_for_timeout(900)
    assert page.evaluate('scrollY') < 400, page.evaluate('scrollY')

    assert not errors, errors
    context.close()
    browser.close()
    print('cinema wheel paging: ok')
