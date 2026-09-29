import { fetchPublicPropertyRest, matchesPropertySlug } from '../../lib/firestorePublic';
import { getPublicProperties } from '../../lib/publicDataCache';

const SITE_URL = 'https://www.startupup-real-estate.com';
const FALLBACK_LOGO = 'https://res.cloudinary.com/dm2wr55r5/image/upload/v1773023427/LOGO_%E0%B9%80%E0%B8%82%E0%B8%B5%E0%B8%A2%E0%B8%A7%E0%B9%82%E0%B8%9B%E0%B8%A3%E0%B9%88%E0%B8%87_vhyhyo.png';

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const toSafeHttpUrl = (value, fallback = FALLBACK_LOGO) => {
  try {
    const url = new URL(String(value || ''), SITE_URL);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : fallback;
  } catch {
    return fallback;
  }
};

const isPreviewBot = (userAgent = '') => (
  /facebookexternalhit|facebot|twitterbot|discordbot|slackbot|whatsapp|telegrambot|linkedinbot|pinterest|line-poker|bot|crawler|spider|preview/i
    .test(userAgent)
);

// Native REST avoids starting the browser Firestore SDK in each serverless instance.
const propertyLookups = new Map();
const findPropertyBySlug = (propertySlug) => {
  const existing = propertyLookups.get(propertySlug);
  if (existing) return existing;
  const lookup = (async () => {
    try {
      const property = await fetchPublicPropertyRest(propertySlug, { signal: AbortSignal.timeout(5000) });
      if (property) return property;
    } catch (error) {
      console.warn('Direct share lookup failed, trying cached public list.', error.message);
    }
    const properties = await getPublicProperties();
    return properties.find(item => matchesPropertySlug(item, propertySlug));
  })().finally(() => propertyLookups.delete(propertySlug));
  // Only share in-flight work, keeping existing preview freshness unchanged.
  if (propertyLookups.size < 200) propertyLookups.set(propertySlug, lookup);
  return lookup;
};

export default async function handler(req, res) {
  const propertySlug = Array.isArray(req.query.property) ? req.query.property[0] : req.query.property;

  if (!propertySlug) {
    return res.redirect(307, '/');
  }

  const redirectTarget = `/?property=${encodeURIComponent(propertySlug)}`;

  if (!isPreviewBot(req.headers['user-agent'] || '')) {
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(307, redirectTarget);
  }

  try {
    const prop = await findPropertyBySlug(propertySlug);

    let title = 'STARTUP UP - จุดเริ่มต้นของคนอยากมีบ้าน';
    let description = 'ค้นหาบ้าน ทาวน์เฮาส์ บ้านเดี่ยว ทำเลดี พร้อมบริการสินเชื่อ';
    let imageUrl = FALLBACK_LOGO;

    if (prop) {
      const propName = prop.project_name || '';
      const houseNo = prop.house_number ? `บ้านเลขที่ ${prop.house_number}` : '';
      title = `${propName} ${houseNo} | STARTUP UP`.trim();

      if (prop.price) {
        const price = Number(String(prop.price).replace(/,/g, ''));
        description = `ราคา: ฿ ${Number.isFinite(price) ? price.toLocaleString() : prop.price} | ${prop.main_location || prop.district || ''}`;
      }

      imageUrl = (prop.images && prop.images.length > 0) ? prop.images[0] : (prop.imageUrl || imageUrl);
      if (typeof imageUrl === 'string' && imageUrl.includes('cloudinary.com')) {
        imageUrl = imageUrl.replace('/upload/', '/upload/f_jpg,q_auto,w_1200,h_630,c_limit/');
      }
    }

    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeImageUrl = escapeHtml(toSafeHttpUrl(imageUrl));
    const safeShareUrl = `${SITE_URL}/api/share?property=${encodeURIComponent(propertySlug)}`;
    const redirectScriptTarget = JSON.stringify(redirectTarget);

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${safeImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHtml(safeShareUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${safeImageUrl}">
  <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectTarget)}">
  <script>window.location.replace(${redirectScriptTarget});</script>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; color: #555; }
    .loader { border: 4px solid #eef3f0; border-top: 4px solid #0b3d1b; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div style="text-align:center">
    <img src="${escapeHtml(FALLBACK_LOGO)}" alt="Startup Up" style="width:120px;margin-bottom:20px">
    <div class="loader"></div>
    <p>กำลังพาไปยังรายละเอียดบ้าน...</p>
    <noscript><p><a href="${escapeHtml(redirectTarget)}">เปิดรายละเอียดบ้าน</a></p></noscript>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.status(200).send(html);
  } catch (error) {
    console.error("Error generating share page:", error);
    res.redirect(307, redirectTarget);
  }
}
