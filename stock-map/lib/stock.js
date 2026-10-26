import { parseCSV } from './csv.mjs';

export const SHEET_ID = '1fdVOGbCgUCRVI_uYDBDZK7Mz0sajTxu4z6e3xS2JDQ4';
export const SHEET_GID = '0'; // แท็บ "Stockบ้าน"
export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${SHEET_GID}`;
const csvUrl = (sheetId, gid) => `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

// สถานะจาก Master Stock และชีตพาร์ทเนอร์ -> กลุ่มที่ใช้แสดงผล
const STATUS_GROUPS = {
  'ยังไม่เสร็จ': 'wip',
  'กำลังปรับปรุง': 'wip',
  'รอเข้าปรับปรุง': 'wip',
  'ว่าง': 'ready',
  'เร่งขาย': 'ready',
  'บ้านมาใหม่': 'ready',
  'ติดจอง': 'hold',
  'ยื่นกู้': 'hold',
  'ยื่นซ้อนได้': 'hold',
  'ประเมิน': 'hold',
  'รอโอน': 'hold',
  'ขายแล้ว': 'sold',
};

const groupOf = (rawStatus) => STATUS_GROUPS[rawStatus] || (rawStatus ? 'hold' : 'ready');

export const GROUP_META = {
  wip: { key: 'wip', label: 'ยังไม่เสร็จ', color: '#b45309', desc: 'อยู่ระหว่างปรับปรุง' },
  ready: { key: 'ready', label: 'พร้อมขาย', color: '#0b3d1b', desc: 'บ้านว่าง พร้อมเสนอลูกค้า' },
  hold: { key: 'hold', label: 'ติดลูกค้า', color: '#1d4ed8', desc: 'ติดจอง / ประเมิน / ยื่นกู้ / ยื่นซ้อนได้ / รอโอน' },
};

// เจ้าของบ้าน — ชุดเดียวกับแท็บใน Master Stock ของแอป All-in-One
export const OWNER_META = {
  startup: { key: 'startup', label: 'Startup Up', color: '#0b3d1b' },
  naphat: { key: 'naphat', label: 'Naphat', color: '#7c3aed' },
  muay: { key: 'muay', label: 'เจ๊หมวย', color: '#db2777' },
  baicha: { key: 'baicha', label: 'ใบชา', color: '#0891b2' },
  notting: { key: 'notting', label: 'Notting', color: '#ca8a04' },
  consign: { key: 'consign', label: 'ฝากขาย', color: '#64748b' },
};

export const OWNER_ORDER = ['startup', 'naphat', 'muay', 'baicha', 'notting', 'consign'];

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

/**
 * ชื่อทำเลแต่ละชีตเขียนไม่เหมือนกัน — จัดให้เป็นรูปเดียวกับ Master Stock ("ย่าน คลอง N")
 * บ้านทำเลเดียวกันจากหลายชีตจะได้รวมเป็นกลุ่มเดียวบนแผนที่
 *   "คลอง2 ลำลูกกา" -> "ลำลูกกา คลอง 2",  "ธัญบุรี คลอง4" -> "ธัญบุรี คลอง 4"
 */
export const normalizeZoneName = (value) => {
  const text = clean(value).replace(/\s{2,}/g, ' ').replace(/คลอง\s*(\d+)/g, 'คลอง $1');
  const leading = text.match(/^คลอง (\d+) (.+)$/);
  return leading ? `${leading[2]} คลอง ${leading[1]}` : text;
};

const toPrice = (value) => {
  const n = toNumber(value);
  // ชีต Naphat ใส่ราคาเป็นหน่วยล้าน (1.99 = 1,990,000)
  return n && n < 1000 ? Math.round(n * 1e6) : n;
};

const mapLink = (value) => (/^https?:\/\//.test(value) ? value : '');

// ชีตพาร์ทเนอร์ที่ยังไม่มีคอลัมน์ Location: ถ้าวางลิงก์ Google Maps ไว้ช่องไหนก็ตาม ให้ใช้ลิงก์นั้น
const GOOGLE_MAPS_LINK = /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.|maps\.)?google\.[a-z.]+\/maps)/;
const findMapLink = (row) => row.map(clean).find((cell) => GOOGLE_MAPS_LINK.test(cell)) || '';

async function readSheet(sheetId, gid) {
  const response = await fetch(csvUrl(sheetId, gid), {
    redirect: 'follow',
    headers: { 'User-Agent': 'startup-up-stock-map' },
  });
  if (!response.ok) throw new Error(`Google Sheet read failed (${response.status})`);

  const rows = parseCSV(await response.text());
  if (!rows.length) throw new Error('Google Sheet returned no rows');

  // ชีตพาร์ทเนอร์บางแผ่นมีแถวชื่อชีตอยู่เหนือหัวตาราง — หาแถวหัวตารางจริงก่อน
  const isHeader = (row) => row.some((cell) => clean(cell) === 'หมู่บ้าน');
  const headerAt = Math.max(0, rows.slice(0, 5).findIndex(isHeader));
  const idx = headerIndex(rows[headerAt]);
  const at = (row, name) => (idx[name] === undefined ? '' : clean(row[idx[name]]));

  return rows.slice(headerAt + 1)
    .map((row, i) => ({ row, rowIndex: headerAt + i + 2, at: (name) => at(row, name) }))
    .filter(({ at: get }) => get('หมู่บ้าน') || get('บ้านเลขที่'));
}

// ช่องที่ทุกชีตมีเหมือนกัน คำนวณกลุ่ม/ขนาด/ประเภทให้ครบในที่เดียว
const toHouse = ({ owner, rowIndex, project, rawStatus, style, area, price, zone, ...rest }) => {
  const { areaText, areaWah, areaUnit } = parseArea(area);
  return {
    uid: `${owner}:${rowIndex}`,
    owner,
    rowIndex,
    project: cleanProjectName(project),
    zone: normalizeZoneName(zone),
    area: areaText,
    areaWah,
    areaUnit,
    sizeBucket: sizeBucketOf(areaWah),
    style,
    styleCategory: styleCategoryOf(style),
    price: toPrice(price),
    rawStatus,
    group: groupOf(rawStatus),
    ...rest,
  };
};

export async function fetchStockRows() {
  const rows = await readSheet(SHEET_ID, SHEET_GID);

  return rows.map(({ rowIndex, at }) => {
    const share = at('หุ้นส่วน');
    const isConsignment = share === CONSIGNMENT_SHARE
      || at('Website') === CONSIGNMENT_MARK
      || at('หมดสัญญา') === CONSIGNMENT_MARK;

    return toHouse({
      owner: isConsignment ? 'consign' : 'startup',
      rowIndex, // เลขแถวจริงในชีต (1-based + header)
      project: at('หมู่บ้าน'),
      houseNumber: at('บ้านเลขที่'),
      soi: at('ซอย'),
      zone: at('ทำเล'),
      area: at('พื้นที่'),
      bedrooms: at('ห้องนอน'),
      bathrooms: at('ห้องน้ำ'),
      style: at('ประเภทบ้าน') || at('รูปแบบ'),
      price: at('ราคา'),
      rawStatus: at('สถานะ'),
      share,
      isConsignment,
      mapUrl: mapLink(at('Location')),
      startedAt: at('เริ่มทำ'),
      finishedAt: at('ทำเสร็จเมื่อ'),
      worker: at('ช่างที่ทำบ้าน'),
    });
  });
}

/**
 * ชีต Stock ของพาร์ทเนอร์ — ชุดเดียวกับที่ Master Stock ในแอป All-in-One อ่าน
 * แต่ละชีตตั้งชื่อคอลัมน์ไม่เหมือนกัน จึงแปลงทีละชีตให้เป็นรูปเดียวกับบ้าน Startup Up
 */
const PARTNER_SHEETS = [
  {
    owner: 'naphat',
    sheetId: '1PvLN75vNw4H5DSzGyDLFXEZRNd5i0QPWNb0XMmKpza8',
    gid: '1209885880', // แท็บ "Stock update"
    // ชีตนี้แยกสถานะขาย (คอลัมน์ "สถานะ") กับสถานะงานปรับปรุง ("สถานะ2") ไว้คนละช่อง
    toRow: (at) => {
      const sale = at('สถานะ');
      const work = at('สถานะ2');
      const district = at('เขต');
      const place = at('Location'); // คอลัมน์นี้เป็นชื่อย่าน ไม่ใช่ลิงก์แผนที่
      // ชื่อโครงการบางแถวมีหมายเหตุในวงเล็บ เช่น "ไดมอนด์วิลล์ (ย้ายออก พ.ย.69)" — แยกออกมา
      // บ้านโครงการเดียวกันจะได้อยู่กลุ่มเดียวกันและหาพิกัดจากโครงการได้
      const name = at('หมู่บ้าน');
      const notes = [...name.matchAll(/\(([^)]*)\)/g)].map((m) => m[1].trim()).filter(Boolean);
      return {
        project: name.replace(/\s*\([^)]*\)\s*/g, ' ').trim() || name,
        note: notes.join(' · '),
        houseNumber: at('บ้านเลขที่'),
        soi: at('ซอย'),
        zone: !place || place === district ? district : `${district} ${place}`,
        area: at('ขนาด'),
        bedrooms: at('นอน'),
        bathrooms: at('น้ำ'),
        style: at('Type'),
        price: at('ราคา'),
        rawStatus: sale === 'จอง' ? 'ติดจอง' : STATUS_GROUPS[work] === 'wip' ? work : sale,
        finishedAt: at('วันที่แล้วเสร็จ'),
      };
    },
  },
  {
    owner: 'muay',
    sheetId: '1cdkbVABQypyqgQYigFeyDwaoRvIYhxVyztTQpkJkSWg',
    gid: '597410899', // แท็บ "Stock เจ๊หมวย"
    toRow: (at) => ({
      project: at('หมู่บ้าน'),
      houseNumber: at('บ้านเลขที่'),
      soi: at('ซอย'),
      zone: at('พื้นที่'),
      area: at('ขนาด'),
      bedrooms: at('นอน'),
      bathrooms: at('ห้องน้ำ'),
      style: '',
      price: at('ราคาขาย') || at('ราคาลด (ราคาตามพี่เกม)') || at('ราคาปกติ') || at('ราคาตลาด'),
      rawStatus: at('สถานะ'),
      mapUrl: mapLink(at('Location')),
    }),
  },
  {
    owner: 'baicha',
    sheetId: SHEET_ID,
    gid: '429867417', // แท็บ "บ้านบริษัท อินดิโก้ 1997"
    toRow: (at) => ({
      project: at('หมู่บ้าน'),
      houseNumber: at('บ้านเลขที่'),
      zone: at('ทำเล'),
      address: at('รายละเอียดที่อยู่'),
      area: at('พื้นที่'),
      bedrooms: at('ห้องนอน'),
      bathrooms: at('ห้องน้ำ'),
      style: at('รูปแบบ'),
      price: at('ราคา'),
      rawStatus: at('สถานะ'),
    }),
  },
  {
    owner: 'notting',
    sheetId: SHEET_ID,
    gid: '1781736015', // แท็บ "STOCK Notting"
    toRow: (at) => ({
      project: at('หมู่บ้าน'),
      houseNumber: at('บ้านเลขที่'),
      soi: at('ซอย'),
      zone: at('ทำเล'),
      address: at('รายละเอียดที่อยู่'),
      area: at('พื้นที่'),
      bedrooms: at('ห้องนอน'),
      bathrooms: at('ห้องน้ำ'),
      style: at('รูปแบบ'),
      price: at('ราคา'),
      rawStatus: at('สถานะ'),
      mapUrl: mapLink(at('Location')),
    }),
  },
];

/**
 * อ่านชีตพาร์ทเนอร์ทุกแผ่นพร้อมกัน — แผ่นไหนอ่านไม่ได้ให้ข้ามไปและรายงานใน errors
 * แผนที่จะได้ยังเปิดได้แม้ชีตพาร์ทเนอร์แผ่นเดียวมีปัญหา
 */
export async function fetchPartnerRows() {
  const results = await Promise.allSettled(PARTNER_SHEETS.map(async (sheet) => {
    const rows = await readSheet(sheet.sheetId, sheet.gid);
    return rows.map(({ row, rowIndex, at }) => {
      const fields = sheet.toRow(at);
      return toHouse({ owner: sheet.owner, rowIndex, ...fields, mapUrl: fields.mapUrl || findMapLink(row) });
    });
  }));

  const rows = [];
  const errors = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') rows.push(...result.value);
    else errors.push(`${OWNER_META[PARTNER_SHEETS[i].owner].label}: ${result.reason?.message || result.reason}`);
  });
  return { rows, errors };
}

export const houseIdentity = (house) => `${normalizeKey(house.project)}|${normalizeKey(house.houseNumber)}`;

/**
 * บ้านที่ยังไม่ขายของทุกเจ้าของ — ถ้าบ้านหลังเดียวกันอยู่ทั้งใน Master Stock และชีตพาร์ทเนอร์
 * (เช่นบ้านหุ้น G+Naphat) ใช้แถวของ Master Stock เหมือนที่แอป All-in-One ทำ
 */
export const selectAllActive = (stockRows, partnerRows) => {
  const stock = stockRows.filter((row) => row.group !== 'sold');
  const seen = new Set(stock.map(houseIdentity));
  const partners = partnerRows.filter((row) => {
    if (row.group === 'sold') return false;
    if (!normalizeKey(row.houseNumber)) return true;
    const key = houseIdentity(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...stock, ...partners];
};

// บ้านของ Startup Up ที่ยังไม่ขาย (ตัดรายการฝากขายและที่ขายแล้วออก)
export const selectOwnedActive = (rows) => rows
  .filter((row) => !row.isConsignment && row.group !== 'sold');
