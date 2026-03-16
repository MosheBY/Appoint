import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getAppointmentErrorMessage } from '../../utils/appointmentErrors';
import { formatDisplayDate } from '../../utils/dateFormat';
import {
  Appointment,
  AppointmentStatus,
  deleteAppointment,
  getAllAppointments,
  updateAppointment,
} from '../../services/appointmentService';
import { getAllUsers } from '../../services/authService';
import { STATUS_COLOR, STATUS_LABEL } from '../../constants';

type AppointmentWithNames = Appointment & {
  barberName?: string;
};

export default function AdminAppointmentsScreen() {
  const [appointments, setAppointments] = useState<AppointmentWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('all');
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(null);

  const load = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const [appointmentsData, users] = await Promise.all([getAllAppointments(), getAllUsers()]);
      const userMap = new Map(users.map((user) => [user.uid, user]));

      setAppointments(
        appointmentsData.map((appointment) => ({
          ...appointment,
          barberName: userMap.get(appointment.barberId)?.name ?? 'ספר לא ידוע',
        }))
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [])
  );

  const handleStatusUpdate = async (
    appointment: AppointmentWithNames,
    status: AppointmentStatus
  ) => {
    try {
      setBusyAppointmentId(appointment.id ?? null);
      await updateAppointment(appointment.id!, { status });
      setAppointments((current) =>
        current.map((entry) =>
          entry.id === appointment.id ? { ...entry, status } : entry
        )
      );
    } catch (error) {
      console.error('Failed to update appointment status', error);
      Alert.alert('לא ניתן לעדכן תור', getAppointmentErrorMessage(error));
    } finally {
      setBusyAppointmentId(null);
    }
  };

  const handleDelete = (appointment: AppointmentWithNames) => {
    Alert.alert('מחיקת תור', `למחוק את התור של ${appointment.customerName}?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusyAppointmentId(appointment.id ?? null);
            await deleteAppointment(appointment.id!);
            setAppointments((current) => current.filter((entry) => entry.id !== appointment.id));
          } catch (error) {
            console.error('Failed to delete appointment', error);
            Alert.alert('שגיאה', 'לא הצלחנו למחוק את התור.');
          } finally {
            setBusyAppointmentId(null);
          }
        },
      },
    ]);
  };

  const filteredAppointments = appointments.filter((appointment) => {
    const haystack = [
      appointment.customerName,
      appointment.customerPhone,
      appointment.barberName,
      appointment.service,
      appointment.date,
      appointment.time,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>כל התורים</Text>
        <TouchableOpacity onPress={() => load(false)}>
          <Ionicons name="refresh-outline" size={24} color="#c9a84c" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="חפש לפי לקוח, ספר, תאריך או שירות"
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
      </View>

      <View style={styles.filters}>
        {(['all', 'confirmed', 'cancelled'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterButton, filterStatus === status && styles.filterButtonActive]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[styles.filterButtonText, filterStatus === status && styles.filterButtonTextActive]}>
              {status === 'all' ? 'הכול' : STATUS_LABEL[status]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c9a84c" />
        </View>
      ) : (
        <FlatList
          data={filteredAppointments}
          keyExtractor={(item) => item.id!}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(false);
              }}
              tintColor="#c9a84c"
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>לא נמצאו תורים</Text>}
          renderItem={({ item }) => {
            const isBusy = busyAppointmentId === item.id;

            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.customerName}>{item.customerName}</Text>
                    {!!item.customerPhone && <Text style={styles.meta}>{item.customerPhone}</Text>}
                  </View>
                  <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
                    <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                      {STATUS_LABEL[item.status]}
                    </Text>
                  </View>
                </View>

                <Text style={styles.meta}>ספר: {item.barberName}</Text>
                <Text style={styles.meta}>שירות: {item.service}</Text>
                <Text style={styles.meta}>
                  תאריך: {formatDisplayDate(item.date)} | שעה: {item.time}
                </Text>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleStatusUpdate(item, 'cancelled')}
                    disabled={isBusy}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#f59e0b" />
                    <Text style={[styles.actionText, styles.cancelText]}>בטל</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(item)}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        <Text style={[styles.actionText, styles.deleteText]}>מחק</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#16213e',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    margin: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: { flex: 1, color: '#fff', padding: 10, fontSize: 14 },
  filters: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 6 },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#16213e',
  },
  filterButtonActive: { backgroundColor: '#c9a84c', borderColor: '#c9a84c' },
  filterButtonText: { color: '#888', fontSize: 13, fontWeight: 'bold' },
  filterButtonTextActive: { color: '#1a1a2e' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 14 },
  empty: { color: '#555', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  customerName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  meta: { color: '#aaa', fontSize: 13, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#1a1a2e',
  },
  actionText: { fontSize: 13, fontWeight: 'bold' },
  cancelText: { color: '#f59e0b' },
  deleteText: { color: '#ef4444' },
});
