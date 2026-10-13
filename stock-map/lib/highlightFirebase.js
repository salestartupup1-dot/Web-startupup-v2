import { getApps, initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const app = getApps().find(app => app.name === 'stock-map') || initializeApp({
  apiKey: 'AIzaSyDsEeGxKA90-URCn06F-K3U2dvlISf_2Jo',
  authDomain: 'startup-up-realestate.firebaseapp.com',
  projectId: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_HIGHLIGHTS_EMULATOR === '1' ? 'demo-stock-highlights' : 'startup-up-realestate',
  appId: '1:750265634166:web:a4f6cd0a59db8c685fbe57',
}, 'stock-map');
export const highlightAuth = getAuth(app);
export const highlightDb = getFirestore(app);
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_HIGHLIGHTS_EMULATOR === '1' && typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname) && !highlightAuth.emulatorConfig) {
  connectAuthEmulator(highlightAuth, 'http://localhost:9098', { disableWarnings: true });
  connectFirestoreEmulator(highlightDb, 'localhost', 8092);
}
