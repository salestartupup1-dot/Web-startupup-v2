"""Popup must appear while catalogue data is still blocked. No production writes."""
import asyncio
import os
from playwright.async_api import async_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://127.0.0.1:3001')

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='msedge', headless=True)
        for mobile in [True, False]:
            context = await browser.new_context(viewport={'width': 390 if mobile else 1365, 'height': 844 if mobile else 900},
                                                is_mobile=mobile, has_touch=mobile)
            page = await context.new_page()
            release = asyncio.Event()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            async def route_request(route):
                url = route.request.url
                if '/api/public-data' in url:
                    await release.wait()
                    await route.fulfill(json={'properties': [], 'company': None, 'visual': None,
                                              'popup': {'imageUrl': '/old.jpg', 'isActive': True}})
                elif '/site_settings/popup?' in url:
                    await route.fulfill(json={'name': 'docs/popup', 'fields': {
                        'imageUrl': {'stringValue': '/featured/singlehouse.jpg'}, 'isActive': {'booleanValue': True}}})
                elif 'firestore.googleapis.com' in url:
                    await route.abort()
                else:
                    await route.continue_()
            await page.route('**/*', route_request)
            await page.goto(BASE, wait_until='domcontentloaded')
            popup = page.locator('.v4-popup-img')
            await expect(popup).to_be_visible(timeout=4000)
            await expect(popup).to_have_attribute('src', '/featured/singlehouse.jpg')
            await expect(popup).to_have_attribute('fetchpriority', 'high')
            assert not release.is_set()
            ready = await page.evaluate('performance.now()')
            release.set()
            await page.wait_for_timeout(600)
            await expect(popup).to_have_attribute('src', '/featured/singlehouse.jpg')
            assert not errors, errors
            print(f'PASS mobile={mobile}: popup visible at {ready:.0f}ms before catalogue responds; late catalogue cannot overwrite it', flush=True)
            await context.close()
        await browser.close()

asyncio.run(main())
