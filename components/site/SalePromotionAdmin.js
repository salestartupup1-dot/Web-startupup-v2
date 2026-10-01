import { useEffect, useMemo, useRef, useState } from 'react';
import useSalePromotion from './useSalePromotion';
import { MAX_PROMOTION_IMAGES, normalizeSalePromotion, validateSalePromotion } from '../../lib/salePromotion';
import styles from '../../styles/sale-promotion.module.css';

export default function SalePromotionAdmin({ db, appId, ...props }) {
  const { promotion, loading, error } = useSalePromotion(db, appId);
  if (loading) return <p role="status">กำลังโหลดโปรโมชั่นหน้าบ้าน...</p>;
  if (error) return <div role="alert">โหลดโปรโมชั่นไม่สำเร็จ กรุณาปิดแล้วเปิดเมนูนี้ใหม่</div>;
  return <SalePromotionEditor {...props} initial={promotion} />;
}

export function SalePromotionEditor({ initial, properties, popupImage, onSave, onUpload, validateImage }) {
  const [form, setForm] = useState(() => normalizeSalePromotion(initial));
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dirty = useRef(false);
  useEffect(() => { if (!dirty.current) setForm(normalizeSalePromotion(initial)); }, [initial]);
  const change = patch => { dirty.current = true; setForm(prev => ({ ...prev, ...patch })); setNotice(''); setError(''); };
  const candidates = useMemo(() => {
    const known = new Set(properties.map(p => p.id));
    const missing = form.propertyIds.filter(id => !known.has(id)).map(id => ({ id, project_name: 'ไม่พบข้อมูลบ้าน', custom_id: id }));
    return [...properties, ...missing].filter(p => [p.project_name, p.custom_id, p.house_number, p.main_location, p.id]
      .some(value => String(value || '').toLowerCase().includes(search.trim().toLowerCase())));
  }, [properties, form.propertyIds, search]);
  const upload = async event => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (form.images.length + files.length > MAX_PROMOTION_IMAGES) { setError('เพิ่มรูปได้สูงสุด 5 รูป'); return; }
    setBusy('upload'); setError(''); setNotice('');
    try {
      files.forEach(file => { if (validateImage(file) === false) throw new Error('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง'); });
      const images = [];
      for (const file of files) images.push(await onUpload(file));
      change({ images: [...form.images, ...images] });
    } catch (e) { setError(e.message || 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่'); }
    finally { setBusy(''); }
  };
  const save = async event => {
    event.preventDefault();
    if (busy) return;
    const data = normalizeSalePromotion(form);
    const problem = validateSalePromotion(data);
    if (problem) { setError(problem); return; }
    setBusy('save'); setError(''); setNotice('');
    try {
      await onSave(data);
      dirty.current = false;
      setNotice('บันทึกโปรโมชั่นหน้าบ้านเรียบร้อยแล้ว');
    } catch (e) { setError(e.message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่'); }
    finally { setBusy(''); }
  };
  return <form onSubmit={save} className={styles.editor}>
    <h2>โปรโมชั่นหน้าบ้าน (Sale page)</h2>
    <p>เลือกรูปและบ้านที่ร่วมรายการ โปรโมชั่นส่วนนี้จัดการแยกจากป๊อปอัปหน้าแรก</p>
    <fieldset disabled={Boolean(busy)} className={styles.fields}>
      <label className={styles.check}><input type="checkbox" checked={form.isActive} onChange={e => change({ isActive: e.target.checked })} /> เปิดแสดงโปรโมชั่นในหน้าบ้าน</label>
      <label>ชื่อโปรโมชั่น<input maxLength={120} value={form.title} onChange={e => change({ title: e.target.value })} /></label>
      <div className={styles.upload}>
        <label>เพิ่มรูปโปรโมชั่น (สูงสุด 5 รูป)<input type="file" accept="image/*" multiple onChange={upload} disabled={form.images.length >= MAX_PROMOTION_IMAGES || Boolean(busy)} /></label>
        {popupImage && <button type="button" onClick={() => change({ images: [...form.images, popupImage] })}
          disabled={form.images.includes(popupImage) || form.images.length >= MAX_PROMOTION_IMAGES}>คัดลอกรูปจากป๊อปอัป</button>}
      </div>
      <p className={styles.hint}>ใช้ไฟล์ภาพขนาดไม่เกิน 5 MB ต่อรูป รูปแรกเป็นรูปหลัก กดบันทึกเมื่อจัดรูปเสร็จ</p>
      <div className={styles.imageList}>
        {form.images.map((image, index) => <div key={image}>
          <img src={image} alt={`รูปโปรโมชั่น ${index + 1}`} />
          <span>{index === 0 ? 'รูปหลัก' : `รูปที่ ${index + 1}`}</span>
          <div>
            {index > 0 && <button type="button" aria-label={`ใช้รูปที่ ${index + 1} เป็นรูปหลัก`} onClick={() => change({ images: [image, ...form.images.filter(url => url !== image)] })}>ใช้เป็นรูปหลัก</button>}
            <button type="button" aria-label={`ลบรูปโปรโมชั่น ${index + 1}`} onClick={() => change({ images: form.images.filter(url => url !== image) })}>ลบรูป</button>
          </div>
        </div>)}
      </div>
      <fieldset className={styles.scope}>
        <legend>บ้านที่ร่วมโปรโมชั่น</legend>
        <label className={styles.check}><input type="radio" name="promotion-scope" value="all" checked={form.scope === 'all'} onChange={() => change({ scope: 'all' })} /> บ้านทุกหลังที่ยังไม่ขาย</label>
        <label className={styles.check}><input type="radio" name="promotion-scope" value="selected" checked={form.scope === 'selected'} onChange={() => change({ scope: 'selected' })} /> เลือกเฉพาะบางหลัง</label>
      </fieldset>
      {form.scope === 'selected' && <div>
        <label>ค้นหาบ้านที่ร่วมรายการ<input type="search" placeholder="ชื่อโครงการ เลขบ้าน หรือรหัสบ้าน" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <p>เลือกแล้ว {form.propertyIds.length} หลัง</p>
        <div className={styles.houseList}>
          {candidates.map(property => <label key={property.id} className={styles.check}>
            <input type="checkbox" checked={form.propertyIds.includes(property.id)} onChange={e => change({ propertyIds: e.target.checked ? [...form.propertyIds, property.id] : form.propertyIds.filter(id => id !== property.id) })} />
            <span>{property.project_name} · {property.custom_id || property.house_number || property.id}{property.badge === 'Sold Out' ? ' (ขายแล้ว — ไม่แสดงโปรโมชั่น)' : ''}</span>
          </label>)}
          {!candidates.length && <p>ไม่พบบ้านที่ตรงกับคำค้นหา</p>}
        </div>
      </div>}
      <label>วันสิ้นสุดโปรโมชั่น (ไม่บังคับ)<input type="date" value={form.endDate} onChange={e => change({ endDate: e.target.value })} /></label>
      <p className={styles.hint}>แสดงจนสิ้นสุดวันที่เลือกตามเวลาไทย แล้วซ่อนอัตโนมัติ เว้นว่างหากไม่กำหนดวันสิ้นสุด</p>
      <button className={styles.save} type="submit">{busy === 'save' ? 'กำลังบันทึก...' : busy === 'upload' ? 'กำลังอัปโหลด...' : 'บันทึกโปรโมชั่นหน้าบ้าน'}</button>
    </fieldset>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
  </form>;
}
