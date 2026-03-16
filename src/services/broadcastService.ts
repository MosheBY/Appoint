import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { getActiveUsersWithPushTokens } from './authService';
import { sendPushNotifications } from './notificationService';
import { db } from './firebase';

export interface BroadcastMessage {
  id?: string;
  title: string;
  body: string;
  recipientCount: number;
  sentAt: any;
  sentBy: string;
}

export const sendBroadcastMessage = async (
  title: string,
  body: string,
  sentBy: string
): Promise<number> => {
  const users = await getActiveUsersWithPushTokens();
  const tokens = users
    .map((user) => user.expoPushToken)
    .filter((token): token is string => !!token);

  await sendPushNotifications(tokens, title, body, { type: 'broadcast' });

  await addDoc(collection(db, 'broadcastMessages'), {
    title: title.trim(),
    body: body.trim(),
    recipientCount: tokens.length,
    sentAt: Timestamp.now(),
    sentBy,
  });

  return tokens.length;
};

export const getBroadcastMessages = async (): Promise<BroadcastMessage[]> => {
  const snap = await getDocs(query(collection(db, 'broadcastMessages'), orderBy('sentAt', 'desc')));
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<BroadcastMessage, 'id'>),
  }));
};

export const getLastSeenBroadcastAt = async (uid: string): Promise<Date | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;

  const value = snap.data()?.lastSeenBroadcastAt;
  return value?.toDate?.() instanceof Date ? value.toDate() : null;
};

export const markBroadcastsAsSeen = async (uid: string): Promise<void> => {
  await setDoc(
    doc(db, 'users', uid),
    {
      lastSeenBroadcastAt: Timestamp.now(),
    },
    { merge: true }
  );
};
