"""Real server/database reads while the browser's direct Firebase access is blocked."""
import os
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3003')
with sync_playwright() as p:
    for engine in [p.chromium, p.webkit]:
        browser = engine.launch(headless=True, **({'channel': 'msedge'} if engine.name == 'chromium' else {}))
        page = browser.new_page(viewport={'width': 390 if engine.name == 'webkit' else 1440, 'height': 900})
        if BASE.startswith('http://localhost:'):
            # Production CSP upgrades HTTP assets to HTTPS in WebKit. Local test
            # server has no TLS; preserve every other directive and production headers.
            def local_document(route):
                if route.request.resource_type != 'document':
                    return route.fallback()
                response = route.fetch()
                headers = dict(response.headers)
                headers['content-security-policy'] = headers.get('content-security-policy', '').replace('upgrade-insecure-requests', '')
                route.fulfill(response=response, headers=headers)
            page.route(BASE + '/**', local_document)
        page.route('**/*firestore.googleapis.com/**', lambda route: route.abort())
        # A unavailable full catalogue must not stop a valid individual property from opening.
        page.route('**/api/public-data*', lambda route: route.fulfill(status=503, json={'error': 'catalogue offline'}))
        responses = []
        page.on('response', lambda response: responses.append(response) if '/api/property?' in response.url else None)
        for slug in ['24-182', '5-557', '5-833']:
            page.goto(BASE + '/?property=' + slug, wait_until='domcontentloaded')
            expect(page.locator('.sp4-price')).to_be_visible(timeout=18000)
            expect(page.get_by_text('โหลดข้อมูลไม่สำเร็จ', exact=True)).to_have_count(0)
            assert responses[-1].status == 200
            assert responses[-1].headers.get('cache-control') == 'no-store'
            expected = responses[-1].json()['property']
            expect(page.locator('.sp4-masthead h1')).to_have_text(expected['project_name'])
            price = int(str(expected['price']).replace(',', ''))
            expect(page.locator('.sp4-price')).to_contain_text(format(price, ','))
            page.reload(wait_until='domcontentloaded')
            expect(page.locator('.sp4-price')).to_be_visible(timeout=18000)
            print(f'PASS {engine.name}: {slug} opens and reloads with direct Firebase blocked', flush=True)
        browser.close()
