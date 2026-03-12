import React, { useState } from 'react';
import { CALENDAR_THEME } from '../../constants';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import {
  updateAppointment, Appointment, AppointmentStatus, ServiceType, getAvailableSlots,
} from '../../services/appointmentService';

const SERVICES: ServiceType[] = ['תספורת', 'זקן', 'תספורת + זקן'];
const STATUSES: { val: AppointmentStatus; label: string; color: string }[] = [
  { val: 'pending', label: 'ממתין', color: '#f59e0b' },
  { val: 'confirmed', label: 'מאושר', color: '#10b981' },
  { val: 'cancelled', label: 'בוטל', color: '#ef4444' },
];

export default function EditAppointmentScreen({ route, navigation }: any) {
  const original: Appointment = route.params.appointment;
  const [service, setService] = useState<ServiceType>(original.service);
  const [date, setDate] = useState(original.date);
  const [time, setTime] = useState(original.time);
  const [status, setStatus] = useState<AppointmentStatus>(original.status);
  const [notes, setNotes] = useState(original.notes ?? '');
  const [customerName, setCustomerName] = useState(original.customerName);
  const [showCalendar, setShowCalendar] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const handleDateSelect = async (day: any) => {
    setDate(day.dateString);
    setTime('');
    setShowCalendar(false);
    const available = await getAvailableSlots(original.barberId, day.dateString);
    if (day.dateString === original.date && !available.includes(original.time)) {
      available.push(original.time);
      available.sort();
    }
    setSlots(available);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAppointment(original.id!, { service, date, time, status, notes, customerName });
      Alert.alert('נשמר!', 'התור עודכן בהצלחה', [
        { text: 'אישור', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('שגיאה', 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#c9a84c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>עריכת תור</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>שם לקוח</Text>
        <TextInput
          style={styles.input} value={customerName} onChangeText={setCustomerName}
          textAlign="right" placeholderTextColor="#888"
        />

        <Text style={styles.label}>שירות</Text>
        <View style={styles.optionRow}>
          {SERVICES.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.option, service === s && styles.optionActive]}
              onPress={() => setService(s)}
            >
              <Text style={[styles.optionText, service === s && styles.optionTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>תאריך</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowCalendar(!showCalendar)}>
          <Ionicons name="calendar-outline" size={18} color="#c9a84c" />
          <Text style={styles.dateBtnText}>{date}</Text>
        </TouchableOpacity>
        {showCalendar && (
          <Calendar
            minDate={today}
            onDayPress={handleDateSelect}
            markedDates={{ [date]: { selected: true, selectedColor: '#c9a84c' } }}
            theme={CALENDAR_THEME}
          />
        )}

        <Text style={styles.label}>שעה</Text>
        {slots.length > 0 ? (
          <View style={styles.slotsGrid}>
            {slots.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.slot, time === s && styles.slotActive]}
                onPress={() => setTime(s)}
              >
                <Text style={[styles.slotText, time === s && styles.slotTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TextInput
            style={styles.input} value={time} onChangeText={setTime}
            placeholder="HH:mm" placeholderTextColor="#888" textAlign="right"
          />
        )}

        <Text style={styles.label}>סטטוס</Text>
        <View style={styles.optionRow}>
          {STATUSES.map(s => (
            <TouchableOpacity
              key={s.val}
              style={[styles.option, status === s.val && { backgroundColor: s.color + '33', borderColor: s.color }]}
              onPress={() => setStatus(s.val)}
            >
              <Text style={[styles.optionText, status === s.val && { color: s.color, fontWeight: 'bold' }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>הערות</Text>
        <TextInput
          style={[styles.input, { height: 80 }]} value={notes} onChangeText={setNotes}
          multiline textAlign="right" placeholder="הערות לתור..." placeholderTextColor="#888"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.saveBtnText}>שמור שינויים</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14, backgroundColor: '#16213e',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  content: { padding: 16 },
  label: { color: '#c9a84c', fontSize: 13, fontWeight: 'bold', marginBottom: 8, marginTop: 14 },
  input: {
    backgroundColor: '#16213e', borderRadius: 10, padding: 12,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#333',
  },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  option: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#16213e', borderRadius: 8, borderWidth: 1, borderColor: '#333',
  },
  optionActive: { backgroundColor: '#c9a84c33', borderColor: '#c9a84c' },
  optionText: { color: '#888', fontSize: 14 },
  optionTextActive: { color: '#c9a84c', fontWeight: 'bold' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#16213e', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#333',
  },
  dateBtnText: { color: '#fff', fontSize: 15 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#16213e', borderRadius: 8, borderWidth: 1, borderColor: '#333',
  },
  slotActive: { backgroundColor: '#c9a84c', borderColor: '#c9a84c' },
  slotText: { color: '#fff', fontSize: 14 },
  slotTextActive: { color: '#1a1a2e', fontWeight: 'bold' },
  saveBtn: {
    backgroundColor: '#c9a84c', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 24, marginBottom: 30,
  },
  saveBtnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 16 },
});
