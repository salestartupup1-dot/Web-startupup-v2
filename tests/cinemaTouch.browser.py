"""Touch event ownership on WebKit and Chromium; no production writes.

Synthetic events verify cancellation and chapter selection, not physical iOS momentum.
Native Chromium touch gestures are covered separately by cinemaReading.browser.py.
"""
import os
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    for engine in [p.webkit, p.chromium]:
        browser = engine.launch(headless=True, **({'channel': 'msedge'} if engine.name == 'chromium' else {}))
        context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('**/api/public-data*', lambda route: route.fulfill(json={
            'properties': [], 'company': None, 'visual': None, 'popup': None}))
        page.route('**/*firestore.googleapis.com/**', lambda route: route.abort())
        page.goto(os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3000'))
        expect(page.locator('.cinema-scroll')).to_be_visible()
        page.wait_for_function("() => document.querySelector('.cine-progress i').style.transform.startsWith('scaleX(')")
        page.evaluate("""() => {
            window.sendTouch = (type, x, y, count = 1) => {
                const target = document.querySelector('.cinema-scroll');
                const touch = { identifier: 1, target, clientX: x, clientY: y };
                const touches = type === 'touchend' || type === 'touchcancel' ? [] : [touch];
                if (count === 2) touches.push({ identifier: 2, target, clientX: x + 60, clientY: y });
                // Desktop WebKit exposes Touch but disallows its constructor. Supply the
                // event fields explicitly: this tests the listener contract, not native input.
                const event = new Event(type, { bubbles: true, cancelable: true });
                Object.defineProperties(event, {
                    touches: { value: touches }, targetTouches: { value: touches },
                    changedTouches: { value: [touch] }
                });
                target.dispatchEvent(event);
                return event.defaultPrevented;
            };
        }""")

        # Claim even the first tiny vertical movement, before Safari's native scroll starts.
        for destination in [2050, 3740, 6480]:
            page.evaluate("sendTouch('touchstart', 190, 650)")
            assert page.evaluate("sendTouch('touchmove', 190, 648)"), 'First vertical move must cancel native scrolling'
            for y in range(640, 549, -10):
                assert page.evaluate(f"sendTouch('touchmove', 190, {y})")
                page.wait_for_timeout(100)
            page.wait_for_timeout(400)  # A paused release still changes chapter.
            page.evaluate("sendTouch('touchend', 190, 550)")
            page.wait_for_function('(y) => Math.abs(scrollY - y) < 4', arg=destination)
            page.wait_for_timeout(400)
            assert abs(page.evaluate('scrollY') - destination) < 4

        page.evaluate("sendTouch('touchstart', 190, 300)")
        assert page.evaluate("sendTouch('touchmove', 190, 420)")
        page.evaluate("sendTouch('touchend', 190, 420)")
        page.wait_for_function('() => Math.abs(scrollY - 3740) < 4')
        page.wait_for_timeout(350)

        # Horizontal gestures, zoom, cancelled touches and dialogs must not page.
        page.evaluate("sendTouch('touchstart', 190, 400)")
        assert not page.evaluate("sendTouch('touchmove', 100, 400)")
        page.evaluate("sendTouch('touchend', 100, 400)")
        page.evaluate("sendTouch('touchstart', 190, 400)")
        assert not page.evaluate("sendTouch('touchmove', 190, 300, 2)")
        page.evaluate("sendTouch('touchend', 190, 300)")
        page.evaluate("sendTouch('touchstart', 190, 400)")
        page.evaluate("sendTouch('touchcancel', 190, 400)")
        page.evaluate("sendTouch('touchend', 190, 300)")
        page.evaluate("document.body.style.overflow = 'hidden'")
        page.evaluate("sendTouch('touchstart', 190, 400)")
        assert not page.evaluate("sendTouch('touchmove', 190, 300)")
        page.evaluate("sendTouch('touchend', 190, 300)")
        page.evaluate("document.body.style.overflow = ''")
        page.wait_for_timeout(1100)
        assert abs(page.evaluate('scrollY') - 3740) < 4
        assert not errors, errors
        browser.close()
        print(f'PASS: {engine.name} owns vertical swipes; slow/reverse paging and gesture exclusions')
