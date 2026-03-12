import React, { useState, useEffect } from 'react';
import { CALENDAR_THEME } from '../../constants';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { ServiceType, createAppointment, getAvailableSlots } from '../../services/appointmentService';
import { scheduleLocalReminder } from '../../services/notificationService';

// *** שנה לפי ה-UID של הספר שלך ב-Firebase ***
const BARBER_ID = 'ABGss0WKwCRTlJwEeTAbbCYHMLD2';

interface Props {
  service: ServiceType;
  onBack: () => void;
}

export default function BookingScreen({ service, onBack }: Props) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (selectedDate) {
      setLoadingSlots(true);
      setSelectedTime('');
      getAvailableSlots(BARBER_ID, selectedDate)
        .then(setSlots)
        .finally(() => setLoadingSlots(false));
    }
  }, [selectedDate]);

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) { Alert.alert('שגיאה', 'יש לבחור תאריך ושעה'); return; }
    setSubmitting(true);
    try {
      const apptId = await createAppointment({
        customerId: user!.uid,
        customerName: user!.name,
        customerPhone: user!.phone,
        barberId: BARBER_ID,
        service,
        date: selectedDate,
        time: selectedTime,
        status: 'pending',
        createdAt: new Date(),
      });
      await scheduleLocalReminder(apptId, selectedDate, selectedTime, service);
      Alert.alert(
        'התור נקבע!',
        `${service}\n${selectedDate} בשעה ${selectedTime}\n\nתקבל אישור מהספר בקרוב.`,
        [{ text: 'אישור', onPress: onBack }]
      );
    } catch {
      Alert.alert('שגיאה', 'קביעת התור נכשלה, נסה שוב');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#c9a84c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{service}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView>
        <Text style={styles.sectionTitle}>בחר תאריך</Text>
        <Calendar
          minDate={today}
          onDayPress={(day: any) => setSelectedDate(day.dateString)}
          markedDates={selectedDate ? { [selectedDate]: { selected: true, selectedColor: '#c9a84c' } } : {}}
          theme={CALENDAR_THEME}
        />

        {selectedDate && (
          <>
            <Text style={styles.sectionTitle}>בחר שעה</Text>
            {loadingSlots ? (
              <ActivityIndicator color="#c9a84c" style={{ margin: 20 }} />
            ) : slots.length === 0 ? (
              <Text style={styles.noSlots}>אין שעות פנויות ביום זה</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slot, selectedTime === slot && styles.slotSelected]}
                    onPress={() => setSelectedTime(slot)}
                  >
                    <Text style={[styles.slotText, selectedTime === slot && styles.slotTextSelected]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {selectedDate && selectedTime && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>סיכום התור</Text>
            <Text style={styles.summaryLine}>שירות: {service}</Text>
            <Text style={styles.summaryLine}>תאריך: {selectedDate}</Text>
            <Text style={styles.summaryLine}>שעה: {selectedTime}</Text>
            <TouchableOpacity style={styles.bookButton} onPress={handleBook} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color="#1a1a2e" />
                : <Text style={styles.bookButtonText}>קבע תור</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16, backgroundColor: '#16213e',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#c9a84c', padding: 16, paddingBottom: 8 },
  noSlots: { color: '#888', textAlign: 'center', padding: 20 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  slot: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#16213e', borderRadius: 8, borderWidth: 1, borderColor: '#333',
  },
  slotSelected: { backgroundColor: '#c9a84c', borderColor: '#c9a84c' },
  slotText: { color: '#fff', fontSize: 14 },
  slotTextSelected: { color: '#1a1a2e', fontWeight: 'bold' },
  summary: {
    margin: 16, backgroundColor: '#16213e', borderRadius: 14,
    padding: 20, borderWidth: 1, borderColor: '#2a2a4a',
  },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#c9a84c', marginBottom: 12 },
  summaryLine: { color: '#fff', fontSize: 15, marginBottom: 6 },
  bookButton: { backgroundColor: '#c9a84c', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 16 },
  bookButtonText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 16 },
});
