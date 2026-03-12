import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy, Timestamp, setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { sendPushNotification } from './notificationService';
import { getUserProfile } from './authService';

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';
export type ServiceType = 'תספורת' | 'זקן' | 'תספורת + זקן';

export interface Appointment {
  id?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  barberId: string;
  service: ServiceType;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes?: string;
  price?: number;
  createdAt: any;
}

export const createAppointment = async (data: Omit<Appointment, 'id'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'appointments'), {
    ...data,
    createdAt: Timestamp.now(),
  });

  const barber = await getUserProfile(data.barberId);
  if (barber?.expoPushToken) {
    await sendPushNotification(
      barber.expoPushToken,
      'תור חדש!',
      `${data.customerName} קבע תור ל${data.date} בשעה ${data.time}`
    );
  }
  return ref.id;
};

export const updateAppointment = async (
  id: string,
  changes: Partial<Appointment>,
  notifyCustomer = true
): Promise<void> => {
  await updateDoc(doc(db, 'appointments', id), changes);

  if (notifyCustomer) {
    const snap = await getDoc(doc(db, 'appointments', id));
    const appt = snap.data() as Appointment;
    const customer = await getUserProfile(appt.customerId);
    if (customer?.expoPushToken) {
      let message = '';
      if (changes.status === 'confirmed') message = `התור שלך ל${appt.date} אושר!`;
      else if (changes.status === 'cancelled') message = `התור שלך ל${appt.date} בוטל.`;
      else message = `פרטי התור שלך עודכנו (${appt.date} ${appt.time})`;
      if (message) await sendPushNotification(customer.expoPushToken, 'עדכון תור', message);
    }
  }
};

export const deleteAppointment = async (id: string, notifyCustomer = true): Promise<void> => {
  if (notifyCustomer) {
    const snap = await getDoc(doc(db, 'appointments', id));
    if (snap.exists()) {
      const appt = snap.data() as Appointment;
      const customer = await getUserProfile(appt.customerId);
      if (customer?.expoPushToken) {
        await sendPushNotification(
          customer.expoPushToken,
          'תור בוטל',
          `התור שלך ל${appt.date} בשעה ${appt.time} בוטל.`
        );
      }
    }
  }
  await deleteDoc(doc(db, 'appointments', id));
};

export const getCustomerAppointments = async (customerId: string): Promise<Appointment[]> => {
  const q = query(
    collection(db, 'appointments'),
    where('customerId', '==', customerId),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
};

export const getBarberAppointments = async (
  barberId: string,
  dateFilter?: string
): Promise<Appointment[]> => {
  const q = dateFilter
    ? query(
        collection(db, 'appointments'),
        where('barberId', '==', barberId),
        where('date', '==', dateFilter),
        orderBy('time', 'asc')
      )
    : query(
        collection(db, 'appointments'),
        where('barberId', '==', barberId),
        orderBy('date', 'asc')
      );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
};

export const getAppointmentsByCustomer = async (
  barberId: string,
  customerId: string
): Promise<Appointment[]> => {
  const q = query(
    collection(db, 'appointments'),
    where('barberId', '==', barberId),
    where('customerId', '==', customerId),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));
};

export const getAvailableSlots = async (
  barberId: string,
  date: string
): Promise<string[]> => {
  const availability = await getBarberAvailability(barberId);
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayKey = days[new Date(date).getDay()];
  const dayConfig = availability?.schedule?.[dayKey];

  if (!dayConfig?.isOpen) return [];
  if (availability?.vacationDays?.includes(date)) return [];

  const start = dayConfig.start ?? '09:00';
  const end = dayConfig.end ?? '18:00';
  const blockedSlots = availability?.blockedSlots?.[date] ?? [];

  const existing = await getBarberAppointments(barberId, date);
  const bookedTimes = existing.filter(a => a.status !== 'cancelled').map(a => a.time);

  const slots: string[] = [];
  let [h, m] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  while (h < endH || (h === endH && m < endM)) {
    const slot = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (!bookedTimes.includes(slot) && !blockedSlots.includes(slot)) slots.push(slot);
    m += 30;
    if (m >= 60) { h++; m -= 60; }
  }
  return slots;
};

export interface DaySchedule {
  isOpen: boolean;
  start: string;
  end: string;
}

export interface BarberAvailability {
  barberId: string;
  schedule: Record<string, DaySchedule>;
  blockedSlots: Record<string, string[]>;
  vacationDays: string[];
}

export const getBarberAvailability = async (barberId: string): Promise<BarberAvailability | null> => {
  const snap = await getDoc(doc(db, 'availability', barberId));
  return snap.exists() ? (snap.data() as BarberAvailability) : null;
};

export const updateBarberAvailability = async (
  barberId: string,
  data: Partial<BarberAvailability>
): Promise<void> => {
  await setDoc(doc(db, 'availability', barberId), { barberId, ...data }, { merge: true });
};
