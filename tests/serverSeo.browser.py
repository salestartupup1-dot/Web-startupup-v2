"""Read-only SSR, canonical, refresh and mobile checks against a local build."""
import html
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3024')

def fetch(path):
    with urllib.request.urlopen(BASE + path, timeout=90) as response:
        return response.url, response.read().decode(), response.headers

def page_data(body):
    return json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', body, re.S).group(1))['props']['pageProps']

def canonical(body):
    return html.unescape(re.search(r'<link rel="canonical" href="([^"]+)"', body).group(1))

target, house_html, headers = fetch('/?property=48-195')
property_data = page_data(house_html)['initialData']
house = property_data['selectedProperty']
assert '/homes/' in target
assert canonical(house_html).endswith(urllib.parse.urlsplit(target).path)
assert headers['Vercel-CDN-Cache-Control'] == 'no-store'
assert 'no-store' in headers['Cache-Control'] or headers['Cache-Control'] == 'no-cache, must-revalidate'
assert house['project_name'] in house_html.split('<script id="__NEXT_DATA__"')[0]
assert format(int(house['price']), ',') in house_html.split('<script id="__NEXT_DATA__"')[0]
assert re.search(r'<h1[^>]*>.*?' + re.escape(house['project_name']), house_html)
assert 'RealEstateListing' in house_html
assert fetch('/api/share?property=48-195')[0] == target
_, home_html, _ = fetch('/')
home_data = page_data(home_html)['initialData']
assert len(home_data['properties']) > 0
assert 'บ้านมือสองรีโนเวท' in home_html
assert '/homes/' in home_html.split('<script id="__NEXT_DATA__"')[0]
for slug in ['บ้านมือสอง-รังสิต', 'บ้านมือสอง-คลองหลวง', 'บ้านมือสอง-ลำลูกกา', 'บ้านมือสอง-ธัญบุรี', 'บ้านรีโนเวท-ปทุมธานี']:
    _, body, _ = fetch('/' + urllib.parse.quote(slug))
    data = page_data(body)
    assert data['initialData']['properties'], slug
    assert data['location']['title'] in body
    assert canonical(body).endswith('/' + urllib.parse.quote(slug))
    assert '/homes/' in body.split('<script id="__NEXT_DATA__"')[0]
_, sitemap, _ = fetch('/sitemap.xml')
urls = re.findall(r'<loc>(.*?)</loc>', sitemap)
assert len(urls) == len(set(urls))
assert not any('?property=' in url or '/api/share' in url for url in urls)
for path in ['/homes/invalid', '/homes/not-found--nonexistentSeoTestHouse', '/unknown-location-seo-test']:
    try:
        fetch(path)
        raise AssertionError(f'Expected 404: {path}')
    except urllib.error.HTTPError as error:
        assert error.code == 404
print('PASS raw HTML: house price/content/schema, old redirects, 5 locations, unique sitemap and true 404', flush=True)

output = Path(os.environ.get('TEMP', '.')) / 'startupup-seo-browser'
output.mkdir(exist_ok=True)
with sync_playwright() as playwright:
    for engine, mobile in [(playwright.chromium, False), (playwright.webkit, True)]:
        browser = engine.launch(channel='msedge' if engine.name == 'chromium' else None, headless=True)
        # The Playwright polling helper uses eval, which the production CSP blocks.
        # Bypass CSP in this isolated test context only; deployed headers are unchanged.
        context = browser.new_context(bypass_csp=True, viewport={'width': 390 if mobile else 1440, 'height': 844 if mobile else 1000}, is_mobile=mobile, has_touch=mobile)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        def intercept(route):
            url = route.request.url
            if '/api/public-data' in url:
                route.fulfill(json=home_data)
            elif 'firestore.googleapis.com' in url:
                route.fulfill(status=204 if route.request.method == 'OPTIONS' else 503, headers={
                    'access-control-allow-origin': BASE, 'access-control-allow-credentials': 'true',
                    'access-control-allow-methods': 'GET, POST, OPTIONS',
                    'access-control-allow-headers': route.request.headers.get('access-control-request-headers', '*')})
            elif url.startswith(BASE):
                if route.request.resource_type == 'document':
                    response = route.fetch()
                    response_headers = dict(response.headers)
                    response_headers['content-security-policy'] = response_headers.get('content-security-policy', '').replace('upgrade-insecure-requests', '').replace("script-src 'self'", "script-src 'self' 'unsafe-eval'")
                    route.fulfill(response=response, headers=response_headers)
                else:
                    route.continue_()
            elif any(host in url for host in ['res.cloudinary.com', 'fonts.googleapis.com', 'fonts.gstatic.com']):
                route.continue_()
            else:
                route.abort()
        page.route('**/*', intercept)
        page.goto(target, wait_until='domcontentloaded', timeout=90000)
        expect(page.locator('.sp4-title')).to_contain_text(house['project_name'])
        expect(page.locator('.sp4-price')).to_contain_text(format(int(house['price']), ','))
        page.wait_for_timeout(1500)
        assert '/homes/' in page.url
        page.reload(wait_until='domcontentloaded')
        expect(page.locator('.sp4-title')).to_contain_text(house['project_name'])
        page.screenshot(path=str(output / f'{engine.name}-house.png'))
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.goto(BASE + '/' + urllib.parse.quote('บ้านมือสอง-คลองหลวง'), wait_until='domcontentloaded')
        expect(page.get_by_role('heading', level=1)).to_contain_text('คลองหลวง')
        page.wait_for_function("document.querySelector('main article img')?.naturalWidth > 0", timeout=20000)
        page.screenshot(path=str(output / f'{engine.name}-location.png'))
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.goto(BASE, wait_until='domcontentloaded')
        expect(page.locator('.intro-lead')).to_contain_text('บ้านมือสองรีโนเวท')
        page.screenshot(path=str(output / f'{engine.name}-home.png'))
        page.get_by_role('button', name='ดูบ้านทั้งหมด', exact=True).first.click()
        page.wait_for_function("new URL(location.href).searchParams.get('tab') === 'all'")
        page.locator('main a[href^="/homes/"]').first.click()
        expect(page.locator('.sp4-price')).to_be_visible(timeout=20000)
        page.wait_for_function("location.pathname.startsWith('/homes/')")
        page.go_back(wait_until='domcontentloaded')
        page.wait_for_function("new URL(location.href).searchParams.get('tab') === 'all'")
        # WebKit reports deliberately blocked Firebase authentication/listen requests
        # as page errors. These simulated network errors are not application exceptions.
        app_errors = [error for error in errors if not ('googleapis.com' in error and 'access control checks' in error)]
        assert not app_errors, app_errors
        print(f'PASS {engine.name}: detail refresh, location page, home -> listing -> house -> Back, no hydration errors', flush=True)
        browser.close()
print(f'Screenshots: {output}', flush=True)
