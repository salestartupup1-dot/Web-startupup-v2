import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const isDevelopment = process.env.NODE_ENV !== 'production';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// เว็บนี้อยู่ในโฟลเดอร์ย่อยของ repo หลัก เวลา build ในเครื่อง Turbopack จะเดินขึ้นไปอ่าน
// node_modules ของโปรเจกต์แม่ (อยู่ใน OneDrive) แล้วพัง — เลยตรึง root ไว้ที่ตัวเอง
//
// แต่บน Vercel ห้ามตรึง: Root Directory ถูกตั้งเป็น stock-map อยู่แล้ว และการตรึงพาธนี้
// ทำให้ builder หา .next/routes-manifest-deterministic.json ไม่เจอ (ENOENT) หลัง build เสร็จ
const rootPinning = process.env.VERCEL
  ? {}
  : { turbopack: { root: projectRoot }, outputFileTracingRoot: projectRoot };

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
    isDevelopment ? "'unsafe-eval'" : ""
  ].filter(Boolean).join(' '),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  [
    "img-src",
    "'self'",
    "data:",
    "blob:",
    "https://tile.openstreetmap.org"
  ].join(' '),
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests"
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...rootPinning,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' }
        ],
      },
    ];
  },
};

export default nextConfig;
