import { AppointmentStatus, ServiceType } from '../services/appointmentService';

export const STATUS_COLOR: Record<AppointmentStatus, string> = {
  pending: '#f59e0b',
  confirmed: '#10b981',
  cancelled: '#ef4444',
};

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: 'ממתין',
  confirmed: 'מאושר',
  cancelled: 'בוטל',
};

export const SERVICE_PRICES: Record<ServiceType, number> = {
  'תספורת': 60,
  'זקן': 40,
  'תספורת + זקן': 90,
};

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

export const todayString = () => new Date().toISOString().split('T')[0];
