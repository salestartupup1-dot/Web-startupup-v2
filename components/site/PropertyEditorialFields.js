import { PROPERTY_EDITORIAL_FIELDS } from '../../lib/propertyEditorial';

export default function PropertyEditorialFields({ value, onChange }) {
  return <fieldset className="sm:col-span-2 space-y-4">
    <legend className="label">ข้อมูลเพิ่มเติมสำหรับผู้สนใจบ้าน</legend>
    <p className="text-sm text-gray-500 mb-3">กรอกเฉพาะข้อมูลที่ยืนยันแล้ว ช่องที่เว้นว่างจะไม่แสดงบนหน้าบ้าน รายละเอียดเดิมยังคงแสดงตามปกติ</p>
    {PROPERTY_EDITORIAL_FIELDS.map(({ key, label, hint }) => <div key={key}>
      <label className="label" htmlFor={`property-${key}`}>{label}</label>
      <textarea id={`property-${key}`} rows={3} maxLength={4000} className="input-modern"
        aria-describedby={`property-${key}-hint`} value={value[key] || ''}
        onChange={event => onChange(previous => ({ ...previous, [key]: event.target.value }))} />
      <p id={`property-${key}-hint`} className="text-xs text-gray-500 mt-1">{hint}</p>
    </div>)}
  </fieldset>;
}
