import { SEO_LOCATIONS } from './seoLocations.js';
import { SEO_LANDINGS } from './seoLandings.js';
import { locationMarket } from './locationMarket.js';
import { propertyPath } from './propertyRoutes.js';
import { monthlyMortgage } from './mortgage.js';
import { PHONE, thaiDate, thb, num, payment, TYPES, typeOf, range, median, tally, cleanProject } from './locationCopy.js';

/**
 * AEO articles A, B and C (work order 11.2). Every number, project, canal and house link is
 * computed from the houses open for sale on the website when the page is generated, so the
 * articles never disagree with the location pages. Wording about viewings and loans is Peth's.
 */
export const MARKET_REVALIDATE_SECONDS = 6 * 3600;
const pathum = SEO_LOCATIONS.find(location => location.copy === 'pathum');
const byName = name => SEO_LOCATIONS.find(location => location.name === name);
const landing = (kind, maxPrice) => SEO_LANDINGS.find(page => page.kind === kind && (maxPrice === undefined || page.maxPrice === maxPrice));
const link = (label, href) => ({ label, href });
const pageLink = page => page && link(page.heading || page.name || `บ้านมือสอง${page.name}`, `/${page.slug}`);
const locLink = name => { const page = byName(name); return page && link(`บ้านมือสอง${page.name}`, `/${page.slug}`); };
const CALCULATOR = link('คำนวณค่าผ่อนบ้าน', '/?tab=calculator');
const VISIT = `โทร ${PHONE} หรือทัก LINE ของ Startup Up แจ้งหลังที่สนใจและวันที่สะดวก ทีมงานจะนัดพาชมบ้านจริง`;
const LOAN = 'ทีมงานช่วยเตรียมเอกสารและยื่นสินเชื่อบ้าน และดูแลจนถึงวันโอน';
const OFFICE = 'สำนักงาน Startup Up Real Estate อยู่ที่ 39/43, 39/44 หมู่ 5 ต.คลองสาม อ.คลองหลวง จ.ปทุมธานี 12120';
const COUNT_NOTE = 'ตัวเลขในบทความนี้นับเฉพาะบ้านของ Startup Up Real Estate ที่รีโนเวทเสร็จและเปิดขายบนเว็บไซต์ ไม่รวมหลังที่ขายแล้ว และอัปเดตตามรายการบ้านบนเว็บโดยอัตโนมัติ ก่อนนัดชมควรเปิดหน้าบ้านเพื่อดูสถานะล่าสุดอีกครั้ง';

const DIGITS = { หนึ่ง: 1, สอง: 2, สาม: 3, สี่: 4, ห้า: 5, หก: 6, เจ็ด: 7, แปด: 8, เก้า: 9, สิบ: 10 };
export const canal = value => String(value || '').trim().replace(/^คลอง(หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ)$/, (_, word) => `คลอง ${DIGITS[word]}`);
const subArea = house => canal(house.sub_location || house.subdistrict);
const place = house => [house.district, subArea(house)].filter((part, i, all) => part && all.indexOf(part) === i).join(' ');
const mb = value => String(Number((value / 1e6).toFixed(2)));
const mrange = values => {
  const list = values.filter(value => value > 0).sort((a, b) => a - b);
  if (!list.length) return '';
  return list[0] === list.at(-1) ? `${mb(list[0])} ล้าน` : `${mb(list[0])}–${mb(list.at(-1))} ล้าน`;
};
const area = list => range(list.map(house => num(house.area_wah)), 'ตร.ว.', String);
const beds = list => range(list.map(house => num(house.bedrooms)), 'ห้อง', String);
const prices = list => list.map(house => num(house.price));
const pay = (price, rate, years) => thb(monthlyMortgage(price, rate, years));
/** "พฤกษาB" is shown as "พฤกษา B", so both spellings read and group the same. */
const projectName = house => cleanProject(house.project_name).replace(/(\p{Script=Thai})([A-Z])$/u, '$1 $2');
const label = house => `${projectName(house)} ${String(house.house_number || '').trim()}`.trim();
const houseLink = house => link(`${label(house)} · ${thb(num(house.price))} บาท`, propertyPath(house));
const byPrice = (a, b) => num(a.price) - num(b.price) || label(a).localeCompare(label(b), 'th');
const isoDay = date => {
  const bangkok = new Date(date.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  return `${bangkok}T00:00:00+07:00`;
};
const types = list => TYPES.map(([name]) => ({ name, houses: list.filter(house => typeOf(house) === name) })).filter(type => type.houses.length);
const typeCounts = list => {
  const groups = types(list);
  if (groups.length === 1) return list.length > 1 ? `${groups[0].name}ทั้งหมด` : groups[0].name;
  return groups.map(type => `${type.name} ${type.houses.length} หลัง`).join(' ');
};
const where = (list, key = place) => {
  const [top] = tally(list.map(key));
  if (!top) return '';
  return top[1] * 2 > list.length ? `ส่วนใหญ่อยู่${top[0]} (${top[1]} หลัง)` : `มีมากที่สุดที่${top[0]} (${top[1]} หลัง)`;
};
const typeCell = list => list.length ? `${list.length} หลัง · ${mrange(prices(list))}` : '–';
const paymentTable = (values, asOf) => ({
  caption: `ค่าผ่อนโดยประมาณต่อเดือน (บาท) ไม่ใช่ผลอนุมัติของธนาคาร · ราคาบ้านอ้างอิง ณ ${asOf}`,
  headers: ['ราคาบ้าน', '3% 40 ปี (แบบที่เว็บใช้)', '4% 30 ปี', '5.5% 30 ปี'],
  rows: [...new Set(values.filter(value => value > 0))].sort((a, b) => a - b)
    .map(price => [`${thb(price)} บาท`, pay(price, 3, 40), pay(price, 4, 30), pay(price, 5.5, 30)]),
});
const PAYMENT_TEXT = 'เว็บไซต์แสดงค่าผ่อนโดยประมาณของทุกหลัง คิดที่ดอกเบี้ย 3% ระยะ 40 ปี ตารางนี้เทียบกับดอกเบี้ย 4% และ 5.5% ระยะ 30 ปีด้วย ยอดผ่อนจริงขึ้นกับวงเงิน ดอกเบี้ย และระยะเวลาที่ธนาคารอนุมัติ';
const section = (id, heading, paragraphs, extra = {}) => ({ id, heading, paragraphs, ...extra });
const faq = pairs => pairs.map(([question, answer]) => ({ question, answer }));
const BANDS = [[0, 2e6, 'ไม่เกิน 2 ล้าน'], [2e6, 2.5e6, '2–2.5 ล้าน'], [2.5e6, 3e6, '2.5–3 ล้าน'], [3e6, Infinity, 'มากกว่า 3 ล้าน']];
const inBand = ([low, high]) => house => num(house.price) > low && num(house.price) <= high;
const forSale = properties => locationMarket(pathum, properties).houses.filter(house => num(house.price)).sort(byPrice);
const districts = list => tally(list.map(house => house.district)).map(([name, count]) => ({ name, count, houses: list.filter(house => house.district === name) }));
const common = (now, extra) => ({ dataAsOf: thaiDate(now), dateModified: isoDay(now), sources: [], closing: `สนใจหลังไหน ${VISIT}`, ...extra });

/** A — บ้านมือสองรีโนเวท ปทุมธานี ราคาเท่าไร? สรุปตามทำเลและประเภทบ้าน */
export function priceArticle(properties, now = new Date()) {
  const houses = forSale(properties);
  if (!houses.length) return null;
  const asOf = thaiDate(now);
  const all = prices(houses);
  const mid = median(all);
  const groups = types(houses).sort((a, b) => b.houses.length - a.houses.length);
  const [main, ...rest] = groups;
  const typeText = [main.houses.length * 2 > houses.length ? `ส่วนใหญ่เป็น${main.name} ${main.houses.length} หลัง ราคา ${mrange(prices(main.houses))}บาท` : `${main.name}ราคา ${mrange(prices(main.houses))}บาท`,
    ...rest.map(type => `${type.name}ราคา ${mrange(prices(type.houses))}บาท`)].join(' ');
  const areas = districts(houses);
  const [top] = areas;
  const [topSub] = tally(top.houses.map(subArea));
  const townhouseAreas = areas.map(d => ({ ...d, townhouses: d.houses.filter(house => typeOf(house) === 'ทาวน์เฮาส์') })).filter(d => d.townhouses.length >= 2)
    .map(d => ({ ...d, mid: median(prices(d.townhouses)) })).sort((a, b) => a.mid - b.mid);
  const detached = houses.filter(house => typeOf(house) === 'บ้านเดี่ยว');
  const widest = [...detached].sort((a, b) => num(b.area_wah) - num(a.area_wah))[0];
  const corner = houses.filter(house => /หลังริม/.test(house.category || ''));
  const middle = houses.filter(house => typeOf(house) === 'ทาวน์เฮาส์' && !/หลังริม/.test(house.category || ''));
  const cheapest = areas.map(d => d.houses[0]);
  const intro = `บ้านมือสองรีโนเวท ปทุมธานี ของ Startup Up Real Estate (ข้อมูล ณ ${asOf}) มี ${houses.length} หลัง ราคา ${mrange(all)}บาท ${typeText} ครึ่งหนึ่งของบ้านที่เปิดขายราคาไม่เกิน ${mb(mid)} ล้านบาท ผ่อนประมาณ ${thb(payment(mid))} บาทต่อเดือน (ดอกเบี้ย 3% ระยะ 40 ปี)`;
  return common(now, {
    description: `บ้านมือสองรีโนเวท ปทุมธานี ของ Startup Up Real Estate มี ${houses.length} หลัง ราคา ${mrange(all)}บาท แยกตามทำเลและประเภทบ้าน พร้อมตารางค่าผ่อน (ข้อมูล ณ ${asOf})`,
    introduction: [intro, COUNT_NOTE],
    sections: [
      section('by-area', 'ราคาบ้านมือสองรีโนเวท ปทุมธานี แยกตามทำเล', [`บ้านที่เปิดขายอยู่ใน ${areas.length} อำเภอ ได้แก่ ${areas.map(d => `${d.name} ${d.count} หลัง`).join(' ')}`], {
        dataTable: { caption: `จำนวนและราคา แยกตามทำเลและประเภทบ้าน (ข้อมูล ณ ${asOf})`, headers: ['ทำเล', 'จำนวน', 'ทาวน์เฮาส์', 'บ้านแฝด', 'บ้านเดี่ยว'],
          rows: areas.map(d => [d.name, `${d.count} หลัง`, ...TYPES.map(([name]) => typeCell(d.houses.filter(house => typeOf(house) === name)))]) },
        after: [
          `${top.name}มีบ้านมากที่สุด ${top.count} หลัง${topSub ? ` ${where(top.houses, subArea)}` : ''}`,
          ...(townhouseAreas.length > 1 ? [`ถ้าดูทาวน์เฮาส์ ${townhouseAreas[0].name}มีราคาย่อมเยาที่สุด ครึ่งหนึ่งของทาวน์เฮาส์ที่นี่ราคาไม่เกิน ${mb(townhouseAreas[0].mid)} ล้านบาท`] : []),
          ...(widest ? [`บ้านเดี่ยวที่ดินกว้างที่สุดอยู่ใน${widest.district} ขนาด ${widest.area_wah} ตร.ว. บ้านเดี่ยวทั้งหมดมีที่ดิน ${area(detached)}`] : []),
        ],
        links: [pageLink(pathum), ...areas.map(d => locLink(d.name))].filter(Boolean) }),
      section('by-type', 'ราคาแยกตามประเภทบ้าน', [
        corner.length && middle.length ? `ทาวน์เฮาส์ในตารางรวมหลังริม ${corner.length} หลัง หลังริมมีที่ดิน ${area(corner)} ส่วนหลังกลางมีที่ดิน ${area(middle)}` : 'ตารางนี้สรุปราคา ขนาดที่ดิน และจำนวนห้องนอนของบ้านแต่ละประเภทที่เปิดขาย'], {
        dataTable: { caption: `ราคาและขนาดแยกตามประเภทบ้าน (ข้อมูล ณ ${asOf})`, headers: ['ประเภท', 'จำนวน', 'ราคา', 'ที่ดิน', 'ห้องนอน'],
          rows: groups.map(type => [type.name, `${type.houses.length} หลัง`, `${mrange(prices(type.houses))}บาท`, area(type.houses), beds(type.houses)]) },
        links: [pageLink(landing('townhouse')), pageLink(landing('corner-townhouse')), pageLink(landing('detached'))].filter(Boolean) }),
      section('by-budget', 'จำนวนบ้านในแต่ละช่วงงบ', ['แบ่งบ้านที่เปิดขายตามช่วงราคา เพื่อดูว่างบที่มีเลือกได้กี่หลัง และอยู่ทำเลไหน'], {
        dataTable: { caption: `จำนวนบ้านแยกตามช่วงราคา (ข้อมูล ณ ${asOf})`, headers: ['ช่วงราคา', 'จำนวน', 'ทำเลที่มีมากที่สุด', 'ผ่อนเริ่มต้น (3% 40 ปี)'],
          rows: BANDS.map(band => { const list = houses.filter(inBand(band)); const [best] = tally(list.map(house => house.district));
            return [band[2], `${list.length} หลัง`, best ? `${best[0]} (${best[1]} หลัง)` : '–', list.length ? `${thb(payment(num(list[0].price)))} บาท/เดือน` : '–']; }) },
        links: [pageLink(landing('budget', 2000000)), pageLink(landing('budget', 2500000)), pageLink(landing('budget', 3000000))].filter(Boolean) }),
      section('payment', 'ผ่อนบ้านมือสองรีโนเวท ปทุมธานี เดือนละเท่าไร', [PAYMENT_TEXT], {
        dataTable: paymentTable([all[0], 2000000, mid, 2500000, 3000000, all.at(-1)], asOf), links: [CALCULATOR] }),
      section('examples', 'ตัวอย่างบ้านราคาเริ่มต้นในแต่ละทำเล', [`หลังราคาต่ำสุดของแต่ละทำเล ณ ${asOf}`], {
        bullets: cheapest.map(house => `${house.district}: ${label(house)} ${house.category} ที่ดิน ${house.area_wah} ตร.ว. ${house.bedrooms} ห้องนอน ราคา ${thb(num(house.price))} บาท ผ่อนประมาณ ${thb(payment(num(house.price)))} บาท/เดือน`),
        links: cheapest.map(houseLink) }),
      section('visit', 'นัดชมบ้านและช่วยยื่นกู้', [VISIT, LOAN, OFFICE]),
    ],
    faq: faq([
      ['บ้านมือสองรีโนเวทปทุมธานีราคาเริ่มต้นเท่าไร?', `บ้านของ Startup Up Real Estate ในปทุมธานีราคาเริ่มต้น ${thb(all[0])} บาท เป็น${houses[0].category} ข้อมูล ณ ${asOf}`],
      ['บ้านเดี่ยวมือสองรีโนเวทปทุมธานีราคาเท่าไร?', detached.length
        ? `บ้านเดี่ยวของ Startup Up Real Estate มี ${detached.length} หลัง ราคา ${range(prices(detached))} ที่ดิน ${area(detached)} ข้อมูล ณ ${asOf}`
        : `ตอนนี้ยังไม่มีบ้านเดี่ยวเปิดขาย ข้อมูล ณ ${asOf} ดูรายการล่าสุดได้ที่หน้าบ้านเดี่ยวมือสอง ปทุมธานี`],
      ['Startup Up มีบ้านในปทุมธานีกี่หลัง?', `${houses.length} หลัง ใน${areas.map(d => d.name).join(' ')} ข้อมูล ณ ${asOf} ดูรายการล่าสุดได้ที่หน้าบ้านมือสองรีโนเวท ปทุมธานี`],
    ]),
  });
}

/** B — งบ 2 ล้าน ซื้อบ้านมือสองรีโนเวทปทุมธานีได้ทำเลไหน? */
export function budgetArticle(properties, now = new Date()) {
  const houses = forSale(properties);
  if (!houses.length) return null;
  const asOf = thaiDate(now);
  const under = houses.filter(inBand(BANDS[0]));
  const stretch = houses.filter(inBand(BANDS[1]));
  const above = houses.filter(house => num(house.price) > 2500000);
  const bigger = list => list.filter(house => num(house.bedrooms) >= 3).length;
  const lowest = num(houses[0].price);
  const underText = under.length
    ? `งบไม่เกิน 2 ล้านบาท ซื้อบ้านมือสองรีโนเวทของ Startup Up Real Estate ในปทุมธานีได้ ${under.length} หลัง (ข้อมูล ณ ${asOf}) ${where(under)} เป็น${typeCounts(under)} ที่ดิน ${area(under)} ค่าผ่อนประมาณ ${range(prices(under).map(payment), 'บาทต่อเดือน')} (ดอกเบี้ย 3% ระยะ 40 ปี)`
    : `ตอนนี้ยังไม่มีบ้านของ Startup Up Real Estate ในปทุมธานีที่ราคาไม่เกิน 2 ล้านบาท (ข้อมูล ณ ${asOf}) หลังราคาต่ำสุดอยู่ที่ ${thb(lowest)} บาท`;
  const stretchText = stretch.length ? ` ถ้าขยับงบเป็น 2–2.5 ล้านบาท มีเพิ่มอีก ${stretch.length} หลัง ${where(stretch)}` : '';
  // Price first: on a phone only the first columns are visible before scrolling the table.
  const houseRow = house => [label(house), `${thb(num(house.price))} บาท`, `${thb(payment(num(house.price)))} บาท`, place(house), house.category, `${house.area_wah} ตร.ว.`, `${house.bedrooms} ห้อง`];
  const houseHeaders = ['บ้าน', 'ราคา', 'ผ่อน/เดือน (3% 40 ปี)', 'ทำเล', 'ประเภท', 'ที่ดิน', 'ห้องนอน'];
  return common(now, {
    description: `งบ 2 ล้าน ซื้อบ้านมือสองรีโนเวท ปทุมธานีของ Startup Up Real Estate ได้ ${under.length} หลัง ดูทำเล ขนาด ค่าผ่อน และบ้านช่วง 2–2.5 ล้าน (ข้อมูล ณ ${asOf})`,
    introduction: [`${underText}${stretchText}`, COUNT_NOTE],
    sections: [
      section('bands', 'บ้านมือสอง ปทุมธานี งบ 2 ล้าน เทียบกับช่วงราคาอื่น', [`จากบ้านที่เปิดขายทั้งหมด ${houses.length} หลัง แบ่งตามช่วงราคาได้ดังนี้`], {
        dataTable: { caption: `จำนวนบ้านแยกตามช่วงราคา (ข้อมูล ณ ${asOf})`, headers: ['ช่วงราคา', 'จำนวน', 'ทำเล', 'ประเภท'],
          rows: BANDS.map(band => { const list = houses.filter(inBand(band));
            return [band[2], `${list.length} หลัง`, list.length ? tally(list.map(house => house.district)).map(([name, count]) => `${name} (${count} หลัง)`).join(' ') : '–', list.length ? typeCounts(list) : '–']; }) } }),
      section('under-2m', 'บ้านราคาไม่เกิน 2 ล้านบาท มีหลังไหนบ้าง', [under.length
        ? `บ้านราคาไม่เกิน 2 ล้านบาทมี ${under.length} หลัง เรียงจากราคาต่ำไปสูง กดชื่อบ้านด้านล่างเพื่อดูรูปและรายละเอียด`
        : 'ตอนนี้ยังไม่มีบ้านราคาไม่เกิน 2 ล้านบาทเปิดขาย ดูบ้านช่วงราคาถัดไปได้ในหัวข้อด้านล่าง'], {
        ...(under.length ? { dataTable: { caption: `บ้านราคาไม่เกิน 2 ล้านบาท (ข้อมูล ณ ${asOf})`, headers: houseHeaders, rows: under.map(houseRow) } } : {}),
        links: [...under.slice(0, 6).map(houseLink), pageLink(landing('budget', 2000000))].filter(Boolean) }),
      section('stretch', 'ขยับงบเป็น 2–2.5 ล้านบาท ได้บ้านแบบไหนเพิ่ม', [stretch.length
        ? `ช่วงราคา 2–2.5 ล้านบาทมี ${stretch.length} หลัง ${where(stretch)} เป็น${typeCounts(stretch)} ที่ดิน ${area(stretch)} มีบ้าน 3 ห้องนอนขึ้นไป ${bigger(stretch)} หลัง เทียบกับบ้านไม่เกิน 2 ล้านบาทที่มี 3 ห้องนอนขึ้นไป ${bigger(under)} หลัง`
        : 'ตอนนี้ยังไม่มีบ้านช่วงราคา 2–2.5 ล้านบาทเปิดขาย',
        ...(above.length ? [`บ้านราคามากกว่า 2.5 ล้านบาทมีอีก ${above.length} หลัง ${where(above)}`] : [])], {
        links: [pageLink(landing('budget', 2500000)), pageLink(landing('budget', 3000000)), locLink('คลองหลวง')].filter(Boolean) }),
      section('payment', `ผ่อนบ้าน ${mb(lowest)} / 2 / 2.5 ล้าน เดือนละเท่าไร`, [PAYMENT_TEXT], {
        dataTable: paymentTable([lowest, 2000000, 2500000], asOf), links: [CALCULATOR] }),
      section('next', 'ก่อนนัดชมบ้านในงบ 2 ล้าน', ['ลองใส่ราคาบ้านและงบผ่อนที่รับไหวในหน้าคำนวณค่าผ่อนบ้านของเว็บไซต์ แล้วเลือกหลังที่ค่าผ่อนอยู่ในงบ', LOAN, VISIT], {
        links: [locLink('ลำลูกกา'), locLink('คลองหลวง'), pageLink(pathum)].filter(Boolean) }),
    ],
    faq: faq([
      ['บ้านมือสองปทุมธานีงบ 2 ล้านได้บ้านแบบไหน?', under.length
        ? `ได้${typeCounts(under)} ที่ดิน ${area(under)} ${beds(under)}นอน ${where(under)} ข้อมูล ณ ${asOf}`
        : `ตอนนี้ยังไม่มีบ้านราคาไม่เกิน 2 ล้านบาทเปิดขาย หลังราคาต่ำสุด ${thb(lowest)} บาท ข้อมูล ณ ${asOf}`],
      ['ผ่อนบ้าน 2 ล้านเดือนละเท่าไร?', `ประมาณ ${pay(2000000, 3, 40)} บาท (ดอกเบี้ย 3% 40 ปี) หรือ ${pay(2000000, 4, 30)} บาท (4% 30 ปี) ยอดจริงขึ้นกับธนาคารที่อนุมัติ`],
      ['งบ 2.5 ล้านซื้อบ้านทำเลไหนได้บ้าง?', stretch.length
        ? `บ้านราคา 2–2.5 ล้านบาทมีเพิ่มอีก ${stretch.length} หลัง ${where(stretch)} ข้อมูล ณ ${asOf}`
        : `ตอนนี้ยังไม่มีบ้านราคา 2–2.5 ล้านบาทเปิดขาย ข้อมูล ณ ${asOf}`],
    ]),
  });
}

/** "พฤกษาB" and "พฤกษา B" are one project; the spaced spelling is shown. */
const projectGroups = list => {
  const groups = new Map();
  for (const house of list) {
    const name = projectName(house);
    const key = name.replace(/\s+/g, '');
    const group = groups.get(key) || { name, houses: [] };
    if (name.includes(' ') && !group.name.includes(' ')) group.name = name;
    group.houses.push(house);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.houses.length - a.houses.length || num(a.houses[0].price) - num(b.houses[0].price));
};

/** C — บ้านมือสองรีโนเวท คลองหลวง คลอง 3 (หมู่บ้านพฤกษา) มีหลังไหนขายบ้าง */
export function khlongThreeArticle(properties, now = new Date()) {
  const houses = forSale(properties);
  const khlongLuang = houses.filter(house => house.district === 'คลองหลวง');
  const canal3 = khlongLuang.filter(house => subArea(house) === 'คลอง 3');
  if (!canal3.length) return null;
  const asOf = thaiDate(now);
  const isTop = districts(houses)[0]?.name === 'คลองหลวง';
  const projects = projectGroups(canal3);
  const pruksa = projectGroups(canal3.filter(house => /^พฤกษา/.test(cleanProject(house.project_name))));
  const pruksaCount = pruksa.reduce((sum, group) => sum + group.houses.length, 0);
  const typeText = types(canal3).map(type => `${type.name}ราคา ${mrange(prices(type.houses))}บาท`).join(' ');
  const others = tally(khlongLuang.filter(house => subArea(house) !== 'คลอง 3').map(subArea))
    .map(([name, count]) => ({ name, count, houses: khlongLuang.filter(house => subArea(house) === name) }));
  const mid = median(prices(canal3));
  return common(now, {
    description: `บ้านมือสองรีโนเวท คลองหลวง คลอง 3 ของ Startup Up Real Estate มี ${canal3.length} หลัง ดูโครงการ หมู่บ้านพฤกษา ราคา และค่าผ่อน (ข้อมูล ณ ${asOf})`,
    introduction: [
      `${isTop ? 'คลองหลวงเป็นทำเลที่ Startup Up Real Estate มีบ้านมือสองรีโนเวทมากที่สุด' : 'Startup Up Real Estate มีบ้านมือสองรีโนเวทในคลองหลวง'} ${khlongLuang.length} หลัง (ข้อมูล ณ ${asOf}) อยู่คลอง 3 (ต.คลองสาม) ${canal3.length} หลัง ในโครงการอย่าง ${projects.slice(0, 4).map(group => group.name).join(', ')} ${typeText} สำนักงานของเราอยู่ ต.คลองสาม อ.คลองหลวง จึงนัดชมได้สะดวก`,
      COUNT_NOTE,
    ],
    sections: [
      section('projects', 'บ้านมือสอง คลองหลวง คลอง 3 มีโครงการไหนบ้าง', [`บ้านในคลอง 3 ที่เปิดขายอยู่ใน ${projects.length} โครงการ เรียงตามจำนวนบ้าน`], {
        dataTable: { caption: `โครงการในคลอง 3 ที่มีบ้านเปิดขาย (ข้อมูล ณ ${asOf})`, headers: ['โครงการ', 'จำนวน', 'ราคา', 'ประเภท', 'ที่ดิน'],
          rows: projects.map(group => [group.name, `${group.houses.length} หลัง`, range(prices(group.houses)), types(group.houses).map(type => type.name).join(', '), area(group.houses)]) },
        links: [locLink('คลองหลวง'), pageLink(landing('pruksa'))].filter(Boolean) }),
      section('houses', 'หมู่บ้านพฤกษา คลองสาม และโครงการอื่นในคลอง 3 มีหลังไหนขาย', [
        pruksaCount ? `ในคลอง 3 มีบ้านในโครงการที่ชื่อขึ้นต้นด้วยพฤกษา ${pruksaCount} หลัง จาก ${pruksa.length} โครงการ ได้แก่ ${pruksa.map(group => `${group.name} (${group.houses.length} หลัง)`).join(', ')} ชื่อพฤกษา พฤกษาวิลล์ และเลขต่อท้ายแต่ละเลขเป็นคนละโครงการ ควรดูชื่อโครงการและเลขที่บ้านให้ตรงก่อนนัดชม`
          : 'ตอนนี้ยังไม่มีบ้านในหมู่บ้านพฤกษาที่คลอง 3 เปิดขาย ดูบ้านโครงการอื่นได้ในตารางด้านล่าง',
        'ตารางด้านล่างคือบ้านทุกหลังในคลอง 3 เรียงจากราคาต่ำไปสูง กดชื่อบ้านด้านล่างตารางเพื่อดูรูปและรายละเอียด'], {
        dataTable: { caption: `บ้านมือสองรีโนเวทในคลอง 3 (ข้อมูล ณ ${asOf})`, headers: ['บ้าน', 'ราคา', 'ประเภท', 'ที่ดิน', 'ห้องนอน'],
          rows: canal3.map(house => [label(house), `${thb(num(house.price))} บาท`, house.category, `${house.area_wah} ตร.ว.`, `${house.bedrooms} ห้อง`]) },
        links: canal3.map(houseLink) }),
      section('other-canals', 'บ้านมือสองคลองหลวงนอกคลอง 3', [others.length
        ? `นอกจากคลอง 3 ยังมีบ้านในคลองหลวงอีก ${khlongLuang.length - canal3.length} หลัง`
        : 'ตอนนี้บ้านในคลองหลวงที่เปิดขายอยู่ในคลอง 3 ทั้งหมด'], {
        ...(others.length ? { dataTable: { caption: `บ้านในคลองหลวงนอกคลอง 3 (ข้อมูล ณ ${asOf})`, headers: ['ย่าน', 'จำนวน', 'ประเภท', 'ราคา'],
          rows: others.map(group => [group.name, `${group.count} หลัง`, typeCounts(group.houses), range(prices(group.houses))]) } } : {}),
        links: [locLink('คลองหลวง'), locLink('รังสิต')].filter(Boolean) }),
      section('payment', 'ผ่อนบ้านคลอง 3 เดือนละเท่าไร', [
        `หลังราคาต่ำสุดในคลอง 3 ราคา ${thb(num(canal3[0].price))} บาท ผ่อนประมาณ ${thb(payment(num(canal3[0].price)))} บาทต่อเดือน ครึ่งหนึ่งของบ้านในคลอง 3 ราคาไม่เกิน ${thb(mid)} บาท ผ่อนประมาณ ${thb(payment(mid))} บาทต่อเดือน (ดอกเบี้ย 3% ระยะ 40 ปี) ยอดจริงขึ้นกับธนาคารที่อนุมัติ`], {
        links: [CALCULATOR] }),
      section('visit', 'นัดชมบ้านคลองหลวง', [OFFICE, VISIT, LOAN], { links: [locLink('คลองหลวง'), pageLink(pathum)].filter(Boolean) }),
    ],
    faq: faq([
      ['บ้านมือสองคลองหลวง คลอง 3 ราคาเท่าไร?', `บ้านของ Startup Up Real Estate ในคลอง 3 มี ${canal3.length} หลัง ${typeText} ข้อมูล ณ ${asOf}`],
      ['หมู่บ้านพฤกษา คลองสาม มีบ้านมือสองขายไหม?', pruksaCount
        ? `มี ${pruksaCount} หลัง เช่น ${pruksa.slice(0, 4).map(group => group.name).join(', ')} ดูรายการล่าสุดที่หน้าบ้านมือสอง คลองหลวง`
        : 'ตอนนี้ยังไม่มีบ้านในหมู่บ้านพฤกษาที่คลองสามเปิดขาย ดูรายการล่าสุดที่หน้าบ้านมือสอง คลองหลวง'],
      ['นัดชมบ้านคลองหลวงได้อย่างไร?', VISIT],
    ]),
  });
}

export const MARKET_ARTICLE_BUILDERS = {
  'ราคาบ้านมือสองรีโนเวท-ปทุมธานี': priceArticle,
  'บ้านมือสอง-ปทุมธานี-งบ-2-ล้าน': budgetArticle,
  'บ้านมือสอง-คลองหลวง-คลอง3-พฤกษา': khlongThreeArticle,
};
export const isMarketArticle = slug => Object.hasOwn(MARKET_ARTICLE_BUILDERS, slug);
