"""Read-only SSR and mobile/desktop checks; suppress test leads and ad traffic."""
import html, json, os, re, urllib.request, urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3026')
def fetch(path):
    with urllib.request.urlopen(BASE + path, timeout=45) as response:
        return response.read().decode('utf-8')

catalogue = json.loads(fetch('/api/public-data'))
house = next(p for p in catalogue['properties'] if p.get('inventoryState') == 'available' and p.get('highlights') and p.get('canonicalPath'))
body = fetch(house['canonicalPath'])
assert html.escape(house['project_name']) in body
assert 'ข้อมูลบ้าน' in body and 'sp4-title' in body
assert body.count('<h1') == 1
for slug, source in [
    ('บ้านมือสอง-รังสิต','futurepark.co.th'), ('บ้านมือสอง-คลองหลวง','talaadthai.com'),
    ('บ้านมือสอง-ลำลูกกา','bts.co.th'), ('บ้านมือสอง-ธัญบุรี','rmutt.ac.th'), ('บ้านรีโนเวท-ปทุมธานี','tu.ac.th')]:
    body = fetch('/' + urllib.parse.quote(slug))
    assert source in body and 'ข้อมูลสถานที่จาก:' in body
    assert 'ช่วงราคาบ้านที่เปิดรับจอง' in body
    assert body.count('<h1') == 1
    schemas = [json.loads(s) for s in re.findall(r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', body, re.S)]
    faq = next(s for s in schemas if s.get('@type') == 'FAQPage')
    assert 'ราคาประกาศ' in faq['mainEntity'][0]['acceptedAnswer']['text']
print('PASS: house facts and all five location guides are present in server HTML', flush=True)

output = Path(os.environ.get('TEMP','.')) / 'startupup-seo-editorial'
output.mkdir(exist_ok=True)
with sync_playwright() as playwright:
    for engine, mobile in [(playwright.chromium,False),(playwright.webkit,True)]:
        browser = engine.launch(channel='msedge' if engine.name == 'chromium' else None)
        context = browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000}, is_mobile=mobile, has_touch=mobile)
        def route(request):
            url = request.request.url
            if '/api/contact/' in url or '/api/line/' in url or '/line/go' in url:
                request.fulfill(status=200, json={'ok':True})
            elif url.startswith(BASE) or any(host in url for host in ['res.cloudinary.com','fonts.googleapis.com','fonts.gstatic.com']):
                request.continue_()
            else:
                request.abort()
        context.route('**/*',route)
        page = context.new_page()
        page.goto(BASE + house['canonicalPath'], wait_until='domcontentloaded')
        facts = page.get_by_role('heading',name='ข้อมูลบ้าน ' + house['project_name'],exact=True)
        expect(facts).to_be_visible(timeout=20000)
        facts.scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.screenshot(path=str(output / ('house-mobile.png' if mobile else 'house-desktop.png')))
        page.goto(BASE + '/' + urllib.parse.quote('บ้านมือสอง-คลองหลวง'),wait_until='domcontentloaded')
        heading = page.get_by_role('heading',name='คลองหลวง: ธรรมศาสตร์ ตลาดไท และทำเลแต่ละคลอง',exact=True)
        expect(heading).to_be_visible(timeout=20000)
        heading.scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.screenshot(path=str(output / ('location-mobile.png' if mobile else 'location-desktop.png')))
        browser.close()
print('PASS: desktop Chromium and mobile WebKit content, layout and screenshots', flush=True)
