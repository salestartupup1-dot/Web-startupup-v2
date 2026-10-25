"""Run against the isolated seeded home fixture. No production writes or ad events."""
import json
import os
from pathlib import Path
from urllib.parse import quote
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3025')
OUT = Path('coverage'); OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
    for engine in [p.chromium, p.webkit]:
        browser = engine.launch(headless=True, **({'channel': 'msedge'} if engine.name == 'chromium' else {}))
        for mobile in [True, False]:
            context = browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 900},
                                          is_mobile=mobile, has_touch=mobile)
            page = context.new_page()
            requests, errors = [], []
            page.on('request', lambda r: requests.append(r.url))
            page.on('pageerror', lambda e: errors.append(str(e)))
            def route(r):
                url = r.request.url
                if '/site_settings/popup?' in url:
                    r.fulfill(json={'fields':{'imageUrl':{'stringValue':'/featured/singlehouse.jpg'},'isActive':{'booleanValue':True}}})
                elif 'firestore.googleapis.com' in url or 'googletagmanager' in url or 'tiktok' in url: r.abort()
                elif '/api/public-data' in url: r.fulfill(json={'properties':[],'company':None,'visual':None})
                else: r.continue_()
            context.route('**/*',route)
            page.add_init_script("""window.shifts=[]; try {new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) shifts.push(e.value)}).observe({type:'layout-shift',buffered:true})}catch{}""")
            response=page.goto(BASE+'/?popup='+quote('/featured/singlehouse.jpg'),wait_until='domcontentloaded')
            assert 'rel="preload" as="image"' in response.text()
            dialog=page.get_by_role('dialog',name='โปรโมชั่น')
            expect(dialog).to_be_visible(timeout=30000)
            assert dialog.locator('img').evaluate('(i)=>i.width>0 && i.getAttribute("width")==i.naturalWidth && i.getAttribute("height")==i.naturalHeight')
            page.wait_for_timeout(1200)
            assert not any('.mp4' in u or 'tile.openstreetmap' in u or '/locations-' in u for u in requests), requests
            assert page.locator('.leaflet-container').count()==0
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            cls=page.evaluate('shifts.reduce((s,n)=>s+n,0)')
            assert cls < .1, cls
            if engine.name=='chromium' and mobile: page.screenshot(path=str(OUT/'performance-popup-mobile.png'))
            page.keyboard.press('Tab')
            assert dialog.evaluate('(d)=>d.contains(document.activeElement)')
            dialog.locator('input').check()
            page.keyboard.press('Escape')
            expect(dialog).to_have_count(0)
            assert page.evaluate('Number(localStorage.hidePopupUntil)>Date.now()')
            page.evaluate('scrollTo(0,2050)')
            expect(page.locator('.lg-root')).to_be_visible(timeout=10000)
            page.wait_for_function("document.querySelector('video')?.readyState >= 2",timeout=45000)
            page.wait_for_function("document.querySelector('video').currentTime>1",timeout=15000)
            assert not page.locator('video').get_attribute('poster')
            assert not any('tile.openstreetmap' in u for u in requests)
            page.evaluate('scrollTo(0,3740)')
            expect(page.locator('.fh-card')).to_be_visible()
            page.wait_for_timeout(1000)
            page.wait_for_function("[...document.querySelectorAll('.fh-img')].every(i=>i.complete&&i.naturalWidth>0)")
            page.evaluate('scrollTo(0,6480)')
            expect(page.locator('.leaflet-container')).to_be_visible(timeout=15000)
            page.evaluate('scrollTo(0,2050)')
            page.wait_for_function("document.querySelector('video').currentTime<6",timeout=15000)
            if engine.name=='chromium' and mobile: page.screenshot(path=str(OUT/'performance-scene-mobile.png'))
            page.reload(wait_until='domcontentloaded')
            page.wait_for_timeout(1200)
            expect(page.get_by_role('dialog')).to_have_count(0)
            assert not errors, errors
            print(json.dumps({'engine':engine.name,'mobile':mobile,'CLS':cls,'passed':'popup dimensions/focus/snooze; deferred media; video forward/reverse; cards/map'}),flush=True)
            context.close()
        browser.close()
