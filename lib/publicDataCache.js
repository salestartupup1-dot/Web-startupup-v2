/**
 * แคชข้อมูลสาธารณะ (บ้าน + ข้อมูลบริษัท + หน้าตาเว็บ + ป๊อปอัป) ไว้ฝั่ง server
 *
 * ⚠️ เดิมเบราว์เซอร์ของ "ผู้เข้าชมทุกคน" อ่าน Firestore ตรงๆ ทั้งคอลเลกชัน
 * = ~185 document reads ต่อการเปิดเว็บ 1 ครั้ง โควตาอ่านรายวันของแพลนฟรี (50,000)
 * จึงหมดตั้งแต่มีคนเข้าไม่กี่ร้อยคน
 *
 * ที่นี่อ่าน Firestore รอบเดียวแล้วแจกให้ทุกคน และก่อนจะอ่านใหม่ทั้งชุด
 * จะแอบดูเอกสารเล็กๆ site_settings/public_version ก่อน (1 read) ว่าหลังบ้านแก้อะไรมาไหม
 * — ไม่มีอะไรเปลี่ยนก็ใช้ของเดิมต่อ ทำให้ข้อมูลสดในระดับ ~1 นาที
 *   โดยเสียโควตาแค่วันละไม่กี่พัน read แทนที่จะเป็นหลักแสน
 */
import { fetchPublicCollectionRest, fetchPublicDocumentRest } from './firestorePublic';

export const PUBLIC_VERSION_PATH = 'site_settings/public_version';

// ทุกๆ 1 นาที ค่อยไปดูเอกสาร version (อ่านครั้งละ 1 doc)
const VERSION_CHECK_MS = 60 * 1000;
// ถ้าอ่านเอกสาร version ไม่ได้ (ยังไม่เคยสร้าง/สิทธิ์ไม่ถึง) ให้โหลดใหม่ทั้งชุดทุก 15 นาทีแทน
const FULL_RELOAD_MS = 15 * 60 * 1000;
// กันคนกดรีเฟรชรัวๆ แล้วลากให้อ่าน Firestore ถี่กว่าที่ควร
const MIN_FORCE_INTERVAL_MS = 60 * 1000;

let cache = { loadedAt: 0, checkedAt: 0, version: null, data: null };
let inFlight = null;

const readVersion = async () => {
  try {
    const doc = await fetchPublicDocumentRest(PUBLIC_VERSION_PATH);
    if (!doc) return null;
    const stamp = doc.updatedAt?.seconds ?? doc.updatedAt ?? doc.version ?? '';
    return stamp ? String(stamp) : null;
  } catch {
    return null;
  }
};

const loadFromFirestore = async () => {
  const [properties, company, visual, popup] = await Promise.all([
    fetchPublicCollectionRest('properties'),
    fetchPublicDocumentRest('company_info/main'),
    fetchPublicDocumentRest('site_settings/visual'),
    fetchPublicDocumentRest('site_settings/popup'),
  ]);

  return { properties, company, visual, popup, updatedAt: new Date().toISOString() };
};

const refresh = (version) => {
  return loadFromFirestore()
    .then((data) => {
      const now = Date.now();
      cache = { loadedAt: now, checkedAt: now, version, data };
      return { ...data, cached: false };
    })
    .catch((error) => {
      // อ่านไม่ได้แต่ยังมีของเก่า — ส่งของเก่าไปก่อน ดีกว่าปล่อยหน้าเว็บว่าง
      if (cache.data) return { ...cache.data, cached: true, stale: true, error: String(error.message || error) };
      throw error;
    });
};

/** คืนข้อมูลสาธารณะจากแคช — ไปอ่าน Firestore ใหม่เฉพาะตอนที่หลังบ้านแก้ข้อมูลจริงๆ */
async function readPublicData({ force = false } = {}) {

  const now = Date.now();
  if (!cache.data) return refresh(await readVersion());

  if (force && now - cache.loadedAt > MIN_FORCE_INTERVAL_MS) return refresh(await readVersion());
  if (now - cache.checkedAt < VERSION_CHECK_MS) return { ...cache.data, cached: true };

  const version = await readVersion();
  cache = { ...cache, checkedAt: now };

  if (version && version !== cache.version) return refresh(version);
  if (!version && now - cache.loadedAt > FULL_RELOAD_MS) return refresh(null);

  return { ...cache.data, cached: true };
}

// Set the shared promise before the first version read to prevent cold-start fan-out.
export function getPublicData(options = {}) {
  if (!inFlight) inFlight = readPublicData(options).finally(() => { inFlight = null; });
  return inFlight;
}

/** รายการบ้านสาธารณะจากแคชเดียวกัน (ใช้ใน /api/share ตอนบอทมาขอ preview) */
export const getPublicProperties = async () => (await getPublicData()).properties || [];
