import { PROPERTY_HIGHLIGHT_FIELDS } from '../../lib/propertyEditorial';

export default function PropertyEditorialFields({ value, onChange }) {
  const fields = items => items.map(({ key, label, hint }) => <div key={key}>
      <label className="label" htmlFor={`property-${key}`}>{label}</label>
      <textarea id={`property-${key}`} rows={3} maxLength={4000} className="input-modern"
        aria-describedby={`property-${key}-hint`} value={value[key] || ''}
        onChange={event => onChange(previous => ({ ...previous, [key]: event.target.value }))} />
      <p id={`property-${key}-hint`} className="text-xs text-gray-500 mt-1">{hint}</p>
    </div>);
  return <>
    <fieldset className="sm:col-span-2 space-y-4">
      <legend className="label">รายละเอียด (จุดเด่น)</legend>
      <p className="text-sm text-gray-500">แยกข้อมูลตามหัวข้อ ช่องที่เว้นว่างจะไม่แสดงบนหน้าบ้าน</p>
      {fields(PROPERTY_HIGHLIGHT_FIELDS)}
    </fieldset>
    <details className="sm:col-span-2 rounded-xl border border-gray-200 p-3">
      <summary className="cursor-pointer text-sm text-gray-600">รายละเอียดเดิม (ถ้ามี)</summary>
      <p id="property-highlights-hint" className="text-xs text-gray-500 mt-3 mb-2">ข้อความเดิมยังคงแสดงบนหน้าบ้าน หากย้ายข้อความไปยัง 3 หัวข้อด้านบนแล้ว สามารถลบข้อความส่วนนี้เพื่อไม่ให้ซ้ำ</p>
      <label className="label" htmlFor="property-highlights">ข้อความจุดเด่นเดิม</label>
      <textarea id="property-highlights" rows={4} className="input-modern" aria-describedby="property-highlights-hint"
        value={value.highlights || ''} onChange={event => onChange(previous => ({ ...previous, highlights: event.target.value }))} />
    </details>
  </>;
}
