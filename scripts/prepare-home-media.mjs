// Run from the repository root. The original videos/poster live in ignored
// public/video; images retain their tracked originals in public/featured and locations.
import sharp from 'sharp';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const out = 'public/home-media/v1';
await mkdir(out, { recursive: true });
for (const folder of ['featured', 'locations']) {
  for (const name of await readdir(`public/${folder}`)) {
    if (!/^[a-z-]+\.jpg$/.test(name)) continue;
    for (const width of [400, 800]) {
      await sharp(`public/${folder}/${name}`).resize({ width, withoutEnlargement: true })
        .webp({ quality: 74, effort: 6 }).toFile(`${out}/${folder}-${name.slice(0, -4)}-${width}.webp`);
    }
  }
}
await sharp('public/video/house-scrub-poster-v3.jpg').webp({ quality: 68, effort: 6 }).toFile(`${out}/hero-poster.webp`);
await mkdir('public/home-media/v2', { recursive: true });
await sharp('public/video/house-scrub-poster-v3.jpg').avif({ quality: 43, effort: 7 }).toFile('public/home-media/v2/hero-poster.avif');
await sharp('public/video/house-scrub-poster-v3.jpg').webp({ quality: 52, effort: 6 }).toFile('public/home-media/v2/hero-poster.webp');
// Keep frequent keyframes for reverse/forward scroll seeking. Do not use a
// generic CDN video transform, which discards this deliberate keyframe spacing.
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', 'public/video/house-scrub-sm-v3.mp4',
  '-vf', 'scale=1080:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
  '-g', '12', '-keyint_min', '12', '-sc_threshold', '0', '-pix_fmt', 'yuv420p',
  '-an', '-movflags', '+faststart', `${out}/house-scrub-mobile.mp4`]);
for (const name of await readdir(out)) console.log(name, (await stat(`${out}/${name}`)).size);
