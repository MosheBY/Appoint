import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getDateKeyWithOffset } from '../utils/dateFormat';

export interface BookingSettings {
  bookingWindowEndDate: string;
  allowSameDayBooking: boolean;
  minAdvanceBookingHours: number;
  allowCustomerCancellation: boolean;
  allowCustomerReschedule: boolean;
  reminderLeadTimeMinutes: number;
}

const BOOKING_SETTINGS_DOC = doc(db, 'appSettings', 'booking');
const DEFAULT_BOOKING_WINDOW_DAYS = 7;

export const getDefaultBookingSettings = (): BookingSettings => ({
  bookingWindowEndDate: getDateKeyWithOffset(DEFAULT_BOOKING_WINDOW_DAYS),
  allowSameDayBooking: true,
  minAdvanceBookingHours: 2,
  allowCustomerCancellation: true,
  allowCustomerReschedule: true,
  reminderLeadTimeMinutes: 120,
});

export const getBookingSettings = async (): Promise<BookingSettings> => {
  const defaults = getDefaultBookingSettings();
  const snap = await getDoc(BOOKING_SETTINGS_DOC);

  if (!snap.exists()) {
    return defaults;
  }

  const data = snap.data() as Partial<BookingSettings>;
  return {
    bookingWindowEndDate: data.bookingWindowEndDate ?? defaults.bookingWindowEndDate,
    allowSameDayBooking: data.allowSameDayBooking ?? defaults.allowSameDayBooking,
    minAdvanceBookingHours:
      typeof data.minAdvanceBookingHours === 'number'
        ? data.minAdvanceBookingHours
        : defaults.minAdvanceBookingHours,
    allowCustomerCancellation:
      data.allowCustomerCancellation ?? defaults.allowCustomerCancellation,
    allowCustomerReschedule:
      data.allowCustomerReschedule ?? defaults.allowCustomerReschedule,
    reminderLeadTimeMinutes:
      typeof data.reminderLeadTimeMinutes === 'number'
        ? data.reminderLeadTimeMinutes
        : defaults.reminderLeadTimeMinutes,
  };
};

export const updateBookingSettings = async (changes: Partial<BookingSettings>): Promise<void> => {
  await setDoc(
    BOOKING_SETTINGS_DOC,
    {
      ...getDefaultBookingSettings(),
      ...changes,
    },
    { merge: true }
  );
};
