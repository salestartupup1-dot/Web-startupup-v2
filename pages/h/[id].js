import NotFound from '../404';
import UnavailablePage from '../../components/site/UnavailablePage';
import { resolveSitePage, missingPage } from '../../lib/serverPageData';
import { propertyIdFromSharePath } from '../../lib/propertyRoutes';

export async function getServerSideProps(context) {
  if (!propertyIdFromSharePath(context.resolvedUrl.split('?')[0])) return missingPage(context.res);
  return resolveSitePage(context);
}

// A valid link redirects on the server. Only an outage renders this page (503).
export default function ShortPropertyLink({ missing }) {
  return missing ? <NotFound /> : <UnavailablePage />;
}
