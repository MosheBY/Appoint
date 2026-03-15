export const formatDisplayDate = (date: string) => {
  if (!date) return '';

  const parts = date.split('-');
  if (parts.length !== 3) return date;

  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const APP_TIME_ZONE = 'Asia/Jerusalem';

const getTimeZoneParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
  };
};

export const getCurrentDateKey = (date = new Date()) => {
  const { year, month, day } = getTimeZoneParts(date);
  return `${year}-${month}-${day}`;
};

export const getCurrentTimeInMinutes = (date = new Date()) => {
  const { hour, minute } = getTimeZoneParts(date);
  return Number(hour) * 60 + Number(minute);
};

export const getDateKeyWithOffset = (offsetDays: number, baseDate = new Date()) => {
  const shiftedDate = new Date(baseDate);
  shiftedDate.setDate(shiftedDate.getDate() + offsetDays);
  return getCurrentDateKey(shiftedDate);
};
