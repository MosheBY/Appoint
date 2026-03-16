import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export type UserRole = 'customer' | 'barber' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  isActive: boolean;
  expoPushToken?: string;
  createdAt: any;
}

const normalizeUserProfile = (uid: string, data: Record<string, any>): UserProfile => ({
  uid,
  name: data.name ?? '',
  email: data.email ?? '',
  role: (data.role ?? 'customer') as UserRole,
  phone: data.phone ?? '',
  isActive: data.isActive ?? true,
  expoPushToken: data.expoPushToken,
  createdAt: data.createdAt ?? new Date(),
});

const ensureUserIsActive = (profile: UserProfile) => {
  if (!profile.isActive) {
    throw new Error('USER_DISABLED');
  }
};

export const registerWithEmail = async (
  email: string,
  password: string,
  name: string,
  phone: string,
  role: UserRole = 'customer'
): Promise<UserProfile> => {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const profile: UserProfile = {
    uid: userCred.user.uid,
    name,
    email,
    phone,
    role,
    isActive: true,
    createdAt: new Date(),
  };

  await setDoc(doc(db, 'users', userCred.user.uid), profile);
  return profile;
};

export const loginWithEmail = async (email: string, password: string): Promise<UserProfile> => {
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, 'users', userCred.user.uid));

  if (!snap.exists()) {
    throw new Error('USER_PROFILE_NOT_FOUND');
  }

  const profile = normalizeUserProfile(snap.id, snap.data() as Record<string, any>);
  ensureUserIsActive(profile);
  return profile;
};

export const loginWithGoogle = async (idToken: string): Promise<UserProfile> => {
  const credential = GoogleAuthProvider.credential(idToken);
  const userCred = await signInWithCredential(auth, credential);

  const snap = await getDoc(doc(db, 'users', userCred.user.uid));
  if (snap.exists()) {
    const profile = normalizeUserProfile(snap.id, snap.data() as Record<string, any>);
    ensureUserIsActive(profile);
    return profile;
  }

  const profile: UserProfile = {
    uid: userCred.user.uid,
    name: userCred.user.displayName ?? 'לקוח',
    email: userCred.user.email ?? '',
    phone: '',
    role: 'customer',
    isActive: true,
    createdAt: new Date(),
  };

  await setDoc(doc(db, 'users', userCred.user.uid), profile);
  return profile;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return normalizeUserProfile(snap.id, snap.data() as Record<string, any>);
};

export const getBarbers = async (): Promise<UserProfile[]> => {
  const q = query(collection(db, 'users'), where('role', '==', 'barber'));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => normalizeUserProfile(docSnap.id, docSnap.data() as Record<string, any>))
    .filter((profile) => profile.isActive);
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .map((docSnap) => normalizeUserProfile(docSnap.id, docSnap.data() as Record<string, any>))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const getActiveUsersWithPushTokens = async (): Promise<UserProfile[]> => {
  const users = await getAllUsers();
  return users.filter((user) => user.isActive && !!user.expoPushToken);
};

export const updateUserRole = async (uid: string, role: UserRole): Promise<void> => {
  await setDoc(doc(db, 'users', uid), { role }, { merge: true });
};

export const updateUserStatus = async (uid: string, isActive: boolean): Promise<void> => {
  await setDoc(doc(db, 'users', uid), { isActive }, { merge: true });
};

export const updateUserDetails = async (
  uid: string,
  data: Pick<UserProfile, 'name' | 'phone'>
): Promise<void> => {
  await setDoc(
    doc(db, 'users', uid),
    {
      name: data.name.trim(),
      phone: data.phone.trim(),
    },
    { merge: true }
  );
};

export const getUserCounts = async () => {
  const users = await getAllUsers();
  return {
    total: users.length,
    active: users.filter((user) => user.isActive).length,
    customers: users.filter((user) => user.role === 'customer').length,
    barbers: users.filter((user) => user.role === 'barber').length,
    admins: users.filter((user) => user.role === 'admin').length,
  };
};

export const logout = () => signOut(auth);

export const updatePushToken = async (uid: string, token: string) => {
  await setDoc(doc(db, 'users', uid), { expoPushToken: token }, { merge: true });
};

export const deleteCurrentCustomerAccount = async (): Promise<void> => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('NO_AUTH_USER');
  }

  const lastSignInTime = currentUser.metadata.lastSignInTime
    ? new Date(currentUser.metadata.lastSignInTime).getTime()
    : 0;

  if (!lastSignInTime || Date.now() - lastSignInTime > 5 * 60 * 1000) {
    throw new Error('REQUIRES_RECENT_LOGIN');
  }

  const profile = await getUserProfile(currentUser.uid);
  if (profile && profile.role !== 'customer') {
    throw new Error('ONLY_CUSTOMER_SELF_DELETE_SUPPORTED');
  }

  const appointmentsSnap = await getDocs(
    query(collection(db, 'appointments'), where('customerId', '==', currentUser.uid))
  );
  const appointmentLocksSnaps = await Promise.all(
    appointmentsSnap.docs.map((appointmentDoc) =>
      getDocs(query(collection(db, 'appointmentLocks'), where('appointmentId', '==', appointmentDoc.id)))
    )
  );

  const batch = writeBatch(db);
  appointmentsSnap.forEach((appointmentDoc) => batch.delete(appointmentDoc.ref));
  appointmentLocksSnaps.forEach((locksSnap) =>
    locksSnap.forEach((lockDoc) => batch.delete(lockDoc.ref))
  );
  batch.delete(doc(db, 'users', currentUser.uid));

  await batch.commit();
  await deleteUser(currentUser);
};
