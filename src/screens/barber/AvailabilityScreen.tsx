import React, { useEffect, useMemo, useState } from 'react';
import { CALENDAR_THEME, todayString } from '../../constants';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import {
  getBarberAvailability,
  updateBarberAvailability,
  DaySchedule,
} from '../../services/appointmentService';

const DAYS = [
  { key: 'sunday', label: 'ראשון' },
  { key: 'monday', label: 'שני' },
  { key: 'tuesday', label: 'שלישי' },
  { key: 'wednesday', label: 'רביעי' },
  { key: 'thursday', label: 'חמישי' },
  { key: 'friday', label: 'שישי' },
  { key: 'saturday', label: 'שבת' },
];

const defaultSchedule: Record<string, DaySchedule> = {
  sunday: { isOpen: true, start: '09:00', end: '18:00' },
  monday: { isOpen: true, start: '09:00', end: '18:00' },
  tuesday: { isOpen: true, start: '09:00', end: '18:00' },
  wednesday: { isOpen: true, start: '09:00', end: '18:00' },
  thursday: { isOpen: true, start: '09:00', end: '18:00' },
  friday: { isOpen: true, start: '09:00', end: '14:00' },
  saturday: { isOpen: false, start: '09:00', end: '13:00' },
};

const parseTimeToDate = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const formatTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export default function AvailabilityScreen() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [vacationDays, setVacationDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerState, setPickerState] = useState<{
    dayKey: string;
    field: 'start' | 'end';
    value: Date;
  } | null>(null);

  useEffect(() => {
    getBarberAvailability(user!.uid)
      .then((data) => {
        if (data) {
          setSchedule(data.schedule ?? defaultSchedule);
          setVacationDays(data.vacationDays ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const markedVacations = useMemo(
    () =>
      vacationDays.reduce((accumulator: Record<string, { selected: boolean; selectedColor: string }>, date) => {
        accumulator[date] = { selected: true, selectedColor: '#ef4444' };
        return accumulator;
      }, {}),
    [vacationDays]
  );

  const toggleDay = (key: string) => {
    setSchedule((prev) => ({
      ...prev,
      [key]: { ...prev[key], isOpen: !prev[key].isOpen },
    }));
  };

  const updateTime = (key: string, field: 'start' | 'end', value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const toggleVacationDay = (dateStr: string) => {
    setVacationDays((prev) =>
      prev.includes(dateStr) ? prev.filter((date) => date !== dateStr) : [...prev, dateStr]
    );
  };

  const openPicker = (dayKey: string, field: 'start' | 'end') => {
    setPickerState({
      dayKey,
      field,
      value: parseTimeToDate(schedule[dayKey][field]),
    });
  };

  const closePicker = () => setPickerState(null);

  const handleTimeChange = (event: DateTimePickerEvent, selectedValue?: Date) => {
    if (!pickerState) return;

    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        closePicker();
        return;
      }

      if (selectedValue) {
        updateTime(pickerState.dayKey, pickerState.field, formatTime(selectedValue));
      }

      closePicker();
      return;
    }

    if (selectedValue) {
      setPickerState((current) => (current ? { ...current, value: selectedValue } : current));
    }
  };

  const confirmIosTime = () => {
    if (!pickerState) return;
    updateTime(pickerState.dayKey, pickerState.field, formatTime(pickerState.value));
    closePicker();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBarberAvailability(user!.uid, { schedule, vacationDays });
      Alert.alert('נשמר!', 'הגדרות הזמינות עודכנו.');
    } catch {
      Alert.alert('שגיאה', 'השמירה נכשלה.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9a84c" size="large" />
      </View>
    );
  }

  const today = todayString();
  const selectedDayLabel = pickerState
    ? DAYS.find((day) => day.key === pickerState.dayKey)?.label ?? ''
    : '';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>הגדרת זמינות</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>שעות עבודה</Text>
        {DAYS.map(({ key, label }) => (
          <View key={key} style={styles.dayRow}>
            <Switch
              value={schedule[key]?.isOpen ?? false}
              onValueChange={() => toggleDay(key)}
              trackColor={{ false: '#333', true: '#c9a84c' }}
              thumbColor="#fff"
            />
            <Text style={[styles.dayLabel, !schedule[key]?.isOpen && styles.dayLabelOff]}>{label}</Text>
            {schedule[key]?.isOpen ? (
              <View style={styles.timeInputs}>
                <TouchableOpacity style={styles.timeButton} onPress={() => openPicker(key, 'start')}>
                  <Ionicons name="time-outline" size={16} color="#c9a84c" />
                  <Text style={styles.timeButtonText}>{schedule[key].start}</Text>
                </TouchableOpacity>

                <Text style={styles.timeDash}>-</Text>

                <TouchableOpacity style={styles.timeButton} onPress={() => openPicker(key, 'end')}>
                  <Ionicons name="time-outline" size={16} color="#c9a84c" />
                  <Text style={styles.timeButtonText}>{schedule[key].end}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.closedText}>סגור</Text>
            )}
          </View>
        ))}

        <Text style={[styles.section, { marginTop: 24 }]}>ימי חופש / חסימה</Text>
        <Text style={styles.hint}>לחץ על תאריך כדי לסמן אותו כחסום באדום.</Text>
        <Calendar
          minDate={today}
          onDayPress={(day: { dateString: string }) => toggleVacationDay(day.dateString)}
          markedDates={markedVacations}
          theme={CALENDAR_THEME}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text style={styles.saveBtnText}>שמור הגדרות</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {pickerState && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerState.value}
          mode="time"
          is24Hour
          display="default"
          onChange={handleTimeChange}
        />
      ) : null}

      <Modal visible={!!pickerState && Platform.OS === 'ios'} transparent animationType="slide" onRequestClose={closePicker}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerState?.field === 'start' ? 'בחר שעת התחלה' : 'בחר שעת סיום'}
                {selectedDayLabel ? ` ליום ${selectedDayLabel}` : ''}
              </Text>
              <TouchableOpacity onPress={closePicker}>
                <Ionicons name="close" size={22} color="#c9a84c" />
              </TouchableOpacity>
            </View>

            {pickerState ? (
              <DateTimePicker
                value={pickerState.value}
                mode="time"
                is24Hour
                display="spinner"
                onChange={handleTimeChange}
                style={styles.iosPicker}
              />
            ) : null}

            <TouchableOpacity style={styles.confirmBtn} onPress={confirmIosTime}>
              <Text style={styles.confirmBtnText}>אישור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
    backgroundColor: '#16213e',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  content: { padding: 16 },
  section: { fontSize: 15, fontWeight: 'bold', color: '#c9a84c', marginBottom: 12 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e3a',
    gap: 10,
  },
  dayLabel: { width: 52, color: '#fff', fontSize: 14 },
  dayLabelOff: { color: '#555' },
  timeInputs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  timeButton: {
    minWidth: 92,
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  timeButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  timeDash: { color: '#666' },
  closedText: { flex: 1, textAlign: 'right', color: '#555', fontSize: 13 },
  hint: { color: '#666', fontSize: 13, marginBottom: 10 },
  saveBtn: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 30,
  },
  saveBtnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#2a2a4a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', flex: 1, marginRight: 12 },
  iosPicker: {
    alignSelf: 'stretch',
    backgroundColor: '#16213e',
  },
  confirmBtn: {
    marginTop: 16,
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#1a1a2e', fontSize: 16, fontWeight: 'bold' },
});
