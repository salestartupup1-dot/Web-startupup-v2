/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV !== 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    isDevelopment ? "'unsafe-eval'" : "",
    "https://apis.google.com",
    "https://static.line-scdn.net",
    "https://www.googletagmanager.com",
    // Google Ads tags injected by GTM, plus the TikTok Pixel in pages/_app.js.
    // https://developers.google.com/tag-platform/security/guides/csp
    "https://www.googleadservices.com",
    "https://www.google.com",
    "https://pagead2.googlesyndication.com",
    "https://googleads.g.doubleclick.net",
    "https://analytics.tiktok.com"
  ].filter(Boolean).join(' '),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  [
    "img-src",
    "'self'",
    "data:",
    "blob:",
    "https://res.cloudinary.com",
    "https://*.cloudinary.com",
    "https://images.unsplash.com",
    "https://img.youtube.com",
    "https://i.ytimg.com",
    "https://*.googleusercontent.com",
    "https://*.googleapis.com",
    "https://*.gstatic.com",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://stats.g.doubleclick.net",
    "https://googleads.g.doubleclick.net",
    "https://www.googleadservices.com",
    "https://pagead2.googlesyndication.com",
    "https://www.google.com",
    "https://google.com",
    "https://www.google.co.th",
    "https://analytics.tiktok.com",
    "https://*.basemaps.cartocdn.com",
    "https://server.arcgisonline.com",
    "https://tile.openstreetmap.org",
    "https://*.tile.openstreetmap.org",
    "https://placehold.co",
    "https://profile.line-scdn.net"
  ].join(' '),
  "media-src 'self' https://res.cloudinary.com https://*.cloudinary.com",
  [
    "connect-src",
    "'self'",
    "https://api.cloudinary.com",
    "https://api.line.me",
    "https://access.line.me",
    "https://liff.line.me",
    "https://*.cloudinary.com",
    "https://*.googleapis.com",
    "https://*.google.com",
    "https://*.gstatic.com",
    "https://raw.githubusercontent.com",
    "https://api.open-meteo.com",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://firebaseinstallations.googleapis.com",
    "https://firestore.googleapis.com",
    ...(isDevelopment ? ["http://127.0.0.1:8093", "http://127.0.0.1:9097"] : []),
    "https://www.googleapis.com",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://analytics.google.com",
    "https://*.analytics.google.com",
    "https://stats.g.doubleclick.net",
    "https://googleads.g.doubleclick.net",
    "https://ad.doubleclick.net",
    "https://www.googleadservices.com",
    "https://pagead2.googlesyndication.com",
    "https://google.com",
    "https://www.google.co.th",
    "https://analytics.tiktok.com",
    // Pixel's IPv6 enrichment request, observed in the PageSpeed console.
    "https://analytics-ipv6.tiktokw.us",
    "https://*.firebaseio.com",
    "wss://*.firebaseio.com",
    "wss://firestore.googleapis.com"
  ].join(' '),
  "frame-src 'self' https://www.youtube-nocookie.com https://www.google.com https://maps.google.com https://*.google.com https://accounts.google.com https://*.firebaseapp.com https://tagassistant.google.com https://www.googletagmanager.com",
  "child-src 'self' https://www.youtube-nocookie.com https://www.google.com https://maps.google.com https://*.google.com https://accounts.google.com https://*.firebaseapp.com https://tagassistant.google.com https://www.googletagmanager.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  /**
   * upgrade-insecure-requests บังคับให้ทุกไฟล์ย่อยโหลดผ่าน https
   * บนเว็บจริงถูกต้อง แต่ตอน dev เสิร์ฟผ่าน http ล้วน (โดยเฉพาะเปิดจากมือถือผ่าน IP วงแลน)
   * ทุกไฟล์จะถูกดันไป https แล้วล้มด้วย ERR_SSL_PROTOCOL_ERROR จนหน้าเว็บว่างเปล่า
   * จึงใส่เฉพาะตอน build จริงเท่านั้น
   */
  ...(isDevelopment ? [] : ["upgrade-insecure-requests"])
].join('; ');

/* HSTS ก็เหมือนกัน — ถ้าส่งตอน dev เบราว์เซอร์จะจำไว้แล้วบังคับ https กับ host นั้นยาวถึง 2 ปี */
const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  ...(isDevelopment ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self), clipboard-write=(self)' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * lucide-react เป็น barrel ก้อนใหญ่ SiteApp.js ดึงไอคอนจากมันทีเดียว 40 ตัว
   * ถ้าไม่บอก Next มันจะเดินทั้ง module graph ของไลบรารีก่อนค่อย tree-shake
   * ตัวนี้ทำให้ import ถูกแตกเป็นรายไฟล์อัตโนมัติ ลด first-load JS
   */
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'startupup-real-estate.com',
          },
        ],
        destination: 'https://www.startupup-real-estate.com/:path*',
        permanent: true,
      },
      // Browsers and older shared links can send the Thai path either decoded
      // or percent-encoded. Keep both forms working, including article links.
      ...['บทความ', encodeURIComponent('บทความ')].flatMap(prefix => [
        { source: `/${prefix}`, destination: '/articles', permanent: true },
        { source: `/${prefix}/:path+`, destination: '/articles/:path*', permanent: true },
      ]),
    ];
  },
  async headers() {
    return [
      {
        source: '/home-media/:version/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // วิดีโอฉากเปิดมีเลขเวอร์ชันในชื่อไฟล์อยู่แล้ว (house-scrub-v1.mp4) แคชยาวได้ปลอดภัย
        // เวลาแปลงใหม่ให้ขึ้นเป็น -v2 ห้ามทับไฟล์เดิม ไม่งั้น CDN จะจ่ายของเก่า
        source: '/video/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ],
      },
    ];
  },
};

export default nextConfig;
