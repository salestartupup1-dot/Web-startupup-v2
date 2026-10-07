"""Local reading navigation regression, with native CDP touch events.

Run: python tests/cinemaReading.browser.py (localhost:3000, Playwright + Edge).
All house data is mocked; no production writes. Device emulation does not replace
checking momentum scrolling on a physical iPhone and Android phone.
"""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright, expect


def setup(browser, width=390, height=844, touch=True, reduced=False):
    context = browser.new_context(viewport={'width': width, 'height': height},
        is_mobile=touch, has_touch=touch, reduced_motion='reduce' if reduced else 'no-preference')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/api/public-data*', lambda route: route.fulfill(json={
        'properties': [{'id': 'reading-test', 'project_name': 'Reading test',
            'category': 'บ้านเดี่ยว', 'price': 2500000, 'property_owner': 'Startup Up'}],
        'company': None, 'visual': None, 'popup': None}))
    page.route('**/*firestore.googleapis.com/**', lambda route: route.abort())
    page.goto(os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3000'))
    if reduced:
        page.get_by_role('button', name='ชมบรรยากาศบ้าน', exact=True).click()
    expect(page.locator('.cinema-scroll')).to_be_visible()
    page.wait_for_function("() => document.querySelector('.cine-progress i').style.transform.startsWith('scaleX(')")
    expect(page.locator('.cine-reading-nav')).to_have_count(0)
    return context, page, errors


def swipe(page, cdp, distance, horizontal=0, x=190):
    height = page.viewport_size['height']
    y = height - 180 if distance < 0 else 170
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
    for step in range(1, 7):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [
            {'x': x + horizontal * step / 6, 'y': y + distance * step / 6}]})
        page.wait_for_timeout(16)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})


def at(page, position):
    page.wait_for_function('(target) => Math.abs(scrollY - target) < 10', arg=position)
    # Let the browser finish its native snap before starting the next reading gesture.
    page.wait_for_timeout(350)



with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    Path('coverage').mkdir(exist_ok=True)
    context, page, errors = setup(browser)
    cdp = context.new_cdp_session(page)
    # Even a short intentional swipe reaches a reading point; the next gesture advances again.
    for position in [2050, 3740, 6480]:
        page.evaluate("""() => {
            window.readingFrames = [];
            window.recordReading = true;
            const sample = () => {
                if (!window.recordReading) return;
                const transform = document.querySelector('.cine-progress i').style.transform;
                window.readingFrames.push([scrollY, parseFloat(transform.slice(7)) * 7600]);
                requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
        }""")
        swipe(page, cdp, -160)
        at(page, position)
        frames = page.evaluate('() => { window.recordReading = false; return window.readingFrames; }')
        assert len(set(round(frame[0]) for frame in frames)) >= 12, 'Landing must move through intermediate positions'
        assert max(abs(b[1] - a[1]) for a, b in zip(frames, frames[1:])) < 500, 'Background must not jump to a distant scene'
    # Swipes beginning over the map still navigate when the page itself scrolls.
    swipe(page, cdp, 160)
    at(page, 3740)
    swipe(page, cdp, 160)
    at(page, 2050)
    swipe(page, cdp, 160)
    at(page, 0)
    # A long swipe also lands at the next chapter instead of skipping it.
    swipe(page, cdp, -550)
    at(page, 2050)
    # Horizontal gestures must not turn a chapter.
    swipe(page, cdp, 0, horizontal=-120, x=260)
    at(page, 2050)
    page.screenshot(path='coverage/cinema-reading-locations.png')
    swipe(page, cdp, -160)
    at(page, 3740)
    page.wait_for_function("() => !document.querySelector('.fh-wrap').inert")
    page.screenshot(path='coverage/cinema-reading-categories.png')
    swipe(page, cdp, -160)
    at(page, 6480)
    page.screenshot(path='coverage/cinema-reading-map.png')
    swipe(page, cdp, -160)
    page.wait_for_function('() => scrollY > 8000')
    page.wait_for_function('() => document.activeElement.matches("h1,h2,h3")')
    before = page.evaluate('scrollY')
    swipe(page, cdp, -160)
    assert page.evaluate('scrollY') > before, 'Ordinary content must scroll freely'
    page.locator('.v4-logo').click()
    expect(page.locator('.cinema-scroll')).to_be_visible()
    at(page, 0)
    assert page.evaluate('getComputedStyle(document.documentElement).scrollSnapType') == 'none'
    assert not errors, errors
    context.close()
    print('PASS: buttons removed, short/long/reverse swipes, horizontal gesture, exit and cleanup')

    context, page, errors = setup(browser)
    cdp = context.new_cdp_session(page)
    swipe(page, cdp, -160)
    page.wait_for_function('() => scrollY > 400 && scrollY < 1900')
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 10, 'y': 250}]})
    stopped_at = page.evaluate('scrollY')
    page.wait_for_timeout(350)
    assert abs(page.evaluate('scrollY') - stopped_at) < 3, 'New touch must immediately cancel the glide'
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    assert not errors, errors
    context.close()
    print('PASS: touch interrupts the smooth landing without a lock timer')

    # A very slow drag reads the scene natively; a fast lift at the end still turns the chapter.
    context, page, errors = setup(browser)
    cdp = context.new_cdp_session(page)
    def slow_drag(flick_end=False):
        y = 600
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 190, 'y': y}]})
        for _ in range(20):
            y -= 10
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 190, 'y': y}]})
            page.wait_for_timeout(80)
        if flick_end:
            for _ in range(4):
                y -= 40
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 190, 'y': y}]})
                page.wait_for_timeout(16)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    slow_drag()
    page.wait_for_timeout(1200)
    slow_at = page.evaluate('scrollY')
    assert 100 < slow_at < 600, f'Slow drag must stay where the finger left it, got {slow_at}'
    slow_drag(flick_end=True)
    at(page, 2050)
    assert not errors, errors
    context.close()
    print('PASS: very slow touch drag stays native, a flick at release still lands')

    # Desktop wheel moves forward to the next chapter and never pulls back to the previous stop
    # (wheel paging details live in cinemaWheel.browser.py).
    context, page, errors = setup(browser, 1365, 900, touch=False)
    page.locator('.cine-quick-actions').get_by_role('button', name='เลือกทำเล', exact=True).click()
    at(page, 2050)
    page.mouse.move(10, 450)
    page.mouse.wheel(0, 200)
    page.wait_for_timeout(1000)
    assert page.evaluate('scrollY') >= 2240, 'Leaving a chapter must not pull back'
    assert not errors, errors
    context.close()
    print('PASS: desktop wheel leaves a reading point without pulling back')

    # Reduced motion leaves swipe distance native while explicit buttons still work.
    context, page, errors = setup(browser, reduced=True)
    cdp = context.new_cdp_session(page)
    swipe(page, cdp, -160)
    page.wait_for_timeout(300)
    assert 0 < page.evaluate('scrollY') < 500
    page.locator('.cine-quick-actions').get_by_role('button', name='เลือกทำเล', exact=True).click()
    at(page, 2050)
    assert not errors, errors
    context.close()
    print('PASS: reduced motion retains native swipe distance and direct navigation')

    # Small screens still reach every reading point without visible navigation controls.
    context, page, errors = setup(browser, 320, 568)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    cdp = context.new_cdp_session(page)
    swipe(page, cdp, -160, x=160)
    at(page, 2050)
    page.screenshot(path='coverage/cinema-reading-small.png')
    swipe(page, cdp, -160, x=160)
    at(page, 3740)
    page.wait_for_function("() => !document.querySelector('.fh-wrap').inert")
    page.screenshot(path='coverage/cinema-reading-small-categories.png')
    cards = page.locator('.fh-card').bounding_box()
    assert cards['y'] + cards['height'] <= 568, 'Category cards must fit the viewport'
    swipe(page, cdp, -160, x=160)
    at(page, 6480)
    page.screenshot(path='coverage/cinema-reading-small-map.png')
    # Start directly over Leaflet to verify its event handling cannot swallow a page swipe.
    cdp = context.new_cdp_session(page)
    swipe(page, cdp, -160, x=160)
    page.wait_for_function('() => scrollY > 8000')
    expect(page.locator('.cine-reading-nav')).to_have_count(0)
    assert not errors, errors
    context.close()
    print('PASS: 320px screen navigation and overflow')
    browser.close()
