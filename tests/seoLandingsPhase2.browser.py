"""Phase 2 SSR and browser checks against an isolated local stock snapshot."""
import html, json, os, re, urllib.request, urllib.parse, urllib.error
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE=os.environ.get('SITE_TEST_BASE_URL','http://localhost:3031')
def fetch(path):
    with urllib.request.urlopen(BASE+path,timeout=60) as response: return response.read().decode('utf-8')
def path(slug): return '/'+urllib.parse.quote(slug)
def links(body): return [html.unescape(value) for value in re.findall(r'<a\b[^>]*href="([^"]+)"',body)]
def meta(body,name): return html.unescape(re.search(r'<meta[^>]*name="'+name+r'"[^>]*content="([^"]+)"',body).group(1))
def canonical(body): return html.unescape(re.search(r'<link[^>]*rel="canonical"[^>]*href="([^"]+)"',body).group(1))
catalogue=json.loads(fetch('/api/public-data'))
properties=catalogue['properties']
ready=[p for p in properties if p.get('inventoryState')=='available' and p.get('badge')!='Sold Out' and p.get('property_owner','Startup Up') in ['','Startup Up']]
districts=['คลองหลวง','ธัญบุรี','ลำลูกกา','เมืองปทุมธานี','หนองเสือ','ลาดหลุมแก้ว','สามโคก']
def pathum(p): return p.get('district') in districts and p.get('province','ปทุมธานี') in ['','ปทุมธานี']
def priced(p,budget):
    try: return 0<float(str(p.get('price','')).replace(',',''))<=budget
    except ValueError: return False
pages=[
    ('ทาวน์เฮาส์มือสอง-ปทุมธานี',lambda p:p.get('category') in ['ทาวน์เฮาส์','ทาวน์เฮาส์หลังริม'] and pathum(p)),
    ('ทาวน์เฮาส์หลังริม-มือสอง',lambda p:p.get('category')=='ทาวน์เฮาส์หลังริม'),
    ('บ้านมือสอง-พฤกษา',lambda p:bool(re.match(r'^พฤกษา(?:วิลเลจ|วิลล์)?(?=$|\s|[0-9A-Za-z-])',p.get('project_name','')))),
    ('บ้านมือสอง-ไม่เกิน-2-ล้าน',lambda p:priced(p,2000000)),
    ('บ้านมือสอง-ไม่เกิน-2.5-ล้าน',lambda p:priced(p,2500000)),
    ('บ้านมือสอง-ไม่เกิน-3-ล้าน',lambda p:priced(p,3000000)),
    ('บ้านเดี่ยวมือสอง-ปทุมธานี',lambda p:p.get('category')=='บ้านเดี่ยว' and pathum(p)),
]
sitemap=fetch('/sitemap.xml')
sitemap_urls=[html.unescape(value) for value in re.findall(r'<loc>(.*?)</loc>',sitemap)]
assert len(sitemap_urls)==len(set(sitemap_urls))
all_house_paths={p['canonicalPath'] for p in properties if p.get('canonicalPath')}
for slug,predicate in pages:
    expected=sorted([p for p in ready if predicate(p)],key=lambda p:float(str(p['price']).replace(',','')))
    body=fetch(path(slug))
    assert canonical(body)==BASE+path(slug)
    assert body.count('<h1')==1 and f'({len(expected)} รายการ)' in body
    assert meta(body,'robots')==('index,follow' if len(expected)>=5 else 'noindex,follow')
    assert (BASE+path(slug) in sitemap_urls)==(len(expected)>=5),slug
    assert set(links(body))&all_house_paths=={p['canonicalPath'] for p in expected[:20]},slug
    groups=[json.loads(value) for value in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',body,re.S)]
    schemas=[schema for group in groups for schema in (group if isinstance(group,list) else [group])]
    collection=next(schema for schema in schemas if schema.get('@type')=='CollectionPage')
    assert collection['url']==canonical(body)
    assert collection['breadcrumb']['itemListElement'][-1]['item']==canonical(body)
    faq=next(schema for schema in schemas if schema.get('@type')=='FAQPage')
    for question in faq['mainEntity']:
        assert html.escape(question['name'],quote=False) in body
        assert html.escape(question['acceptedAnswer']['text'],quote=False) in body
    if len(expected)>20:
        second=fetch(path(slug)+'?page=2')
        assert canonical(second)==BASE+path(slug)+'?page=2'
        assert set(links(second))&all_house_paths=={p['canonicalPath'] for p in expected[20:40]}
    print(f'PASS SSR {slug}: {len(expected)} homes, matching cards/FAQ/schema/robots/sitemap',flush=True)
home=fetch('/')
for slug,_ in pages:
    assert links(home).count(path(slug))==2,slug # Homepage FAQ plus footer.
for slug in ['บ้านมือสอง-รังสิต','บ้านมือสอง-คลองหลวง','บ้านมือสอง-ลำลูกกา','บ้านมือสอง-ธัญบุรี','บ้านรีโนเวท-ปทุมธานี']:
    assert BASE+path(slug) in sitemap_urls
print('PASS homepage/footer crawlable links and existing location sitemap entries',flush=True)

output=Path(os.environ.get('TEMP','.'))/'startupup-seo-phase2';output.mkdir(exist_ok=True)
with sync_playwright() as playwright:
    for engine,mobile in [(playwright.chromium,False),(playwright.webkit,True)]:
        browser=engine.launch(channel='msedge' if engine.name=='chromium' else None)
        context=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000},is_mobile=mobile,has_touch=mobile)
        def intercept(route):
            url=route.request.url
            if '/api/contact/' in url or '/api/line/' in url: route.fulfill(status=200,json={'ok':True})
            elif url.startswith(BASE) or any(host in url for host in ['res.cloudinary.com','fonts.googleapis.com','fonts.gstatic.com']): route.continue_()
            else: route.abort()
        context.route('**/*',intercept)
        page=context.new_page(); errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
        page.goto(BASE+path('บ้านมือสอง-ไม่เกิน-2.5-ล้าน'),wait_until='domcontentloaded')
        expect(page.locator('h1')).to_contain_text('บ้านมือสองไม่เกิน 2.5 ล้าน')
        pagination=page.get_by_role('navigation',name='แบ่งหน้ารายการ')
        pagination.get_by_role('link',name='หน้าถัดไป',exact=True).click()
        page.wait_for_url(BASE+path('บ้านมือสอง-ไม่เกิน-2.5-ล้าน')+'?page=2')
        expect(pagination.locator('[aria-current="page"]')).to_have_text('2')
        page.reload(wait_until='domcontentloaded')
        expect(pagination.locator('[aria-current="page"]')).to_have_text('2')
        page.goto(BASE+path('บ้านเดี่ยวมือสอง-ปทุมธานี'),wait_until='domcontentloaded')
        expect(page.locator('h1')).to_contain_text('บ้านเดี่ยวมือสอง ปทุมธานี')
        expect(page.locator('meta[name="robots"]')).to_have_attribute('content','noindex,follow')
        page.wait_for_function("""() => { let node=document.querySelector('h1'); if(!node)return false;
          while(node){if(Number(getComputedStyle(node).opacity)<0.99)return false;node=node.parentElement;}return true;}""")
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
        page.screenshot(path=str(output/('landing-mobile.png' if mobile else 'landing-desktop.png')))
        faq=page.locator('details').first
        faq.locator('summary').scroll_into_view_if_needed(); faq.locator('summary').click()
        expect(faq).to_have_attribute('open','')
        page.screenshot(path=str(output/('faq-mobile.png' if mobile else 'faq-desktop.png')))
        footer=page.get_by_role('navigation',name='ค้นหาบ้านตามประเภทและงบประมาณท้ายเว็บ')
        footer.scroll_into_view_if_needed(); assert footer.locator('a').count()==8 # Seven collections and sold-home archive.
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
        page.screenshot(path=str(output/('footer-mobile.png' if mobile else 'footer-desktop.png')))
        page.goto(BASE+'/',wait_until='domcontentloaded')
        browse=page.get_by_role('navigation',name='ค้นหาบ้านตามประเภทและงบประมาณ',exact=True)
        browse.scroll_into_view_if_needed()
        browse.get_by_role('link',name='บ้านมือสอง พฤกษา',exact=True).click()
        page.wait_for_url(BASE+path('บ้านมือสอง-พฤกษา'))
        expect(page.locator('h1')).to_contain_text('บ้านมือสอง พฤกษา')
        page.go_back(wait_until='domcontentloaded'); page.wait_for_url(BASE+'/')
        browser.close()
        expected_offline=['127.0.0.1:8093','localhost:8093','127.0.0.1:9097/identitytoolkit.googleapis.com/','auth/network-request-failed']
        assert not [error for error in errors if not any(marker in error for marker in expected_offline)],errors
print('PASS desktop Chromium/mobile WebKit: decimal path, pagination/reload, noindex, FAQ, footer, home links and Back',flush=True)
