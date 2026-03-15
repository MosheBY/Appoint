import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { formatDisplayDate } from '../../utils/dateFormat';
import { CALENDAR_THEME, STATUS_COLOR, STATUS_LABEL, todayString } from '../../constants';
import {
  Appointment,
  getAvailableSlots,
  getCustomerAppointments,
  updateAppointment,
} from '../../services/appointmentService';

export default function MyAppointmentsScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [savingChange, setSavingChange] = useState(false);

  const today = todayString();

  const load = async () => {
    if (!user) return;
    try {
      const data = await getCustomerAppointments(user.uid);
      setAppointments(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [user?.uid])
  );

  const handleCancel = (appointment: Appointment) => {
    Alert.alert(
      'ביטול תור',
      `לבטל את התור ל${formatDisplayDate(appointment.date)} בשעה ${appointment.time}?`,
      [
        { text: 'חזור', style: 'cancel' },
        {
          text: 'בטל תור',
          style: 'destructive',
          onPress: async () => {
            await updateAppointment(appointment.id!, { status: 'cancelled' }, false);
            setAppointments((current) =>
              current.map((entry) =>
                entry.id === appointment.id ? { ...entry, status: 'cancelled' } : entry
              )
            );
          },
        },
      ]
    );
  };

  const loadSlots = async (appointment: Appointment, date: string) => {
    setLoadingSlots(true);
    try {
      const available = await getAvailableSlots(appointment.barberId, date, appointment.service);
      const nextSlots = [...available];

      if (date === appointment.date && !nextSlots.includes(appointment.time)) {
        nextSlots.push(appointment.time);
        nextSlots.sort();
      }

      setSlots(nextSlots);
    } catch (error) {
      console.error('Failed to load reschedule slots', error);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const openReschedule = async (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setSelectedDate(appointment.date);
    setSelectedTime(appointment.time);
    await loadSlots(appointment, appointment.date);
  };

  const closeReschedule = () => {
    setEditingAppointment(null);
    setSelectedDate('');
    setSelectedTime('');
    setSlots([]);
  };

  const saveReschedule = async () => {
    if (!editingAppointment || !selectedDate || !selectedTime) {
      Alert.alert('שגיאה', 'יש לבחור תאריך ושעה חדשים');
      return;
    }

    setSavingChange(true);
    try {
      await updateAppointment(
        editingAppointment.id!,
        {
          date: selectedDate,
          time: selectedTime,
          status: 'confirmed',
        },
        false
      );

      setAppointments((current) =>
        current.map((entry) =>
          entry.id === editingAppointment.id
            ? { ...entry, date: selectedDate, time: selectedTime, status: 'confirmed' }
            : entry
        )
      );

      closeReschedule();
      Alert.alert('הצלחנו', 'התור עודכן בהצלחה');
    } catch (error) {
      console.error('Failed to reschedule appointment', error);
      Alert.alert('שגיאה', 'לא הצלחנו לשנות את התור, נסה שוב');
    } finally {
      setSavingChange(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c9a84c" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>התורים שלי</Text>
      </View>

      {appointments.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>אין לך תורים עדיין</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id!}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#c9a84c"
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.service}>{item.service}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                    {STATUS_LABEL[item.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <Ionicons name="calendar-outline" size={16} color="#888" />
                <Text style={styles.detail}>{formatDisplayDate(item.date)}</Text>
                <Ionicons name="time-outline" size={16} color="#888" style={styles.timeIcon} />
                <Text style={styles.detail}>{item.time}</Text>
              </View>

              {(item.status === 'pending' || item.status === 'confirmed') && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.editButton} onPress={() => openReschedule(item)}>
                    <Text style={styles.editButtonText}>שנה תור</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancel(item)}>
                    <Text style={styles.cancelButtonText}>בטל תור</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      <Modal visible={!!editingAppointment} animationType="slide" transparent onRequestClose={closeReschedule}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>שינוי תור</Text>
              <TouchableOpacity onPress={closeReschedule}>
                <Ionicons name="close" size={22} color="#c9a84c" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.modalLabel}>בחר תאריך חדש</Text>
              <Calendar
                minDate={today}
                onDayPress={(day: { dateString: string }) => {
                  if (!editingAppointment) return;
                  setSelectedDate(day.dateString);
                  setSelectedTime('');
                  loadSlots(editingAppointment, day.dateString);
                }}
                markedDates={
                  selectedDate
                    ? { [selectedDate]: { selected: true, selectedColor: '#c9a84c' } }
                    : {}
                }
                theme={CALENDAR_THEME}
              />

              <Text style={styles.modalLabel}>בחר שעה חדשה</Text>
              {loadingSlots ? (
                <ActivityIndicator color="#c9a84c" style={styles.loader} />
              ) : slots.length === 0 ? (
                <Text style={styles.emptySlots}>אין שעות פנויות ביום הזה</Text>
              ) : (
                <View style={styles.slotsGrid}>
                  {slots.map((slot) => (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.slotButton, selectedTime === slot && styles.slotButtonSelected]}
                      onPress={() => setSelectedTime(slot)}
                    >
                      <Text
                        style={[
                          styles.slotButtonText,
                          selectedTime === slot && styles.slotButtonTextSelected,
                        ]}
                      >
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={closeReschedule}>
                  <Text style={styles.modalCancelText}>ביטול</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSave} onPress={saveReschedule} disabled={savingChange}>
                  {savingChange ? (
                    <ActivityIndicator color="#1a1a2e" />
                  ) : (
                    <Text style={styles.modalSaveText}>שמור שינוי</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16, backgroundColor: '#16213e' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#555', marginTop: 12, fontSize: 15 },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  service: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  detail: { color: '#ccc', fontSize: 14 },
  timeIcon: { marginRight: 12 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#c9a84c',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  editButtonText: { color: '#c9a84c', fontSize: 14, fontWeight: 'bold' },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#ef4444', fontSize: 14, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    maxHeight: '90%',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalLabel: { color: '#c9a84c', fontSize: 15, fontWeight: 'bold', marginTop: 8, marginBottom: 10 },
  loader: { marginVertical: 20 },
  emptySlots: { color: '#888', textAlign: 'center', paddingVertical: 20 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  slotButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#16213e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  slotButtonSelected: { backgroundColor: '#c9a84c', borderColor: '#c9a84c' },
  slotButtonText: { color: '#fff', fontSize: 14 },
  slotButtonTextSelected: { color: '#1a1a2e', fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 6 },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalCancelText: { color: '#ccc', fontSize: 15, fontWeight: 'bold' },
  modalSave: {
    flex: 1,
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalSaveText: { color: '#1a1a2e', fontSize: 15, fontWeight: 'bold' },
});
