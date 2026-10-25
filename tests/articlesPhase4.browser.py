"""Read-only article checks on the isolated localhost preview; no live database writes."""
import html,json,os,re,urllib.request,urllib.parse,urllib.error
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('SITE_TEST_BASE_URL','http://localhost:3031')
INDEX='/articles'
ARTICLE=INDEX+'/'+urllib.parse.quote('ลดค่าโอน-บ้านมือสอง')
def fetch(path):
    with urllib.request.urlopen(BASE+path,timeout=60) as response:return response.read().decode('utf-8')
body=fetch(ARTICLE)
data=json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',body,re.S).group(1))['props']['pageProps']['article']
assert body.count('<h1')==1 and html.escape(data['title']) in body
assert html.unescape(re.search(r'<link[^>]*rel="canonical"[^>]*href="([^"]+)"',body).group(1))==BASE+ARTICLE
robots=re.search(r'<meta[^>]*name="robots"[^>]*content="([^"]+)"',body).group(1)
assert robots==('index,follow' if data['author'] else 'noindex,follow')
groups=[json.loads(s) for s in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',body,re.S)]
schemas=[item for group in groups for item in (group if isinstance(group,list) else [group])]
schema=next((s for s in schemas if s.get('@type')=='Article'),None)
if data['author']:
    organization={'@type':'Organization','name':'Startup Up','url':'https://www.startupup-real-estate.com'}
    assert schema['author']==organization and schema['publisher']==organization
    assert schema['datePublished']==data['datePublished']
else:assert schema is None
assert '59,600' in body and '200' in body and '400' in body
assert 'รูปที่ควรใส่' not in body
assert ARTICLE in fetch(INDEX) and ARTICLE in fetch('/')
sitemap=html.unescape(fetch('/sitemap.xml'))
assert (BASE+ARTICLE in sitemap)==bool(data['author'])
try:fetch(INDEX+'/missing-article')
except urllib.error.HTTPError as error:assert error.code==404
else:raise AssertionError('Unknown article must return 404')
print('PASS SSR: full article HTML, metadata, canonical, byline/schema gate, table, home links and sitemap',flush=True)

output=Path(os.environ['TEMP'])/'startupup-articles';output.mkdir(exist_ok=True)
with sync_playwright() as p:
    for engine,mobile in [(p.chromium,False),(p.webkit,True)]:
        browser=engine.launch(channel='msedge' if engine.name=='chromium' else None)
        context=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000},is_mobile=mobile,has_touch=mobile)
        stock_calls=[]
        def intercept(route):
            url=route.request.url
            if '/api/public-data' in url or '/api/property?' in url or 'firestore.googleapis.com' in url:stock_calls.append(url);route.abort()
            elif '/api/contact/' in url or '/api/line/' in url:route.abort()
            elif url.startswith(BASE) or 'fonts.googleapis.com' in url or 'fonts.gstatic.com' in url:route.continue_()
            else:route.abort()
        context.route('**/*',intercept)
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+INDEX,wait_until='networkidle')
        expect(page.locator('h1')).to_have_count(1)
        page.get_by_role('link',name='อ่านบทความ',exact=True).click()
        page.wait_for_url(BASE+ARTICLE);page.wait_for_load_state('networkidle')
        expect(page.locator('h1')).to_have_text(data['title'])
        expect(page.get_by_text('โดย ทีมงาน Startup Up',exact=True)).to_be_visible()
        expect(page.locator('meta[name="robots"]')).to_have_attribute('content','index,follow')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.screenshot(path=str(output/('article-mobile.png' if mobile else 'article-desktop.png')))
        toc=page.get_by_role('navigation',name='สารบัญบทความ')
        toc.locator('summary').click()
        toc.get_by_role('link',name='ตัวอย่างบ้าน 2 ล้านบาท ประหยัดค่าธรรมเนียมเท่าไหร่',exact=True).click()
        expect(page.get_by_role('table')).to_be_visible()
        page.get_by_role('table').screenshot(path=str(output/('fees-mobile.png' if mobile else 'fees-desktop.png')))
        faq=page.locator('#questions details').first
        faq.locator('summary').focus();page.keyboard.press('Enter')
        expect(faq).to_have_attribute('open','')
        expect(faq.locator('p')).to_be_visible()
        expect(page.get_by_role('link',name='คุยกับเราทาง LINE',exact=True)).to_have_attribute('href','/line/go?via=website')
        expect(page.get_by_role('link',name='โทร 062-478-2426',exact=True).first).to_have_attribute('href','tel:0624782426')
        assert not stock_calls,stock_calls
        assert not errors,errors
        browser.close()
print('PASS Chromium/mobile WebKit: index to article, readable layout, TOC, table, keyboard FAQ, contact URLs, zero stock reads',flush=True)
