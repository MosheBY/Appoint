import React, { useState, useEffect } from 'react';
import { CALENDAR_THEME, todayString } from '../../constants';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../../context/AuthContext';
import {
  getBarberAvailability, updateBarberAvailability, DaySchedule,
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

export default function AvailabilityScreen() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [vacationDays, setVacationDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBarberAvailability(user!.uid).then(data => {
      if (data) {
        setSchedule(data.schedule ?? defaultSchedule);
        setVacationDays(data.vacationDays ?? []);
      }
    }).finally(() => setLoading(false));
  }, []);

  const toggleDay = (key: string) =>
    setSchedule(prev => ({ ...prev, [key]: { ...prev[key], isOpen: !prev[key].isOpen } }));

  const updateTime = (key: string, field: 'start' | 'end', value: string) =>
    setSchedule(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const toggleVacationDay = (dateStr: string) =>
    setVacationDays(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBarberAvailability(user!.uid, { schedule, vacationDays });
      Alert.alert('נשמר!', 'הגדרות הזמינות עודכנו');
    } catch {
      Alert.alert('שגיאה', 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#c9a84c" size="large" /></View>;
  }

  const today = todayString();
  const markedVacations = vacationDays.reduce((acc: any, d) => {
    acc[d] = { selected: true, selectedColor: '#ef4444' };
    return acc;
  }, {});

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
                <TextInput
                  style={styles.timeInput}
                  value={schedule[key].start}
                  onChangeText={v => updateTime(key, 'start', v)}
                  placeholder="09:00" placeholderTextColor="#666" textAlign="center"
                />
                <Text style={styles.timeDash}>—</Text>
                <TextInput
                  style={styles.timeInput}
                  value={schedule[key].end}
                  onChangeText={v => updateTime(key, 'end', v)}
                  placeholder="18:00" placeholderTextColor="#666" textAlign="center"
                />
              </View>
            ) : (
              <Text style={styles.closedText}>סגור</Text>
            )}
          </View>
        ))}

        <Text style={[styles.section, { marginTop: 24 }]}>ימי חופש / חסימה</Text>
        <Text style={styles.hint}>לחץ על תאריך לסמנו כחסום (אדום)</Text>
        <Calendar
          minDate={today}
          onDayPress={(d: any) => toggleVacationDay(d.dateString)}
          markedDates={markedVacations}
          theme={CALENDAR_THEME}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.saveBtnText}>שמור הגדרות</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  header: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14, backgroundColor: '#16213e' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  content: { padding: 16 },
  section: { fontSize: 15, fontWeight: 'bold', color: '#c9a84c', marginBottom: 12 },
  dayRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1e1e3a', gap: 10,
  },
  dayLabel: { width: 46, color: '#fff', fontSize: 14 },
  dayLabelOff: { color: '#555' },
  timeInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  timeInput: {
    backgroundColor: '#16213e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#333', width: 64,
  },
  timeDash: { color: '#666' },
  closedText: { flex: 1, textAlign: 'right', color: '#555', fontSize: 13 },
  hint: { color: '#666', fontSize: 13, marginBottom: 10 },
  saveBtn: {
    backgroundColor: '#c9a84c', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 24, marginBottom: 30,
  },
  saveBtnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 16 },
});
