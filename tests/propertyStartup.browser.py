"""Start the fresh house read before JS, reuse it once, re-read after reload.

Run against a production build. All data/external requests are intercepted.
"""
import asyncio
import json
import os
from playwright.async_api import async_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3018')
HOUSE = {'id': 'startup-house', 'custom_id': 'startup-house', 'project_name': 'Startup speed test',
         'price': 2500000, 'category': 'บ้านเดี่ยว', 'property_owner': 'Startup Up',
         'images': ['/brand/line.png']}


async def run(browser, engine):
    page = await browser.new_page(viewport={'width': 390 if engine == 'webkit' else 1440, 'height': 900})
    calls, errors, order = [], [], []
    price = [2500000]
    page.on('pageerror', lambda error: errors.append(str(error)))

    async def intercept(route):
        url = route.request.url
        if '/api/property?' in url:
            calls.append(url)
            order.append('property-request')
            await route.fulfill(json={'property': {**HOUSE, 'price': price[0]}})
        elif '/api/public-data' in url:
            await route.fulfill(json={'properties': [], 'company': None, 'visual': None})
        elif url.startswith(BASE):
            if route.request.resource_type == 'script':
                await asyncio.sleep(1)
                order.append('script-delivered')
            if route.request.resource_type == 'document':
                response = await route.fetch()
                headers = dict(response.headers)
                headers['content-security-policy'] = headers.get('content-security-policy', '').replace('upgrade-insecure-requests', '')
                await route.fulfill(response=response, headers=headers)
            else:
                await route.continue_()
        else:
            await route.abort()

    await page.route('**/*', intercept)
    await page.goto(BASE + '/?property=startup-house', wait_until='domcontentloaded')
    await expect(page.locator('.sp4-price')).to_contain_text('2,500,000')
    assert len(calls) == 1, calls
    assert order.index('property-request') < order.index('script-delivered'), order
    timing = await page.evaluate('''() => {
      const entries = performance.getEntriesByType('resource');
      return {propertyStartMs:Math.round(entries.find(x=>x.name.includes('/api/property?')).startTime),
        firstScriptEndMs:Math.round(Math.min(...entries.filter(x=>x.initiatorType==='script').map(x=>x.responseEnd)))};
    }''')
    price[0] = 2300000
    await page.reload(wait_until='domcontentloaded')
    await expect(page.locator('.sp4-price')).to_contain_text('2,300,000')
    assert len(calls) == 2, calls
    assert not errors, errors
    print(json.dumps({'engine': engine, 'one_request_per_visit': True, 'fresh_price_after_reload': True,
                      **timing, 'passed': True}), flush=True)
    await page.close()


async def main():
    async with async_playwright() as p:
        for engine in [p.chromium, p.webkit]:
            browser = await engine.launch(headless=True, **({'channel': 'msedge'} if engine.name == 'chromium' else {}))
            await run(browser, engine.name)
            await browser.close()

asyncio.run(main())
