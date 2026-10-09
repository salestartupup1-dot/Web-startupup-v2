/**
 * useSiteData — สมองของเว็บทั้งก้อน
 *
 * รวมทุกอย่างที่เว็บต้องใช้ไว้ที่เดียว : โหลดข้อมูลจาก Firestore, ล็อกอิน Google,
 * สิทธิ์ host/admin, โหมดแก้ไขหน้าเว็บ (undo/redo), ป็อปอัปโปรโมชั่น, ไลท์บ็อกซ์,
 * การอ่าน/เขียน URL และ SEO
 *
 * แยกออกมาจาก components/site/SiteApp.js เพื่อให้ดีไซน์ใหม่ (pages/v4.js)
 * ใช้ระบบหลังบ้านชุดเดียวกันได้ทั้งดุ้น โดยไม่ต้องก๊อปโค้ด
 */

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';

/**
 * อ่าน URL ให้เสร็จก่อนเบราว์เซอร์วาดจอแรก ไม่งั้นเปิดลิงก์ตรงอย่าง ?tab=all
 * จะเห็นหน้าหลัก (ฉากภาพยนตร์) แวบหนึ่งก่อนแล้วค่อยสลับ
 * ฝั่ง server ไม่มี layout effect เลยถอยไปใช้ useEffect ตามปกติ
 */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import {
  onAuthStateChanged, signOut, signInAnonymously,
  GoogleAuthProvider, signInWithPopup,
} from 'firebase/auth';
import {
  collection, getDocsFromServer, doc, onSnapshot, query,
  getDoc, getDocFromServer, serverTimestamp,
} from 'firebase/firestore';

import {
  fetchPublicCollectionRest, fetchPublicDocumentRest,
} from '../../lib/firestorePublic';
import { buildPageSeo, buildStructuredData } from '../../lib/seo';
import { selectPublicProperties } from '../../lib/propertyOwners';
import usePropertyLink from './usePropertyLink';
import { createPropertyPreview } from '../../lib/propertyPreview';
import usePublicPopup from './usePublicPopup';
import { subscribeSiteSession } from '../../lib/siteSession';
import { subscribePublicData } from '../../lib/publicDataSubscription';

import {
  db, auth, appId, HOST_EMAIL, setDoc,
  DEFAULT_COMPANY_INFO, DEFAULT_LOCATIONS_DATA, DEFAULT_VISUAL_CONTENT,
  uploadFileToCloudinary, validateImage, generatePropSlug,
} from './SiteApp';

/**
 * basePath — เว็บนี้เก็บสถานะไว้ใน query string ของหน้าตัวเอง
 * หน้าเดิมอยู่ที่ '/' ส่วนดีไซน์ใหม่อยู่ที่ '/v4' ถ้าไม่บอกไว้ การเปลี่ยนแท็บบน /v4
 * จะเขียน URL กลับไปเป็น '/' แล้วพอรีเฟรชจะเด้งไปหน้าเดิม
 */
export default function useSiteData({ basePath = '/' } = {}) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [properties, setProperties] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(DEFAULT_COMPANY_INFO);
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publicDataError, setPublicDataError] = useState(false);

  // หน้าเว็บฝั่งลูกค้าใช้เฉพาะบ้านของ Startup Up — บ้าน Partner ยังอยู่ครบใน properties สำหรับหลังบ้าน
  const publicProperties = useMemo(() => selectPublicProperties(properties), [properties]);

  const [activeTab, setActiveTab] = useState('home');
  const [isRouteReady, setIsRouteReady] = useState(false);
  const [searchParams, setSearchParams] = useState({ type: 'all', value: '', area: '' });
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [requestedPropSlug, setRequestedPropSlug] = useState(null);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [isVisualEditMode, setIsVisualEditMode] = useState(false);
  const [visualContent, setVisualContent] = useState(DEFAULT_VISUAL_CONTENT);
  const [pastVisual, setPastVisual] = useState([]);
  const [futureVisual, setFutureVisual] = useState([]);
  const [isSavingVisual, setIsSavingVisual] = useState(false);

  const popupData = usePublicPopup(db, appId);
  const [showPopupModal, setShowPopupModal] = useState(false);
  const [isSnoozeChecked, setIsSnoozeChecked] = useState(false);
  const hasCheckedPopup = useRef('');

  const [lightbox, setLightbox] = useState({ isOpen: false, images: [], startIndex: 0 });
  const openLightbox = useCallback((images, startIndex = 0) => setLightbox({ isOpen: true, images, startIndex }), []);
  const closeLightbox = useCallback(() => setLightbox(prev => ({ ...prev, isOpen: false })), []);

  const [globalAlert, setGlobalAlert] = useState({
    isOpen: false, type: 'info', title: '', message: '', onConfirm: null, showCancel: false,
  });

  const showGlobalAlert = useCallback((title, message, type = 'info') => {
    setGlobalAlert({
      isOpen: true, type, title, message, showCancel: false,
      onConfirm: () => setGlobalAlert(prev => ({ ...prev, isOpen: false })),
    });
  }, []);

  const showGlobalConfirm = useCallback((title, message, onConfirmCallback) => {
    setGlobalAlert({
      isOpen: true, type: 'warning', title, message, showCancel: true,
      onCancel: () => setGlobalAlert(prev => ({ ...prev, isOpen: false })),
      onConfirm: () => {
        setGlobalAlert(prev => ({ ...prev, isOpen: false }));
        if (onConfirmCallback) onConfirmCallback();
      },
    });
  }, []);

  /* ---------- SEO ---------- */
  const seoMeta = useMemo(
    () => buildPageSeo({ selectedProperty, activeTab, searchParams, companyInfo }),
    [selectedProperty, activeTab, searchParams, companyInfo]
  );
  const structuredData = useMemo(
    () => buildStructuredData({ companyInfo, selectedProperty }),
    [companyInfo, selectedProperty]
  );

  /* ---------- อ่านสถานะจาก URL ---------- */
  useIsomorphicLayoutEffect(() => {
    const syncFromUrl = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab') || 'home';
        const propSlug = params.get('property');
        const sType = params.get('sType');
        const sValue = params.get('sValue');

        setActiveTab(tab);
        if (sType && sValue) setSearchParams({ type: sType, value: sValue, area: params.get('sArea') || '' });
        setRequestedPropSlug(propSlug);
        setSelectedProperty(null);
      } catch (e) {
        console.warn('Cannot read URL parameters in this environment.');
      }
      setIsRouteReady(true);
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  usePropertyLink({
    db, appId, loading, requestedPropSlug, properties, selectedProperty,
    setRequestedPropSlug, setSelectedProperty, setActiveTab, setGlobalAlert,
  });

  /* ---------- เขียนสถานะกลับลง URL ---------- */
  useEffect(() => {
    /* ห้ามเขียนก่อนอ่าน URL เสร็จ ไม่งั้นรอบแรกจะ pushState ทับด้วย activeTab='home'
       แล้ว ?tab=… ที่ผู้ใช้เปิดมาจะหายไป กลายเป็นเด้งกลับหน้าหลักทุกครั้ง */
    if (!isRouteReady) return;

    const params = new URLSearchParams();
    let targetPath = basePath;

    if (selectedProperty) {
      targetPath = '/api/share';
      params.set('property', generatePropSlug(selectedProperty));
    } else {
      if (activeTab !== 'home') params.set('tab', activeTab);
      if (activeTab === 'search_result' && searchParams.value) {
        params.set('sType', searchParams.type);
        params.set('sValue', searchParams.value);
        if (searchParams.area) params.set('sArea', searchParams.area);
      }
    }

    try {
      const currentParams = new URLSearchParams(window.location.search);
      currentParams.forEach((value, key) => {
        const shouldPreserve = key === '_gl' || key === 'tagassistant' || key.startsWith('gtm_');
        if (shouldPreserve && !params.has(key)) params.append(key, value);
      });
    } catch (e) { /* ไม่มี window ก็ข้ามไป */ }

    if (showAdminPanel) params.set('admin', '1');

    const queryString = params.toString() ? `?${params.toString()}` : '';

    try {
      const currentUrl = window.location.pathname + window.location.search;
      const newUrl = targetPath + queryString;
      if (currentUrl !== newUrl && !requestedPropSlug) {
        window.history.pushState({}, '', newUrl);
      }
    } catch (e) { /* ไม่มี history ก็ข้ามไป */ }
  }, [activeTab, selectedProperty, searchParams, requestedPropSlug, basePath, isRouteReady, showAdminPanel]);

  /* ---------- ป็อปอัปโปรโมชั่น ---------- */
  useEffect(() => {
    const isHomeView = isRouteReady && activeTab === 'home' && !selectedProperty && !requestedPropSlug;
    if (!popupData.isActive || !popupData.imageUrl) {
      hasCheckedPopup.current = '';
      setShowPopupModal(false);
      return;
    }
    if (!isHomeView) {
      setShowPopupModal(false);
      return;
    }
    if (hasCheckedPopup.current !== popupData.imageUrl) {
      hasCheckedPopup.current = popupData.imageUrl;
      let hideUntil = 0;
      try { hideUntil = Number(localStorage.getItem('hidePopupUntil')) || 0; } catch {}
      setShowPopupModal(Date.now() > hideUntil);
    }
  }, [popupData, isRouteReady, activeTab, selectedProperty, requestedPropSlug]);

  const dismissPopup = useCallback(() => {
    if (isSnoozeChecked) localStorage.setItem('hidePopupUntil', Date.now() + 24 * 60 * 60 * 1000);
    setShowPopupModal(false);
  }, [isSnoozeChecked]);

  /* ---------- โหมดแก้ไขหน้าเว็บ ---------- */
  const updateVisualContent = useCallback((newContent) => {
    setPastVisual(prev => [...prev, visualContent]);
    setVisualContent(newContent);
    setFutureVisual([]);
  }, [visualContent]);

  const undoVisual = useCallback(() => {
    if (pastVisual.length === 0) return;
    const prev = pastVisual[pastVisual.length - 1];
    setFutureVisual(f => [visualContent, ...f]);
    setVisualContent(prev);
    setPastVisual(p => p.slice(0, -1));
  }, [pastVisual, visualContent]);

  const redoVisual = useCallback(() => {
    if (futureVisual.length === 0) return;
    const next = futureVisual[0];
    setPastVisual(p => [...p, visualContent]);
    setVisualContent(next);
    setFutureVisual(f => f.slice(1));
  }, [futureVisual, visualContent]);

  const saveVisualEdit = useCallback(() => {
    if (userRole !== 'host') {
      showGlobalAlert('ปฏิเสธการเข้าถึง', 'เฉพาะ Host เท่านั้นที่สามารถบันทึกการแก้ไขหน้าเว็บได้', 'error');
      return;
    }
    showGlobalConfirm('ยืนยันการบันทึก', 'คุณต้องการบันทึกการแก้ไขหน้าตาเว็บไซต์ใช่หรือไม่?', async () => {
      setIsSavingVisual(true);
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'site_settings', 'visual'), visualContent, { merge: true });
        setIsVisualEditMode(false);
        setPastVisual([]); setFutureVisual([]);
        showGlobalAlert('สำเร็จ', 'บันทึกการแก้ไขเรียบร้อยแล้ว', 'success');
      } catch (e) {
        showGlobalAlert('ผิดพลาด', e.message, 'error');
      }
      setIsSavingVisual(false);
    });
  }, [userRole, visualContent, showGlobalAlert, showGlobalConfirm]);

  const cancelVisualEdit = useCallback(() => {
    showGlobalConfirm('ยกเลิกการแก้ไข', 'การแก้ไขที่ยังไม่ได้บันทึกจะสูญหาย ยืนยันยกเลิก?', () => {
      setIsVisualEditMode(false);
      setPastVisual(prev => {
        if (prev.length > 0) setVisualContent(prev[0]);
        return [];
      });
      setFutureVisual([]);
    });
  }, [showGlobalConfirm]);

  useEffect(() => {
    if (!isVisualEditMode) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoVisual(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redoVisual(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisualEditMode, undoVisual, redoVisual]);

  const handleLocationImageUpdate = useCallback(async (idx, file) => {
    try {
      validateImage(file);
      const url = await uploadFileToCloudinary(file);
      const newLocations = [...(visualContent.locations || DEFAULT_LOCATIONS_DATA)];
      newLocations[idx] = { ...newLocations[idx], img: url };
      updateVisualContent({ ...visualContent, locations: newLocations });
    } catch (err) {
      showGlobalAlert('อัปโหลดผิดพลาด', err.message, 'error');
    }
  }, [visualContent, updateVisualContent, showGlobalAlert]);

  const handleRemoveLocationImage = useCallback((idx) => {
    if (userRole !== 'host') return;
    const newLocations = [...(visualContent.locations || DEFAULT_LOCATIONS_DATA)];
    const target = newLocations[idx];
    if (!target) return;
    const defaultImg = DEFAULT_LOCATIONS_DATA.find(d => d.area === target.area)?.img;
    if (!defaultImg) return;
    newLocations[idx] = { ...target, img: defaultImg };
    updateVisualContent({ ...visualContent, locations: newLocations });
  }, [userRole, visualContent, updateVisualContent]);

  /* ---------- ล็อกอิน / สิทธิ์ ---------- */
  useEffect(() => subscribeSiteSession({
    auth, hostEmail: HOST_EMAIL,
    observeAuth: onAuthStateChanged,
    signInGuest: signInAnonymously,
    observeRole: (email, onRole, onError) => onSnapshot(
      doc(db, 'artifacts', appId, 'public', 'data', 'users', email),
      snapshot => onRole(snapshot.exists() ? snapshot.data().role : null),
      onError,
    ),
    onSession: (session) => {
      setUser(session.user);
      setUserRole(session.userRole);
      setUserEmail(session.userEmail);
      setAuthReady(session.authReady);
    },
  }), []);

  useEffect(() => {
    if (!loading) return;
    const timeoutId = setTimeout(() => {
      console.warn('Initial Firebase load timed out. Showing the public page with available default content.');
      setLoading(false);
    }, 20000);
    return () => clearTimeout(timeoutId);
  }, [loading]);

  /* ---------- โหลดข้อมูลสาธารณะ ---------- */
  useEffect(() => {
    const qProps = query(collection(db, 'artifacts', appId, 'public', 'data', 'properties'));
    const companyRef = doc(db, 'artifacts', appId, 'public', 'data', 'company_info', 'main');
    const visualRef = doc(db, 'artifacts', appId, 'public', 'data', 'site_settings', 'visual');
    const canManageSite = Boolean(user) && (userRole === 'host' || userRole === 'admin');

    const sortProperties = (items = []) => {
      const props = [...items];
      return props.sort((a, b) => {
        if (a.badge === 'Sold Out' && b.badge !== 'Sold Out') return 1;
        if (a.badge !== 'Sold Out' && b.badge === 'Sold Out') return -1;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
    };

    const applyPropertiesData = (items = []) => {
      setProperties(sortProperties(items));
      setLoading(false);
    };

    const snapshotToProperties = (snapshot) => snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    const applyPropertiesSnapshot = (snapshot) => applyPropertiesData(snapshotToProperties(snapshot));

    const stripRestDocumentId = (data) => {
      const cleaned = { ...data };
      delete cleaned.id;
      return cleaned;
    };

    const applyCompanyData = (data) => {
      if (data) setCompanyInfo({ ...DEFAULT_COMPANY_INFO, ...stripRestDocumentId(data) });
    };
    const applyCompanySnapshot = (docSnap) => { if (docSnap.exists()) applyCompanyData(docSnap.data()); };

    const mergeLocations = (existingLocations) => {
      const merged = Array.isArray(existingLocations)
        ? existingLocations.filter(loc => loc && loc.area).map(loc => ({ ...loc }))
        : [];
      DEFAULT_LOCATIONS_DATA.forEach(defaultLoc => {
        const exists = merged.find(loc => loc.area === defaultLoc.area);
        if (!exists) merged.push(defaultLoc);
        else exists.sub_areas = defaultLoc.sub_areas;
      });
      return merged.map(loc => (Array.isArray(loc.sub_areas) ? loc : { ...loc, sub_areas: [] }));
    };

    const applyVisualData = (data) => {
      if (data) {
        const visualData = stripRestDocumentId(data);
        visualData.locations = mergeLocations(visualData.locations);
        setVisualContent({ ...DEFAULT_VISUAL_CONTENT, ...visualData });
      }
    };
    const applyVisualSnapshot = (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        data.locations = mergeLocations(data.locations);
        setVisualContent({ ...DEFAULT_VISUAL_CONTENT, ...data });
      }
    };

    const applyPublicData = ({ props, company, visual }) => {
      if (!company) setCompanyInfo(DEFAULT_COMPANY_INFO);
      if (!visual) setVisualContent(DEFAULT_VISUAL_CONTENT);
      applyPropertiesData(props || []);
      applyCompanyData(company);
      applyVisualData(visual);
    };

    const loadPublicDataFromSdk = async () => {
      const [propsSnap, companySnap, visualSnap] = await Promise.all([
        getDocsFromServer(qProps), getDocFromServer(companyRef), getDocFromServer(visualRef),
      ]);
      return {
        props: snapshotToProperties(propsSnap),
        company: companySnap.exists() ? companySnap.data() : null,
        visual: visualSnap.exists() ? visualSnap.data() : null,
      };
    };

    /**
     * ทางหลักของผู้เข้าชมทั่วไป — อ่านผ่าน /api/public-data ที่แคชไว้ฝั่ง server
     * เพื่อไม่ให้เบราว์เซอร์ทุกคนยิงอ่าน Firestore ทั้งคอลเลกชัน (กินโควตาอ่านรายวันจนหมด)
     */
    const loadPublicDataFromApi = async () => {
      const response = await fetch('/api/public-data', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Public data API failed (${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data?.properties) || data.stale) {
        throw new Error('Public data API returned invalid or stale data');
      }
      return { props: data.properties, company: data.company, visual: data.visual };
    };

    const loadPublicDataFromRest = async () => {
      const [props, company, visual] = await Promise.all([
        fetchPublicCollectionRest('properties'),
        fetchPublicDocumentRest('company_info/main', { cache: 'no-store' }),
        fetchPublicDocumentRest('site_settings/visual', { cache: 'no-store' }),
      ]);
      return { props, company, visual };
    };

    const withTimeout = (promise, timeoutMs, label) => Promise.race([
      promise,
      new Promise((_, reject) => { setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs); }),
    ]);

    if (!canManageSite) {
      const load = async () => {
        try {
          return await withTimeout(loadPublicDataFromApi(), 6000, 'Public data API load');
        } catch (error) {
          console.warn('Public API unavailable, checking the source.', error);
          try {
            return await withTimeout(loadPublicDataFromRest(), 10000, 'Public data REST load');
          } catch {
            return await withTimeout(loadPublicDataFromSdk(), 6000, 'Public data server load');
          }
        }
      };
      return subscribePublicData({
        observe: (options, onValue, onError) => onSnapshot(
          doc(db, 'artifacts', appId, 'public', 'data', 'site_settings', 'public_version'),
          options, onValue, onError),
        load,
        onData: data => { setPublicDataError(false); applyPublicData(data); },
        onError: error => {
          console.warn('Could not verify current public data.', error);
          setPublicDataError(true);
          setProperties([]);
          setLoading(false);
        },
      });
    }

    const unsubProps = onSnapshot(qProps, applyPropertiesSnapshot, (error) => {
      console.warn(error);
      setLoading(false);
    });
    const unsubCompany = onSnapshot(companyRef, applyCompanySnapshot, (error) => console.warn(error));
    const unsubVisual = onSnapshot(visualRef, applyVisualSnapshot, (error) => console.warn(error));

    const qUsers = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const users = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      setAuthorizedUsers(users);
      if (!users.some(u => u.email === HOST_EMAIL) && users.length === 0) {
        setDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'users', 'host_init'),
          { email: HOST_EMAIL, role: 'host', name: 'Main Host', createdAt: serverTimestamp() }
        ).catch(e => console.warn(e));
      }
    }, (error) => console.warn(error));

    return () => { unsubProps(); unsubCompany(); unsubVisual(); unsubUsers(); };
  }, [user, userRole]);

  /* ---------- การกระทำต่าง ๆ ---------- */
  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setUserRole(null); setUserEmail(''); setIsVisualEditMode(false);
    setShowAdminPanel(false); setActiveTab('home');
    await signInAnonymously(auth);
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email.toLowerCase();

      if (email === HOST_EMAIL.toLowerCase()) {
        setUserRole('host'); setUserEmail(email);
        setShowLoginModal(false); setShowAdminPanel(true);
        try {
          await setDoc(
            doc(db, 'artifacts', appId, 'public', 'data', 'users', email),
            { email, role: 'host', name: result.user.displayName || 'Main Host', createdAt: serverTimestamp() },
            { merge: true }
          );
        } catch (e) { /* เขียนไม่ได้ก็ยังเข้าใช้งานได้ */ }
        return;
      }

      const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', email);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const finalRole = userDocSnap.data().role || 'pending';
        if (finalRole === 'admin' || finalRole === 'host') {
          setUserRole(finalRole); setUserEmail(email);
          setShowLoginModal(false); setShowAdminPanel(true);
        } else {
          await signOut(auth); await signInAnonymously(auth);
          throw new Error('บัญชีของคุณอยู่ระหว่างรอ Host อนุมัติ');
        }
      } else {
        await setDoc(userDocRef, { email, role: 'pending', name: result.user.displayName || '', createdAt: serverTimestamp() });
        await signOut(auth); await signInAnonymously(auth);
        throw new Error('ส่งคำขอเข้าใช้งานสำเร็จแล้ว กรุณารอ Host อนุมัติสิทธิ์');
      }
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        throw new Error(error.message || 'การเข้าสู่ระบบผิดพลาด');
      }
    }
  }, []);

  /**
   * กระโดดขึ้นบนสุด "ทันที" ไม่ใช่ค่อย ๆ ไหลขึ้น
   *
   * globals.css ตั้ง html { scroll-behavior: smooth } ไว้ทั้งเว็บ
   * ถ้าเรียก scrollTo(0,0) เฉย ๆ เบราว์เซอร์จะเลื่อนแบบนุ่มนวลกินเวลาครึ่งวินาที
   * ระหว่างนั้นหน้าใหม่ถูกวาดที่ตำแหน่งสกอลล์เดิมไปแล้ว ผู้ใช้จึงเห็นท้ายหน้าก่อน
   * แล้วค่อยไหลขึ้นบน — เห็นชัดมากบนหน้า v4 เพราะฉากเปิดยาวหลายพันพิกเซล
   */
  const jumpTop = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch (e) {
      // เบราว์เซอร์เก่าไม่รู้จัก 'instant' — ปิด smooth ชั่วคราวแทน
      const root = document.documentElement;
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, 0);
      root.style.scrollBehavior = prev;
    }
  }, []);

  const goTab = useCallback((tab) => {
    setRequestedPropSlug(null);
    setActiveTab(tab);
    setSelectedProperty(null);
    jumpTop();
  }, [jumpTop]);

  const handleFilterSelect = useCallback((type, value, area = '') => {
    setRequestedPropSlug(null);
    setSearchParams({ type, value, area });
    setActiveTab('search_result');
    setSelectedProperty(null);
    jumpTop();
  }, [jumpTop]);

  const handleGlobalSearch = useCallback((keyword) => {
    setRequestedPropSlug(null);
    setSearchParams({ type: 'keyword', value: keyword, area: '' });
    setActiveTab('search_result');
    setSelectedProperty(null);
    jumpTop();
  }, [jumpTop]);

  const handleSelectProperty = useCallback((p) => {
    setSelectedProperty(createPropertyPreview(p));
    setRequestedPropSlug(generatePropSlug(p));
    jumpTop();
  }, [jumpTop]);

  const enterVisualEditMode = useCallback(() => {
    setShowAdminPanel(false);
    setSelectedProperty(null);
    setActiveTab('home');
    setTimeout(() => {
      setIsVisualEditMode(true);
      jumpTop();
    }, 100);
  }, [jumpTop]);

  return {
    // ข้อมูล
    user, userRole, userEmail, authReady, properties, publicProperties, companyInfo,
    authorizedUsers, loading, publicDataError, visualContent, popupData,
    // สถานะหน้าจอ
    activeTab, setActiveTab, isRouteReady, searchParams, selectedProperty,
    requestedPropSlug, setRequestedPropSlug, setSelectedProperty,
    // โมดัล
    showLoginModal, setShowLoginModal, showAdminPanel, setShowAdminPanel,
    showPopupModal, isSnoozeChecked, setIsSnoozeChecked, dismissPopup,
    lightbox, openLightbox, closeLightbox,
    globalAlert,
    // โหมดแก้ไขหน้าเว็บ
    isVisualEditMode, setIsVisualEditMode, updateVisualContent,
    undoVisual, redoVisual, saveVisualEdit, cancelVisualEdit,
    isSavingVisual, canUndo: pastVisual.length > 0, canRedo: futureVisual.length > 0,
    handleLocationImageUpdate, handleRemoveLocationImage, enterVisualEditMode,
    // การกระทำ
    handleLogout, handleGoogleLogin, goTab, handleFilterSelect,
    handleGlobalSearch, handleSelectProperty,
    showGlobalAlert, showGlobalConfirm,
    // SEO
    seoMeta, structuredData,
  };
}
