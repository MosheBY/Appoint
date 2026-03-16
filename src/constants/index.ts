import { AppointmentStatus } from '../services/appointmentService';
import { DEFAULT_SERVICE_SETTINGS } from '../services/serviceSettingsService';
import { getCurrentDateKey } from '../utils/dateFormat';

export const STATUS_COLOR: Record<AppointmentStatus, string> = {
  pending: '#10b981',
  confirmed: '#10b981',
  cancelled: '#ef4444',
};

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: 'מאושר',
  confirmed: 'מאושר',
  cancelled: 'בוטל',
};

export const SERVICE_PRICES = Object.fromEntries(
  Object.values(DEFAULT_SERVICE_SETTINGS).map((setting) => [setting.type, setting.price])
);

export const CALENDAR_THEME = {
  backgroundColor: '#1a1a2e',
  calendarBackground: '#16213e',
  textSectionTitleColor: '#c9a84c',
  selectedDayBackgroundColor: '#c9a84c',
  selectedDayTextColor: '#1a1a2e',
  todayTextColor: '#c9a84c',
  dayTextColor: '#fff',
  textDisabledColor: '#444',
  arrowColor: '#c9a84c',
  monthTextColor: '#fff',
};

export const todayString = () => getCurrentDateKey();
