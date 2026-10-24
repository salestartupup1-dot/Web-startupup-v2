import SiteV4 from '../components/site/SiteV4';
import UnavailablePage from '../components/site/UnavailablePage';
import { findSeoLocation } from '../lib/seoLocations';
import { loadSitePage } from '../lib/serverPageData';

export async function getServerSideProps(context) {
  if (!findSeoLocation(context.params.landing)) return { notFound: true };
  return loadSitePage(context);
}

export default function LocationLanding({ initialData, unavailable }) {
  return unavailable ? <UnavailablePage /> : <SiteV4 basePath="/" initialData={initialData} />;
}
