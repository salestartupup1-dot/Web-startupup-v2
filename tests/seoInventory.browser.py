"""Local SEO smoke tests. No writes to stock or real ad conversions."""
import json, re, os, html, urllib.request, urllib.parse, urllib.error
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('SITE_TEST_BASE_URL','http://localhost:3026')
def fetch(path):
    req=urllib.request.Request(BASE+path,headers={'User-Agent':'Googlebot'})
    with urllib.request.urlopen(req,timeout=40) as r:return r.read().decode(),r.url

def data(body):return json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',body,re.S).group(1))['props']['pageProps']['initialData']
body,_=fetch('/api/public-data'); catalogue=json.loads(body)
# Select actual website-owned records; never edit live inventory to test a state.
public=[p for p in catalogue['properties'] if p.get('property_owner','Startup Up').lower().replace(' ','')=='startupup']
chosen=[]
for state in ['available','reserved','sold']:
    chosen.append(next(p for p in public if p['inventoryState']==state and p.get('custom_id')))
paths=[]
for p in chosen:
    body,url=fetch('/?property='+urllib.parse.quote(p['custom_id']))
    state=data(body)['selectedProperty']['inventoryState']
    assert state==p['inventoryState']
    raw=re.sub(r'<script.*?</script>|<style.*?</style>','',body,flags=re.S)
    assert len(re.findall(r'<h1\b',raw))==1
    assert format(int(str(p['price']).replace(',','')),',') in raw
    assert 'sp4-breadcrumb' in raw and 'ประมาณการผ่อนบ้าน' in raw
    assert ('noindex,follow' in body)==(state in ['reserved','sold'])
    schemas=[json.loads(s) for s in re.findall(r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',body,re.S)]
    assert schemas
    paths.append(urllib.parse.urlsplit(url).path)
for slug in ['บ้านมือสอง-คลองหลวง','บ้านมือสอง-ลำลูกกา']:
    body,_=fetch('/'+urllib.parse.quote(slug));assert '<h1' in body and 'ราคาเริ่มต้น' in body
    assert body.count('<summary>')==5
sitemap,_=fetch('/sitemap.xml');urls=re.findall(r'<loc>(.*?)</loc>',sitemap)
assert len(urls)==len(set(urls));assert '?property=' not in sitemap
for p in chosen[1:]:assert p['id'] not in sitemap
for tab in ['all','promo','location','calculator','portfolio']:
    body,_=fetch('/?tab='+tab);assert data(body)['activeTab']==tab
try:fetch('/homes/missing--seoUnknownProperty')
except urllib.error.HTTPError as e:assert e.code==404 and 'ค้นหาบ้านตามทำเล' in e.read().decode()
else:raise AssertionError('Expected 404')
print('PASS raw HTML: 3 stock states, 2 locations, 5 legacy tabs, sitemap, 404',flush=True)
output=Path(os.environ.get('TEMP','.'))/'startupup-seo-local';output.mkdir(exist_ok=True)
with sync_playwright() as p:
    for engine,mobile in [(p.chromium,False),(p.webkit,True)]:
        browser=engine.launch(channel='msedge' if engine.name=='chromium' else None,headless=True)
        ctx=browser.new_context(bypass_csp=True,viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000},is_mobile=mobile,has_touch=mobile)
        def intercept(route):
            url=route.request.url
            if '/line/go' in url:route.fulfill(status=200,body='Local contact test')
            elif '/api/contact/' in url or '/api/line/' in url:route.fulfill(status=200,json={'ok':True})
            elif url.startswith(BASE):
                if route.request.resource_type=='document':
                    response=route.fetch();headers=dict(response.headers);headers.pop('content-security-policy',None);route.fulfill(response=response,headers=headers)
                else:route.continue_()
            elif any(host in url for host in ['res.cloudinary.com','fonts.googleapis.com','fonts.gstatic.com']):route.continue_()
            else:route.abort()
        ctx.route('**/*',intercept)
        page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+paths[0],wait_until='networkidle',timeout=60000)
        expect(page.locator('.sp4-availability')).to_have_text('พร้อมขาย')
        assert page.locator('.sp4-related a.sp4-pcard').count()<=6
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.screenshot(path=str(output/('house-mobile.png' if mobile else 'house-desktop.png')))
        # Observe the exact queued Google event, without transmitting test leads to Ads.
        page.evaluate("window.__events=[];window.gtag=(...args)=>window.__events.push(args)")
        with page.expect_popup() as popup:
            page.locator('a.sp4-act.line').click()
        popup.value.close()
        assert page.evaluate("window.__events.some(e=>e[0]==='event' && e[1]==='ads_conversion___1')")
        page.evaluate("window.__events=[]")
        page.locator('.sp4-act.call').click(modifiers=['Control'])
        assert page.evaluate("window.__events.some(e=>e[1]==='ads_conversion___1')")
        page.goto(BASE+'/'+urllib.parse.quote('บ้านมือสอง-ลำลูกกา'),wait_until='networkidle',timeout=60000)
        expect(page.locator('h1')).to_contain_text('ลำลูกกา')
        expect(page.locator('text=เรียงตาม:')).to_be_visible()
        summaries=page.locator('summary');assert summaries.count()==5
        summaries.nth(0).click();expect(page.locator('details').nth(0)).to_have_attribute('open','')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.screenshot(path=str(output/('location-mobile.png' if mobile else 'location-desktop.png')),full_page=True)
        # A full-page house navigation and Back must keep the location list intact.
        house_href=page.locator('a[href]').evaluate_all("els=>els.map(e=>e.getAttribute('href')).find(h=>/^\\/[a-f0-9]{6}$/.test(h))")
        house_link=page.locator('a[href="'+house_href+'"]').first if house_href else page.locator('a[data-no-property]')
        if house_link.count():
            house_link.click();expect(page.locator('.sp4-title')).to_be_visible(timeout=20000)
            page.wait_for_url(BASE+house_href,timeout=20000)
            page.go_back(wait_until='domcontentloaded');expect(page.locator('h1')).to_contain_text('ลำลูกกา')
        assert not errors,errors
        print('PASS browser',engine.name,'mobile' if mobile else 'desktop','contact events, FAQ, navigation, overflow',flush=True)
        browser.close()
print('Screenshots:',output,flush=True)
