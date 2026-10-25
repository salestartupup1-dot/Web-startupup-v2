// Shared by the document preload and the popup so the browser reuses one request.
export function promotionImage(url) {
  const resize = width => {
    if (!url?.includes('res.cloudinary.com/') || !url.includes('/image/upload/')) return url;
    return url.replace('/image/upload/', `/image/upload/f_auto,q_auto:eco,w_${width},c_limit/`);
  };
  return {
    src: resize(900),
    srcSet: url?.includes('res.cloudinary.com/') ? [400, 520, 700, 900, 1200].map(w => `${resize(w)} ${w}w`).join(', ') : undefined,
    sizes: '(max-width: 552px) calc(100vw - 32px), 520px',
  };
}
