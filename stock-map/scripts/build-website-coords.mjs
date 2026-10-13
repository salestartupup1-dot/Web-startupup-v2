/**
 * ดึงพิกัดบ้านจากเว็บหลัก (Firestore) มาเก็บเป็นสแนปช็อตไว้ใน data/website-coords.json
 * เพื่อให้ /api/stock ไม่ต้องอ่าน Firestore ตอน runtime — การอ่านแต่ละรอบนับเป็น
 * document read เท่าจำนวนบ้านทั้งเว็บ (~180 ครั้ง) ถ้าอ่านทุกครั้งที่แคชหมดอายุ
 * โควตาอ่านรายวันของแพลนฟรี (50,000 ครั้ง) จะหมดภายในวันเดียว
 *
 *   node scripts/build-website-coords.mjs      (รันอัตโนมัติผ่าน prebuild)
 *
 * ถ้าอ่านไม่สำเร็จ (เน็ตล่ม / โควตาเต็ม) จะเก็บสแนปช็อตเดิมไว้และไม่ทำให้ build ล้ม
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { fetchFirestoreCoords } = await import(pathToFileURL(path.join(ROOT, 'lib', 'firestoreCoords.mjs')).href);
const OUT_PATH = path.join(ROOT, 'data', 'website-coords.json');

const readExisting = () => {
  try {
    return JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
  } catch {
    return null;
  }
};

try {
  const { byHouse, byProject, properties, docCount } = await fetchFirestoreCoords();
  const houseCount = Object.keys(byHouse).length;

  // กันเคสอ่านได้แต่ข้อมูลว่าง — อย่าเขียนทับสแนปช็อตดีๆ ด้วยไฟล์เปล่า
  const existing = readExisting();
  if (!houseCount && existing && Object.keys(existing.byHouse || {}).length) {
    console.warn('⚠️  อ่าน Firestore ได้แต่ไม่มีพิกัดเลย — คงสแนปช็อตเดิมไว้');
    process.exit(0);
  }

  const payload = {
    builtAt: new Date().toISOString(),
    note: 'สแนปช็อตพิกัดบ้านจากเว็บหลัก สร้างด้วย `npm run build:coords` (จะถูกเขียนทับทุกครั้งที่ build)',
    byHouse,
    byProject,
    properties,
  };
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`✓ เขียน data/website-coords.json แล้ว — อ่าน ${docCount} หลัง, มีพิกัด ${houseCount} หลัง, ${Object.keys(byProject).length} โครงการ`);
} catch (error) {
  const existing = readExisting();
  const cached = Object.keys(existing?.byHouse || {}).length;
  console.warn(`⚠️  ดึงพิกัดจากเว็บหลักไม่สำเร็จ: ${error.message}`);
  console.warn(cached
    ? `   ใช้สแนปช็อตเดิม (${cached} หลัง, สร้างเมื่อ ${existing.builtAt || 'ไม่ทราบ'}) ต่อไปก่อน`
    : '   ยังไม่มีสแนปช็อต — /api/stock จะอ่าน Firestore สดๆ แล้วจำไว้ 6 ชม. จนกว่าจะ build ใหม่สำเร็จ');
}
