import { NEW_ARTICLE_METADATA } from '../content/articles/catalogue.js';
import { ARTICLE_COVERS } from '../content/articles/covers.js';
export const ARTICLES_PATH = '/articles';
export const articlePath = article => `${ARTICLES_PATH}/${encodeURIComponent(article.slug)}`;

// Articles without authorId inherit this central default, including older articles.
// Add a confirmed Person here later, then set authorId only on their new articles.
export const DEFAULT_ARTICLE_AUTHOR_ID = 'startup-up';
export const ARTICLE_AUTHORS = {
  'startup-up': {
    type: 'Organization', name: 'Startup Up Real Estate', displayName: 'ทีมงาน Startup Up Real Estate',
    url: 'https://www.startupup-real-estate.com',
  },
};
export const ARTICLE_PUBLISHER = {
  '@type': 'Organization', name: 'Startup Up Real Estate', url: 'https://www.startupup-real-estate.com',
};
// AEO articles A–C (work order 11.2): body and numbers are generated from live stock (lib/marketArticles.js).
const MARKET_ARTICLE_METADATA = [
  ['ราคาบ้านมือสองรีโนเวท-ปทุมธานี', 'บ้านมือสองรีโนเวท ปทุมธานี ราคาเท่าไร? สรุปตามทำเลและประเภทบ้าน', 'บ้านมือสองรีโนเวท ปทุมธานี ราคาเท่าไร', 'บ้านมือสองรีโนเวท ปทุมธานี', 'renovation',
    'สรุปราคาบ้านมือสองรีโนเวทของ Startup Up Real Estate แยกตามทำเลคลองหลวง ลำลูกกา ธัญบุรี และประเภทบ้าน พร้อมตารางค่าผ่อน'],
  ['บ้านมือสอง-ปทุมธานี-งบ-2-ล้าน', 'งบ 2 ล้าน ซื้อบ้านมือสองรีโนเวทปทุมธานีได้ทำเลไหน?', 'งบ 2 ล้าน ซื้อบ้านมือสองปทุมธานีได้ทำเลไหน', 'บ้านมือสอง ปทุมธานี งบ 2 ล้าน', 'budget',
    'บ้านราคาไม่เกิน 2 ล้านบาทมีกี่หลัง อยู่ทำเลไหน ผ่อนเดือนละเท่าไร และถ้าขยับงบเป็น 2.5 ล้านจะได้บ้านแบบไหนเพิ่ม'],
  ['บ้านมือสอง-คลองหลวง-คลอง3-พฤกษา', 'บ้านมือสองรีโนเวท คลองหลวง คลอง 3 (หมู่บ้านพฤกษา) มีหลังไหนขายบ้าง', 'บ้านมือสอง คลองหลวง คลอง 3 หมู่บ้านพฤกษา', 'บ้านมือสอง คลองหลวง คลอง 3', 'pruksa',
    'รวมบ้านมือสองรีโนเวทในคลอง 3 คลองหลวง แยกตามโครงการ หมู่บ้านพฤกษา ราคา ขนาดที่ดิน และค่าผ่อน'],
].map(([slug, title, seoTitle, keyword, cover, excerpt]) => ({ slug, title, seoTitle: `${seoTitle} | Startup Up`, keyword, category: 'ราคาบ้านและทำเล', market: true,
  ...ARTICLE_COVERS[cover], excerpt, description: `${keyword} ${excerpt}`.slice(0, 155),
  datePublished: '2026-11-08T00:00:00+07:00', dateModified: '2026-11-08T00:00:00+07:00' }));
export function resolveArticleAuthor(article, authors = ARTICLE_AUTHORS) {
  const author = authors[article.authorId || DEFAULT_ARTICLE_AUTHOR_ID];
  // An explicit unknown author must not silently be credited to somebody else.
  if (!author?.name?.trim() || !['Organization', 'Person'].includes(author.type)) return null;
  return { ...author, displayName: author.displayName || author.name };
}
export const ARTICLE_CATALOGUE = [{
  slug: 'ลดค่าโอน-บ้านมือสอง',
  title: 'ลดค่าโอน 0.01% ถึง 30 มิ.ย. 2570 บ้านมือสองใช้สิทธิได้ไหม ประหยัดได้เท่าไหร่',
  seoTitle: 'ลดค่าโอน บ้านมือสอง 0.01% ถึง มิ.ย. 2570 | Startup Up',
  description: 'ลดค่าโอน บ้านมือสองเหลือ 0.01% ถึง 30 มิ.ย. 2570 เช็กเงื่อนไขราคาไม่เกิน 7 ล้าน ตัวอย่างบ้าน 2 ล้าน และค่าใช้จ่ายที่ยังต้องเตรียมก่อนวันโอน',
  excerpt: 'บ้านมือสองใช้สิทธิได้เมื่อเข้าเงื่อนไข ดูตัวอย่างค่าโอนและค่าจดจำนองของบ้าน 2 ล้านบาท พร้อมสิ่งที่ควรถามก่อนจอง',
  category: 'ขั้นตอนซื้อบ้าน',
  ...ARTICLE_COVERS.fees,
  datePublished: '2026-10-24T00:00:00+07:00',
  dateModified: '2026-10-24T00:00:00+07:00',
}, ...NEW_ARTICLE_METADATA, ...MARKET_ARTICLE_METADATA];
export const isArticlePublishable = article => Boolean(resolveArticleAuthor(article));
export const articleSitemapEntries = () => ARTICLE_CATALOGUE.filter(isArticlePublishable).map(article => ({
  path: articlePath(article), lastmod: article.dateModified,
}));
