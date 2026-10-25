"""Verify scheduling and buffered conversions with SDKs intercepted (no real ad events)."""
import os, json
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3027')
with sync_playwright() as p:
    for engine in [p.chromium, p.webkit]:
        browser = engine.launch(headless=True, **({'channel': 'msedge'} if engine.name == 'chromium' else {}))
        for early_contact in [False, True]:
            context = browser.new_context(viewport={'width':390, 'height':844}, is_mobile=True, has_touch=True)
            page = context.new_page(); requests = []; errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.add_init_script('''window.testIdle = new Map(); let nextIdleId=0;
                window.requestIdleCallback=cb=>{testIdle.set(++nextIdleId,cb); return nextIdleId};
                window.cancelIdleCallback=id=>testIdle.delete(id);
                window.runTestIdle=()=>{const batch=[...testIdle.entries()];testIdle.clear();for(const [,cb] of batch)cb({didTimeout:false,timeRemaining:()=>50})};''')
            def route(r):
                url = r.request.url
                if 'googletagmanager.com/gtm.js' in url:
                    requests.append('google')
                    r.fulfill(content_type='application/javascript', body='window.googleLoaded=true;window.googleReceived=window.dataLayer.map(x=>Array.isArray(x)?x:Array.from(x.length?x:[]));')
                elif 'analytics.tiktok.com/i18n/pixel/events.js' in url:
                    requests.append('tiktok')
                    r.fulfill(content_type='application/javascript', body='window.tiktokLoaded=true;window.tiktokReceived=Array.from(window.ttq);')
                elif 'firestore.googleapis.com' in url:
                    r.fulfill(json={'fields':{}})
                elif '/api/public-data' in url:
                    r.fulfill(json={'properties':[], 'company':None,'visual':None})
                else: r.continue_()
            context.route('**/*', route)
            page.goto(BASE+'/?utm_source=google&utm_medium=cpc&utm_campaign=fixture', wait_until='load')
            page.wait_for_function('typeof window.gtagSendEvent === "function"')
            assert requests == [], requests
            assert page.evaluate('typeof window.gtag') == 'function'
            assert page.evaluate('ttq.filter(x=>x[0]==="page").length') == 1
            page.evaluate('gtag("event","view_property",{property_id:"fixture"})')
            if early_contact:
                page.evaluate('gtagSendEvent()')
            else:
                page.evaluate('runTestIdle()')
                page.wait_for_function('window.googleLoaded===true')
                assert requests == ['google'], requests
                page.evaluate('runTestIdle()')
            page.wait_for_function('window.googleLoaded && window.tiktokLoaded')
            page.evaluate('runTestIdle(); __siteMarketing.start(); runTestIdle()')
            assert requests == ['google', 'tiktok'], requests
            assert page.evaluate('googleReceived.some(x=>x[1]==="view_property")')
            if early_contact:
                assert page.evaluate('googleReceived.filter(x=>x[1]==="ads_conversion___1").length') == 1
            assert page.evaluate('tiktokReceived.filter(x=>x[0]==="page").length') == 1
            attribution = page.evaluate('JSON.parse(localStorage.getItem("startupup:attribution:v1"))')
            assert attribution['last']['source']=='google_ads'
            assert attribution['last']['campaign']=='fixture'
            assert not errors, errors
            print(json.dumps({'browser':engine.name,'earlyContact':early_contact,'result':'PASS: deferred SDKs, buffered events, single initialization, campaign preserved'}),flush=True)
            context.close()
        browser.close()
