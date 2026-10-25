import { initializeApp, getApps, getApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, addDoc as sdkAddDoc, doc, updateDoc as sdkUpdateDoc, deleteDoc as sdkDeleteDoc, setDoc as sdkSetDoc, serverTimestamp, writeBatch, runTransaction } from 'firebase/firestore';
import { firebaseProjectId, useFirebaseEmulator } from './firebaseEnvironment';
import { createPublicDataWrites } from './publicDataWrites';

const firebaseConfig = {
  apiKey: "AIzaSyDsEeGxKA90-URCn06F-K3U2dvlISf_2Jo",
  authDomain: "startup-up-realestate.firebaseapp.com",
  projectId: firebaseProjectId,
  storageBucket: "startup-up-realestate.firebasestorage.app",
  messagingSenderId: "750265634166",
  appId: "1:750265634166:web:a4f6cd0a59db8c685fbe57",
  measurementId: "G-1HZQ3RCXWP"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
// getAuth() would attach the popup/redirect resolver, which loads Firebase's sign-in iframe and
// Google API scripts (~130KB) on every visit. Visitors never sign in, so the resolver is passed
// only to signInWithPopup when an admin opens the Google popup.
const createAuth = () => {
  if (typeof window === 'undefined') return getAuth(app);
  try { return initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] }); }
  catch { return getAuth(app); } // already initialised (hot reload)
};
const auth = createAuth();
if (useFirebaseEmulator && !auth.emulatorConfig) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9097', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8093);
}

const HOST_EMAIL = 'startup.up.real.estate@gmail.com';
const appId = "startup-up-realestate";

const { setDoc, updateDoc, addDoc, deleteDoc } = createPublicDataWrites({
  db, appId, doc, writeBatch, runTransaction, serverTimestamp,
  sdk: { setDoc: sdkSetDoc, updateDoc: sdkUpdateDoc, addDoc: sdkAddDoc, deleteDoc: sdkDeleteDoc },
});


export { db, auth, appId, HOST_EMAIL, setDoc, updateDoc, addDoc, deleteDoc };
export { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, browserPopupRedirectResolver } from 'firebase/auth';
export { collection, doc, onSnapshot, query, getDoc, serverTimestamp } from 'firebase/firestore';
