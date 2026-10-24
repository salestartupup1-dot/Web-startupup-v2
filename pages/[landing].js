import NotFound from './404';
import SiteV4 from '../components/site/SiteV4';
import UnavailablePage from '../components/site/UnavailablePage';
import { findSeoLocation } from '../lib/seoLocations';
import { resolveSitePage, missingPage } from '../lib/serverPageData';
import { isShortCode } from '../lib/propertyShortLinks';
import { isPropertySlug } from '../lib/propertyRoutes';

export async function getServerSideProps(context) {
  if (isShortCode(context.params.landing) || isPropertySlug(context.params.landing)) {
    return resolveSitePage(context);
  }
  if (!findSeoLocation(context.params.landing)) return missingPage(context.res);
  return resolveSitePage(context);
}

export default function LocationLanding({ initialData, unavailable, missing }) {
  return missing ? <NotFound /> : unavailable ? <UnavailablePage /> : <SiteV4 basePath="/" initialData={initialData} />;
}
