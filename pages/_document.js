import { Html, Head, Main, NextScript } from 'next/document'

const GOOGLE_TAG_MANAGER_ID = 'GTM-N27PQGL2'

// Run before the browser restores scroll and before React/the cinema initializes.
// Only reloads of the home route reset; property links and history navigation keep their targets.
const HOME_RELOAD_START = `(() => {
  const url = new URL(window.location.href);
  const navigation = performance.getEntriesByType('navigation')[0];
  const tab = url.searchParams.get('tab');
  if (navigation?.type !== 'reload' || !['/', '/v4', '/v4/'].includes(url.pathname)
    || (tab && tab !== 'home') || url.hash
    || ['property', 'at', 't'].some(key => url.searchParams.has(key))) return;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  let active = true;
  const reset = () => {
    if (!active) return;
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    root.style.scrollBehavior = previous;
  };
  const inputEvents = ['pointerdown', 'touchstart', 'wheel', 'keydown'];
  const stop = () => {
    active = false;
    document.removeEventListener('DOMContentLoaded', reset);
    window.removeEventListener('load', reset);
    window.removeEventListener('pageshow', shown);
    inputEvents.forEach(name => window.removeEventListener(name, stop));
  };
  const shown = event => {
    if (event.persisted) return;
    reset();
    requestAnimationFrame(reset);
  };
  inputEvents.forEach(name => window.addEventListener(name, stop, { passive: true, once: true }));
  window.addEventListener('pagehide', () => {
    stop();
    if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
  }, { once: true });
  document.addEventListener('DOMContentLoaded', reset, { once: true });
  window.addEventListener('load', reset, { once: true });
  window.addEventListener('pageshow', shown, { once: true });
  reset();
})();`

export default function Document(props) {
  const privateRoute = /^\/(admin|line)(\/|$)/.test(props.__NEXT_DATA__?.page || '')
  return (
    <Html lang="th">
      <Head>
        <script id="home-reload-start" dangerouslySetInnerHTML={{ __html: HOME_RELOAD_START }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@200;300;400;500;600;700&display=swap" rel="stylesheet" />

        {/*
          ประกาศไอคอนไว้ที่นี่ให้ครบทุกหน้า ไม่ใช่เฉพาะหน้าแรก
          Google จะเลือกไอคอนจากหน้าที่มันเก็บได้ ถ้าบางหน้าไม่ประกาศ
          มันอาจไปหยิบของที่เดาเอาเองหรือไม่เจอเลย
        */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/icon-192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
      </Head>
      <body>
        {!privateRoute && <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GOOGLE_TAG_MANAGER_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>}
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
