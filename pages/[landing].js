import NotFound from './404';
import SiteV4 from '../components/site/SiteV4';
import UnavailablePage from '../components/site/UnavailablePage';
import { findSeoLocation } from '../lib/seoLocations';
import { resolveSitePage, missingPage } from '../lib/serverPageData';
import { isShortCode } from '../lib/propertyShortLinks';
import { isPropertySlug } from '../lib/propertyRoutes';
import { SOLD_HOMES_SLUG } from '../lib/soldHomes';
import ArticlesIndex from '../components/articles/ArticlesIndex';

export async function getServerSideProps(context) {
  if (context.params.landing === 'articles') return { props: { articleIndex: true } };
  if (isShortCode(context.params.landing) || isPropertySlug(context.params.landing)) {
    return resolveSitePage(context);
  }
  if (context.params.landing !== SOLD_HOMES_SLUG && !findSeoLocation(context.params.landing)) return missingPage(context.res);
  return resolveSitePage(context);
}

export default function LocationLanding({ initialData, unavailable, missing, articleIndex }) {
  if (articleIndex) return <ArticlesIndex />;
  return missing ? <NotFound /> : unavailable ? <UnavailablePage /> : <SiteV4 basePath="/" initialData={initialData} />;
}
