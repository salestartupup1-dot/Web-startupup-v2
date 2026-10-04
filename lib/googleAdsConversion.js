export const GOOGLE_ADS_CONTACT_EVENT = 'ads_conversion___1';

export function trackContactClick(event, runtime = globalThis.window) {
  if (!runtime || event.defaultPrevented || event.button !== 0) return;
  const anchor = event.target?.closest?.('a[href]');
  if (!anchor || anchor.hasAttribute('download')) return;
  let destination;
  try { destination = new URL(anchor.href, runtime.location.href); } catch { return; }
  const isContact = destination.protocol === 'tel:'
    || (destination.origin === runtime.location.origin && destination.pathname === '/line/go')
    || (destination.protocol === 'https:' && destination.hostname === 'line.me');
  if (!isContact) return;
  // New tabs must open in the original user gesture to avoid popup blocking.
  // The current page stays open and can finish sending the event independently.
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
    || (anchor.target && anchor.target !== '_self')) {
    gtagSendEvent(undefined, runtime);
    return;
  }
  event.preventDefault();
  gtagSendEvent(anchor.href, runtime);
}

// Compatible with the supplied gtagSendEvent(url) snippet. The independent
// deadline also works when an ad blocker prevents Google's callback from running.
export function gtagSendEvent(url, runtime = globalThis.window) {
  if (!runtime) return false;
  let navigated = false;
  let timeout;
  const callback = () => {
    if (navigated) return;
    navigated = true;
    if (timeout !== undefined) runtime.clearTimeout(timeout);
    if (typeof url === 'string') runtime.location.assign(url);
  };
  if (typeof url === 'string') timeout = runtime.setTimeout(callback, 2000);
  try {
    runtime.dataLayer = runtime.dataLayer || [];
    runtime.gtag = runtime.gtag || function () { runtime.dataLayer.push(arguments); };
    runtime.gtag('event', GOOGLE_ADS_CONTACT_EVENT, {
      event_callback: callback,
      event_timeout: 2000,
    });
  } catch { callback(); }
  return false;
}
