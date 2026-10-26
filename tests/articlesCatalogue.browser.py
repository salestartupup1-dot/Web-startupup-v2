"""Read-only localhost checks; never follow contact links or query production stock."""
import json,os,re,urllib.request,urllib.parse,html
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('SITE_TEST_BASE_URL','http://localhost:3031')
INDEX='/articles'
OUT=Path(os.environ['TEMP'])/'startupup-articles';OUT.mkdir(exist_ok=True)
def fetch(path):
    with urllib.request.urlopen(BASE+path,timeout=60) as response:return response.read().decode('utf-8')
index=fetch(INDEX)
paths=list(dict.fromkeys(re.findall(r'<a\b[^>]*\bhref="('+re.escape(INDEX)+r'/[^"#]+)"',index)))
assert len(paths)==20,len(paths)
sitemap=html.unescape(fetch('/sitemap.xml'))
for path in paths:
    body=fetch(path)
    data=json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',body,re.S).group(1))['props']['pageProps']['article']
    assert body.count('<h1')==1
    assert html.escape(data['title']) in body
    assert html.escape(data['introduction'][0]) in body
    assert BASE+path in sitemap,path
    assert re.search(r'<link[^>]*rel="canonical"[^>]*href="'+re.escape(BASE+path)+'"',body),path
    assert 'content="index,follow"' in body
    assert data['author']['displayName']=='ทีมงาน Startup Up'
    assert 'รูปที่ควรใส่' not in body
    for group in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',body,re.S):
        schemas=json.loads(group)
        for schema in schemas if isinstance(schemas,list) else [schemas]:
            if schema.get('@type')=='Article':
                assert schema['author']['@type']=='Organization'
                assert schema['publisher']['name']=='Startup Up'
                assert schema['image'].endswith('.jpg')
print('PASS all 20 SSR pages: body, metadata, canonical, author/schema and sitemap',flush=True)
with sync_playwright() as p:
    for engine,width in [(p.chromium,1440),(p.webkit,390)]:
        mobile=width<600
        browser=engine.launch(channel='msedge' if engine.name=='chromium' else None)
        context=browser.new_context(viewport={'width':width,'height':980 if not mobile else 844},is_mobile=mobile,has_touch=mobile)
        stock=[];errors=[]
        def route(r):
            url=r.request.url
            if '/api/public-data' in url or '/api/property?' in url or 'firestore.googleapis.com' in url:stock.append(url);r.abort()
            elif url.startswith(BASE) or 'fonts.googleapis.com' in url or 'fonts.gstatic.com' in url:r.continue_()
            else:r.abort()
        context.route('**/*',route)
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+INDEX,wait_until='networkidle')
        expect(page.locator('h1')).to_have_count(1)
        expect(page.locator('main ul > li article')).to_have_count(20)
        nav=page.get_by_role('navigation',name='เมนูเว็บไซต์')
        names=nav.get_by_role('link').all_text_contents()
        assert names.index('บทความ')==names.index('ผลงาน')+1,names
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.screenshot(path=str(OUT/('index-mobile.png' if mobile else 'index-desktop.png')),full_page=False)
        page.locator('#mortgage').scroll_into_view_if_needed()
        page.screenshot(path=str(OUT/('cards-mobile.png' if mobile else 'cards-desktop.png')))
        page.locator('#mortgage ul li').first.get_by_role('link').click()
        page.wait_for_load_state('networkidle')
        expect(page.locator('h1')).to_contain_text('กู้ซื้อบ้านมือสอง')
        expect(page.get_by_text('โดย ทีมงาน Startup Up',exact=True)).to_be_visible()
        toc=page.get_by_role('navigation',name='สารบัญบทความ')
        toc.locator('summary').click();expect(toc.get_by_role('link').first).to_be_visible()
        page.locator('#questions summary').first.focus();page.keyboard.press('Enter')
        expect(page.locator('#questions details').first).to_have_attribute('open','')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.goto(BASE+INDEX+'/'+urllib.parse.quote('เงินเดือน-กู้บ้าน'),wait_until='networkidle')
        expect(page.get_by_role('table')).to_have_count(1)
        assert '1,067,000 บาท' in page.get_by_role('table').inner_text()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert not stock,stock
        assert not errors,errors
        # Verify the actual website navigation, not just the article layout.
        page.goto(BASE+'/?tab=all',wait_until='networkidle')
        if mobile:
            page.locator('.v4-burger').click()
            menu=page.locator('#site-mobile-menu')
            expect(menu.get_by_role('link',name='บทความ',exact=True)).to_be_visible()
            sequence=menu.locator(':scope > button, :scope > a').all_text_contents()
            assert sequence.index('บทความ')==sequence.index('ผลงาน')+1,sequence
            menu.get_by_role('link',name='บทความ',exact=True).click()
        else:
            nav=page.get_by_role('navigation',name='เมนูหลัก')
            names=nav.locator(':scope > a').all_text_contents()
            assert names.index('บทความ')==names.index('ผลงาน')+1,names
            for size in [1025,1280,1440]:
                page.set_viewport_size({'width':size,'height':980})
                boxes=[item.bounding_box() for item in nav.locator(':scope > a').all()]
                assert all(b and b['x']>=0 and b['x']+b['width']<=size for b in boxes),(size,boxes)
            nav.get_by_role('link',name='บทความ',exact=True).click()
        page.wait_for_url(BASE+INDEX)
        expect(page.locator('h1')).to_contain_text('เลือกบ้าน')
        browser.close()
print('PASS desktop Chromium and mobile WebKit: cards, category anchors, reading, FAQ, tables, no stock requests',flush=True)
