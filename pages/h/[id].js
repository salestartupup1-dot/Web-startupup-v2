import UnavailablePage from '../../components/site/UnavailablePage';
import { loadSitePage } from '../../lib/serverPageData';
import { propertyIdFromSharePath } from '../../lib/propertyRoutes';

export async function getServerSideProps(context) {
  if (!propertyIdFromSharePath(context.resolvedUrl.split('?')[0])) return { notFound: true };
  return loadSitePage(context);
}

// A valid link redirects on the server. Only an outage renders this page (503).
export default function ShortPropertyLink() {
  return <UnavailablePage />;
}
