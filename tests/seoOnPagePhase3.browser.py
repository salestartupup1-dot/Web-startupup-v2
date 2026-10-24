"""Phase 3 checks against a local public-data snapshot, without production writes."""
import html,json,os,re,urllib.request,urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('SITE_TEST_BASE_URL','http://localhost:3031')
LEGACY='/'+urllib.parse.quote('บ้านที่ขายแล้ว')
SOLD='/?tab=portfolio'
HOME_H1='จุดเริ่มต้นของคนอยากมีบ้าน'
def fetch(path):
    with urllib.request.urlopen(BASE+path,timeout=60) as response:return response.read().decode('utf-8')
def canonical(body):return html.unescape(re.search(r'<link[^>]*rel="canonical"[^>]*href="([^"]+)"',body).group(1))
def meta(body,name):return html.unescape(re.search(r'<meta[^>]*name="'+name+r'"[^>]*content="([^"]+)"',body).group(1))
def links(body):return [html.unescape(value) for value in re.findall(r'<a\b[^>]*href="([^"]+)"',body)]
def heading(p):return ' '.join(str(v).strip() for v in [p.get('category'),p.get('project_name'),re.sub(r'^(?:อำเภอ|อ\.|เขต)\s*','',p.get('district',''))] if v)
data=json.loads(fetch('/api/public-data'))
public=[p for p in data['properties'] if not p.get('property_owner') or p.get('property_owner')=='Startup Up']
sold=[p for p in public if p.get('inventoryState')=='sold' or p.get('badge')=='Sold Out']
all_paths={p['canonicalPath'] for p in public if p.get('canonicalPath')}
home=fetch('/')
assert home.count('<h1')==1 and HOME_H1 in re.search(r'<h1[^>]*>(.*?)</h1>',home,re.S).group(1)
assert links(home).count(SOLD)>=2
for img in re.findall(r'<img\b[^>]*>',home):assert re.search(r'\balt="[^"]*"',img),img
first,second=fetch(SOLD),fetch(SOLD+'&page=2')
assert first.count('<h1')==1 and f'({len(sold)} หลัง)' in re.sub(r'<!--.*?-->','',first)
assert meta(first,'robots')==meta(second,'robots')=='index,follow'
assert canonical(first)==BASE+SOLD and canonical(second)==BASE+SOLD+'&page=2'
assert set(links(first))&all_paths=={p['canonicalPath'] for p in sold[:20]}
assert set(links(second))&all_paths=={p['canonicalPath'] for p in sold[20:40]}
assert 'ภาพบ้านที่ขายแล้ว' in first and 'ก่อนรีโนเวท' not in first
groups=[json.loads(s) for s in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',first,re.S)]
schemas=[s for group in groups for s in (group if isinstance(group,list) else [group])]
collection=next(s for s in schemas if s.get('@type')=='CollectionPage')
assert collection['mainEntity']['numberOfItems']==len(sold)
assert len(collection['mainEntity']['itemListElement'])==20
sitemap=fetch('/sitemap.xml')
assert BASE+SOLD in html.unescape(sitemap)
assert BASE+LEGACY not in sitemap
with urllib.request.urlopen(BASE+LEGACY+'?page=2') as redirected:
    assert urllib.parse.parse_qs(urllib.parse.urlsplit(redirected.url).query)=={'tab':['portfolio'],'page':['2']}
assert all(BASE+p['canonicalPath'] not in sitemap for p in sold)
chosen=[]
for state in ['available','sold','reserved']:
    p=next(p for p in public if p.get('inventoryState')==state and p.get('district') and p.get('canonicalPath'))
    chosen.append(p)
    body=fetch(p['canonicalPath'])
    assert body.count('<h1')==1
    assert html.unescape(re.search(r'<h1[^>]*>(.*?)</h1>',body,re.S).group(1))==heading(p)
    assert canonical(body)==BASE+p['canonicalPath']
    assert meta(body,'robots')==('index,follow' if state=='available' else 'noindex,follow')
    assert 'RealEstateListing' in body
print(f'PASS SSR: home/house H1, image alt, {len(sold)} sold homes, page 2, schema, sitemap and individual noindex',flush=True)

output=Path(os.environ.get('TEMP','.'))/'startupup-seo-phase3';output.mkdir(exist_ok=True)
with sync_playwright() as playwright:
    for engine,mobile in [(playwright.chromium,False),(playwright.webkit,True)]:
        browser=engine.launch(channel='msedge' if engine.name=='chromium' else None)
        context=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000},is_mobile=mobile,has_touch=mobile)
        def intercept(route):
            url=route.request.url
            if '/api/property?' in url:
                query=urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)
                key=query.get('documentId',query.get('property',['']))[0]
                p=next((p for p in data['properties'] if p['id']==key or p.get('custom_id')==key),None)
                route.fulfill(status=200 if p else 404,json={'property':p})
            elif '/api/contact/' in url or '/api/line/' in url:route.fulfill(status=200,json={'ok':True})
            elif url.startswith(BASE) or any(host in url for host in ['res.cloudinary.com','fonts.googleapis.com','fonts.gstatic.com']):route.continue_()
            else:route.abort()
        context.route('**/*',intercept)
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+SOLD,wait_until='domcontentloaded')
        expect(page.locator('#sold-homes-title')).to_contain_text(f'({len(sold)} หลัง)')
        expect(page.locator('h1')).to_contain_text('ผลงานบ้านมือสองรีโนเวท')
        expect(page.get_by_role('heading',name='อัลบั้มผลงาน',exact=True)).to_be_visible()
        expect(page.locator('main article')).to_have_count(20)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
        page.screenshot(path=str(output/('sold-mobile.png' if mobile else 'sold-desktop.png')))
        nav=page.get_by_role('navigation',name='แบ่งหน้ารายการ')
        nav.get_by_role('link',name='หน้าถัดไป',exact=True).click()
        page.wait_for_url(BASE+SOLD+'&page=2'); expect(nav.locator('[aria-current="page"]')).to_have_text('2')
        page.reload(wait_until='domcontentloaded');expect(nav.locator('[aria-current="page"]')).to_have_text('2')
        page.locator('main article a').first.click()
        page.wait_for_url(BASE+sold[20]['canonicalPath'])
        expect(page.locator('h1')).to_have_text(heading(sold[20]))
        expect(page.locator('meta[name="robots"]')).to_have_attribute('content','noindex,follow')
        page.go_back(wait_until='domcontentloaded');page.wait_for_url(BASE+SOLD+'&page=2')
        expect(nav.locator('[aria-current="page"]')).to_have_text('2')
        page.goto(BASE+'/',wait_until='domcontentloaded')
        expect(page.locator('h1')).to_have_text(HOME_H1)
        assert page.locator('img:not([alt])').count()==0
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
        page.screenshot(path=str(output/('home-mobile.png' if mobile else 'home-desktop.png')))
        if mobile:
            page.emulate_media(reduced_motion='reduce')
            expect(page.locator('#mobile-home-title')).to_have_text(HOME_H1)
            assert page.locator('h1').count()==1 and page.locator('img:not([alt])').count()==0
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
            page.emulate_media(reduced_motion='no-preference')
        footer=page.get_by_role('navigation',name='ค้นหาบ้านตามประเภทและงบประมาณท้ายเว็บ')
        footer.get_by_role('link',name='บ้านที่ขายแล้ว',exact=True).click()
        page.wait_for_url(BASE+SOLD)
        expect(page.locator('#sold-homes-title')).to_contain_text('บ้านที่ขายแล้ว')
        expect(page.locator('h1')).to_have_count(1)
        browser.close()
        offline=['127.0.0.1:8093','localhost:8093','127.0.0.1:9097/identitytoolkit.googleapis.com/','auth/network-request-failed']
        assert not [e for e in errors if not any(marker in e for marker in offline)],errors
print('PASS desktop Chromium/mobile WebKit: sold navigation, detail noindex, Back, both home modes, alt and layout',flush=True)
