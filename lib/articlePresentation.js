import { articlePath, ARTICLES_PATH, ARTICLE_AUTHORS, ARTICLE_PUBLISHER, resolveArticleAuthor } from './articleCatalogue.js';
import { toAbsoluteUrl } from './seo.js';

export const formatArticleDate = value => new Intl.DateTimeFormat('th-TH', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok',
}).format(new Date(value));

export function articleStructuredData(article, { authors = ARTICLE_AUTHORS } = {}) {
  const author = resolveArticleAuthor(article, authors);
  const url = toAbsoluteUrl(articlePath(article));
  const breadcrumbs = { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:[
    { '@type':'ListItem', position:1, name:'หน้าหลัก', item:toAbsoluteUrl('/') },
    { '@type':'ListItem', position:2, name:'บทความ', item:toAbsoluteUrl(ARTICLES_PATH) },
    { '@type':'ListItem', position:3, name:article.title, item:url },
  ] };
  const schema = { '@context':'https://schema.org', '@type':'Article', headline:article.title,
    description:article.description, url, mainEntityOfPage:{'@type':'WebPage','@id':url},
    datePublished:article.datePublished, dateModified:article.dateModified, inLanguage:'th-TH',
    ...(article.cover?{image:toAbsoluteUrl(article.coverSocial || article.cover.replace(/\.svg$/,'.png'))}:{}),
    publisher:{...ARTICLE_PUBLISHER},
    ...(author ? {author:{'@type':author.type,name:author.name,...(author.url?{url:author.url}:{})}} : {}),
    citation:article.sources.map(source=>source.href),
  };
  return [breadcrumbs, ...(author ? [schema] : [])];
}

export const feeExample = [
  { label:'ค่าโอน', base:2000000, normalRate:0.02, reducedRate:0.0001 },
  { label:'ค่าจดจำนอง', base:2000000, normalRate:0.01, reducedRate:0.0001 },
].map(row=>({...row,normal:row.base*row.normalRate,reduced:row.base*row.reducedRate}));
