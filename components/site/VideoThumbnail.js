import { useCallback, useEffect, useRef, useState } from 'react';

// YouTube can return a decoded 120x90 placeholder, including with a 404.
// It may load before hydration, so onError alone cannot detect missing covers.
export default function VideoThumbnail({ videoId, poster, ...props }) {
  const [index, setIndex] = useState(0);
  const imageRef = useRef(null);
  const thumbnails = ['maxresdefault', 'hqdefault', 'mqdefault']
    .map(quality => `https://img.youtube.com/vi/${videoId}/${quality}.jpg`);
  if (poster) thumbnails.push(poster);
  const src = thumbnails[index];
  const advance = useCallback(() => {
    setIndex(current => current === index ? current + 1 : current);
  }, [index]);
  const checkImage = useCallback(image => {
    if (!image?.complete) return;
    const placeholder = index < 3 && image.naturalWidth <= 120 && image.naturalHeight <= 90;
    if (!image.naturalWidth || placeholder) advance();
  }, [index, advance]);

  useEffect(() => { checkImage(imageRef.current); }, [src, checkImage]);

  if (!src) return <span className="sp4-video-placeholder">กดเพื่อเล่นวิดีโอแนะนำบ้าน</span>;
  return (
    // Direct CDN images keep video covers independent of the image proxy.
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} ref={imageRef} src={src} alt="ภาพปกวิดีโอแนะนำบ้าน"
      onLoad={event => checkImage(event.currentTarget)} onError={advance} />
  );
}
