import test from 'node:test';
import assert from 'node:assert/strict';
import { getArticle, articleText, articleStructuredData } from '../lib/articles.js';
import { ARTICLE_CATALOGUE } from '../lib/articleCatalogue.js';
import { MARKET_ARTICLE_BUILDERS, canal } from '../lib/marketArticles.js';

const now = new Date('2026-11-08T03:00:00Z');
const house = (id, district, sub, category, price, area, beds, project) => ({ id, district, main_location: district, sub_location: sub, subdistrict: sub,
  province: 'ปทุมธานี', inventoryState: 'available', category, price, area_wah: area, bedrooms: beds, project_name: project, house_number: `1/${id}` });
const stock = [
  house('a', 'ลำลูกกา', 'คลองสอง', 'ทาวน์เฮาส์', 1690000, 16, 2, 'โครงการแอร์วิลล่า'),
  house('b', 'ลำลูกกา', 'คลองสอง', 'ทาวน์เฮาส์', 1890000, 18, 3, 'พฤกษา 20'),
  house('c', 'คลองหลวง', 'คลองสาม', 'ทาวน์เฮาส์หลังริม', 1990000, 23.9, 3, 'พฤกษา D'),
  house('d', 'คลองหลวง', 'คลองสาม', 'ทาวน์เฮาส์', 2190000, 24.1, 3, 'พฤกษา 13'),
  house('e', 'คลองหลวง', 'คลองสาม', 'บ้านแฝด', 2690000, 35, 5, 'พฤกษา 13'),
  house('f', 'คลองหลวง', 'คลองสาม', 'ทาวน์เฮาส์หลังริม', 2490000, 30, 4, 'พฤกษาB'),
  house('g', 'คลองหลวง', 'คลองสาม', 'ทาวน์เฮาส์', 2790000, 28.4, 3, 'ไทยสมบูรณ์ 3'),
  house('h', 'คลองหลวง', 'คลองสอง', 'บ้านเดี่ยว', 3490000, 50, 3, 'ฐานมั่นคง'),
  house('i', 'ธัญบุรี', 'คลองเจ็ด', 'บ้านเดี่ยว', 3990000, 62.8, 4, 'พฤกษาวิลเลจ 2'),
  { ...house('sold', 'คลองหลวง', 'คลองสาม', 'ทาวน์เฮาส์', 100, 10, 1, 'ขายแล้ว'), inventoryState: 'sold' },
];
const slugs = Object.keys(MARKET_ARTICLE_BUILDERS);

test('market articles are listed and only render with stock', () => {
  for (const slug of slugs) {
    const meta = ARTICLE_CATALOGUE.find(article => article.slug === slug);
    assert.ok(meta?.market && ['ราคาบ้านและทำเล', 'สินเชื่อ'].includes(meta.category), slug);
    assert.ok(meta.seoTitle.length <= 60 && meta.description.length <= 155, slug);
    assert.equal(getArticle(slug), null, 'no article without stock data');
    assert.equal(getArticle(slug, []), null, 'no article without houses');
  }
});

test('market articles follow the AEO brief with numbers from stock only', () => {
  for (const slug of slugs) {
    const article = getArticle(slug, stock, now);
    const text = articleText(article);
    assert.match(article.introduction.join(' '), /ณ 8 พ\.ย\. 2569/, slug);
    assert.ok(article.sections.some(section => section.dataTable), `${slug}: table`);
    assert.equal(article.faq.length, 3, slug);
    assert.equal(article.author.displayName, 'ทีมงาน Startup Up Real Estate');
    assert.equal(article.dateModified, '2026-11-08T00:00:00+07:00');
    assert.ok(article.description.length <= 155, `${slug}: ${article.description.length}`);
    const links = article.sections.flatMap(section => section.links || []);
    assert.ok(links.length >= 3, slug);
    assert.doesNotMatch(text, /undefined|NaN|null|∞|100 บาท|ขายแล้ว 1\//, slug);
    const schema = articleStructuredData(article);
    const faqSchema = schema.find(item => item['@type'] === 'FAQPage');
    assert.deepEqual(faqSchema.mainEntity.map(item => [item.name, item.acceptedAnswer.text]), article.faq.map(item => [item.question, item.answer]));
  }
});

test('article A summarises price by area, type and payment', () => {
  const article = getArticle('ราคาบ้านมือสองรีโนเวท-ปทุมธานี', stock, now);
  assert.match(article.introduction[0], /มี 9 หลัง ราคา 1\.69–3\.99 ล้านบาท ส่วนใหญ่เป็นทาวน์เฮาส์ 6 หลัง ราคา 1\.69–2\.79 ล้านบาท/);
  assert.match(article.introduction[0], /ครึ่งหนึ่งของบ้านที่เปิดขายราคาไม่เกิน 2\.49 ล้านบาท ผ่อนประมาณ 8,914 บาทต่อเดือน/);
  const area = article.sections.find(section => section.id === 'by-area');
  assert.deepEqual(area.dataTable.rows[0], ['คลองหลวง (6 หลัง)', '4 หลัง · 1.99–2.79 ล้าน', '1 หลัง · 2.69 ล้าน', '1 หลัง · 3.49 ล้าน']);
  assert.match(area.after[0], /คลองหลวงมีบ้านมากที่สุด 6 หลัง ส่วนใหญ่อยู่คลอง 3 \(5 หลัง\)/);
  const pay = article.sections.find(section => section.id === 'payment').dataTable.rows;
  assert.deepEqual(pay.find(row => row[0] === '2,000,000 บาท').slice(1), ['7,160', '9,548', '11,356']);
  assert.equal(article.faq[0].answer, 'บ้านของ Startup Up Real Estate ในปทุมธานีราคาเริ่มต้น 1,690,000 บาท เป็นทาวน์เฮาส์ ข้อมูล ณ 8 พ.ย. 2569');
});

test('article B counts budget bands and compares bedrooms', () => {
  const article = getArticle('บ้านมือสอง-ปทุมธานี-งบ-2-ล้าน', stock, now);
  assert.match(article.introduction[0], /ได้ 3 หลัง \(ข้อมูล ณ 8 พ\.ย\. 2569\) ส่วนใหญ่อยู่ลำลูกกา คลอง 2 \(2 หลัง\)/);
  assert.match(article.introduction[0], /ค่าผ่อนประมาณ 6,050–7,124 บาทต่อเดือน/);
  assert.match(article.introduction[0], /มีเพิ่มอีก 2 หลัง/);
  const bands = article.sections.find(section => section.id === 'bands').dataTable.rows.map(row => row[1]);
  assert.deepEqual(bands, ['3 หลัง', '2 หลัง', '2 หลัง', '2 หลัง']);
  assert.equal(article.faq[1].answer, 'ประมาณ 7,160 บาท (ดอกเบี้ย 3% 40 ปี) หรือ 9,548 บาท (4% 30 ปี) ยอดจริงขึ้นกับธนาคารที่อนุมัติ');
});

test('article C groups canal 3 projects and merges spacing variants', () => {
  assert.equal(canal('คลองสาม'), 'คลอง 3');
  assert.equal(canal('คลองหลวง'), 'คลองหลวง');
  const article = getArticle('บ้านมือสอง-คลองหลวง-คลอง3-พฤกษา', stock, now);
  assert.match(article.introduction[0], /^คลองหลวงเป็นทำเลที่ Startup Up Real Estate มีบ้านมือสองรีโนเวทมากที่สุด 6 หลัง/);
  assert.match(article.introduction[0], /อยู่คลอง 3 \(ต\.คลองสาม\) 5 หลัง/);
  const projects = article.sections.find(section => section.id === 'projects').dataTable.rows.map(row => row[0]);
  assert.deepEqual(projects, ['พฤกษา 13', 'พฤกษา D', 'พฤกษา B', 'ไทยสมบูรณ์ 3']);
  const houses = article.sections.find(section => section.id === 'houses');
  assert.equal(houses.links.length, 5);
  assert.match(houses.paragraphs[0], /พฤกษา 4 หลัง จาก 3 โครงการ/);
  assert.match(article.faq[1].answer, /^มี 4 หลัง/);
});

test('article D compares townhouses with detached houses from stock', () => {
  const article = getArticle('ทาวน์เฮาส์-vs-บ้านเดี่ยว-มือสอง-ปทุมธานี', stock, now);
  assert.match(article.introduction[0], /มี 6 หลัง ราคา 1\.69–2\.79 ล้านบาท ที่ดิน 16–30 ตร\.ว\. ส่วนบ้านเดี่ยวมี 2 หลัง ราคา 3\.49–3\.99 ล้านบาท ที่ดิน 50–62\.8 ตร\.ว\./);
  const table = article.sections.find(section => section.id === 'compare').dataTable;
  assert.deepEqual(table.headers, ['เทียบ', 'ทาวน์เฮาส์', 'บ้านแฝด', 'บ้านเดี่ยว']);
  assert.deepEqual(table.rows.find(row => row[0] === 'จำนวน'), ['จำนวน', '6 หลัง', '1 หลัง', '2 หลัง']);
  assert.match(article.faq[2].answer, /^ทาวน์เฮาส์ 1,990,000 บาท ผ่อนประมาณ 7,124 บาท บ้านเดี่ยว 3,490,000 บาท ผ่อนประมาณ 12,494 บาทต่อเดือน/);
  assert.equal(getArticle('ทาวน์เฮาส์-vs-บ้านเดี่ยว-มือสอง-ปทุมธานี', stock.filter(house => house.category !== 'บ้านเดี่ยว'), now), null);
});

test('article E payment table and worked example use the stated formula', () => {
  const article = getArticle('ผ่อนบ้านมือสอง-เดือนละเท่าไร', stock, now);
  assert.match(article.introduction[0], /^บ้านมือสองราคา 2 ล้านบาท ผ่อนประมาณ 7,160 บาทต่อเดือน ถ้าดอกเบี้ย 3% ระยะ 40 ปี หรือประมาณ 9,548 บาท/);
  const rows = article.sections.find(section => section.id === 'table').dataTable.rows;
  assert.deepEqual(rows.map(row => row[1]), ['6,050', '7,160', '8,950', '10,740', '12,529', '14,319']);
  assert.match(article.sections.find(section => section.id === 'method').paragraphs[1], /≈ 7,160 บาท$/);
  assert.deepEqual(article.faq.map(item => item.answer), [
    'ประมาณ 6,050 บาท (ดอกเบี้ย 3% 40 ปี) หรือ 8,068 บาท (4% 30 ปี) ยอดจริงขึ้นกับธนาคารที่อนุมัติ',
    'ประมาณ 10,740 บาท (ดอกเบี้ย 3% 40 ปี) หรือ 14,322 บาท (4% 30 ปี) ยอดจริงขึ้นกับธนาคารที่อนุมัติ',
    'ช่วย ทีมงานช่วยเตรียมเอกสารและยื่นสินเชื่อบ้าน และดูแลจนถึงวันโอน']);
});

test('article F lists Lam Luk Ka houses up to 2 million by canal', () => {
  const article = getArticle('บ้านมือสอง-ลำลูกกา-ไม่เกิน-2-ล้าน', stock, now);
  assert.match(article.introduction[0], /ราคาไม่เกิน 2 ล้านบาท 2 หลัง \(ข้อมูล ณ 8 พ\.ย\. 2569\) ทั้งหมดอยู่คลอง 2 \(2 หลัง\)/);
  assert.equal(article.sections.find(section => section.id === 'houses').links.length, 2);
  assert.equal(article.faq[1].question, 'ผ่อนบ้านลำลูกกา 1.69 ล้านเดือนละเท่าไร?');
});
