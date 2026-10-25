import { useEffect, useState } from 'react';
import { observePublicDocument } from '../../lib/publicDocumentObserver';
import { fetchPublicDocumentRest } from '../../lib/firestorePublic';
import { subscribePopup } from '../../lib/popupSubscription';

const EMPTY_POPUP = { imageUrl: '', isActive: false };

export default function usePublicPopup(initialPopup) {
  const [popup, setPopup] = useState(initialPopup || EMPTY_POPUP);
  useEffect(() => {
    return subscribePopup({
      load: options => fetchPublicDocumentRest('site_settings/popup', options),
      observe: (_options, next, error) => observePublicDocument('site_settings/popup', next, error, { initial: false }),
      onData: data => setPopup(current => {
        const next = data ? { imageUrl: data.imageUrl || '', isActive: Boolean(data.isActive) } : EMPTY_POPUP;
        return current.imageUrl === next.imageUrl && current.isActive === next.isActive ? current : next;
      }),
    });
  }, []);
  return popup;
}
