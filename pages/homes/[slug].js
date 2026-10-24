import SiteV4 from '../../components/site/SiteV4';
import UnavailablePage from '../../components/site/UnavailablePage';
import { loadSitePage } from '../../lib/serverPageData';
import { propertyIdFromPath } from '../../lib/propertyRoutes';

export async function getServerSideProps(context) {
  if (!propertyIdFromPath(context.resolvedUrl.split('?')[0])) return { notFound: true };
  return loadSitePage(context);
}
export default function PropertyPage({ initialData, unavailable }) {
  return unavailable ? <UnavailablePage /> : <SiteV4 basePath="/" initialData={initialData} />;
}
