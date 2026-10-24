import SiteV4 from '../components/site/SiteV4';
import UnavailablePage from '../components/site/UnavailablePage';
export { loadSitePage as getServerSideProps } from '../lib/serverPageData';
export default function Home({ initialData, unavailable }) {
  return unavailable ? <UnavailablePage /> : <SiteV4 basePath="/" initialData={initialData} />;
}
