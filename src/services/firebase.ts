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

console.log('[firebase] getReactNativePersistence type:', typeof getReactNativePersistence);
console.log('[firebase] AsyncStorage:', !!AsyncStorage);

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const { _getProvider } = require('firebase/app');
const authProvider = _getProvider(app, 'auth');
console.log('[firebase] auth component set?', (authProvider as any).component != null);

let auth: Auth;
try {
  const persistence = getReactNativePersistence(AsyncStorage);
  auth = initializeAuth(app, { persistence });
  console.log('[firebase] initializeAuth success');
} catch (e) {
  console.log('[firebase] initializeAuth error:', e);
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);

export default app;
