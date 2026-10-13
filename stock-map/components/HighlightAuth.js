import { createContext, useContext, useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { highlightAuth, highlightDb } from '../lib/highlightFirebase';

const Context = createContext({});
export const useHighlightAuth = () => useContext(Context);
export function HighlightAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let stopRole;
    const stopAuth = onAuthStateChanged(highlightAuth, account => {
      stopRole?.(); setUser(account); setCanEdit(false); setError('');
      if (!account?.emailVerified) return;
      if (account.email === 'startup.up.real.estate@gmail.com') { setCanEdit(true); return; }
      stopRole = onSnapshot(doc(highlightDb, 'artifacts/startup-up-realestate/public/data/users', account.email), snapshot => {
        const allowed = ['admin', 'host'].includes(snapshot.data()?.role);
        setCanEdit(allowed);
        setError(allowed ? '' : 'บัญชีนี้ยังไม่มีสิทธิ์แก้ไข กรุณาใช้บัญชีผู้ดูแลเว็บหลัก');
      }, () => setError('ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่'));
    });
    return () => { stopAuth(); stopRole?.(); };
  }, []);
  const login = async () => {
    setBusy(true); setError('');
    try { const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' }); await signInWithPopup(highlightAuth, provider); }
    catch (e) { if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) setError('เข้าสู่ระบบไม่สำเร็จ กรุณาอนุญาตหน้าต่างเข้าสู่ระบบแล้วลองใหม่'); }
    finally { setBusy(false); }
  };
  return <Context.Provider value={{ user, canEdit, error, busy, login, logout: () => signOut(highlightAuth) }}>{children}</Context.Provider>;
}
export function HighlightAccount() {
  const { user, canEdit, busy, login, logout, error } = useHighlightAuth();
  return <div className="text-xs"><button className="rounded-full bg-white/10 px-4 py-2 hover:bg-white/20" onClick={user ? logout : login} disabled={busy}>{user ? `${canEdit ? 'ผู้แก้ไขจุดเด่น' : 'บัญชีผู้ใช้'} · ออกจากระบบ` : 'เข้าสู่ระบบเพื่อแก้ไขจุดเด่น'}</button>{error && <p role="alert" className="mt-2 max-w-72">{error}</p>}</div>;
}
