export const SALE_PROMOTION_PATH = 'site_settings/sale_promotion';
export const MAX_PROMOTION_IMAGES = 5;
export const EMPTY_SALE_PROMOTION = {
  title: 'โปรโมชั่นสำหรับบ้านหลังนี้', images: [], isActive: false,
  scope: 'selected', propertyIds: [], endDate: '',
};

export function normalizeSalePromotion(value) {
  const data = value || {};
  return {
    title: String(data.title || '').trim().slice(0, 120) || EMPTY_SALE_PROMOTION.title,
    images: Array.isArray(data.images) ? [...new Set(data.images.filter(url =>
      typeof url === 'string' && /^https:\/\//i.test(url)))].slice(0, MAX_PROMOTION_IMAGES) : [],
    isActive: data.isActive === true,
    scope: data.scope === 'all' ? 'all' : 'selected',
    propertyIds: Array.isArray(data.propertyIds) ? [...new Set(data.propertyIds.filter(id => typeof id === 'string' && id))] : [],
    endDate: typeof data.endDate === 'string' ? data.endDate : '',
  };
}

export function promotionExpiry(endDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate || '')) return NaN;
  const start = Date.parse(`${endDate}T00:00:00+07:00`);
  if (!Number.isFinite(start) || new Date(start + 7 * 3600000).toISOString().slice(0, 10) !== endDate) return NaN;
  return start + 24 * 3600000;
}

export function validateSalePromotion(data, now = Date.now()) {
  if (data.endDate && !Number.isFinite(promotionExpiry(data.endDate))) return 'กรุณาระบุวันสิ้นสุดให้ถูกต้อง';
  if (!data.isActive) return '';
  if (!data.images.length) return 'กรุณาเพิ่มรูปโปรโมชั่นก่อนเปิดแสดง';
  if (data.scope !== 'all' && !data.propertyIds.length) return 'กรุณาเลือกบ้านที่ร่วมโปรโมชั่น';
  if (data.endDate && now >= promotionExpiry(data.endDate)) return 'วันสิ้นสุดโปรโมชั่นผ่านไปแล้ว กรุณาเปลี่ยนวันที่หรือปิดแสดง';
  return '';
}

export function promotionAppliesTo(promotion, property, now = Date.now()) {
  const data = normalizeSalePromotion(promotion);
  if (!property?.id || !data.isActive || !data.images.length) return false;
  if (property.badge === 'Sold Out' || ['sold', 'sold out'].includes(String(property.status || '').toLowerCase())) return false;
  if (data.endDate && (!Number.isFinite(promotionExpiry(data.endDate)) || now >= promotionExpiry(data.endDate))) return false;
  return data.scope === 'all' || data.propertyIds.includes(property.id);
}
