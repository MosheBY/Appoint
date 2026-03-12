import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  getAppointmentsByCustomer, Appointment,
} from '../../services/appointmentService';
import { STATUS_COLOR, STATUS_LABEL, SERVICE_PRICES } from '../../constants';

export default function CustomerHistoryScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { customerId, customerName } = route.params;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppointmentsByCustomer(user!.uid, customerId)
      .then(setAppointments)
      .finally(() => setLoading(false));
  }, []);

  const completedCount = appointments.filter(a => a.status === 'confirmed').length;
  const totalSpent = appointments
    .filter(a => a.status === 'confirmed')
    .reduce((sum, a) => sum + (SERVICE_PRICES[a.service] ?? 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#c9a84c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{customerName}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>{appointments.length}</Text>
          <Text style={styles.summaryLabel}>סה"כ תורים</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNum, { color: '#10b981' }]}>{completedCount}</Text>
          <Text style={styles.summaryLabel}>הושלמו</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNum, { color: '#c9a84c' }]}>₪{totalSpent}</Text>
          <Text style={styles.summaryLabel}>סה"כ שילם</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#c9a84c" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={item => item.id!}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<Text style={styles.empty}>אין היסטוריה</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View>
                <Text style={styles.time}>{item.time}</Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.service}>{item.service}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                    {STATUS_LABEL[item.status]}
                  </Text>
                </View>
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
  summary: { flexDirection: 'row', padding: 14, gap: 10 },
  summaryCard: {
    flex: 1, backgroundColor: '#16213e', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#2a2a4a',
  },
  summaryNum: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  summaryLabel: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  empty: { color: '#555', textAlign: 'center', marginTop: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#16213e', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#2a2a4a',
  },
  time: { fontSize: 16, fontWeight: 'bold', color: '#c9a84c' },
  date: { fontSize: 12, color: '#666', marginTop: 2 },
  service: { fontSize: 14, color: '#fff' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
});
