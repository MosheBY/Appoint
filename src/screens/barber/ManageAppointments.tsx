import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  getBarberAppointments, deleteAppointment, Appointment, AppointmentStatus,
} from '../../services/appointmentService';
import { STATUS_COLOR, STATUS_LABEL } from '../../constants';

export default function ManageAppointments({ navigation }: any) {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<AppointmentStatus | 'all'>('all');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getBarberAppointments(user.uid);
      setAppointments(data);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const filtered = appointments.filter(a => {
    const matchSearch = a.customerName.includes(search) || a.service.includes(search) || a.date.includes(search);
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleDelete = (appt: Appointment) => {
    Alert.alert('מחיקת תור', `למחוק את התור של ${appt.customerName}?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק', style: 'destructive',
        onPress: async () => {
          await deleteAppointment(appt.id!);
          setAppointments(prev => prev.filter(a => a.id !== appt.id));
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
          placeholder="חפש לפי שם, שירות, תאריך..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
      </View>

      <View style={styles.filters}>
        {(['all', 'pending', 'confirmed', 'cancelled'] as const).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterBtn, filterStatus === s && styles.filterBtnActive]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[styles.filterText, filterStatus === s && styles.filterTextActive]}>
              {s === 'all' ? 'הכל' : STATUS_LABEL[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#c9a84c" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id!}
          contentContainerStyle={{ padding: 14 }}
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
                  <Text style={styles.detail}>{item.date}</Text>
                  <Ionicons name="time-outline" size={14} color="#888" />
                  <Text style={styles.detail}>{item.time}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('CustomerHistory', {
                    customerId: item.customerId,
                    customerName: item.customerName,
                  })}
                >
                  <Ionicons name="person-outline" size={18} color="#c9a84c" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('EditAppointment', { appointment: item })}
                >
                  <Ionicons name="create-outline" size={18} color="#60a5fa" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14, backgroundColor: '#16213e',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#16213e', margin: 12, borderRadius: 10,
    paddingHorizontal: 12, borderWidth: 1, borderColor: '#333',
  },
  searchInput: { flex: 1, color: '#fff', padding: 10, fontSize: 14 },
  filters: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#16213e', borderRadius: 20, borderWidth: 1, borderColor: '#333',
  },
  filterBtnActive: { backgroundColor: '#c9a84c', borderColor: '#c9a84c' },
  filterText: { color: '#888', fontSize: 13 },
  filterTextActive: { color: '#1a1a2e', fontWeight: 'bold' },
  empty: { color: '#555', textAlign: 'center', paddingTop: 40 },
  card: {
    backgroundColor: '#16213e', borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#2a2a4a', overflow: 'hidden',
  },
  cardMain: { padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  customerName: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detail: { color: '#aaa', fontSize: 13 },
  actions: {
    flexDirection: 'row', justifyContent: 'flex-end',
    borderTopWidth: 1, borderTopColor: '#2a2a4a', padding: 8, gap: 8,
  },
  actionBtn: { padding: 8, backgroundColor: '#1a1a2e', borderRadius: 8 },
});
