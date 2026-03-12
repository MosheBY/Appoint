import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type UserRole = 'customer' | 'barber';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  expoPushToken?: string;
  createdAt: any;
}

export const registerWithEmail = async (
  email: string,
  password: string,
  name: string,
  role: UserRole = 'customer'
): Promise<UserProfile> => {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const profile: UserProfile = {
    uid: userCred.user.uid,
    name,
    email,
    role,
    createdAt: new Date(),
  };
  await setDoc(doc(db, 'users', userCred.user.uid), profile);
  return profile;
};

export const loginWithEmail = async (
  email: string,
  password: string
): Promise<UserProfile> => {
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'users', userCred.user.uid));
  return snap.data() as UserProfile;
};

export const loginWithGoogle = async (idToken: string): Promise<UserProfile> => {
  const credential = GoogleAuthProvider.credential(idToken);
  const userCred = await signInWithCredential(auth, credential);

  const snap = await getDoc(doc(db, 'users', userCred.user.uid));
  if (snap.exists()) return snap.data() as UserProfile;

  const profile: UserProfile = {
    uid: userCred.user.uid,
    name: userCred.user.displayName ?? 'לקוח',
    email: userCred.user.email ?? '',
    role: 'customer',
    createdAt: new Date(),
  };
  await setDoc(doc(db, 'users', userCred.user.uid), profile);
  return profile;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

export const logout = () => signOut(auth);

export const updatePushToken = async (uid: string, token: string) => {
  await setDoc(doc(db, 'users', uid), { expoPushToken: token }, { merge: true });
};
