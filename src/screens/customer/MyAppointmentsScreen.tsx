import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  getCustomerAppointments, updateAppointment, Appointment,
} from '../../services/appointmentService';
import { STATUS_COLOR, STATUS_LABEL } from '../../constants';

export default function MyAppointmentsScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleCancel = (appt: Appointment) => {
    Alert.alert('ביטול תור', `לבטל את התור ל${appt.date} בשעה ${appt.time}?`, [
      { text: 'חזור', style: 'cancel' },
      {
        text: 'בטל תור', style: 'destructive',
        onPress: async () => {
          await updateAppointment(appt.id!, { status: 'cancelled' }, false);
          setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'cancelled' } : a));
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#c9a84c" size="large" /></View>;
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
          keyExtractor={item => item.id!}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#c9a84c" />}
          contentContainerStyle={{ padding: 16 }}
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
                <Text style={styles.detail}>{item.date}</Text>
                <Ionicons name="time-outline" size={16} color="#888" style={{ marginRight: 12 }} />
                <Text style={styles.detail}>{item.time}</Text>
              </View>
              {(item.status === 'pending' || item.status === 'confirmed') && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
                  <Text style={styles.cancelBtnText}>ביטול תור</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 16, backgroundColor: '#16213e' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#555', marginTop: 12, fontSize: 15 },
  card: {
    backgroundColor: '#16213e', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#2a2a4a',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  service: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  detail: { color: '#ccc', fontSize: 14 },
  cancelBtn: { marginTop: 12, borderWidth: 1, borderColor: '#ef4444', borderRadius: 8, padding: 10, alignItems: 'center' },
  cancelBtnText: { color: '#ef4444', fontSize: 14, fontWeight: 'bold' },
});
