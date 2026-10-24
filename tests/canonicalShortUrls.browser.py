"""Read-only release smoke test; clipboard is intercepted, Ads/lead calls blocked."""
import html, json, os, re, urllib.request, urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE=os.environ.get('SITE_TEST_BASE_URL','http://localhost:3026')
def property_heading(p):
    return ' '.join(str(v).strip() for v in [p.get('category'),p.get('project_name'),re.sub(r'^(?:อำเภอ|อ\.|เขต)\s*','',p.get('district',''))] if v)
def fetch(path):
    with urllib.request.urlopen(BASE+path,timeout=60) as r:return r.read().decode(),r.url
catalogue=json.loads(fetch('/api/public-data')[0])
properties=catalogue['properties']
assert all(p.get('canonicalPath','').startswith('/') and '-' in urllib.parse.unquote(p['canonicalPath']) and '/homes/' not in p['canonicalPath'] for p in properties)
assert len({p['canonicalPath'] for p in properties})==len(properties)
public=[p for p in properties if p.get('property_owner','Startup Up').replace(' ','').lower()=='startupup']
chosen=[next(p for p in public if p.get('inventoryState')==state) for state in ['available','reserved','sold']]
for p in chosen:
    path=p['canonicalPath'];body,url=fetch(path)
    assert url==BASE+path
    request=urllib.request.Request(BASE+'/api/property-share',data=json.dumps({'propertyId':p['id']}).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(request,timeout=60) as r: assert json.load(r)['path']==path
    data=json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',body,re.S).group(1))['props']['pageProps']['initialData']
    assert data['selectedProperty']['id']==p['id']
    assert f'href="https://www.startupup-real-estate.com{path}"' in body
    assert html.unescape(re.search(r'<h1[^>]*>(.*?)</h1>',body,re.S).group(1))==property_heading(p)
    assert format(int(str(data['selectedProperty']['price']).replace(',','')),',') in body
    for old in ['/h/'+p['id'],'/homes/old-name--'+p['id']]:
        assert fetch(old)[1]==BASE+path
    if p.get('custom_id'):
        assert fetch('/?property='+urllib.parse.quote(p['custom_id']))[1]==BASE+path
sitemap=fetch('/sitemap.xml')[0]
assert '/homes/' not in sitemap and '/h/' not in sitemap and '?property=' not in sitemap
for old,expected in [('/642467','/เจษฎา-4-38-59'),('/f35895','/ไทยสมบูรณ์-3-48-195'),('/44bd3d','/ไทยสมบรูณ์-2-34-74')]:
    assert urllib.parse.unquote(fetch(old)[1])==BASE+expected
print('PASS raw HTML: readable canonical URLs, metadata, headings, old short aliases, sitemap',flush=True)

with sync_playwright() as pw:
    for engine,mobile in [(pw.chromium,False),(pw.webkit,True)]:
        browser=engine.launch(channel='msedge' if engine.name=='chromium' else None,headless=True)
        ctx=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000},is_mobile=mobile,has_touch=mobile)
        def intercept(route):
            url=route.request.url
            if url.startswith(BASE) or any(h in url for h in ['res.cloudinary.com','fonts.googleapis.com','fonts.gstatic.com']):route.continue_()
            else:route.abort()
        ctx.route('**/*',intercept)
        ctx.add_init_script("""Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
          write:async items=>{window.__copied=await(await items[0].getType('text/plain')).text()},
          writeText:async text=>{window.__copied=text}
        }});""")
        page=ctx.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        p=chosen[0];target=BASE+p['canonicalPath']
        page.goto(target,wait_until='networkidle',timeout=60000)
        expect(page.locator('h1')).to_have_text(property_heading(p))
        page.locator('.sp4-share').click()
        page.wait_for_function('window.__copied === location.origin + location.pathname')
        assert page.url==target
        page.reload(wait_until='networkidle');expect(page.locator('h1')).to_have_text(property_heading(p))
        assert page.url==target
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        output=Path(os.environ.get('TEMP','.'))/'startupup-short-canonical';output.mkdir(exist_ok=True)
        page.screenshot(path=str(output/('mobile.png' if mobile else 'desktop.png')))
        page.goto(BASE+'/?tab=all',wait_until='networkidle',timeout=60000)
        link=page.locator('a[href="'+p['canonicalPath']+'"]').first
        expect(link).to_be_visible(timeout=15000);link.click()
        page.wait_for_url(target);expect(page.locator('h1')).to_have_text(property_heading(p))
        page.go_back(wait_until='domcontentloaded');expect(page.locator('h1.sp4-title')).to_have_count(0)
        page.go_forward(wait_until='domcontentloaded');expect(page.locator('h1')).to_have_text(property_heading(p))
        assert page.url==target
        # WebKit reports the intentionally blocked public Firestore listener as a pageerror.
        unexpected=[e for e in errors if not ('firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?' in e and 'access control checks' in e)]
        assert not unexpected,unexpected
        print('PASS',engine.name,'copy equals address bar; reload; listing; Back/Forward; compact heading',flush=True)
        browser.close()
