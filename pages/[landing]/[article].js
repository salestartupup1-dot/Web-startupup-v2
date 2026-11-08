import ArticlePage from '../../components/articles/ArticlePage';
import { ARTICLE_CATALOGUE } from '../../lib/articleCatalogue';
import { getArticle, isMarketArticle, MARKET_REVALIDATE_SECONDS } from '../../lib/articles';
import { getWebsiteData } from '../../lib/websiteData';
import { seoCatalogue } from '../../lib/seoCatalogue';

export function getStaticPaths() {
  return { paths:ARTICLE_CATALOGUE.map(article=>({params:{landing:'articles',article:article.slug}})), fallback:false };
}
export async function getStaticProps({ params }) {
  if (params.landing!=='articles') return {notFound:true};
  if (!isMarketArticle(params.article)) {
    const article=getArticle(params.article);
    return article ? {props:{article}} : {notFound:true};
  }
  // Market articles (A–C) are rebuilt from the website stock every few hours (ISR), so their
  // numbers match the location pages. A failed refresh keeps serving the last good page.
  try {
    const data=await getWebsiteData();
    const article=getArticle(params.article, seoCatalogue(data.properties));
    return article ? {props:{article}, revalidate:MARKET_REVALIDATE_SECONDS} : {notFound:true, revalidate:3600};
  } catch (error) {
    if (process.env.NEXT_PHASE==='phase-production-build') return {notFound:true, revalidate:60};
    throw error;
  }
}
export default ArticlePage;
