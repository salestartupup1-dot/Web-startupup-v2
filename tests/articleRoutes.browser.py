"""Verify the real article URL migration, including redirects and preserved assets.
Local article pages use static content only; no catalogue/database requests.
"""
import html
import json
import os
import re
from urllib.request import urlopen, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError
from urllib.parse import quote, urlparse, parse_qs, unquote
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3023')
OLD = '/' + quote('บทความ')
NEW = '/articles'
SLUG = quote('เงินเดือน-กู้บ้าน')

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs): return None

def read(path):
    with urlopen(BASE + path, timeout=60) as response:
        assert response.status == 200
        return response.read().decode('utf-8')

opener = build_opener(NoRedirect)
for old, new in [(OLD, NEW), (OLD + '/' + SLUG, NEW + '/' + SLUG),
                 (OLD.lower(), NEW), (OLD.lower() + '/' + SLUG.lower(), NEW + '/' + SLUG)]:
    try:
        opener.open(BASE + old + '?utm_source=old-link&campaign=article', timeout=60)
        raise AssertionError('Expected a permanent redirect')
    except HTTPError as error:
        assert error.code == 308, (old, error.code)
        location = urlparse(error.headers['Location'])
        assert unquote(location.path) == unquote(new), error.headers['Location']
        assert parse_qs(location.query) == {'utm_source':['old-link'],'campaign':['article']}
print('PASS old index/article URLs: permanent redirect, one hop, tracking preserved', flush=True)

index = read(NEW)
paths = list(dict.fromkeys(re.findall(r'<a\b[^>]*\bhref="(/articles/[^"#]+)"', index)))
assert len(paths) == 20, len(paths)
for path in [NEW, *paths]:
    body = read(path)
    assert body.count('<h1') == 1, path
    canonical = html.unescape(re.search(r'<link[^>]*rel="canonical"[^>]*href="([^"]+)"', body).group(1))
    assert unquote(urlparse(canonical).path) == unquote(path), canonical
    assert OLD not in body and 'href="/บทความ' not in body, path
    for raw in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', body, re.S):
        schema = json.loads(raw)
        assert '/บทความ/' not in json.dumps(schema, ensure_ascii=False)
print('PASS new index and all 20 articles: content, canonical URLs, internal links and schema', flush=True)
with urlopen(BASE + '/articles/fees.svg', timeout=30) as response:
    assert response.status == 200 and 'image/svg+xml' in response.headers['Content-Type']
try:
    urlopen(BASE + '/articles/not-a-real-article', timeout=30)
    raise AssertionError('Invalid article should not exist')
except HTTPError as error: assert error.code == 404
print('PASS existing article cover URLs and missing-article behavior', flush=True)

with sync_playwright() as p:
    for engine in [p.chromium, p.webkit]:
        browser = engine.launch(headless=True, **({'channel':'msedge'} if engine.name=='chromium' else {}))
        page = browser.new_page(viewport={'width':390 if engine.name=='webkit' else 1440,'height':900})
        stock, errors = [], []
        def intercept(route):
            url = route.request.url
            if '/api/public-data' in url or '/api/property?' in url or 'firestore.googleapis.com' in url:
                stock.append(url); route.abort()
            elif url.startswith(BASE) or any(host in url for host in ['res.cloudinary.com','fonts.googleapis.com','fonts.gstatic.com']): route.continue_()
            else: route.abort()
        page.route('**/*', intercept)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(BASE + OLD, wait_until='domcontentloaded')
        assert urlparse(page.url).path == NEW, page.url
        expect(page.locator('main h1')).to_have_count(1)
        header = page.locator('header').first
        if engine.name=='webkit': header.get_by_role('button',name='เมนู',exact=True).click()
        expect(header.get_by_role('link',name='บทความ',exact=True)).to_have_attribute('href', NEW)
        page.goto(BASE + OLD + '/' + SLUG + '?utm_source=bookmark#questions', wait_until='domcontentloaded')
        final = urlparse(page.url)
        assert unquote(final.path) == unquote(NEW + '/' + SLUG)
        assert parse_qs(final.query) == {'utm_source':['bookmark']} and final.fragment == 'questions'
        expect(page.locator('main h1')).to_have_count(1)
        assert not stock, stock
        assert not errors, errors
        print(json.dumps({'engine':engine.name,'old_bookmarks_work':True,'new_url':True,'passed':True}),flush=True)
        browser.close()
