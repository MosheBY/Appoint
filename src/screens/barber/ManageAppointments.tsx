import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { formatDisplayDate } from '../../utils/dateFormat';
import {
  Appointment,
  AppointmentStatus,
  deleteAppointment,
  getBarberAppointments,
} from '../../services/appointmentService';
import { STATUS_COLOR, STATUS_LABEL } from '../../constants';

export default function ManageAppointments({ navigation }: any) {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('all');

  const load = async (showLoader = false) => {
    if (!user) return;
    if (showLoader) {
      setLoading(true);
    }

    try {
      const data = await getBarberAppointments(user.uid);
      setAppointments(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [user?.uid])
  );

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch =
      appointment.customerName.includes(search) ||
      appointment.service.includes(search) ||
      appointment.date.includes(search);
    const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (appointment: Appointment) => {
    Alert.alert('מחיקת תור', `למחוק את התור של ${appointment.customerName}?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          await deleteAppointment(appointment.id!);
          setAppointments((current) => current.filter((entry) => entry.id !== appointment.id));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ניהול תורים</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddAppointment')}>
          <Ionicons name="add-circle" size={28} color="#c9a84c" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="חפש לפי שם, שירות או תאריך"
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
      </View>

      <View style={styles.filters}>
        {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterButton, filterStatus === status && styles.filterButtonActive]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[styles.filterText, filterStatus === status && styles.filterTextActive]}>
              {status === 'all' ? 'הכול' : STATUS_LABEL[status]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#c9a84c" style={styles.loader} />
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
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>לא נמצאו תורים</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardMain}
                onPress={() => navigation.navigate('EditAppointment', { appointment: item })}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.customerName}>{item.customerName}</Text>
                  <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
                    <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                      {STATUS_LABEL[item.status]}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardRow}>
                  <Ionicons name="cut-outline" size={14} color="#888" />
                  <Text style={styles.detail}>{item.service}</Text>
                  <Ionicons name="calendar-outline" size={14} color="#888" />
                  <Text style={styles.detail}>{formatDisplayDate(item.date)}</Text>
                  <Ionicons name="time-outline" size={14} color="#888" />
                  <Text style={styles.detail}>{item.time}</Text>
                </View>

                {!!item.customerPhone && (
                  <View style={styles.cardRow}>
                    <Ionicons name="call-outline" size={14} color="#888" />
                    <Text style={styles.detail}>{item.customerPhone}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    navigation.navigate('CustomerHistory', {
                      customerId: item.customerId,
                      customerName: item.customerName,
                    })
                  }
                >
                  <Ionicons name="person-outline" size={18} color="#c9a84c" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('EditAppointment', { appointment: item })}
                >
                  <Ionicons name="create-outline" size={18} color="#60a5fa" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    paddingBottom: 14,
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
  filters: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#16213e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterButtonActive: { backgroundColor: '#c9a84c', borderColor: '#c9a84c' },
  filterText: { color: '#888', fontSize: 13 },
  filterTextActive: { color: '#1a1a2e', fontWeight: 'bold' },
  loader: { marginTop: 40 },
  listContent: { padding: 14 },
  empty: { color: '#555', textAlign: 'center', paddingTop: 40 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    overflow: 'hidden',
  },
  cardMain: { padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  customerName: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detail: { color: '#aaa', fontSize: 13 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
    padding: 8,
    gap: 8,
  },
  actionButton: { padding: 8, backgroundColor: '#1a1a2e', borderRadius: 8 },
});
