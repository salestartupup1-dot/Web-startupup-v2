"""Sale hero refresh/cache/error regression. Database and failure responses are mocked."""
import base64
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3000')
ORIGINAL = 'https://res.cloudinary.com/test/image/upload/house.jpg'
IMAGE = Path('public/featured/singlehouse.jpg').read_bytes()
CACHED = 'data:image/jpeg;base64,' + base64.b64encode(IMAGE).decode()

def field(value):
    if isinstance(value, int): return {'integerValue': str(value)}
    if isinstance(value, list): return {'arrayValue': {'values': [field(v) for v in value]}}
    return {'stringValue': value}

def visible_hero(page):
    page.wait_for_function("""() => {
        const img = document.querySelector('.sp4-hero');
        return img?.complete && img.naturalWidth > 0 && getComputedStyle(img).visibility === 'visible'
            && !document.querySelector('.sp4-skel-hero');
    }""")
    expect(page.locator('.sp4-hero')).to_be_visible()

with sync_playwright() as p:
    for engine in [p.chromium, p.webkit]:
        browser = engine.launch(headless=True, **({'channel': 'msedge'} if engine.name == 'chromium' else {}))
        for scenario in ['cached', 'fallback', 'retry']:
            context = browser.new_context(viewport={'width': 390 if engine.name == 'webkit' else 1440, 'height': 900})
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            house = {'id': 'hero-test', 'custom_id': 'hero-test', 'project_name': 'Hero test',
                     'price': 2500000, 'category': 'บ้านเดี่ยว', 'property_owner': 'Startup Up',
                     'images': [CACHED if scenario == 'cached' else ORIGINAL, '/featured/twinhouse.jpg']}
            document = {'name': 'docs/hero-test', 'fields': {k: field(v) for k, v in house.items()}}
            state = {'fail_original': scenario == 'retry'}
            def route_request(route):
                url = route.request.url
                if '/api/public-data' in url:
                    route.fulfill(json={'properties': [house], 'company': None, 'visual': None, 'popup': None})
                elif 'firestore.googleapis.com' in url and '/properties/hero-test' in url:
                    route.fulfill(json=document)
                elif 'firestore.googleapis.com' in url and ':runQuery' in url:
                    route.fulfill(json=[{'document': document}])
                elif url == ORIGINAL and not state['fail_original']:
                    route.fulfill(body=IMAGE, content_type='image/jpeg')
                elif 'res.cloudinary.com/test/' in url:
                    route.fulfill(status=503, body='Temporary image failure')
                elif url.startswith(BASE): route.continue_()
                else: route.abort()
            page.route('**/*', route_request)
            if scenario == 'cached':
                # Warm decoded image data before mounting React. Ignore its load event to
                # cover completion before a listener is attached, not just a cold network load.
                page.add_init_script(script=f"new Image().src = {CACHED!r};")
                page.add_init_script(script="""window.addEventListener('load', event => {
                    if (event.target.matches?.('.sp4-hero')) event.stopImmediatePropagation();
                }, true);""")
            page.goto(BASE + '/?property=hero-test')
            if scenario == 'retry':
                expect(page.get_by_role('button', name='ลองโหลดรูปอีกครั้ง')).to_be_visible()
                state['fail_original'] = False
                page.get_by_role('button', name='ลองโหลดรูปอีกครั้ง').click()
            visible_hero(page)
            if scenario == 'fallback':
                assert page.locator('.sp4-hero').get_attribute('src') == ORIGINAL
            if scenario == 'cached':
                for _ in range(3):
                    page.reload()
                    visible_hero(page)
                page.get_by_role('button', name='รูปถัดไป', exact=True).click()
                expect(page.locator('.sp4-counter')).to_have_text('2 / 2')
                visible_hero(page)
                page.get_by_role('button', name='รูปก่อนหน้า', exact=True).click()
                expect(page.locator('.sp4-counter')).to_have_text('1 / 2')
                visible_hero(page)
            assert not errors, errors
            context.close()
            print(f'PASS {engine.name}: {scenario}', flush=True)
        browser.close()
