# ระบบที่มาลูกค้า LINE — STARTUP UP

## สิ่งที่ทำไว้

- บัญชีปลายทางเดียว: **@SURE141**
- หน้ารายงานย้ายไป CRM: `https://startup-up-crm.vercel.app/lead-source` เมนู **Lead Source** ต่อจาก “ลูกค้าของฉัน” สมาชิก CRM ที่ได้รับอนุมัติแล้วทุกคนอ่านได้
- ลิงก์เดิม `/admin/line-leads` เปลี่ยนทางไปหน้า CRM และนำเมนูเดิมออกจากหลังบ้านเว็บไซต์
- หน้าเชื่อมบัญชี LIFF: `/line/connect`
- ปุ่ม LINE ในหน้าแรก หน้ารายละเอียดบ้าน และการนัดชมบ้านผ่าน `/line/go`
- ป้ายต้นทางแสดงใน CRM ไม่ใช่แท็กในแอป LINE OA (Messaging API สาธารณะยังไม่มีคำสั่งติดแท็กแชทรายคน)
- ลูกค้าไม่ต้องส่งรหัสต้นทางหรือข้อความบอกว่ามาจากไหน แต่ครั้งแรกอาจต้องเข้าสู่ระบบและอนุญาตโปรไฟล์ LINE
- การจองนัดชมบ้านยังเตรียมข้อความนัดหมายให้ลูกค้ากดส่ง โดยไม่มีรหัสต้นทางปนในข้อความ
- หากยังไม่ตั้งค่า ระบบพาไปบัญชีหลักได้ตามปกติ โดยยังไม่เก็บข้อมูลลูกค้า LINE

**ยังต้องเชื่อม LINE และฐานข้อมูล ทดสอบด้วยบัญชีจริง และเผยแพร่ก่อนใช้งานจริง**
ชื่อ/รูปในหน้าทดสอบ `?demo=1` เป็นตัวอย่าง และใช้ได้เฉพาะเซิร์ฟเวอร์ development เท่านั้น

## 1. เปิด Messaging API ของบัญชีหลัก

### การอ่านข้อมูลจาก CRM (เพิ่ม 2026-10-01)

CRM เรียก `/api/lead-source` แล้วส่ง Firebase ID token ของสมาชิกไปที่ `/api/line/crm-leads` ของเว็บไซต์ เซิร์ฟเวอร์ตรวจ token และเอกสาร `startup-up-crm/users/{uid}` ผ่าน Firestore REST ทุกคำขอ ต้องมี `active: true` และ role ที่ระบบรองรับ จึงอ่านรายงานเดิมได้ ทั้งสองฝั่งใช้ `private, no-store` ไม่มีการย้ายหรือคัดลอกข้อมูลส่วนตัวไป collection สาธารณะ ไม่มีการเปลี่ยน LINE webhook และไม่ต้องเพิ่ม shared secret

สมาชิกที่ยังไม่อนุมัติ/ถูกปิดใช้งานหรือ token หมดอายุอ่านไม่ได้ ส่วน `/api/line/leads` เดิมยังจำกัดบัญชี Google ตาม allowlist สำหรับความเข้ากันได้ การตั้งค่า LINE และฐานข้อมูลด้านล่างยังจำเป็นต่อการเก็บลูกค้าใหม่ แม้หน้ารายงานจะย้ายไป CRM แล้ว

1. เปิด https://manager.line.biz/ และเลือกบัญชี **@SURE141** ตรวจสอบชื่อและบัญชีให้ตรงก่อนดำเนินการ
2. ไปที่ **ตั้งค่า → Messaging API** ถ้ายังไม่เปิด ให้เจ้าของบัญชีเปิดใช้งานและดำเนินการยอมรับเงื่อนไขด้วยตนเอง
3. เลือก Provider สำหรับธุรกิจนี้ บันทึกว่าเลือก Provider ใด เพราะ LINE Login ต้องสร้างใน Provider เดียวกัน ห้ามเลือกสุ่ม
4. เปิด https://developers.line.biz/console/ และเลือก Messaging API channel ของบัญชีหลัก
5. ใน Basic settings จะมี **Channel secret** เก็บไว้ในตัวแปร Vercel `LINE_CHANNEL_SECRET` เท่านั้น ไม่ส่งในแชทและไม่ใส่ใน GitHub
6. ถ้ามี Webhook URL เดิม ต้องตรวจสอบระบบที่ใช้อยู่ก่อน ห้ามเขียนทับโดยไม่จัดทางส่งต่อเหตุการณ์ของระบบเดิม

ระบบนี้ไม่ส่งข้อความตอบกลับอัตโนมัติและไม่ต้องใช้ Channel access token ของ Messaging API
เปิด Chat ใน OA Manager ไว้ แอดมินตอบใน LINE OA ได้เหมือนเดิม

## 2. สร้าง LINE Login และ LIFF

1. ใน Provider **เดียวกับ Messaging API ของ @SURE141** สร้าง LINE Login channel ชนิด Web app
2. ตั้งชื่อที่ลูกค้าจำได้ เช่น “STARTUP UP” และใช้ข้อมูลธุรกิจ/นโยบายความเป็นส่วนตัวจริงที่เจ้าของธุรกิจตรวจสอบแล้ว
3. เชื่อม Linked LINE Official Account เป็น **@SURE141**
4. ในแท็บ LIFF เพิ่ม LIFF app:
   - ชื่อ: STARTUP UP Contact
   - Size: Full
   - Endpoint URL: `https://www.startupup-real-estate.com/line/connect`
   - Scope: `openid` และ `profile` เท่านั้น
   - Add friend option: เปิดตามตัวเลือกที่บัญชีรองรับ เพื่อให้ลูกค้าเพิ่มบัญชีหลัก
   - ไม่ต้องใช้ `email` หรือ `chat_message.write`
5. เปลี่ยน LINE Login channel เป็น **Published** ก่อนให้ลูกค้าทั่วไปใช้งาน
6. เก็บ **LINE Login Channel ID** ลง `LINE_LOGIN_CHANNEL_ID` และ **LIFF ID** ลง `LINE_LIFF_ID` ทั้งสองค่าไม่ใช่รหัสลับ จึงแจ้งผู้พัฒนาเพื่อช่วยตรวจได้

ลิงก์ผู้ใช้เริ่มจากเว็บไซต์หรือ `/line/go` แล้วระบบจะสร้างลิงก์ LIFF พร้อมหมายเลขอ้างอิงชั่วคราวให้เอง
อย่านำ Endpoint `/line/connect` เปล่า ๆ ไปวางเป็นลิงก์โฆษณา เพราะไม่มีข้อมูลอ้างอิงต้นทาง

## 3. ฐานข้อมูลและสิทธิ์ผู้ดูแล

ใช้ Firebase project เดิม `startup-up-realestate` โดยเพิ่ม Firebase Admin SDK ฝั่งเซิร์ฟเวอร์
ตั้ง service account ผ่านผู้ดูแล Firebase และเก็บ private key เฉพาะใน Environment Variables ของ Vercel หรือ `.env.local` ที่ไม่เข้า Git
อย่าใช้ตัวแปรขึ้นต้น `NEXT_PUBLIC_` กับ key/secret

ข้อมูลใหม่แยกจาก collection สาธารณะเดิม:

| Collection | เนื้อหา |
| --- | --- |
| `startupup_line_leads_private` | LINE user ID, ชื่อ, รูป, ต้นทางแรก/ล่าสุด, โครงการ และเวลาสถานะ |
| `startupup_line_intents_private` | หมายเลขอ้างอิงสุ่มก่อนเข้า LINE อายุ 30 นาที |
| `startupup_line_limits_private` | ตัวนับจำกัดคำขอและ IP ที่แฮชด้วยกุญแจ ไม่เก็บ IP ดิบ |

**ต้องตรวจ Firestore Rules ก่อนเปิดระบบ** ให้ทั้ง 3 collection ไม่อนุญาต client SDK อ่านหรือเขียนโดยตรง ไม่ว่าจะไม่ล็อกอิน, anonymous หรือบัญชีทั่วไป
Admin SDK เข้าผ่าน server เท่านั้น ส่วน API อ่านรายชื่อตรวจ Firebase ID token ที่ยังไม่ถูกเพิกถอน + Google provider + verified email + allowlist

ตัวอย่างส่วนของ Rules ที่ต้องผสานเข้า Rules เดิมโดยไม่แทนทั้งไฟล์:

```text
match /startupup_line_leads_private/{document} {
  allow read, write: if false;
}
match /startupup_line_intents_private/{document} {
  allow read, write: if false;
}
match /startupup_line_limits_private/{document} {
  allow read, write: if false;
}
```

Firestore ใช้หลัก “ถ้ามีกฎใดอนุญาตก็เข้าถึงได้” ดังนั้น `if false` ข้างต้น **ไม่หักล้าง** กฎกว้าง เช่น `match /{document=**} { allow read, write: if true; }`
ต้องแก้กฎกว้างให้ไม่ครอบคลุม collection ส่วนตัว และใช้ Rules Playground/Emulator ตรวจ read, list, create และ update ด้วยบัญชีที่ไม่มีสิทธิ์ก่อนตั้ง `LINE_PRIVATE_RULES_CONFIRMED=true`

เปิด TTL ที่ field `expiresAt` สำหรับ intent และ rate-limit collections เพื่อล้างข้อมูลชั่วคราวอัตโนมัติ
การหมดอายุ intent ตรวจในเซิร์ฟเวอร์ด้วย จึงไม่ขึ้นกับเวลาที่ TTL ลบเอกสารจริง
กำหนดระยะเก็บข้อมูลลูกค้าและขั้นตอนลบข้อมูลตามการใช้งานของธุรกิจ โดยระบบนี้ยังไม่ลบประวัติลูกค้าอัตโนมัติ

## 4. ตัวแปร Vercel

ตั้งในโปรเจกต์ STARTUP UP ที่ถูกต้อง แล้ว redeploy หลังเปลี่ยนตัวแปร:

| ชื่อ | ค่า / หมายเหตุ |
| --- | --- |
| `LINE_ATTRIBUTION_ENABLED` | เริ่มที่ `false` เปลี่ยนเป็น `true` หลังเชื่อมระบบและตรวจ Rules |
| `LINE_LIFF_ID` | LIFF ID จากข้อ 2 |
| `LINE_LOGIN_CHANNEL_ID` | Channel ID ของ **LINE Login** ไม่ใช่ Messaging API |
| `LINE_CHANNEL_SECRET` | Channel secret ของ **Messaging API** สำหรับตรวจลายเซ็น webhook |
| `LINE_BOT_USER_ID` | ไม่บังคับ; bot userId จาก Get bot info API รูปแบบ U… ต้องตรงกับ destination ของ webhook (เว้นไว้ได้) |
| `LINE_SITE_ORIGIN` | `https://www.startupup-real-estate.com` |
| `LINE_TRACKING_SECRET` | ค่าสุ่มอย่างน้อย 32 ตัวอักษร สร้างและบันทึกในระบบเก็บ secret ไม่ส่งในแชท |
| `FIREBASE_ADMIN_PROJECT_ID` | `startup-up-realestate` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account client email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service account private key รองรับ newline จริงหรือ `\n` |
| `LINE_LEADS_ADMIN_EMAILS` | อีเมล Google ของแอดมินที่ได้รับสิทธิ์ คั่นด้วย comma ค่าเริ่มต้นถ้าไม่ตั้งคือ `startup.up.real.estate@gmail.com` |
| `LINE_PRIVATE_RULES_CONFIRMED` | `true` เฉพาะเมื่อทดสอบ Rules ในข้อ 3 แล้ว |

**LINE_BOT_USER_ID:** หากไม่แน่ใจให้เว้นไว้ ลายเซ็นจาก Channel secret ยังใช้ยืนยัน webhook ของบัญชีหลักได้อยู่ ไม่ควรนำ LINE ID `@SURE141` หรือ user ID ของผู้พัฒนามาใส่

สำหรับ Preview deployment ใช้ environment ของ Preview แยกและ `LINE_SITE_ORIGIN` ให้ตรงกับโดเมน Preview
ถ้าทดสอบ LIFF บน Preview ให้สร้าง LIFF ทดสอบที่ endpoint ตรงกัน ห้ามชี้ LIFF production ไปยัง Preview ชั่วคราวโดยไม่วางแผน

หลังเว็บที่มี endpoint ใหม่เผยแพร่แล้ว ตั้ง Webhook URL ของ Messaging API:

`https://www.startupup-real-estate.com/api/line/webhook`

กด Verify, เปิด Use webhook และเปิด Webhook redelivery ตามที่บัญชีรองรับ ระบบทนต่อการส่งเหตุการณ์ซ้ำและลำดับสลับได้
ตั้งชื่อจริงของธุรกิจ นโยบายความเป็นส่วนตัว และข้อมูลติดต่อใน LINE channel ให้เรียบร้อยก่อนเผยแพร่

## 5. รวมทุกช่องทางมาที่ @SURE141

- TikTok หน้าโปรไฟล์: `https://www.startupup-real-estate.com/line/go?utm_source=tiktok&utm_medium=social&utm_campaign=tiktok_bio`
- Facebook หน้าเพจ: `https://www.startupup-real-estate.com/line/go?utm_source=facebook&utm_medium=social&utm_campaign=facebook_page`
- Google Ads: คงปลายทางโฆษณาเป็นหน้าเว็บ/บ้านตามเดิม เปิด Auto-tagging และตั้ง UTM เช่น `utm_source=google&utm_medium=cpc&utm_campaign=ชื่อแคมเปญ` ตามแคมเปญจริง
- TikTok Ads ที่เข้าเว็บ: เพิ่ม `utm_source=tiktok&utm_medium=paid_social&utm_campaign=ชื่อแคมเปญ` ในลิงก์เข้าเว็บ
- ย้ายจาก OA TikTok เดิม: `https://www.startupup-real-estate.com/line/go?utm_source=tiktok_oa&utm_medium=referral&utm_campaign=move_to_main`

วางลิงก์ย้ายบัญชีในตำแหน่งที่เจ้าของบัญชีเลือก เช่น Rich menu หรือข้อความทักทายของ OA เดิม
งานครั้งนี้ยังไม่ได้ส่งข้อความ/บรอดแคสต์หรือเปลี่ยนบัญชี TikTok ภายนอก และไม่สามารถย้ายเพื่อนหรือประวัติแชทระหว่าง OA ได้
ไม่ต้องปิด OA เดิมทันที ผู้ติดตามเดิมยังต้องกดเพิ่มบัญชีหลักด้วยตนเอง

## 6. ขอบเขตของข้อมูล

- แยก **เชื่อมต้นทางสำเร็จ**, **เพิ่มเพื่อน**, **มีข้อความเข้า** ออกจากกัน การเชื่อม LIFF ไม่เท่ากับลูกค้าทักแชทหรือซื้อบ้าน
- เก็บต้นทางแรก/ล่าสุดที่ทราบ ช่วงจำต้นทางบนเบราว์เซอร์ 30 วัน การกลับเว็บตรงจะไม่ล้างต้นทางล่าสุดที่ทราบ
- แหล่งต้นทางเป็นข้อมูลเพื่อการตลาด ไม่ใช่หลักฐานยืนยันทางการเงิน ผู้ใช้แก้ UTM หรือแชร์ลิงก์ต่อได้
- ไม่เก็บ GCLID/FBCLID/TTCLID ดิบ ไม่อัปโหลด offline conversion ไป Google Ads ในรุ่นนี้
- หากลูกค้าข้ามลิงก์ ไปค้น LINE ID เอง ปฏิเสธอนุญาต ล้างข้อมูลเบราว์เซอร์ หรือเปลี่ยนอุปกรณ์ อาจระบุต้นทางไม่ได้
- `fbclid` อย่างเดียวไม่ยืนยันว่าเป็นโฆษณา จึงติดป้าย Facebook ไม่ใช่ Facebook Ads
- ป้าย “ย้ายจาก LINE TikTok” หมายถึงเข้าทางลิงก์ย้าย ไม่อ้างว่าเป็นต้นทางโฆษณาเดิมย้อนหลัง
- ไม่เก็บเนื้อหาข้อความแชท webhook บันทึกเพียงเวลาและสถานะ
- รายการที่ webhook เห็นก่อน LIFF จะแสดง “ยังไม่ได้เชื่อมต้นทาง” จนกว่าจะจับคู่ได้
- รายงานโหลดครั้งละ 50 รายการตามช่องทางและช่วงวันที่ (เวลาไทย รวมทั้งวันสิ้นสุด) ยอดสรุปใช้ Firestore count ครอบคลุมทั้งช่วง ไม่จำกัดที่จำนวนแถวที่โหลด การค้นหาชื่อเป็นการค้นหาเฉพาะแถวที่โหลดแล้ว
- เก็บแต่ละการเชื่อมสำเร็จแยกใน `startupup_line_visits_private` ใช้ hash ของ intent เป็นรหัสแถว: intent เดิม retry ไม่เพิ่มซ้ำ แต่ intent ใหม่จากคนเดิมเพิ่มแถวใหม่ได้ ช่องทางของแต่ละครั้งไม่ถูกแก้เมื่อกลับมาอีกครั้ง
- Facebook/Ads รวมใต้ Facebook, TikTok/Ads รวมใต้ TikTok และปุ่ม LINE บนเว็บไซต์/หน้าขายรวม Website/Google Ads; เก็บหลักฐานแคมเปญของแต่ละครั้งไว้
- การติดต่อ OA โดยตรงที่พบครั้งแรกเพิ่มรายการไม่ทราบที่มา/ไอดีไลน์; ข้อความถัดไปอัปเดตสถานะเท่านั้น ไม่สร้างรายการเข้าช่องทางใหม่ หากต่อมาเชื่อม LIFF จะเป็นอีกเหตุการณ์หนึ่ง จึงไม่ใช่จำนวนคนไม่ซ้ำ
- ข้อมูลเดิมย้ายหนึ่งรายการต่อโปรไฟล์พร้อม kind=legacy จาก attributedAt หรือ firstSeenAt และติดป้ายข้อมูลเดิม ไม่สร้างรายการย้อนหลังจาก connectionCount เพราะไม่มีวันเวลา/ช่องทางแต่ละครั้งที่เชื่อถือได้
- ใช้ `backfillVisitHistory()` หลัง deploy หนึ่งครั้ง (รันซ้ำได้) transaction ตรวจ visitHistoryVersion เพื่อไม่ทับข้อมูลใหม่ เซิร์ฟเวอร์รองรับย้ายข้อมูลของคนที่เข้ามาระหว่าง rollout ด้วย
- `startupup_line_visits_private` ต้องปิด read/write จาก client เช่นเดียวกับ collection ส่วนตัวอื่น และต้องรวมประวัติ collection นี้เมื่อเจ้าของข้อมูลขอลบหรือถึงรอบทบทวนระยะเวลาจัดเก็บ
- หน้านี้เป็นรายชื่อต้นทาง ไม่มี inbox แชทในตัว แอดมินตอบใน LINE OA ต่อได้และเปรียบเทียบชื่อ/รูป ชื่อ LINE อาจซ้ำกันได้

## 7. ทดสอบก่อนเปิดจริง

1. ให้แอดมินที่อยู่ใน allowlist เข้าได้ และบัญชีอื่น/anonymous/ไม่มี token อ่าน API ไม่ได้
2. เริ่มจากลิงก์ Google Ads ทดสอบ → เปิดบ้าน → กด LINE → อนุญาต → เพิ่ม @SURE141 → ส่งข้อความทดสอบด้วยตนเอง
3. ดูว่ารายการลูกค้าเป็นชื่อ/รูปเดียวกับ LINE และป้าย Google Ads; ลูกค้าไม่เห็นป้ายในแชท
4. ลูกค้าคนเดิมเปิดลิงก์ TikTok อีกครั้ง → แถวใหม่และยอด TikTok เพิ่มหนึ่ง แต่การ retry intent เดิมไม่เพิ่ม; วันที่และช่องทางของแถวก่อนหน้ายังคงเดิม
5. เปิดลิงก์ย้าย OA เดิม → ป้าย “ย้ายจาก LINE TikTok”
6. ปิดหน้าขณะเชื่อม, ปฏิเสธสิทธิ์ และจำลองระบบเชื่อมขัดข้อง → ยังใช้ปุ่มติดต่อ LINE โดยตรงได้
7. ทดสอบ iOS/Android และเบราว์เซอร์ใน TikTok/Facebook; หากแอปจำกัดการเปิด LINE ให้ลองเปิดในเบราว์เซอร์ภายนอก
8. ทดลองบน PC แยกจากมือถือ เพราะ LINE URL scheme รองรับมือถือเป็นหลัก; ทดสอบการเปิด LIFF ผ่าน QR/บัญชีเดียวกันจริงก่อนยืนยันผล
9. Google/TikTok tracking scripts ต้องไม่โหลดใน `/admin/*` หรือ `/line/*` เพื่อไม่ส่งข้อมูลลูกค้าและ OAuth URL ไปยังระบบโฆษณา
10. ทดสอบชุดข้อมูลเดิมก่อนเผยแพร่ เนื่องจากโฟลเดอร์มีการแก้ไขหน้าเว็บอื่นอยู่แล้ว งานนี้ไม่ commit/push/deploy การแก้ไขเหล่านั้นอัตโนมัติ

แหล่งอ้างอิง:
- https://developers.line.biz/en/docs/liff/using-user-profile/
- https://developers.line.biz/en/docs/liff/opening-liff-app/
- https://developers.line.biz/en/docs/messaging-api/getting-started/
- https://firebase.google.com/docs/admin/setup
- https://firebase.google.com/docs/firestore/security/rules-structure
