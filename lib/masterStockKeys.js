// Pure house/project key helpers. Kept apart from masterStock.js so client bundles
// never include the server-only stock sheet sources.

/** จับคู่บ้านเว็บกับแถวในชีตด้วยบ้านเลขที่ — วิธีเดียวกับที่ stock-map ใช้ */
export const normalizeHouseKey = (value) => String(value ?? '')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/\u00a0/g, ' ')
  .trim()
  .toLowerCase()
  .replace(/\*+/g, '')
  .replace(/\s+/g, '')
  .replace(/[-–—]/g, '/');

/**
 * key ของชื่อโครงการ ใช้ตอนจับคู่สำรอง — บางหลังในเว็บกรอกบ้านเลขที่ไม่ครบ
 * (เว็บ "904" แต่ในชีตเป็น "11/904") ถ้าโครงการตรงกันและเลขท้ายตรงกันแบบไม่กำกวม ถือว่าหลังเดียวกัน
 */
export const normalizeProjectKey = (value) => String(value ?? '')
  .replace(/[​-‍﻿]/g, '')
  .replace(/ /g, ' ')
  .trim()
  .toLowerCase()
  .replace(/\*+/g, '')
  .replace(/\s+/g, '');

export const houseAliasKey = (project, houseKey) => {
  const tail = String(houseKey || '').split('/').pop();
  const projectKey = normalizeProjectKey(project);
  return tail && projectKey ? `${projectKey}|${tail}` : '';
};
