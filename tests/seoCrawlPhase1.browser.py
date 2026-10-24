"""Crawl/SSR navigation checks against a local snapshot preview; no production writes."""
import html, json, os, re, urllib.request, urllib.parse, urllib.error
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3031')
def fetch(path):
    with urllib.request.urlopen(BASE+path, timeout=60) as response: return response.read().decode('utf-8')
def props(body): return json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',body,re.S).group(1))['props']['pageProps']['initialData']
def links(body): return [html.unescape(href) for href in re.findall(r'<a\b[^>]*href="([^"]+)"',body)]
def canonical(body): return html.unescape(re.search(r'<link[^>]*rel="canonical"[^>]*href="([^"]+)"',body).group(1))
catalogue = json.loads(fetch('/api/public-data'))
public = [p for p in catalogue['properties'] if not p.get('property_owner') or p['property_owner'] == 'Startup Up']
paths = {p['canonicalPath'] for p in public if p.get('canonicalPath')}
first,second = fetch('/?tab=all'),fetch('/?tab=all&page=2')
cards1, cards2 = set(links(first)) & paths, set(links(second)) & paths
assert len(cards1) == len(cards2) == 20 and not cards1 & cards2
assert canonical(second) == BASE+'/?tab=all&page=2'
assert '/?tab=all&page=3' in links(second)
assert first.count('<h1') == second.count('<h1') == 1
assert 'บ้านมือสองรีโนเวท' in first
lam = '/' + urllib.parse.quote('บ้านมือสอง-ลำลูกกา')
body = fetch(lam)
expected = [p for p in public if p.get('district') == 'ลำลูกกา' and p.get('inventoryState') in ['available','renovating','backup'] and p.get('badge') != 'Sold Out']
assert set(links(body)) & paths == {p['canonicalPath'] for p in expected}
assert f'({len(expected)} รายการ)' in body
pathum = fetch('/'+urllib.parse.quote('บ้านรีโนเวท-ปทุมธานี'))
assert 'บ้านรีโนเวท ปทุมธานี' in re.search(r'<h1[^>]*>(.*?)</h1>',pathum,re.S).group(1)
assert 'บ้านรีโนเวท ปทุมธานี' in re.search(r'<title[^>]*>(.*?)</title>',pathum,re.S).group(1)
portfolio = fetch('/?tab=portfolio')
assert portfolio.count('<h1') == 1 and 'ผลงานบ้านมือสองรีโนเวท' in portfolio
album = next(y for y in catalogue['company']['portfolio_years'] if len(y.get('images',[])) > 20)
album_path = '/?tab=portfolio&page=2&year='+str(album['year'])
album_body = fetch(album_path)
assert props(album_body)['listing']['page'] == 2 and canonical(album_body) == BASE+album_path
assert 'Portfolio image 21' in album_body and 'Portfolio image 1"' not in album_body
for path in ['/?tab=all&page=9999','/?tab=all&page=0','/?tab=portfolio&year=unknown']:
    try: fetch(path)
    except urllib.error.HTTPError as error: assert error.code == 404
    else: raise AssertionError('Expected 404: '+path)
print(f'PASS raw SSR: 20 distinct cards/page, self canonicals, Lam Luk Ka {len(expected)}, portfolio album pages, real 404s',flush=True)

output=Path(os.environ.get('TEMP','.'))/'startupup-crawl-phase1';output.mkdir(exist_ok=True)
with sync_playwright() as playwright:
    for engine,mobile in [(playwright.chromium,False),(playwright.webkit,True)]:
        browser=engine.launch(channel='msedge' if engine.name=='chromium' else None)
        context=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000},is_mobile=mobile,has_touch=mobile)
        def intercept(route):
            url=route.request.url
            if '/api/property?' in url:
                key=urllib.parse.parse_qs(urllib.parse.urlsplit(url).query).get('documentId',[''])[0]
                route.fulfill(status=200,json={'property':next(p for p in catalogue['properties'] if p['id']==key)})
            elif '/api/contact/' in url or '/api/line/' in url: route.fulfill(status=200,json={'ok':True})
            elif url.startswith(BASE) or any(host in url for host in ['res.cloudinary.com','fonts.googleapis.com','fonts.gstatic.com']): route.continue_()
            else: route.abort()
        context.route('**/*',intercept)
        page=context.new_page();errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
        page.goto(BASE+'/?tab=all&page=2',wait_until='domcontentloaded')
        nav=page.get_by_role('navigation',name='แบ่งหน้ารายการ')
        expect(nav.locator('[aria-current="page"]')).to_have_text('2')
        page.reload(wait_until='domcontentloaded')
        expect(nav.locator('[aria-current="page"]')).to_have_text('2')
        nav.get_by_role('link',name='หน้าถัดไป',exact=True).click()
        page.wait_for_url(BASE+'/?tab=all&page=3')
        expect(nav.locator('[aria-current="page"]')).to_have_text('3')
        page.go_back(wait_until='domcontentloaded')
        expect(nav.locator('[aria-current="page"]')).to_have_text('2')
        page.get_by_role('button',name='ตัวกรอง',exact=True).click()
        page.get_by_label('ลำลูกกา',exact=True).check()
        expect(page.locator('h1')).to_contain_text('รายการ')
        page.wait_for_url(re.compile(r'.*area=.*'))
        assert 'page=2' not in page.url
        page.reload(wait_until='domcontentloaded')
        assert 'area=' in page.url and 'page=2' not in page.url
        page.goto(BASE+'/?tab=all&sort=price_desc&page=2',wait_until='domcontentloaded')
        expect(nav.locator('[aria-current="page"]')).to_have_text('2')
        assert 'sort=price_desc' in nav.get_by_role('link',name='หน้าถัดไป',exact=True).get_attribute('href')
        href=nav.get_by_role('link',name='หน้าถัดไป',exact=True).get_attribute('href')
        other=context.new_page();other.goto(BASE+href,wait_until='domcontentloaded')
        expect(other.locator('[aria-current="page"]')).to_have_text('3');other.close()
        page.goto(BASE+lam,wait_until='domcontentloaded')
        expect(page.locator('h1')).to_contain_text(f'({len(expected)} รายการ)')
        page.wait_for_function("""() => {
            let node = document.querySelector('h1');
            if (!node) return false;
            while (node) {
                if (Number(getComputedStyle(node).opacity) < 0.99) return false;
                node = node.parentElement;
            }
            return true;
        }""")
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.screenshot(path=str(output/('lam-mobile.png' if mobile else 'lam-desktop.png')))
        page.goto(BASE+album_path,wait_until='domcontentloaded')
        expect(nav.locator('[aria-current="page"]')).to_have_text('2')
        expect(page.locator('h1')).to_contain_text('ผลงานบ้านมือสองรีโนเวท')
        page.reload(wait_until='domcontentloaded');expect(nav.locator('[aria-current="page"]')).to_have_text('2')
        browser.close()
        # Snapshot preview deliberately has no Firebase auth/Firestore emulator.
        expected_offline = ['127.0.0.1:8093', 'localhost:8093', '127.0.0.1:9097/identitytoolkit.googleapis.com/', 'auth/network-request-failed']
        assert not [e for e in errors if not any(marker in e for marker in expected_offline)],errors
print('PASS Chromium + mobile WebKit: direct page 2, reload, next, Back, filters, sorted new tab, album paging',flush=True)
