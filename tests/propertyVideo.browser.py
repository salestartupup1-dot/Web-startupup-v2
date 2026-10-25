"""Copy fixtures/property-video.js.txt to pages/__video-test.js in a disposable
checkout, then run this against its dev server. Never deploy the fixture page.
All YouTube/database requests are mocked; no production writes.
"""
import asyncio
import json
import os
from playwright.async_api import async_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3020')

def picture(width, height):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}"><rect width="100%" height="100%" fill="#356746"/></svg>'

async def run(browser, engine, scenario):
    page = await browser.new_page(viewport={'width': 390 if engine == 'webkit' else 1280, 'height': 6000 if scenario == 'before-hydration' else 900})
    calls, errors = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    if scenario == 'before-hydration':
        # A decoded placeholder before React attaches handlers must still fall back.
        await page.add_init_script('''window.addEventListener('load', e => {
          if(e.target.matches?.('.sp4-video-cover img')) e.stopImmediatePropagation();
        }, true);''')

    async def intercept(route):
        url = route.request.url
        if 'img.youtube.com/' in url:
            calls.append(url)
            good = scenario == 'maxres' or (scenario in ['hq', 'before-hydration'] and 'hqdefault.jpg' in url)
            await route.fulfill(status=200, body=picture(640, 360) if good else picture(120, 90), content_type='image/svg+xml')
        elif 'youtube-nocookie.com/embed/' in url:
            await route.fulfill(content_type='text/html', body='<title>Mock video player</title>')
        elif scenario == 'no-images' and '/featured/singlehouse.jpg' in url:
            await route.fulfill(status=503, body='unavailable')
        elif url.startswith(BASE):
            if scenario == 'before-hydration' and route.request.resource_type == 'script':
                await asyncio.sleep(0.8)
            await route.continue_()
        else:
            await route.abort()

    await page.route('**/*', intercept)
    await page.goto(BASE + '/__video-test', wait_until='domcontentloaded')
    button = page.get_by_role('button', name='เล่นวิดีโอแนะนำบ้าน', exact=True)
    await button.scroll_into_view_if_needed()
    image = button.locator('img')
    if scenario == 'no-images':
        await expect(image).to_have_count(0)
        await expect(button).to_contain_text('กดเพื่อเล่นวิดีโอแนะนำบ้าน')
        assert len(calls) <= 4, calls
    else:
        expected = 'maxresdefault.jpg' if scenario == 'maxres' else 'singlehouse.jpg' if scenario == 'house-poster' else 'hqdefault.jpg'
        await expect(image).to_have_attribute('src', __import__('re').compile(expected))
        await page.wait_for_function('''() => {
          const image = document.querySelector('.sp4-video-cover img');
          return image?.complete && image.naturalWidth > 120;
        }''')
        assert len(calls) <= 3, calls
    link = page.get_by_role('link', name='เปิดวิดีโอบน YouTube')
    await expect(link).to_have_attribute('href', 'https://www.youtube.com/watch?v=video-test1')
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.sp4-video iframe')).to_have_attribute('src', __import__('re').compile('/embed/video-test1\\?autoplay=1'))
    await page.get_by_role('button', name='Switch house').click()
    await expect(page.locator('.sp4-video iframe')).to_have_count(0)
    await expect(page.get_by_role('button', name='เล่นวิดีโอแนะนำบ้าน', exact=True)).to_be_visible()
    await expect(link).to_have_attribute('href', 'https://www.youtube.com/watch?v=video-test2')
    assert not errors, errors
    print(json.dumps({'engine':engine,'scenario':scenario,'passed':True}), flush=True)
    await page.close()

async def main():
    async with async_playwright() as p:
        for engine in [p.chromium, p.webkit]:
            browser = await engine.launch(headless=True, **({'channel':'msedge'} if engine.name=='chromium' else {}))
            for scenario in ['maxres', 'hq', 'before-hydration', 'house-poster', 'no-images']:
                await run(browser, engine.name, scenario)
            await browser.close()

asyncio.run(main())
