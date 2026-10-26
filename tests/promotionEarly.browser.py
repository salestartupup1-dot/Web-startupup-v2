"""Promotion works while all Next.js scripts are held back, then survives hydration."""
import asyncio, os, json
from playwright.async_api import async_playwright, expect
BASE=os.environ.get('SITE_TEST_BASE_URL','http://localhost:3026')
async def main():
 async with async_playwright() as p:
  for engine in [p.chromium,p.webkit]:
   browser=await engine.launch(headless=True,**({'channel':'msedge'} if engine.name=='chromium' else {}))
   for snooze in [False, True]:
    c=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    page=await c.new_page(); release=asyncio.Event(); requests=[]; errors=[]
    # Next dev hides the entire body until its JS runs. Production has no FOUC
    # style; remove only this development-only guard for the held-JS scenario.
    await page.add_init_script("new MutationObserver(()=>document.querySelectorAll('style[data-next-hide-fouc]').forEach(s=>s.remove())).observe(document,{childList:true,subtree:true})")
    page.on('pageerror',lambda e:errors.append(str(e)))
    async def route(r):
     u=r.request.url;requests.append(u)
     if '/_next/' in u and '.js' in u:
      await release.wait(); await r.continue_()
     elif '/site_settings/popup?' in u:
      await r.fulfill(json={'fields':{'imageUrl':{'stringValue':'/featured/singlehouse.jpg'},'isActive':{'booleanValue':True}}})
     elif 'firestore.googleapis.com' in u: await r.abort()
     elif 'googletagmanager' in u or 'tiktok' in u: await r.abort()
     else: await r.continue_()
    await c.route('**/*',route)
    await page.goto(BASE+'/?popup=/featured/singlehouse.jpg',wait_until='commit')
    d=page.get_by_role('dialog',name='โปรโมชั่น')
    await page.wait_for_selector('#site-promotion',state='attached')
    await page.mouse.wheel(0,400)
    await expect(d).to_be_visible(timeout=30000)
    assert not release.is_set()
    await expect(d.locator('img')).to_have_attribute('width','900')
    if snooze: await d.locator('input').check()
    await d.get_by_role('button',name='ปิดหน้าต่าง').click()
    await expect(d).not_to_be_visible()
    release.set(); await page.wait_for_load_state('domcontentloaded')
    await page.wait_for_function("document.querySelector('.cine-progress i')?.style.transform.startsWith('scaleX(')")
    await page.wait_for_timeout(600)
    await expect(d).not_to_be_visible()
    assert not any('/Listen/' in u or 'firebaseClient' in u for u in requests)
    assert await page.evaluate("document.body.style.overflow!='hidden'")
    if snooze:
     await page.reload(wait_until='domcontentloaded');await page.wait_for_timeout(500);await expect(d).not_to_be_visible()
    await page.get_by_role('button',name='เข้าสู่ระบบผู้ดูแล',exact=True).click()
    await expect(page.get_by_role('heading',name='ระบบจัดการหลังบ้าน')).to_be_visible()
    await page.wait_for_function("performance.getEntriesByType('resource').some(r=>r.name.includes('firebaseClient'))")
    assert not errors,errors
    print(json.dumps({'engine':engine.name,'snooze':snooze,'earlyPopupAndClose':'PASS','noFirebaseOnHome':'PASS','loginLoadsOnDemand':'PASS'}),flush=True)
    await c.close()
   await browser.close()
asyncio.run(main())
