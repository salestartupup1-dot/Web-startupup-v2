import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { fetchPublicPropertyApi } from '../../lib/publicProperty';
import { subscribePropertyDetails } from '../../lib/propertyDetails';
import { matchesPropertySlug } from '../../lib/firestorePublic';

export default function usePropertyLink({
  db, appId, requestedPropSlug, selectedProperty,
  setRequestedPropSlug, setSelectedProperty, setActiveTab, setGlobalAlert,
}) {
  const documentId = requestedPropSlug && selectedProperty?._detailsPending
    && matchesPropertySlug(selectedProperty, requestedPropSlug) ? selectedProperty.id : undefined;
  useEffect(() => {
    if (!requestedPropSlug) return;

    let cancelled = false;
    let controller, timer, recoveryTimer;
    let running = false;
    let recoveryCount = 0;
    let mayRecover = true;
    const closeAlert = () => setGlobalAlert(previous => previous.propertyLoadError
      ? { ...previous, isOpen: false } : previous);

    // Retry in place. A recovered network never requires reloading the whole site.
    const load = async () => {
      if (cancelled || running) return;
      clearTimeout(recoveryTimer);
      running = true;
      closeAlert();
      controller = new AbortController();
      timer = setTimeout(() => controller.abort(), 30000);
      try {
        const property = await fetchPublicPropertyApi(requestedPropSlug, { signal: controller.signal, documentId });
        if (cancelled) return;
        closeAlert();
        setSelectedProperty(property);
        setRequestedPropSlug(null);
        if (!property) {
          setActiveTab('home');
          setGlobalAlert({
            isOpen: true, type: 'error', title: 'ไม่พบข้อมูล',
            message: 'ไม่พบข้อมูลบ้านที่คุณระบุ ระบบจะพากลับหน้าหลัก',
            showCancel: false,
            onConfirm: () => setGlobalAlert(previous => ({ ...previous, isOpen: false })),
          });
        }
      } catch (error) {
        if (cancelled) return;
        mayRecover = error.retryable !== false;
        console.warn('Direct property lookup failed.', { status: error.status, requestId: error.requestId });
        setGlobalAlert({
          isOpen: true, propertyLoadError: true, type: 'error', title: 'โหลดข้อมูลไม่สำเร็จ',
          message: 'ยังเชื่อมต่อข้อมูลบ้านไม่ได้ กรุณาลองอีกครั้ง โดยไม่ต้องรีเฟรชหน้าเว็บ',
          confirmText: 'ลองอีกครั้ง', showCancel: false, onConfirm: load,
        });
        // Bounded recovery: no endless polling against an outage or exhausted quota.
        if (mayRecover && recoveryCount < 2) {
          recoveryTimer = setTimeout(() => {
            if (document.visibilityState !== 'hidden' && navigator.onLine) {
              recoveryCount += 1;
              void load();
            }
          }, 15000 * (recoveryCount + 1));
        }
      } finally {
        clearTimeout(timer);
        running = false;
      }
    };
    const recover = () => {
      if (!running && mayRecover && recoveryCount < 2 && document.visibilityState !== 'hidden' && navigator.onLine) {
        recoveryCount += 1;
        void load();
      }
    };
    void load();
    window.addEventListener('online', recover);
    document.addEventListener('visibilitychange', recover);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(recoveryTimer);
      controller?.abort();
      window.removeEventListener('online', recover);
      document.removeEventListener('visibilitychange', recover);
      closeAlert();
    };
  }, [requestedPropSlug, documentId, setRequestedPropSlug, setSelectedProperty, setActiveTab, setGlobalAlert]);

  const selectedId = selectedProperty?.id;
  useEffect(() => {
    if (!selectedId || requestedPropSlug) return;
    const propertyRef = doc(db, 'artifacts', appId, 'public', 'data', 'properties', selectedId);
    // Subscribe only to the house being viewed, not the entire catalogue.
    return subscribePropertyDetails({
      observe: (options, onValue, onError) => onSnapshot(propertyRef, options, onValue, onError),
      onProperty: property => setSelectedProperty(current => current?.id === selectedId ? property : current),
      onMissing: () => {
        setSelectedProperty(current => current?.id === selectedId ? null : current);
        setActiveTab('home');
        setGlobalAlert({
          isOpen: true, type: 'error', title: 'ไม่พบข้อมูล',
          message: 'บ้านหลังนี้ถูกนำออกจากรายการแล้ว ระบบจะพากลับหน้าหลัก',
          showCancel: false,
          onConfirm: () => setGlobalAlert(previous => ({ ...previous, isOpen: false })),
        });
      },
      onError: error => console.warn('Live property updates unavailable.', error),
    });
  }, [db, appId, selectedId, requestedPropSlug, setSelectedProperty, setActiveTab, setGlobalAlert]);
}
