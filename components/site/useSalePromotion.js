import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { fetchPublicDocumentRest } from '../../lib/firestorePublic';
import { subscribePopup as subscribeLiveDocument } from '../../lib/popupSubscription';
import { EMPTY_SALE_PROMOTION, normalizeSalePromotion, promotionExpiry, SALE_PROMOTION_PATH } from '../../lib/salePromotion';

export default function useSalePromotion(db, appId) {
  const [state, setState] = useState({ promotion: EMPTY_SALE_PROMOTION, loading: true, error: false });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'site_settings', 'sale_promotion');
    return subscribeLiveDocument({
      load: options => fetchPublicDocumentRest(SALE_PROMOTION_PATH, options),
      observe: (options, next, error) => onSnapshot(ref, options, next, error),
      onData: data => setState({ promotion: normalizeSalePromotion(data), loading: false, error: false }),
      onError: () => setState({ promotion: EMPTY_SALE_PROMOTION, loading: false, error: true }),
    });
  }, [db, appId]);
  useEffect(() => {
    const expires = promotionExpiry(state.promotion.endDate);
    let timer;
    const updateClock = () => {
      clearTimeout(timer);
      setNow(Date.now());
      const delay = expires - Date.now();
      if (delay > 0) timer = setTimeout(updateClock, Math.min(delay, 2147483647));
    };
    updateClock();
    window.addEventListener('focus', updateClock);
    document.addEventListener('visibilitychange', updateClock);
    return () => { clearTimeout(timer); window.removeEventListener('focus', updateClock); document.removeEventListener('visibilitychange', updateClock); };
  }, [state.promotion.endDate]);
  return { ...state, now };
}
