import NotFound from './404';
import SiteV4 from '../components/site/SiteV4';
import UnavailablePage from '../components/site/UnavailablePage';
import { findSeoLocation } from '../lib/seoLocations';
import { resolveSitePage, missingPage } from '../lib/serverPageData';
import { privateResponse, unavailablePage } from '../lib/serverPageData';
import { isShortCode, propertyShortLinks } from '../lib/propertyShortLinks';

export async function getServerSideProps(context) {
  if (isShortCode(context.params.landing)) {
    privateResponse(context.res);
    try {
      const id = await propertyShortLinks.resolve(context.params.landing);
      if (!id) return missingPage(context.res);
      const suffix = context.resolvedUrl.includes('?') ? context.resolvedUrl.slice(context.resolvedUrl.indexOf('?')) : '';
      return resolveSitePage({ ...context, resolvedUrl: `/h/${id}${suffix}` });
    } catch (error) { return unavailablePage(context.res, error); }
  }
  if (!findSeoLocation(context.params.landing)) return missingPage(context.res);
  return resolveSitePage(context);
}

export default function LocationLanding({ initialData, unavailable, missing }) {
  return missing ? <NotFound /> : unavailable ? <UnavailablePage /> : <SiteV4 basePath="/" initialData={initialData} />;
}
