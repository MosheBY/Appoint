import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../services/authService';
import {
  getBarberAppointments, updateAppointment, Appointment,
} from '../../services/appointmentService';
import { STATUS_COLOR, STATUS_LABEL, SERVICE_PRICES } from '../../constants';

export default function BarberDashboard({ navigation }: any) {
  const { user, setUser } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'all'>('today');
  const todayStr = new Date().toISOString().split('T')[0];

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const date = viewMode === 'today' ? todayStr : undefined;
      let data = await getBarberAppointments(user.uid, date);
      if (viewMode === 'week') {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekEndStr = weekEnd.toISOString().split('T')[0];
        data = data.filter(a => a.date >= todayStr && a.date <= weekEndStr);
      }
      setAppointments(data);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [viewMode]));

  const todayAppts = appointments.filter(a => a.date === todayStr && a.status !== 'cancelled');
  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const totalToday = todayAppts.reduce((sum, a) => sum + (SERVICE_PRICES[a.service] ?? 0), 0);

  const confirm = async (appt: Appointment) => {
    await updateAppointment(appt.id!, { status: 'confirmed' });
    setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'confirmed' } : a));
  };

  const cancel = (appt: Appointment) => {
    Alert.alert('ביטול תור', `לבטל את התור של ${appt.customerName}?`, [
      { text: 'לא', style: 'cancel' },
      {
        text: 'בטל', style: 'destructive',
        onPress: async () => {
          await updateAppointment(appt.id!, { status: 'cancelled' });
          setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: 'cancelled' } : a));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() =>
          Alert.alert('יציאה', 'להתנתק?', [
            { text: 'ביטול', style: 'cancel' },
            { text: 'יציאה', style: 'destructive', onPress: async () => { await logout(); setUser(null); } },
          ])
        }>
          <Ionicons name="log-out-outline" size={24} color="#c9a84c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>לוח בקרה</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Appointments', { screen: 'AddAppointment' })}>
          <Ionicons name="add-circle" size={28} color="#c9a84c" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{todayAppts.length}</Text>
            <Text style={styles.statLabel}>תורים היום</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#f59e0b' }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>ממתינים</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#10b981' }]}>₪{totalToday}</Text>
            <Text style={styles.statLabel}>הכנסה צפויה</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {(['today', 'week', 'all'] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.tab, viewMode === mode && styles.tabActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.tabText, viewMode === mode && styles.tabTextActive]}>
                {mode === 'today' ? 'היום' : mode === 'week' ? 'שבוע' : 'הכל'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color="#c9a84c" style={{ margin: 30 }} />
        ) : appointments.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={50} color="#333" />
            <Text style={styles.emptyText}>אין תורים</Text>
          </View>
        ) : (
          appointments.map(appt => (
            <TouchableOpacity
              key={appt.id}
              style={styles.card}
              onPress={() => navigation.navigate('Appointments', {
                screen: 'EditAppointment',
                params: { appointment: appt },
              })}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.time}>{appt.time}</Text>
                <Text style={styles.date}>{appt.date}</Text>
              </View>
              <View style={styles.cardMiddle}>
                <Text style={styles.customerName}>{appt.customerName}</Text>
                <Text style={styles.service}>{appt.service}</Text>
              </View>
              <View style={styles.cardRight}>
                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[appt.status] + '22' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[appt.status] }]}>
                    {STATUS_LABEL[appt.status]}
                  </Text>
                </View>
                {appt.status === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => confirm(appt)} style={styles.confirmBtn}>
                      <Ionicons name="checkmark" size={18} color="#10b981" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => cancel(appt)} style={styles.cancelBtn}>
                      <Ionicons name="close" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
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
  statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#16213e', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#2a2a4a',
  },
  statNum: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  tabs: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#16213e', borderRadius: 10, padding: 4,
  },
  tab: { flex: 1, padding: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#c9a84c' },
  tabText: { color: '#888', fontSize: 14 },
  tabTextActive: { color: '#1a1a2e', fontWeight: 'bold' },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#555', marginTop: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#16213e', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a4a',
  },
  cardLeft: { width: 56, alignItems: 'center', marginRight: 12 },
  time: { fontSize: 16, fontWeight: 'bold', color: '#c9a84c' },
  date: { fontSize: 11, color: '#666', marginTop: 2 },
  cardMiddle: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  service: { fontSize: 13, color: '#888', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  confirmBtn: { backgroundColor: '#10b98122', borderRadius: 6, padding: 6 },
  cancelBtn: { backgroundColor: '#ef444422', borderRadius: 6, padding: 6 },
});
