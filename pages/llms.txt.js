import { getWebsiteData } from '../lib/websiteData';
import { seoCatalogue } from '../lib/seoCatalogue';
import { locationMarket } from '../lib/locationMarket';
import { SEO_LOCATIONS } from '../lib/seoLocations';
import { buildLlmsText } from '../lib/llmsText';

// Plain text for AI crawlers (/llms.txt). Same houses as /บ้านรีโนเวท-ปทุมธานี; if the
// catalogue cannot be read, the file is still served without a price range.
export async function getServerSideProps({ res }) {
  let market = null;
  try {
    const data = await getWebsiteData();
    market = locationMarket(SEO_LOCATIONS.find(location => location.copy === 'pathum'), seoCatalogue(data.properties));
  } catch (error) {
    console.error('llms.txt without live prices:', error?.code || error?.name);
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  for (const header of ['CDN-Cache-Control', 'Vercel-CDN-Cache-Control']) res.setHeader(header, market ? 'max-age=3600, stale-while-revalidate=86400' : 'max-age=60');
  res.write(buildLlmsText(market));
  res.end();
  return { props: {} };
}

export default function LlmsTxt() {
  return null;
}
