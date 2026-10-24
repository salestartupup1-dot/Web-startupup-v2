import NotFound from '../404';
import SiteV4 from '../../components/site/SiteV4';
import UnavailablePage from '../../components/site/UnavailablePage';
import { resolveSitePage, missingPage } from '../../lib/serverPageData';
import { propertyIdFromPath } from '../../lib/propertyRoutes';

export async function getServerSideProps(context) {
  if (!propertyIdFromPath(context.resolvedUrl.split('?')[0])) return missingPage(context.res);
  return resolveSitePage(context);
}
export default function PropertyPage({ initialData, unavailable, missing }) {
  return missing ? <NotFound /> : unavailable ? <UnavailablePage /> : <SiteV4 basePath="/" initialData={initialData} />;
}
