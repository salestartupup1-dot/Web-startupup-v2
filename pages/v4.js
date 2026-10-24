import SiteV4 from '../components/site/SiteV4';
import UnavailablePage from '../components/site/UnavailablePage';
export { loadSitePage as getServerSideProps } from '../lib/serverPageData';
export default function V4({ initialData, unavailable }) {
  return unavailable ? <UnavailablePage /> : <SiteV4 basePath="/v4" initialData={initialData} />;
}
