import ArticlePage from '../../components/articles/ArticlePage';
import { ARTICLE_CATALOGUE } from '../../lib/articleCatalogue';
import { getArticle } from '../../lib/articles';

export function getStaticPaths() {
  return { paths:ARTICLE_CATALOGUE.map(article=>({params:{landing:'articles',article:article.slug}})), fallback:false };
}
export function getStaticProps({ params }) {
  const article=params.landing==='articles' ? getArticle(params.article) : null;
  return article ? {props:{article}} : {notFound:true};
}
export default ArticlePage;
