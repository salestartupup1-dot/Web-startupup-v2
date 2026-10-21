export const PROPERTY_OWNERS = ['Startup Up', 'Naphat', 'เจ๊หมวย', 'ใบชา', 'Notting', 'ฝากขาย'];
export const DEFAULT_PROPERTY_OWNER = PROPERTY_OWNERS[0];

export const getPropertyOwner = (property) => {
  const owner = String(property?.property_owner || '').trim();
  return PROPERTY_OWNERS.includes(owner) ? owner : DEFAULT_PROPERTY_OWNER;
};

/**
 * บ้านของ Partner (เจ้าของอื่นที่ไม่ใช่ Startup Up) จะไม่ขึ้นในหน้าเว็บสาธารณะ
 * — ยังลง/แก้ไขในหลังบ้านได้ตามปกติ และยังเปิดดูได้ถ้ามีลิงก์ตรง
 */
export const isPartnerProperty = (property) => getPropertyOwner(property) !== DEFAULT_PROPERTY_OWNER;

export const selectPublicProperties = (properties = []) => properties.filter((p) => !isPartnerProperty(p));
