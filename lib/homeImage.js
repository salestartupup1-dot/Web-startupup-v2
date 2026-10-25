// Versioned, precompressed derivatives retain the original artwork and crop.
export function homeImage(src) {
  const match = /^\/(featured|locations)\/([a-z-]+)\.jpg$/.exec(src || '');
  if (!match) return { src };
  const base = `/home-media/v1/${match[1]}-${match[2]}`;
  return { src: `${base}-800.webp`, srcSet: `${base}-400.webp 400w, ${base}-800.webp 800w` };
}
