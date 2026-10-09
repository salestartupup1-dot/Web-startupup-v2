"""Hold the detail API open to prove previews never display stale prices.

Run against a production build with SITE_TEST_BASE_URL=http://localhost:3004.
All house data is mocked; this test does not write production data.
"""
import asyncio
import json
import os
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from playwright.async_api import async_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3004')
HOUSE = {'id': 'preview-house', 'custom_id': '12-34', 'project_name': 'บ้านทดสอบความเร็ว',
         'house_number': '12/34', 'price': 2500000, 'bedrooms': 3, 'bathrooms': 2,
         'area_wah': 50, 'category': 'ทาวน์เฮาส์', 'property_owner': 'Startup Up',
         'images': ['/brand/line.png']}


async def run(browser, engine, scenario):
    context = await browser.new_context(viewport={'width': 390 if engine == 'webkit' else 1440, 'height': 900})
    page = await context.new_page()
    errors, requests = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    release, started = asyncio.Event(), asyncio.Event()

    async def route_request(route):
        url = route.request.url
        if '/api/public-data' in url:
            await route.fulfill(json={'properties': [{**HOUSE, 'price': 1890000, 'badge': 'Sold Out',
                                   'highlights': 'โปรโมชั่นเก่า 1,890,000'}],
                                   'company': None, 'visual': None, 'popup': None})
        elif '/api/property?' in url:
            requests.append(parse_qs(urlparse(url).query))
            started.set()
            await release.wait()
            if scenario == 'missing':
                await route.fulfill(status=404, json={'error': 'not found'})
            elif scenario == 'failure' and len(requests) == 1:
                await route.fulfill(status=503, json={'error': 'unavailable', 'retryable': False})
            else:
                await route.fulfill(json={'property': HOUSE})
        elif url.startswith(BASE):
            if engine == 'webkit' and route.request.resource_type == 'document':
                response = await route.fetch()
                headers = dict(response.headers)
                headers['content-security-policy'] = headers.get('content-security-policy', '').replace('upgrade-insecure-requests', '')
                await route.fulfill(response=response, headers=headers)
            else:
                await route.continue_()
        else:
            await route.abort()

    await page.route('**/*', route_request)
    await page.goto(BASE + '/?tab=all')
    await page.wait_for_load_state('networkidle')
    card = page.locator('a[href^="/api/share?property="]').filter(has_text=HOUSE['project_name']).first
    await expect(card).to_be_visible()
    await page.evaluate("""() => {
      document.addEventListener('click', () => window.previewClickAt = performance.now(), {once:true, capture:true});
      new MutationObserver(() => {
        if (document.querySelector('.sp4-title') && !window.previewMountedAt)
          window.previewMountedAt = performance.now();
      }).observe(document.body, {childList:true, subtree:true});
    }""")
    await card.click()
    await asyncio.wait_for(started.wait(), timeout=5)
    await expect(page.locator('.sp4-title')).to_be_visible(timeout=1500)
    assert await page.locator('.sp4-masthead').evaluate('(element) => getComputedStyle(element).opacity') == '1'
    await expect(page.locator('.sp4-shot')).to_have_count(1)
    await expect(page.locator('.sp4-price-pending')).to_have_text('กำลังตรวจสอบราคาล่าสุด…')
    await expect(page.locator('.sp4-price')).to_have_count(0)
    await expect(page.locator('.sp4-flag')).to_have_count(0)
    await expect(page.locator('.sp4-calculator-card input')).to_have_count(0)
    await expect(page.get_by_role('button', name='นัดเข้าชมบ้าน', exact=True)).to_be_disabled()
    assert '1,890,000' not in await page.locator('.sp4').inner_text()
    structured = await page.locator('script[type="application/ld+json"]').all_text_contents()
    assert not any('"Offer"' in value for value in structured), structured
    assert requests[0]['documentId'] == [HOUSE['id']]
    elapsed = await page.evaluate('window.previewMountedAt - window.previewClickAt')
    assert 0 <= elapsed < 1000, elapsed

    if scenario == 'back':
        await page.get_by_role('button', name='ย้อนกลับ', exact=True).click()
        await expect(page.locator('.sp4')).to_have_count(0)
    elif scenario == 'popstate':
        await page.evaluate("() => { history.pushState({}, '', '/?tab=all'); dispatchEvent(new PopStateEvent('popstate')); }")
        await expect(page.locator('.sp4')).to_have_count(0)
    if scenario == 'success':
        Path('coverage').mkdir(exist_ok=True)
        await page.screenshot(path=f'coverage/property-preview-{engine}.png')
    release.set()
    if scenario in ['back', 'popstate']:
        await page.wait_for_timeout(600)
        await expect(page.locator('.sp4')).to_have_count(0)
        assert 'property=' not in page.url
    elif scenario == 'missing':
        await expect(page.get_by_text('ไม่พบข้อมูล', exact=True)).to_be_visible()
        await expect(page.locator('.sp4')).to_have_count(0)
    else:
        if scenario == 'failure':
            await expect(page.get_by_text('โหลดข้อมูลไม่สำเร็จ', exact=True)).to_be_visible()
            await expect(page.locator('.sp4-price')).to_have_count(0)
            await page.get_by_role('button', name='ลองอีกครั้ง', exact=True).click()
        await expect(page.locator('.sp4-price')).to_contain_text('2,500,000')
        await expect(page.locator('.sp4-price-pending')).to_have_count(0)
        await expect(page.get_by_role('button', name='นัดเข้าชมบ้าน', exact=True)).to_be_enabled()
    assert not errors, errors
    print(json.dumps({'engine': engine, 'scenario': scenario, 'preview_ms': round(elapsed), 'passed': True}), flush=True)
    await context.close()


async def main():
    async with async_playwright() as p:
        for engine in [p.chromium, p.webkit]:
            browser = await engine.launch(headless=True, **({'channel': 'msedge'} if engine.name == 'chromium' else {}))
            for scenario in ['success', 'back', 'popstate', 'missing', 'failure']:
                await run(browser, engine.name, scenario)
            await browser.close()


asyncio.run(main())
