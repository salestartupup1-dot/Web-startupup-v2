"""Real admin save flow in a local snapshot with intercepted Firebase writes."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_TEST_BASE_URL', 'http://localhost:3028')
with sync_playwright() as p:
    for engine, mobile in [(p.chromium, False), (p.webkit, True)]:
        browser = engine.launch(headless=True, **({'channel':'msedge'} if engine.name=='chromium' else {}))
        page = browser.new_page(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000}, is_mobile=mobile, has_touch=mobile)
        errors = []; page.on('pageerror',lambda e: errors.append(str(e)))
        page.route('**/*',lambda r: r.continue_() if r.request.url.startswith(BASE) else r.abort())
        page.goto(BASE+'/__highlights-test',wait_until='networkidle')
        page.get_by_placeholder('ค้นหา...',exact=True).fill('บ้านทดสอบ')
        page.get_by_title('แก้ไข',exact=True).click()
        group = page.get_by_role('group',name='รายละเอียด (จุดเด่น)',exact=True)
        expect(group.locator('textarea')).to_have_count(3)
        expect(page.get_by_label('การเดินทาง',exact=True)).to_have_value('ถนนเดิมที่ตรวจสอบแล้ว')
        expect(page.get_by_label('ฟังก์ชันภายใน',exact=True)).to_have_value('')
        page.get_by_label('ฟังก์ชันภายใน',exact=True).fill('ครัวในบ้าน\nห้องเก็บของ')
        page.get_by_label('ฟังก์ชันภายนอก',exact=True).fill('จอดรถ 2 คัน\nสวนข้างบ้าน')
        page.get_by_label('การเดินทาง',exact=True).fill('เข้าจากถนนหลัก\nทางออกโครงการ 2 ทาง')
        page.get_by_role('button',name='บันทึกข้อมูล',exact=True).click()
        expect(page.get_by_role('heading',name='แก้ไขข้อมูล',exact=True)).to_have_count(0)
        saved = page.evaluate('window.savedProperty')
        assert saved['interior_features']=='ครัวในบ้าน\nห้องเก็บของ'
        assert saved['exterior_features']=='จอดรถ 2 คัน\nสวนข้างบ้าน'
        assert saved['access_details']=='เข้าจากถนนหลัก\nทางออกโครงการ 2 ทาง'
        assert saved['highlights']=='จุดเด่นโครงการ\n- ตลาดหน้าโครงการ'
        assert saved['renovation_details']=='เปลี่ยนพื้นแล้ว' and saved['nearby_places']=='ตลาดเดิม'
        page.get_by_title('แก้ไข',exact=True).click()
        expect(page.get_by_label('ฟังก์ชันภายใน',exact=True)).to_have_value(saved['interior_features'])
        expect(page.get_by_label('ฟังก์ชันภายนอก',exact=True)).to_have_value(saved['exterior_features'])
        expect(page.get_by_label('การเดินทาง',exact=True)).to_have_value(saved['access_details'])
        group.scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        Path('coverage').mkdir(exist_ok=True)
        page.screenshot(path=f'coverage/property-highlights-{engine.name}.png')
        page.get_by_label('ฟังก์ชันภายนอก',exact=True).fill('')
        page.get_by_role('button',name='บันทึกข้อมูล',exact=True).click()
        page.evaluate('window.__testPreview()')
        expect(page.get_by_role('heading',name='ฟังก์ชันภายใน',exact=True)).to_be_visible()
        expect(page.get_by_role('heading',name='การเดินทาง',exact=True)).to_be_visible()
        expect(page.get_by_role('heading',name='ฟังก์ชันภายนอก',exact=True)).to_have_count(0)
        expect(page.get_by_text('ตลาดหน้าโครงการ',exact=True)).to_have_count(1)
        expect(page.get_by_text('ครัวในบ้าน\nห้องเก็บของ',exact=True)).to_be_visible()
        page.get_by_role('button',name='ย้อนกลับ',exact=True).click()
        page.get_by_role('button',name='เพิ่มใหม่',exact=True).click()
        for label in ['ฟังก์ชันภายใน','ฟังก์ชันภายนอก','การเดินทาง']:
            expect(page.get_by_label(label,exact=True)).to_have_value('')
        assert not errors,errors
        print(json.dumps({'engine':engine.name,'mobile':mobile,'result':'PASS: three fields, save/reopen, legacy preservation, public headings, blank hiding, new-house reset'}),flush=True)
        browser.close()
