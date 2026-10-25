// An independent document island: usable before React, without changing #__next.
function installPromotion() {
  const dialog = document.getElementById('site-promotion');
  if (!dialog) return;
  const img = dialog.querySelector('img'), checkbox = dialog.querySelector('input');
  const dismissed = new Set();
  let current = dialog.dataset.imageUrl || '', generation = 0, previousFocus;
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
