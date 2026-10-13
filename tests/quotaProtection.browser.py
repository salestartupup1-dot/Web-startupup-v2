"""Prove quota exhaustion does not trigger full catalogue scans from visitors."""
import asyncio, os, json
from playwright.async_api import async_playwright, expect
BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3006')

async def main():
    async with async_playwright() as p:
        for engine in [p.chromium, p.webkit]:
            browser = await engine.launch(headless=True, **({'channel':'msedge'} if engine.name == 'chromium' else {}))
            page = await browser.new_page(viewport={'width':390 if engine.name == 'webkit' else 1440,'height':900})
            calls, scans, errors = [], [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            async def route_request(route):
                url = route.request.url
                if '/api/public-data' in url:
                    calls.append(url)
                    await route.fulfill(status=503, json={'code':'QUOTA_EXCEEDED','retryable':False})
                elif 'firestore.googleapis.com' in url:
                    if '/properties?' in url or '"collectionId":"properties"' in (route.request.post_data or ''):
                        scans.append(url)
                    await route.fulfill(status=429, json={'error':{'code':429,'status':'RESOURCE_EXHAUSTED','message':'Quota exceeded.'}})
                elif url.startswith(BASE):
                    if engine.name == 'webkit' and route.request.resource_type == 'document' and BASE.startswith('http:'):
                        r = await route.fetch()
                        headers = dict(r.headers)
                        headers['content-security-policy'] = headers.get('content-security-policy','').replace('upgrade-insecure-requests','')
                        await route.fulfill(response=r, headers=headers)
                    else:
                        await route.continue_()
                else:
                    await route.abort()
            await page.route('**/*', route_request)
            await page.goto(BASE + '/?tab=all')
            await expect(page.locator('[role="alert"]').filter(has_text='ข้อมูล')).to_be_visible()
            await page.wait_for_timeout(500)
            initial = len(calls)
            for _ in range(4):
                await page.evaluate("() => {dispatchEvent(new Event('focus')); dispatchEvent(new Event('online')); document.dispatchEvent(new Event('visibilitychange'));}")
            await page.wait_for_timeout(16000)
            assert len(calls) == initial, (initial, calls)
            assert initial == 1, calls
            assert not scans, scans
            assert not errors, errors
            print(json.dumps({'engine':engine.name,'catalogue_requests':len(calls),'browser_full_scans':len(scans),'passed':True}), flush=True)
            await browser.close()

asyncio.run(main())
