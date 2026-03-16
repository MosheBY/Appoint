import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { sendPushNotification } from './notificationService';
import { getUserProfile } from './authService';
import { getBookingSettings } from './bookingSettingsService';
import { getCurrentDateKey, getCurrentTimeInMinutes } from '../utils/dateFormat';
import {
  DEFAULT_SERVICE_SETTINGS,
  getServiceSettingsMap,
} from './serviceSettingsService';

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';
export type ServiceType = string;

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
  reminderNotificationId?: string;
  createdAt: any;
}

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
  blockedCustomerIds?: string[];
}

const APPOINTMENT_LOCKS_COLLECTION = 'appointmentLocks';
const DEFAULT_SERVICE_DURATION_MINUTES = Object.fromEntries(
  Object.values(DEFAULT_SERVICE_SETTINGS).map((service) => [service.type, service.duration])
) as Record<string, number>;

const compareAppointments = (a: Appointment, b: Appointment) => {
  const byDate = a.date.localeCompare(b.date);
  if (byDate !== 0) return byDate;
  return a.time.localeCompare(b.time);
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const rangesOverlap = (startA: number, endA: number, startB: number, endB: number) =>
  startA < endB && startB < endA;

const getAppointmentDurationMinutes = (
  service: ServiceType,
  serviceSettings: Awaited<ReturnType<typeof getServiceSettingsMap>>
) => serviceSettings[service]?.duration ?? DEFAULT_SERVICE_DURATION_MINUTES[service] ?? 30;

const getLockTimeBlocks = (time: string, durationMinutes: number) => {
  const startMinutes = timeToMinutes(time);
  const blocks: string[] = [];

  for (let minutes = startMinutes; minutes < startMinutes + durationMinutes; minutes += 30) {
    blocks.push(minutesToTime(minutes));
  }

  return blocks;
};

const getAppointmentLockRefs = (
  appointment: Pick<Appointment, 'barberId' | 'date' | 'time' | 'service'>,
  serviceSettings: Awaited<ReturnType<typeof getServiceSettingsMap>>
) => {
  const durationMinutes = getAppointmentDurationMinutes(appointment.service, serviceSettings);
  const timeBlocks = getLockTimeBlocks(appointment.time, durationMinutes);

  return timeBlocks.map((timeBlock) =>
    doc(db, APPOINTMENT_LOCKS_COLLECTION, `${appointment.barberId}_${appointment.date}_${timeBlock.replace(':', '-')}`)
  );
};

const hydrateAppointment = async (appointment: Appointment): Promise<Appointment> => {
  if (appointment.customerPhone || appointment.customerId.startsWith('manual_')) {
    return appointment;
  }

  try {
    const customer = await getUserProfile(appointment.customerId);
    if (!customer?.phone) {
      return appointment;
    }

    return {
      ...appointment,
      customerPhone: customer.phone,
    };
  } catch {
    return appointment;
  }
};

const hydrateAppointments = async (appointments: Appointment[]) =>
  Promise.all(appointments.map(hydrateAppointment));

const isAppointmentDataValid = (
  appointment: Partial<Appointment>
): appointment is Pick<
  Appointment,
  'barberId' | 'customerId' | 'customerName' | 'date' | 'time' | 'service' | 'status'
> =>
  !!appointment.barberId &&
  !!appointment.customerId &&
  !!appointment.customerName &&
  !!appointment.date &&
  !!appointment.time &&
  !!appointment.service &&
  !!appointment.status;

const assertWithinBookingWindow = async (date: string) => {
  const { bookingWindowEndDate } = await getBookingSettings();
  if (date > bookingWindowEndDate) {
    throw new Error('BOOKING_WINDOW_CLOSED');
  }
};

const assertBookingTimeAllowed = async (date: string, appointmentStart: number) => {
  const settings = await getBookingSettings();
  const today = getCurrentDateKey();
  const isToday = date === today;

  if (isToday && !settings.allowSameDayBooking) {
    throw new Error('SAME_DAY_BOOKING_DISABLED');
  }

  const currentMinutes = getCurrentTimeInMinutes();
  if (isToday && appointmentStart <= currentMinutes) {
    throw new Error('TIME_ALREADY_PASSED');
  }

  const minAdvanceMinutes = settings.minAdvanceBookingHours * 60;
  if (isToday && appointmentStart - currentMinutes < minAdvanceMinutes) {
    throw new Error('MIN_ADVANCE_BOOKING_HOURS');
  }
};

const assertAppointmentCanBeScheduled = ({
  appointment,
  availability,
  appointments,
  serviceSettings,
  excludedAppointmentId,
}: {
  appointment: Appointment;
  availability: BarberAvailability | null;
  appointments: Appointment[];
  serviceSettings: Awaited<ReturnType<typeof getServiceSettingsMap>>;
  excludedAppointmentId?: string;
}) => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayKey = days[new Date(appointment.date + 'T12:00:00').getDay()];
  const dayConfig = availability?.schedule?.[dayKey];

  if (!dayConfig?.isOpen) {
    throw new Error('BARBER_UNAVAILABLE');
  }

  if (availability?.vacationDays?.includes(appointment.date)) {
    throw new Error('BARBER_ON_VACATION');
  }

  if (
    !appointment.customerId.startsWith('manual_') &&
    availability?.blockedCustomerIds?.includes(appointment.customerId)
  ) {
    throw new Error('CUSTOMER_BLOCKED');
  }

  const serviceDuration = getAppointmentDurationMinutes(appointment.service, serviceSettings);
  const appointmentStart = timeToMinutes(appointment.time);
  const appointmentEnd = appointmentStart + serviceDuration;
  const startMinutes = timeToMinutes(dayConfig.start ?? '09:00');
  const endMinutes = timeToMinutes(dayConfig.end ?? '18:00');

  if (appointmentStart < startMinutes || appointmentEnd > endMinutes) {
    throw new Error('OUTSIDE_WORKING_HOURS');
  }

  const blockedSlots = availability?.blockedSlots?.[appointment.date] ?? [];
  const overlapsBlockedSlot = blockedSlots.some((blockedSlot) => {
    const blockedStart = timeToMinutes(blockedSlot);
    const blockedEnd = blockedStart + 30;
    return rangesOverlap(appointmentStart, appointmentEnd, blockedStart, blockedEnd);
  });

  if (overlapsBlockedSlot) {
    throw new Error('BLOCKED_SLOT');
  }

  const activeAppointments = appointments.filter(
    (entry) => entry.status !== 'cancelled' && entry.id !== excludedAppointmentId
  );

  const overlapsExisting = activeAppointments.some((entry) => {
    const entryStart = timeToMinutes(entry.time);
    const entryDuration = getAppointmentDurationMinutes(entry.service, serviceSettings);
    const entryEnd = entryStart + entryDuration;
    return rangesOverlap(appointmentStart, appointmentEnd, entryStart, entryEnd);
  });

  if (overlapsExisting) {
    throw new Error('SLOT_NOT_AVAILABLE');
  }
};

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

export const getBlockedCustomerIds = async (barberId: string): Promise<string[]> => {
  const availability = await getBarberAvailability(barberId);
  return availability?.blockedCustomerIds ?? [];
};

export const isCustomerBlocked = async (
  barberId: string,
  customerId: string
): Promise<boolean> => {
  const blockedCustomerIds = await getBlockedCustomerIds(barberId);
  return blockedCustomerIds.includes(customerId);
};

export const blockCustomer = async (barberId: string, customerId: string): Promise<void> => {
  await setDoc(
    doc(db, 'availability', barberId),
    {
      barberId,
      blockedCustomerIds: arrayUnion(customerId),
    },
    { merge: true }
  );
};

export const unblockCustomer = async (barberId: string, customerId: string): Promise<void> => {
  await setDoc(
    doc(db, 'availability', barberId),
    {
      barberId,
      blockedCustomerIds: arrayRemove(customerId),
    },
    { merge: true }
  );
};

export const getCustomerAppointments = async (customerId: string): Promise<Appointment[]> => {
  const q = query(collection(db, 'appointments'), where('customerId', '==', customerId));
  const snap = await getDocs(q);
  const appointments = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Appointment))
    .sort((a, b) => compareAppointments(b, a));
  return hydrateAppointments(appointments);
};

export const getBarberAppointments = async (
  barberId: string,
  dateFilter?: string
): Promise<Appointment[]> => {
  const q = dateFilter
    ? query(
        collection(db, 'appointments'),
        where('barberId', '==', barberId),
        where('date', '==', dateFilter)
      )
    : query(collection(db, 'appointments'), where('barberId', '==', barberId));

  const snap = await getDocs(q);
  const appointments = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Appointment))
    .sort(compareAppointments);
  return hydrateAppointments(appointments);
};

export const getAppointmentsByCustomer = async (
  barberId: string,
  customerId: string
): Promise<Appointment[]> => {
  const q = query(
    collection(db, 'appointments'),
    where('barberId', '==', barberId),
    where('customerId', '==', customerId)
  );
  const snap = await getDocs(q);
  const appointments = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Appointment))
    .sort((a, b) => compareAppointments(b, a));
  return hydrateAppointments(appointments);
};

export const getAllAppointments = async (): Promise<Appointment[]> => {
  const snap = await getDocs(collection(db, 'appointments'));
  const appointments = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Appointment))
    .sort(compareAppointments);
  return hydrateAppointments(appointments);
};

export const getAvailableSlots = async (
  barberId: string,
  date: string,
  service: ServiceType = 'תספורת'
): Promise<string[]> => {
  const availability = await getBarberAvailability(barberId);
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayKey = days[new Date(date + 'T12:00:00').getDay()];
  const dayConfig = availability?.schedule?.[dayKey];

  if (!dayConfig?.isOpen) return [];
  if (availability?.vacationDays?.includes(date)) return [];

  const start = dayConfig.start ?? '09:00';
  const end = dayConfig.end ?? '18:00';
  const blockedSlots = availability?.blockedSlots?.[date] ?? [];
  const serviceSettings = await getServiceSettingsMap();
  const bookingSettings = await getBookingSettings();
  const serviceDuration = getAppointmentDurationMinutes(service, serviceSettings);

  const existing = await getBarberAppointments(barberId, date);
  const bookedAppointments = existing.filter((a) => a.status !== 'cancelled');

  const slots: string[] = [];
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  const now = new Date();
  const isToday = date === getCurrentDateKey(now);
  const currentMinutes = getCurrentTimeInMinutes(now);
  const minAdvanceMinutes = bookingSettings.minAdvanceBookingHours * 60;

  if (isToday && !bookingSettings.allowSameDayBooking) {
    return [];
  }

  for (let slotStart = startMinutes; slotStart + serviceDuration <= endMinutes; slotStart += 30) {
    const slot = minutesToTime(slotStart);
    const slotEnd = slotStart + serviceDuration;
    const isPastSlot = isToday && slotStart <= currentMinutes;
    const violatesAdvanceWindow =
      isToday && slotStart - currentMinutes < minAdvanceMinutes;

    const overlapsBookedAppointment = bookedAppointments.some((appointment) => {
      const appointmentStart = timeToMinutes(appointment.time);
      const appointmentDuration = getAppointmentDurationMinutes(appointment.service, serviceSettings);
      const appointmentEnd = appointmentStart + appointmentDuration;
      return rangesOverlap(slotStart, slotEnd, appointmentStart, appointmentEnd);
    });

    const overlapsBlockedSlot = blockedSlots.some((blockedSlot) => {
      const blockedStart = timeToMinutes(blockedSlot);
      const blockedEnd = blockedStart + 30;
      return rangesOverlap(slotStart, slotEnd, blockedStart, blockedEnd);
    });

    if (!isPastSlot && !violatesAdvanceWindow && !overlapsBookedAppointment && !overlapsBlockedSlot) {
      slots.push(slot);
    }
  }

  return slots;
};

export const createAppointment = async (data: Omit<Appointment, 'id'>): Promise<string> => {
  if (!isAppointmentDataValid(data)) {
    throw new Error('INVALID_APPOINTMENT_DATA');
  }

  await assertWithinBookingWindow(data.date);
  await assertBookingTimeAllowed(data.date, timeToMinutes(data.time));

  const customerProfile =
    !data.customerPhone && !data.customerId.startsWith('manual_')
      ? await getUserProfile(data.customerId)
      : null;
  const [availability, existingAppointments] = await Promise.all([
    getBarberAvailability(data.barberId),
    getBarberAppointments(data.barberId, data.date),
  ]);
  const serviceSettings = await getServiceSettingsMap();

  assertAppointmentCanBeScheduled({
    appointment: data,
    availability,
    appointments: existingAppointments,
    serviceSettings,
  });

  const appointmentRef = doc(collection(db, 'appointments'));
  const lockRefs = getAppointmentLockRefs(data, serviceSettings);
  const payload = {
    ...data,
    customerPhone: data.customerPhone ?? customerProfile?.phone,
    price: data.price ?? serviceSettings[data.service]?.price ?? DEFAULT_SERVICE_SETTINGS[data.service]?.price ?? 60,
    createdAt: Timestamp.now(),
  } as Record<string, unknown>;

  if (payload.customerPhone === undefined) delete payload.customerPhone;
  if (payload.notes === undefined) delete payload.notes;
  if (payload.price === undefined) delete payload.price;

  await runTransaction(db, async (transaction) => {
    const availabilityRef = doc(db, 'availability', data.barberId);
    const [availabilitySnap, ...lockSnapshots] = await Promise.all([
      transaction.get(availabilityRef),
      ...lockRefs.map((lockRef) => transaction.get(lockRef)),
    ]);

    assertAppointmentCanBeScheduled({
      appointment: data,
      availability: availabilitySnap.exists() ? (availabilitySnap.data() as BarberAvailability) : null,
      appointments: existingAppointments,
      serviceSettings,
    });

    if (lockSnapshots.some((snapshot) => snapshot.exists())) {
      throw new Error('SLOT_NOT_AVAILABLE');
    }

    transaction.set(appointmentRef, payload);
    lockRefs.forEach((lockRef) =>
      transaction.set(lockRef, {
        appointmentId: appointmentRef.id,
        barberId: data.barberId,
        date: data.date,
        time: lockRef.id.split('_').slice(-1)[0].replace('-', ':'),
      })
    );
  });

  try {
    const barber = await getUserProfile(data.barberId);
    if (barber?.expoPushToken) {
      await sendPushNotification(
        barber.expoPushToken,
        'תור חדש!',
        `${data.customerName} קבע תור ל${data.date} בשעה ${data.time}`
      );
    }
  } catch (error) {
    console.warn('Failed to send push notification to barber', error);
  }

  return appointmentRef.id;
};

export const updateAppointment = async (
  id: string,
  changes: Partial<Appointment>,
  notifyCustomer = true
): Promise<void> => {
  const appointmentRef = doc(db, 'appointments', id);
  const requiresAvailabilityValidation = ['barberId', 'date', 'time', 'service', 'status'].some(
    (field) => field in changes
  );

  if (!requiresAvailabilityValidation) {
    await updateDoc(appointmentRef, changes);
  } else {
    const serviceSettings = await getServiceSettingsMap();

    await runTransaction(db, async (transaction) => {
      const currentAppointmentSnap = await transaction.get(appointmentRef);

      if (!currentAppointmentSnap.exists()) {
        throw new Error('APPOINTMENT_NOT_FOUND');
      }

      const currentAppointment = {
        id: currentAppointmentSnap.id,
        ...currentAppointmentSnap.data(),
      } as Appointment;
      const nextAppointment = {
        ...currentAppointment,
        ...changes,
      } as Appointment;

      if (!isAppointmentDataValid(nextAppointment)) {
        throw new Error('INVALID_APPOINTMENT_DATA');
      }

      if (nextAppointment.status !== 'cancelled') {
        await assertWithinBookingWindow(nextAppointment.date);
        await assertBookingTimeAllowed(nextAppointment.date, timeToMinutes(nextAppointment.time));
      }

      const currentLockRefs = getAppointmentLockRefs(currentAppointment, serviceSettings);
      const nextLockRefs =
        nextAppointment.status === 'cancelled'
          ? []
          : getAppointmentLockRefs(nextAppointment, serviceSettings);
      const allLockRefs = [...currentLockRefs, ...nextLockRefs].filter(
        (lockRef, index, refs) => refs.findIndex((entry) => entry.path === lockRef.path) === index
      );

      if (nextAppointment.status !== 'cancelled') {
        const availabilityRef = doc(db, 'availability', nextAppointment.barberId);
        const [availabilitySnap, ...lockSnapshots] = await Promise.all([
          transaction.get(availabilityRef),
          ...allLockRefs.map((lockRef) => transaction.get(lockRef)),
        ]);

        const existingAppointments = await getBarberAppointments(nextAppointment.barberId, nextAppointment.date);
        assertAppointmentCanBeScheduled({
          appointment: nextAppointment,
          availability: availabilitySnap.exists()
            ? (availabilitySnap.data() as BarberAvailability)
            : null,
          appointments: existingAppointments,
          serviceSettings,
          excludedAppointmentId: currentAppointment.id,
        });

        const hasConflictingLock = lockSnapshots.some((snapshot) => {
          if (!snapshot.exists()) return false;
          return snapshot.data()?.appointmentId !== currentAppointment.id;
        });

        if (hasConflictingLock) {
          throw new Error('SLOT_NOT_AVAILABLE');
        }
      }

      transaction.update(appointmentRef, changes);

      currentLockRefs.forEach((lockRef) => {
        if (!nextLockRefs.some((nextRef) => nextRef.path === lockRef.path)) {
          transaction.delete(lockRef);
        }
      });

      nextLockRefs.forEach((lockRef) => {
        transaction.set(
          lockRef,
          {
            appointmentId: currentAppointment.id,
            barberId: nextAppointment.barberId,
            date: nextAppointment.date,
            time: lockRef.id.split('_').slice(-1)[0].replace('-', ':'),
          },
          { merge: true }
        );
      });
    });
  }

  if (!notifyCustomer) return;

  try {
    const snap = await getDoc(appointmentRef);
    if (!snap.exists()) return;

    const appointment = snap.data() as Appointment;
    const customer = await getUserProfile(appointment.customerId);
    if (!customer?.expoPushToken) return;

    let message = '';
    if (changes.status === 'confirmed') message = `התור שלך ל${appointment.date} אושר!`;
    else if (changes.status === 'cancelled') message = `התור שלך ל${appointment.date} בוטל.`;
    else message = `פרטי התור שלך עודכנו (${appointment.date} ${appointment.time})`;

    if (message) {
      await sendPushNotification(customer.expoPushToken, 'עדכון תור', message);
    }
  } catch (error) {
    console.warn('Failed to send push notification to customer', error);
  }
};

export const deleteAppointment = async (id: string, notifyCustomer = true): Promise<void> => {
  const serviceSettings = await getServiceSettingsMap();

  if (notifyCustomer) {
    try {
      const snap = await getDoc(doc(db, 'appointments', id));
      if (snap.exists()) {
        const appointment = snap.data() as Appointment;
        const customer = await getUserProfile(appointment.customerId);
        if (customer?.expoPushToken) {
          await sendPushNotification(
            customer.expoPushToken,
            'תור בוטל',
            `התור שלך ל${appointment.date} בשעה ${appointment.time} בוטל.`
          );
        }
      }
    } catch (error) {
      console.warn('Failed to send cancellation push notification', error);
    }
  }

  await runTransaction(db, async (transaction) => {
    const appointmentRef = doc(db, 'appointments', id);
    const appointmentSnap = await transaction.get(appointmentRef);

    if (!appointmentSnap.exists()) {
      return;
    }

    const appointment = { id: appointmentSnap.id, ...appointmentSnap.data() } as Appointment;
    const lockRefs = getAppointmentLockRefs(appointment, serviceSettings);

    lockRefs.forEach((lockRef) => transaction.delete(lockRef));
    transaction.delete(appointmentRef);
  });
};

export const updateAppointmentReminderNotificationId = async (
  id: string,
  reminderNotificationId?: string
): Promise<void> => {
  await updateDoc(doc(db, 'appointments', id), {
    reminderNotificationId: reminderNotificationId ?? '',
  });
};
