import NotFound from './404';
import SiteV4 from '../components/site/SiteV4';
import UnavailablePage from '../components/site/UnavailablePage';
export { resolveSitePage as getServerSideProps } from '../lib/serverPageData';
export default function V4({ initialData, unavailable, missing }) {
  return missing ? <NotFound /> : unavailable ? <UnavailablePage /> : <SiteV4 basePath="/v4" initialData={initialData} />;
}
