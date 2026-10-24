import SiteV4 from '../components/site/SiteV4';
import UnavailablePage from '../components/site/UnavailablePage';
import { findSeoLocation } from '../lib/seoLocations';
import { loadSitePage } from '../lib/serverPageData';
import { privateResponse, unavailablePage } from '../lib/serverPageData';
import { isShortCode, propertyShortLinks } from '../lib/propertyShortLinks';

export async function getServerSideProps(context) {
  if (isShortCode(context.params.landing)) {
    privateResponse(context.res);
    try {
      const id = await propertyShortLinks.resolve(context.params.landing);
      if (!id) return { notFound: true };
      const suffix = context.resolvedUrl.includes('?') ? context.resolvedUrl.slice(context.resolvedUrl.indexOf('?')) : '';
      return loadSitePage({ ...context, resolvedUrl: `/h/${id}${suffix}` });
    } catch (error) { return unavailablePage(context.res, error); }
  }
  if (!findSeoLocation(context.params.landing)) return { notFound: true };
  return loadSitePage(context);
}

export default function LocationLanding({ initialData, unavailable }) {
  return unavailable ? <UnavailablePage /> : <SiteV4 basePath="/" initialData={initialData} />;
}
