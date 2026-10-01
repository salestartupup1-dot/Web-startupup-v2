import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { fetchPublicDocumentRest } from '../../lib/firestorePublic';
import { subscribePopup } from '../../lib/popupSubscription';

const EMPTY_POPUP = { imageUrl: '', isActive: false };

export default function usePublicPopup(db, appId) {
  const [popup, setPopup] = useState(EMPTY_POPUP);
  useEffect(() => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'site_settings', 'popup');
    return subscribePopup({
      load: options => fetchPublicDocumentRest('site_settings/popup', options),
      observe: (options, next, error) => onSnapshot(ref, options, next, error),
      onData: data => setPopup(current => {
        const next = data ? { imageUrl: data.imageUrl || '', isActive: Boolean(data.isActive) } : EMPTY_POPUP;
        return current.imageUrl === next.imageUrl && current.isActive === next.isActive ? current : next;
      }),
    });
  }, [db, appId]);
  return popup;
}
