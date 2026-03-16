export const getAppointmentErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return 'לא הצלחנו להשלים את הפעולה. נסה שוב.';
  }

  switch (error.message) {
    case 'CUSTOMER_BLOCKED':
      return 'הספר חסם את החשבון הזה לקביעת תורים חדשים.';
    case 'SLOT_NOT_AVAILABLE':
      return 'השעה הזו כבר נתפסה. בחר שעה אחרת.';
    case 'BARBER_UNAVAILABLE':
      return 'הספר לא זמין ביום שבחרת.';
    case 'BARBER_ON_VACATION':
      return 'הספר בחופשה בתאריך הזה.';
    case 'OUTSIDE_WORKING_HOURS':
      return 'השעה שבחרת מחוץ לשעות העבודה של הספר.';
    case 'TIME_ALREADY_PASSED':
      return 'לא ניתן לבחור שעה שכבר עברה.';
    case 'SAME_DAY_BOOKING_DISABLED':
      return 'כרגע אי אפשר לקבוע תור לאותו יום.';
    case 'MIN_ADVANCE_BOOKING_HOURS':
      return 'אי אפשר לקבוע תור בהתראה קצרה יותר מהמינימום שהוגדר.';
    case 'BLOCKED_SLOT':
      return 'השעה הזו חסומה ביומן. בחר שעה אחרת.';
    case 'BOOKING_WINDOW_CLOSED':
      return 'לא ניתן לקבוע תור מעבר לטווח התאריכים שפתוח כרגע להזמנה.';
    case 'INVALID_APPOINTMENT_DATA':
      return 'חסרים פרטים בתור. בדוק את הנתונים ונסה שוב.';
    default:
      return 'לא הצלחנו להשלים את הפעולה. נסה שוב.';
  }
};
