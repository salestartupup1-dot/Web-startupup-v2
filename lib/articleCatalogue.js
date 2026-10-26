import { NEW_ARTICLE_METADATA } from '../content/articles/catalogue.js';
import { ARTICLE_COVERS } from '../content/articles/covers.js';
export const ARTICLES_PATH = '/articles';
export const articlePath = article => `${ARTICLES_PATH}/${encodeURIComponent(article.slug)}`;

// Articles without authorId inherit this central default, including older articles.
// Add a confirmed Person here later, then set authorId only on their new articles.
export const DEFAULT_ARTICLE_AUTHOR_ID = 'startup-up';
export const ARTICLE_AUTHORS = {
  'startup-up': {
    type: 'Organization', name: 'Startup Up', displayName: 'ทีมงาน Startup Up',
    url: 'https://www.startupup-real-estate.com',
  },
};
export const ARTICLE_PUBLISHER = {
  '@type': 'Organization', name: 'Startup Up', url: 'https://www.startupup-real-estate.com',
};
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
}, ...NEW_ARTICLE_METADATA];
export const isArticlePublishable = article => Boolean(resolveArticleAuthor(article));
export const articleSitemapEntries = () => ARTICLE_CATALOGUE.filter(isArticlePublishable).map(article => ({
  path: articlePath(article), lastmod: article.dateModified,
}));
