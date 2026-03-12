import React, { useState } from 'react';
import { CALENDAR_THEME } from '../../constants';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../../context/AuthContext';
import { createAppointment, ServiceType, getAvailableSlots } from '../../services/appointmentService';

const SERVICES: ServiceType[] = ['תספורת', 'זקן', 'תספורת + זקן'];

export default function AddAppointmentScreen({ navigation }: any) {
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [service, setService] = useState<ServiceType>('תספורת');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const handleDateSelect = async (day: any) => {
    setDate(day.dateString);
    setTime('');
    setShowCalendar(false);
    const available = await getAvailableSlots(user!.uid, day.dateString);
    setSlots(available);
  };

  const handleSave = async () => {
    if (!customerName || !date || !time) {
      Alert.alert('שגיאה', 'יש למלא שם לקוח, תאריך ושעה');
      return;
    }
    setSaving(true);
    try {
      await createAppointment({
        customerId: 'manual_' + Date.now(),
        customerName,
        customerPhone,
        barberId: user!.uid,
        service,
        date,
        time,
        status: 'confirmed',
        notes,
        createdAt: new Date(),
      });
      Alert.alert('נוצר!', 'התור נוסף בהצלחה', [
        { text: 'אישור', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('שגיאה', 'יצירת תור נכשלה');
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
        <Text style={styles.headerTitle}>הוספת תור ידנית</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>שם לקוח *</Text>
        <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName}
          placeholder="שם הלקוח" placeholderTextColor="#888" textAlign="right" />

        <Text style={styles.label}>טלפון</Text>
        <TextInput style={styles.input} value={customerPhone} onChangeText={setCustomerPhone}
          placeholder="מספר טלפון" placeholderTextColor="#888" keyboardType="phone-pad" textAlign="right" />

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

        <Text style={styles.label}>תאריך *</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowCalendar(!showCalendar)}>
          <Ionicons name="calendar-outline" size={18} color="#c9a84c" />
          <Text style={styles.dateBtnText}>{date || 'בחר תאריך'}</Text>
        </TouchableOpacity>
        {showCalendar && (
          <Calendar
            minDate={today}
            onDayPress={handleDateSelect}
            markedDates={date ? { [date]: { selected: true, selectedColor: '#c9a84c' } } : {}}
            theme={CALENDAR_THEME}
          />
        )}

        <Text style={styles.label}>שעה *</Text>
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
          <TextInput style={styles.input} value={time} onChangeText={setTime}
            placeholder="HH:mm (לדוגמה: 14:30)" placeholderTextColor="#888" textAlign="right" />
        )}

        <Text style={styles.label}>הערות</Text>
        <TextInput style={[styles.input, { height: 70 }]} value={notes} onChangeText={setNotes}
          multiline textAlign="right" placeholder="הערות נוספות..." placeholderTextColor="#888" />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.saveBtnText}>הוסף תור</Text>}
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
