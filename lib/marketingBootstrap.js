// Self-contained so the document can create queues before React effects emit events.
// Download the SDKs after load at idle, or immediately for a real interaction.
export function installMarketingScripts(win, doc) {
  if (win.__siteMarketing) return win.__siteMarketing;
  const googleId = 'GTM-N27PQGL2', pixelId = 'D929G0BC77U133LMGG50';
  const idleTasks = new Set();
  let googleStarted = false, tiktokStarted = false, scheduled = false;
  win.dataLayer = win.dataLayer || [];
  win.gtag = win.gtag || function () { win.dataLayer.push(arguments); };
  win.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  // TikTok's deferred API keeps calls in order until its SDK arrives.
  win.TiktokAnalyticsObject = 'ttq';
  const ttq = win.ttq = win.ttq || [];
  ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent'];
  ttq.setAndDefer = (target, method) => { target[method] = (...args) => target.push([method, ...args]); };
  ttq.methods.forEach(method => ttq.setAndDefer(ttq, method));
  ttq.instance = id => {
    const instance = ttq._i[id] || [];
    ttq.methods.forEach(method => ttq.setAndDefer(instance, method));
    return instance;
  };
  ttq._i = ttq._i || {}; ttq._t = ttq._t || {}; ttq._o = ttq._o || {};
  const inject = (id, src) => {
    if (doc.getElementById(id)) return;
    const script = doc.createElement('script');
    script.id = id; script.async = true; script.src = src;
    script.fetchPriority = 'low';
    doc.head.appendChild(script);
  };
  ttq.load = (id, options) => {
    const url = 'https://analytics.tiktok.com/i18n/pixel/events.js';
    ttq._i[id] = []; ttq._i[id]._u = url;
    ttq._t[id] = Date.now(); ttq._o[id] = options || {};
    inject('tiktok-pixel-sdk', url + '?sdkid=' + id + '&lib=ttq');
  };
  ttq.page();
  const google = () => {
    if (googleStarted) return;
    googleStarted = true;
    inject('google-tag-manager-sdk', 'https://www.googletagmanager.com/gtm.js?id=' + googleId);
  };
  const tiktok = () => {
    if (tiktokStarted) return;
    tiktokStarted = true; ttq.load(pixelId);
  };
  const cancelIdle = () => {
    idleTasks.forEach(id => win.requestIdleCallback ? win.cancelIdleCallback(id) : win.clearTimeout(id));
    idleTasks.clear();
  };
  const idle = callback => {
    const run = () => { idleTasks.delete(id); callback(); };
    const id = win.requestIdleCallback ? win.requestIdleCallback(run, { timeout: 1000 }) : win.setTimeout(run, 0);
    idleTasks.add(id);
  };
  const cleanup = () => {
    cancelIdle();
    win.removeEventListener('load', schedule);
    doc.removeEventListener('pointerdown', start, true);
    doc.removeEventListener('keydown', start, true);
    doc.removeEventListener('visibilitychange', leaving);
    win.removeEventListener('pagehide', start);
  };
  const start = () => { google(); tiktok(); cleanup(); };
  const leaving = () => { if (doc.visibilityState === 'hidden') start(); };
  const schedule = () => {
    if (scheduled || (googleStarted && tiktokStarted)) return;
    scheduled = true;
    idle(() => {
      google();
      // Give rendering and input another opportunity between SDK requests.
      idle(() => { tiktok(); cleanup(); });
    });
  };
  win.__siteMarketing = { start };
  doc.addEventListener('pointerdown', start, { capture: true, passive: true });
  doc.addEventListener('keydown', start, true);
  doc.addEventListener('visibilitychange', leaving);
  win.addEventListener('pagehide', start);
  if (doc.readyState === 'complete') schedule();
  else win.addEventListener('load', schedule, { once: true });
  return win.__siteMarketing;
}

export const MARKETING_BOOTSTRAP = `(${installMarketingScripts.toString()})(window, document);`;
