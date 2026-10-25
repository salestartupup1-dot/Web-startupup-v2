"""Article navigation, responsive layout and keyboard checks. No stock reads or writes."""
import json
import os
from pathlib import Path
from urllib.parse import quote, urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3021')
INDEX = '/articles'
DETAIL = INDEX + '/' + quote('เงินเดือน-กู้บ้าน')
OUT = Path('coverage'); OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    for engine in [p.chromium, p.webkit]:
        browser = engine.launch(headless=True, **({'channel':'msedge'} if engine.name == 'chromium' else {}))
        for width in [1880, 1200, 375, 844]:
            mobile = width <= 1100
            context = browser.new_context(viewport={'width':width,'height':390 if width==844 else 900},
                                          reduced_motion='reduce' if width==375 else 'no-preference')
            requests, errors = [], []
            def route_request(route):
                url = route.request.url
                if '/api/public-data' in url or '/api/property?' in url or 'firestore.googleapis.com' in url:
                    requests.append(url); route.abort()
                elif url.startswith(BASE + '/?tab=search_result'):
                    route.fulfill(content_type='text/html', body='<h1>Search destination</h1>')
                elif url.startswith(BASE) or any(host in url for host in ['res.cloudinary.com','fonts.googleapis.com','fonts.gstatic.com']):
                    route.continue_()
                else: route.abort()
            context.route('**/*', route_request)
            page = context.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(BASE + INDEX, wait_until='domcontentloaded')
            header = page.locator('header').first
            theme = header.evaluate('(el) => ({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundImage})')
            assert theme['color']=='rgb(11, 61, 27)' and 'url(' not in theme['background'],theme
            expect(header.get_by_role('img',name='Startup Up',exact=True)).to_be_visible()
            expect(header.get_by_role('link',name='ระบบจัดการ')).to_have_attribute('href','/?admin=1')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            if mobile:
                toggle=header.get_by_role('button',name='เมนู',exact=True)
                expect(toggle).to_have_attribute('aria-expanded','false')
                toggle.click()
                menu=header.get_by_role('navigation',name='เมนูหลักมือถือ')
                expect(menu.get_by_role('link')).to_have_count(7)
                expect(menu.get_by_role('link',name='บทความ',exact=True)).to_have_attribute('aria-current','page')
                menu.get_by_role('searchbox',name='ค้นหาบ้าน').focus()
                page.keyboard.press('Escape')
                expect(toggle).to_have_attribute('aria-expanded','false')
                expect(toggle).to_be_focused()
                if engine.name=='chromium' and width==375:
                    header.screenshot(path=str(OUT/'article-header-mobile.png'))
                toggle.click()
                field=menu.get_by_role('searchbox',name='ค้นหาบ้าน')
            else:
                nav=header.get_by_role('navigation',name='เมนูหลัก',exact=True)
                expect(nav.get_by_role('link')).to_have_count(7)
                expect(nav.get_by_role('link',name='บทความ',exact=True)).to_have_attribute('aria-current','page')
                if engine.name=='chromium' and width==1880:
                    header.screenshot(path=str(OUT/'article-header-desktop.png'))
                search=nav.get_by_role('button',name='ค้นหา',exact=True)
                search.click()
                field=nav.get_by_role('searchbox',name='ค้นหาบ้าน')
                expect(field).to_be_focused()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                page.keyboard.press('Escape'); expect(search).to_be_focused()
                search.click()
            field.fill('คลองสอง'); field.press('Enter')
            expect(page.get_by_role('heading',name='Search destination')).to_be_visible()
            query=parse_qs(urlparse(page.url).query)
            assert query=={'tab':['search_result'],'sType':['keyword'],'sValue':['คลองสอง']},query
            page.goto(BASE + DETAIL,wait_until='domcontentloaded')
            expect(header.get_by_role('img',name='Startup Up',exact=True)).to_be_visible()
            expect(page.locator('main h1')).to_have_count(1)
            page.evaluate('window.scrollTo({top:500,behavior:"instant"})')
            assert abs(header.bounding_box()['y'])<1
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            assert not requests,requests
            assert not errors,errors
            print(json.dumps({'engine':engine.name,'width':width,'search_and_navigation':True,'no_stock_requests':True,'passed':True}),flush=True)
            context.close()
        context=browser.new_context(java_script_enabled=False,viewport={'width':1440,'height':900})
        page=context.new_page();page.goto(BASE + INDEX,wait_until='domcontentloaded')
        expect(page.get_by_role('navigation',name='เมนูหลัก',exact=True).get_by_role('link',name='บทความ',exact=True)).to_be_visible()
        expect(page.locator('main h1')).to_have_count(1)
        print(json.dumps({'engine':engine.name,'no_javascript_navigation':True,'passed':True}),flush=True)
        context.close();browser.close()
