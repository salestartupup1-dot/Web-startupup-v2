import { useEffect } from 'react';
import { promotionImage } from '../../lib/promotionImage';

// Initial visitors can see and dismiss the document island before React loads.
export default function PromotionPopup({ imageUrl, onClose }) {
  useEffect(() => {
    const dismissed = event => { if (event.detail === imageUrl) onClose(); };
    window.addEventListener('site-promotion-dismiss', dismissed);
    window.__sitePromotion?.show(imageUrl, promotionImage(imageUrl));
    return () => {
      window.removeEventListener('site-promotion-dismiss', dismissed);
      if (window.__sitePromotion?.current() === imageUrl) window.__sitePromotion.hide();
    };
  }, [imageUrl, onClose]);
  return null;
}
