import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Enable offline data persistence for smoother offline recovery/play
enableIndexedDbPersistence(db).catch((err) => {
  console.warn("Could not enable Firestore offline cache persistence:", err.message);
});

export const auth = getAuth(app);
