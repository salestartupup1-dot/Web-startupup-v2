import { parseCSV } from './csv.mjs';

export const SHEET_ID = '1fdVOGbCgUCRVI_uYDBDZK7Mz0sajTxu4z6e3xS2JDQ4';
export const SHEET_GID = '0'; // แท็บ "Stockบ้าน"
export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${SHEET_GID}`;
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

// สถานะจาก Master Stock -> กลุ่มที่ใช้แสดงผล
const STATUS_GROUPS = {
  'ยังไม่เสร็จ': 'wip',
  'ว่าง': 'ready',
  'ยื่นกู้': 'hold',
  'ยื่นซ้อนได้': 'hold',
  'ประเมิน': 'hold',
  'รอโอน': 'hold',
  'ขายแล้ว': 'sold',
};

export const GROUP_META = {
  wip: { key: 'wip', label: 'ยังไม่เสร็จ', color: '#b45309', desc: 'อยู่ระหว่างปรับปรุง' },
  ready: { key: 'ready', label: 'พร้อมขาย', color: '#0b3d1b', desc: 'บ้านว่าง พร้อมเสนอลูกค้า' },
  hold: { key: 'hold', label: 'ติดลูกค้า', color: '#1d4ed8', desc: 'ประเมิน / ยื่นกู้ / ยื่นซ้อนได้ / รอโอน' },
};

export const GROUP_ORDER = ['wip', 'ready', 'hold'];

// จัดกลุ่ม "ประเภทบ้าน" (ชื่อเดิม "รูปแบบ") — ลำดับสำคัญ ใช้ตัวที่ match ก่อน
export const STYLE_CATEGORIES = [
  { key: 'twin', label: 'บ้านแฝด', test: (s) => /บ้านแฝด/.test(s) },
  { key: 'detached', label: 'บ้านเดี่ยว', test: (s) => /บ้านเดี่ยว/.test(s) },
  { key: 'condo', label: 'ห้องชุด', test: (s) => /ห้องชุด|คอนโด/.test(s) },
  { key: 'corner', label: 'หลังริม / แปลงมุม', test: (s) => /หลังริม|หลังมุม|แปลงมุม/.test(s) },
  { key: 'townhouse', label: 'ทาวน์เฮาส์', test: (s) => /ทาวน์เฮาส์/.test(s) },
];

export const STYLE_ORDER = ['townhouse', 'corner', 'twin', 'detached', 'condo', 'other'];

export const STYLE_LABELS = {
  ...Object.fromEntries(STYLE_CATEGORIES.map((c) => [c.key, c.label])),
  other: 'ไม่ระบุรูปแบบ',
};

export const styleCategoryOf = (style) => {
  const value = String(style || '');
  return STYLE_CATEGORIES.find((category) => category.test(value))?.key || 'other';
};

// ช่วงขนาดที่ทีมขายใช้เรียกกันจริง (ตร.ว.) — ห้องชุดที่วัดเป็น ตร.ม. จะไม่ถูกจัดเข้าช่วงเหล่านี้
export const SIZE_BUCKETS = [
  { key: 'under16', label: 'ต่ำกว่า 16', min: 0, max: 15 },
  { key: '16-18', label: '16–18', min: 16, max: 18 },
  { key: '19-22', label: '19–22', min: 19, max: 22 },
  { key: '23-24', label: '23–24', min: 23, max: 24 },
  { key: '25-29', label: '25–29', min: 25, max: 29 },
  { key: '30-34', label: '30–34', min: 30, max: 34 },
  { key: '35-49', label: '35–49', min: 35, max: 49 },
  { key: '50+', label: '50 ขึ้นไป', min: 50, max: Infinity },
];

/**
 * ปัดเศษลงก่อนจัดช่วง — พื้นที่ในชีตมีทศนิยม (18.2, 24.6, 29.7) ถ้าเทียบตรงๆ
 * กับขอบที่เป็นจำนวนเต็มจะร่วงออกจากทุกช่วง และตรงกับที่ทีมขายเรียกกันจริง
 * (24.6 ตร.ว. คือบ้าน "24 ตร.ว. นิดๆ")
 */
export const sizeBucketOf = (areaWah) => {
  if (!areaWah || areaWah <= 0) return null;
  const wah = Math.floor(areaWah);
  return SIZE_BUCKETS.find((bucket) => wah >= bucket.min && wah <= bucket.max)?.key || null;
};

/**
 * แยกชื่อทำเลเป็น (ย่าน, เลข) เพื่อให้ทำเลย่านเดียวกันอยู่ติดกันและเรียงเลขคลองตามลำดับ
 *   "คลองหลวง คลอง 3" -> { area: 'คลองหลวง', number: 3, label: 'คลอง 3' }
 *   "สายไหม 33"       -> { area: 'สายไหม',   number: 33, label: '33' }
 *   "พยอม"            -> { area: 'พยอม',     number: null, label: '' }
 */
export const parseZoneName = (name) => {
  const text = String(name || '').trim();

  const khlong = text.match(/^(.+?)\s*คลอง\s*(\d+)\s*$/);
  if (khlong) return { area: khlong[1].trim(), number: Number(khlong[2]), label: `คลอง ${khlong[2]}` };

  const numbered = text.match(/^(.+?)\s+(\d+)\s*$/);
  if (numbered) return { area: numbered[1].trim(), number: Number(numbered[2]), label: numbered[2] };

  return { area: text, number: null, label: '' };
};

/** เรียงย่านที่มีบ้านเยอะขึ้นก่อน แล้วในย่านเดียวกันเรียงตามเลขคลองจากน้อยไปมาก */
export const makeZoneComparator = (areaTotals) => (a, b) => {
  const pa = parseZoneName(a.name);
  const pb = parseZoneName(b.name);

  if (pa.area !== pb.area) {
    const byTotal = (areaTotals[pb.area] || 0) - (areaTotals[pa.area] || 0);
    if (byTotal) return byTotal;
    return pa.area.localeCompare(pb.area, 'th');
  }
  if (pa.number !== pb.number) {
    if (pa.number === null) return 1;
    if (pb.number === null) return -1;
    return pa.number - pb.number;
  }
  return a.name.localeCompare(b.name, 'th');
};

export const zoneAreaTotals = (zones) => zones.reduce((totals, zone) => {
  const { area } = parseZoneName(zone.name);
  return { ...totals, [area]: (totals[area] || 0) + (zone.houseCount || 0) };
}, {});

const CONSIGNMENT_MARK = 'ฝากขาย';
const CONSIGNMENT_SHARE = '3%';

const clean = (value) => String(value ?? '').replace(/ /g, ' ').trim();

// ชื่อโครงการในชีตมีการต่อท้ายด้วย ** เพื่อทำเครื่องหมายภายใน — ตัดออกเพื่อให้จัดกลุ่มถูกโครงการเดียวกัน
export const cleanProjectName = (value) => clean(value).replace(/\*+\s*$/, '').replace(/\s{2,}/g, ' ').trim();

export const normalizeKey = (value) => clean(value)
  .toLowerCase()
  .replace(/\*+/g, '')
  .replace(/\s+/g, '')
  .replace(/[-–—]/g, '/');

const toNumber = (value) => {
  const n = Number(clean(value).replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * คอลัมน์ "พื้นที่" เป็น ตร.ว. เปล่าๆ ยกเว้นห้องชุดที่เขียนกำกับว่า ตร.ม.
 * แยกหน่วยไว้เพื่อไม่ให้ 32 ตร.ม. ไปโผล่ในช่วง "30–34 ตร.ว."
 */
const parseArea = (raw) => {
  const text = clean(raw);
  if (!text) return { areaText: '', areaWah: null, areaUnit: null };

  const amount = toNumber(text.replace(/[^\d.,]/g, ''));
  if (!amount) return { areaText: text, areaWah: null, areaUnit: null };

  const isSqm = /ตร\.?\s*ม|ตารางเมตร|sqm|sq\.?m/i.test(text);
  return {
    areaText: `${amount} ${isSqm ? 'ตร.ม.' : 'ตร.ว.'}`,
    areaWah: isSqm ? null : amount,
    areaUnit: isSqm ? 'sqm' : 'wah',
  };
};

const headerIndex = (headerRow) => {
  const index = {};
  headerRow.forEach((name, i) => {
    const key = clean(name);
    if (key && !(key in index)) index[key] = i;
  });
  return index;
};

export async function fetchStockRows() {
  const response = await fetch(CSV_URL, {
    redirect: 'follow',
    headers: { 'User-Agent': 'startup-up-stock-map' },
  });
  if (!response.ok) throw new Error(`Google Sheet read failed (${response.status})`);

  const rows = parseCSV(await response.text());
  if (!rows.length) throw new Error('Google Sheet returned no rows');

  const idx = headerIndex(rows[0]);
  const at = (row, name) => (idx[name] === undefined ? '' : clean(row[idx[name]]));

  return rows.slice(1)
    .filter((row) => clean(row[idx['หมู่บ้าน']]) || clean(row[idx['บ้านเลขที่']]))
    .map((row, i) => {
      const share = at(row, 'หุ้นส่วน');
      const isConsignment = share === CONSIGNMENT_SHARE
        || at(row, 'Website') === CONSIGNMENT_MARK
        || at(row, 'หมดสัญญา') === CONSIGNMENT_MARK;

      const rawStatus = at(row, 'สถานะ');
      const style = at(row, 'ประเภทบ้าน') || at(row, 'รูปแบบ');
      const { areaText, areaWah, areaUnit } = parseArea(at(row, 'พื้นที่'));

      return {
        rowIndex: i + 2, // เลขแถวจริงในชีต (1-based + header)
        project: cleanProjectName(row[idx['หมู่บ้าน']]),
        houseNumber: at(row, 'บ้านเลขที่'),
        soi: at(row, 'ซอย'),
        zone: at(row, 'ทำเล'),
        area: areaText,
        areaWah,
        areaUnit,
        sizeBucket: sizeBucketOf(areaWah),
        bedrooms: at(row, 'ห้องนอน'),
        bathrooms: at(row, 'ห้องน้ำ'),
        style,
        styleCategory: styleCategoryOf(style),
        price: toNumber(at(row, 'ราคา')),
        rawStatus,
        group: STATUS_GROUPS[rawStatus] || (rawStatus ? 'hold' : 'ready'),
        share,
        isConsignment,
        mapUrl: /^https?:\/\//.test(at(row, 'Location')) ? at(row, 'Location') : '',
        startedAt: at(row, 'เริ่มทำ'),
        finishedAt: at(row, 'ทำเสร็จเมื่อ'),
        worker: at(row, 'ช่างที่ทำบ้าน'),
      };
    });
}

// บ้านของ Startup Up ที่ยังไม่ขาย (ตัดรายการฝากขายและที่ขายแล้วออก)
export const selectOwnedActive = (rows) => rows
  .filter((row) => !row.isConsignment && row.group !== 'sold');
