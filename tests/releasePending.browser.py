"""Read-only release smoke test; blocks marketing and contact submissions."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3035')
OUT = Path('coverage')
OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='msedge')
    for width in [390, 1440]:
        context = browser.new_context(viewport={'width': width, 'height': 900})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        def route(request):
            url = request.request.url
            if any(s in url for s in ['googletagmanager.com', 'google-analytics.com', 'googleadservices.com', 'doubleclick.net', 'tiktok', '/api/contact/', '/api/line/']):
                request.abort()
            else:
                request.continue_()
        context.route('**/*', route)
        response = page.goto(BASE + '/?tab=location', wait_until='domcontentloaded')
        assert response.status == 200
        cards = page.locator('.listing-card')
        expect(cards).to_have_count(12)
        expect(cards.first.locator('img')).to_be_visible()
        page.wait_for_function("document.querySelector('.listing-card img').naturalWidth > 0")
        if width == 390:
            assert page.locator('.listing-card img').count() < 12
        page.screenshot(path=str(OUT / f'release-location-{width}.png'))
        more = page.get_by_role('button', name='ดูบ้านเพิ่ม', exact=False)
        # Scroll drives incremental batches until all matching homes are visible.
        for _ in range(10):
            if more.count() == 0:
                break
            more.scroll_into_view_if_needed()
            page.wait_for_timeout(500)
        assert more.count() == 0
        all_count = cards.count()
        assert all_count > 12
        assert len(set(cards.evaluate_all('(els) => els.map(e => e.href)'))) == all_count
        filters = page.locator('#home-locations button')
        filters.nth(1).click()
        assert cards.count() <= 12
        filters.first.click()
        expect(cards).to_have_count(12)
        expected_payment = cards.first.locator('strong').inner_text()
        cards.first.click()
        expect(page.locator('.sp4-pay')).to_be_visible(timeout=30000)
        expect(page.locator('.sp4-pay-val b')).to_have_text(expected_payment)
        page.locator('.sp4-pay').scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.screenshot(path=str(OUT / f'release-payment-{width}.png'))
        assert not errors, errors
        print(f'PASS {width}px: 12-card batches, all {all_count} homes reachable, deferred images, filters, matching payment, no page errors', flush=True)
        context.close()
    browser.close()
