import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCC4b6AUk-AmXAqSSHWZMDTU8AdrX77kNc",
  authDomain: "barberapp-9faff.firebaseapp.com",
  projectId: "barberapp-9faff",
  storageBucket: "barberapp-9faff.firebasestorage.app",
  messagingSenderId: "288101421313",
  appId: "1:288101421313:web:076c612bc76aa2ce470b00",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export default app;
