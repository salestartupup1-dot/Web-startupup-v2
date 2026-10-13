// This flag is deliberately ignored in production builds.
export const useFirebaseEmulator = process.env.NODE_ENV === 'development'
  && process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === '1';
export const firebaseProjectId = useFirebaseEmulator ? 'demo-startupup-website' : 'startup-up-realestate';
export const firestoreOrigin = useFirebaseEmulator ? 'http://127.0.0.1:8093' : 'https://firestore.googleapis.com';
