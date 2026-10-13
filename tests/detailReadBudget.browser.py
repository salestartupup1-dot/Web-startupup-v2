"""Direct Sale Page fetches settings + one house, deferring the list until needed."""
import asyncio, os, json
from playwright.async_api import async_playwright, expect
BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3016')
HOUSE = {'id': 'demo-1', 'custom_id': 'demo-1', 'project_name': 'บ้านทดสอบ',
         'house_number': '1/1', 'price': 2500000, 'category': 'บ้านเดี่ยว',
         'property_owner': 'Startup Up', 'images': ['/brand/line.png']}

async def main():
    async with async_playwright() as p:
        for engine in [p.chromium, p.webkit]:
            browser = await engine.launch(headless=True, **({'channel':'msedge'} if engine.name == 'chromium' else {}))
            page = await browser.new_page(viewport={'width':390 if engine.name == 'webkit' else 1440, 'height':900})
            calls, errors = [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            async def route_request(route):
                url = route.request.url
                if '/api/public-data' in url:
                    calls.append(url)
                    payload = {'company': None, 'visual': None, 'popup': None}
                    if 'view=detail' not in url: payload['properties'] = [HOUSE, {**HOUSE, 'id':'demo-2', 'custom_id':'demo-2', 'project_name':'บ้านแนะนำ'}]
                    await route.fulfill(json=payload)
                elif '/api/property?' in url:
                    await route.fulfill(json={'property':HOUSE})
                elif url.startswith(BASE):
                    if engine.name == 'webkit' and route.request.resource_type == 'document':
                        response = await route.fetch(); headers = dict(response.headers)
                        headers['content-security-policy'] = headers.get('content-security-policy','').replace('upgrade-insecure-requests','')
                        await route.fulfill(response=response, headers=headers)
                    else: await route.continue_()
                else: await route.abort()
            await page.route('**/*', route_request)
            await page.goto(BASE + '/?property=demo-1')
            await expect(page.locator('.sp4-price')).to_contain_text('2,500,000')
            await page.wait_for_load_state('networkidle')
            assert calls and all('view=detail' in call for call in calls), calls
            await page.locator('.sp4 [aria-hidden="true"]').last.scroll_into_view_if_needed()
            await page.evaluate('window.scrollTo({top:document.body.scrollHeight,behavior:"instant"})')
            await expect(page.locator('.sp4-related')).to_be_visible()
            assert len([call for call in calls if 'view=detail' not in call]) == 1, calls
            await expect(page.locator('.sp4-price')).to_contain_text('2,500,000')
            assert not errors, errors
            print(json.dumps({'engine':engine.name, 'detail_only_initially':True, 'related_catalogue_requests':1, 'passed':True}), flush=True)
            await browser.close()
asyncio.run(main())
