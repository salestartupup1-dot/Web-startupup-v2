import { useCallback, useEffect, useRef, useState } from 'react';
import styles from '../../styles/skeleton.module.css';

export function SkeletonBlock({ width = '100%', height = '1em', className = '', style, ...props }) {
  return <span {...props} aria-hidden="true" className={`${styles.block} ${className}`} style={{ width, height, ...style }} />;
}

export function InlineSkeleton({ label = 'กำลังโหลด…', width = '5rem', height = '1em' }) {
  return <span role="status" aria-live="polite" aria-busy="true" className={styles.inline} style={{ width }}>
    <span className={styles.srOnly}>{label}</span><SkeletonBlock height={height} />
  </span>;
}

function Lines() {
  return <div className={styles.lines}><SkeletonBlock width="72%" /><SkeletonBlock /><SkeletonBlock width="86%" /></div>;
}

function Card() {
  return <div className={styles.card}><SkeletonBlock className={styles.cover} /><div className={styles.cardBody}><SkeletonBlock width="65%" height="1.25rem" /><SkeletonBlock width="45%" /><SkeletonBlock width="58%" height="1.5rem" /><SkeletonBlock /></div></div>;
}

export default function LoadingSkeleton({ variant = 'listing', label = 'กำลังโหลดข้อมูล…', count = 6, className = '' }) {
  return <div role="status" aria-live="polite" aria-busy="true" className={`${styles.root} ${styles[variant] || ''} ${className}`}>
    <span className={styles.srOnly}>{label}</span>
    <div aria-hidden="true">
      {variant === 'price' ? <><SkeletonBlock width="16rem" height="2.75rem" /><SkeletonBlock className={styles.payment} height="3.1rem" /><SkeletonBlock width="85%" height=".65rem" /></>
        : variant === 'form' ? <div className={styles.form}><SkeletonBlock width="60%" height="1.5rem" />{Array.from({ length: 4 }, (_, i) => <div className={styles.lines} key={i}><SkeletonBlock width="35%" height=".7rem" /><SkeletonBlock height="2.75rem" /></div>)}</div>
        : variant === 'map' ? <SkeletonBlock className={styles.mapCanvas} />
        : variant === 'panel' ? <div className={styles.panel}><SkeletonBlock width="55%" height="1.5rem" /><Lines /><Lines /></div>
        : variant === 'property' ? <><SkeletonBlock className={styles.hero} /><div className={styles.propertyBody}><div className={styles.lines}><SkeletonBlock width="65%" height="2rem" /><SkeletonBlock width="50%" /><SkeletonBlock width="45%" height="2.75rem" /><SkeletonBlock height="7rem" /><Lines /></div><div className={styles.panel}><Lines /><SkeletonBlock height="3rem" /><SkeletonBlock height="3rem" /></div></div></>
        : <><SkeletonBlock width="min(70%, 23rem)" height="1.75rem" /><div className={styles.grid}>{Array.from({ length: count }, (_, i) => <Card key={i} />)}</div></>}
    </div>
  </div>;
}

// Preserve the img element and its geometry, callbacks, and React 19 ref.
// Checking complete also handles images that load before hydration attaches events.
export function SkeletonImage({ src, srcSet, sizes, alt = '', className = '', onLoad, onError, ref: forwardedRef, ...props }) {
  const imageRef = useRef(null);
  const key = `${src || ''}\n${srcSet || ''}\n${sizes || ''}`;
  const [settled, setSettled] = useState(null);
  const attach = useCallback(node => {
    imageRef.current = node;
    if (typeof forwardedRef === 'function') return forwardedRef(node);
    if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  useEffect(() => {
    if (imageRef.current?.complete) setSettled(key);
  }, [key]);
  const pending = Boolean(src) && settled !== key;
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} ref={attach} src={src} srcSet={srcSet} sizes={sizes} alt={alt}
    className={`${className}${pending ? ` ${styles.image}` : ''}`} aria-busy={pending || undefined}
    onLoad={event => { setSettled(key); onLoad?.(event); }}
    onError={event => { setSettled(key); onError?.(event); }} />;
}
