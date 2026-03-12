import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-expect-error Metro resolves firebase/auth to the RN bundle which exports getReactNativePersistence
import { initializeAuth, getAuth, getReactNativePersistence, type Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCC4b6AUk-AmXAqSSHWZMDTU8AdrX77kNc",
  authDomain: "barberapp-9faff.firebaseapp.com",
  projectId: "barberapp-9faff",
  storageBucket: "barberapp-9faff.firebasestorage.app",
  messagingSenderId: "288101421313",
  appId: "1:288101421313:web:076c612bc76aa2ce470b00",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  const persistence = getReactNativePersistence(AsyncStorage);
  auth = initializeAuth(app, { persistence });
} catch {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);

export default app;
