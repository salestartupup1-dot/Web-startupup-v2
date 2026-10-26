// An independent document island: usable before React, without changing #__next.
function installPromotion() {
  const dialog = document.getElementById('site-promotion');
  if (!dialog) return;
  const img = dialog.querySelector('img'), checkbox = dialog.querySelector('input');
  const dismissed = new Set();
  let current = dialog.dataset.imageUrl || '', generation = 0, previousFocus, scrolled = false, waiting = 0;
  const snoozed = () => {
    try { return Number(localStorage.getItem('hidePopupUntil')) > Date.now(); } catch { return false; }
  };
  const hide = () => {
    generation++;
    if (dialog.open) {
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    }
  };
  const dismiss = () => {
    dismissed.add(current);
    if (checkbox.checked) {
      try { localStorage.setItem('hidePopupUntil', String(Date.now() + 86400000)); } catch { /* disabled storage */ }
    }
    hide();
    window.dispatchEvent(new CustomEvent('site-promotion-dismiss', { detail: current }));
  };
  const prepare = async token => {
    if (!img.complete || !img.naturalWidth) return;
    try { await img.decode(); } catch { return; }
    if (token !== generation || dismissed.has(current) || snoozed()) return;
    img.width = img.naturalWidth; img.height = img.naturalHeight;
    // Opens once the visitor starts scrolling, so the first houses stay the page's main content.
    if (!scrolled) { waiting = token; return; }
    if (!dialog.open) {
      previousFocus = document.activeElement;
      dialog.showModal();
    }
  };
  const show = (url, image) => {
    if (!url || dismissed.has(url) || snoozed()) { hide(); return; }
    if (current === url && dialog.open) {
      if (!dialog.contains(document.activeElement)) dialog.querySelector('button').focus({ preventScroll: true });
      return;
    }
    if (current !== url) {
      hide(); current = url; checkbox.checked = false;
      img.sizes = image.sizes;
      if (image.srcSet) img.srcset = image.srcSet; else img.removeAttribute('srcset');
      img.src = image.src;
    }
    const token = ++generation;
    img.onload = () => { void prepare(token); }; img.onerror = hide;
    void prepare(token);
  };
  // The first photo downloads at the first scroll, or 3 s after load, whichever comes first.
  const loadImage = () => {
    if (img.getAttribute('src') || !img.dataset.src) return;
    if (img.dataset.sizes) img.sizes = img.dataset.sizes;
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
  };
  window.addEventListener('load', () => setTimeout(loadImage, 3000), { once: true });
  const onScroll = () => {
    if (window.scrollY <= 0) return; // a reload's reset to the top is not the visitor scrolling
    window.removeEventListener('scroll', onScroll);
    scrolled = true;
    loadImage();
    if (waiting) void prepare(waiting);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  dialog.querySelector('button').addEventListener('click', dismiss);
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const first = checkbox, last = dialog.querySelector('button');
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.__sitePromotion = { show, hide, current: () => current };
  if (current) show(current, {});
}
export const PROMOTION_BOOTSTRAP = `(${installPromotion.toString()})();`;
