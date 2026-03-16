import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { formatDisplayDate, getDateKeyWithOffset } from '../../utils/dateFormat';
import { logout } from '../../services/authService';
import {
  Appointment,
  getBarberAppointments,
  updateAppointment,
} from '../../services/appointmentService';
import { STATUS_COLOR, STATUS_LABEL, todayString } from '../../constants';
import { DEFAULT_SERVICE_SETTINGS } from '../../services/serviceSettingsService';

export default function BarberDashboard({ navigation }: any) {
  const { user, setUser } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'all'>('today');
  const todayStr = todayString();

  const load = async (showLoader = false) => {
    if (!user) return;
    if (showLoader) {
      setLoading(true);
    }

    try {
      const date = viewMode === 'today' ? todayStr : undefined;
      let data = await getBarberAppointments(user.uid, date);

      if (viewMode === 'week') {
        const weekEndStr = getDateKeyWithOffset(7);
        data = data.filter((appointment) => appointment.date >= todayStr && appointment.date <= weekEndStr);
      }

      setAppointments(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [viewMode, user?.uid])
  );

  const todayAppointments = appointments.filter(
    (appointment) => appointment.date === todayStr && appointment.status !== 'cancelled'
  );
  const activeCount = appointments.filter((appointment) => appointment.status !== 'cancelled').length;
  const totalToday = todayAppointments.reduce(
    (sum, appointment) =>
      sum + (appointment.price ?? DEFAULT_SERVICE_SETTINGS[appointment.service]?.price ?? 0),
    0
  );

  const cancel = (appointment: Appointment) => {
    Alert.alert('ביטול תור', `לבטל את התור של ${appointment.customerName}?`, [
      { text: 'לא', style: 'cancel' },
      {
        text: 'בטל',
        style: 'destructive',
        onPress: async () => {
          await updateAppointment(appointment.id!, { status: 'cancelled' });
          setAppointments((current) =>
            current.map((entry) =>
              entry.id === appointment.id ? { ...entry, status: 'cancelled' } : entry
            )
          );
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('יציאה', 'להתנתק?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'יציאה',
        style: 'destructive',
        onPress: async () => {
          await logout();
          setUser(null);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#c9a84c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>לוח בקרה</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Appointments', { screen: 'AddAppointment' })}>
          <Ionicons name="add-circle" size={28} color="#c9a84c" />
        </TouchableOpacity>
      </View>

      <ScrollView
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
      >
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>שלום, {user?.name}</Text>
          <Text style={styles.welcomeSubtitle}>כאן אפשר לנהל את התורים והזמינות שלך.</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{todayAppointments.length}</Text>
            <Text style={styles.statLabel}>תורים היום</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, styles.activeAccent]}>{activeCount}</Text>
            <Text style={styles.statLabel}>תורים פעילים</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, styles.moneyAccent]}>₪{totalToday}</Text>
            <Text style={styles.statLabel}>הכנסה צפויה</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {(['today', 'week', 'all'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.tab, viewMode === mode && styles.tabActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.tabText, viewMode === mode && styles.tabTextActive]}>
                {mode === 'today' ? 'היום' : mode === 'week' ? 'שבוע' : 'הכול'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color="#c9a84c" style={styles.loader} />
        ) : appointments.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={50} color="#333" />
            <Text style={styles.emptyText}>אין תורים</Text>
          </View>
        ) : (
          appointments.map((appointment) => (
            <TouchableOpacity
              key={appointment.id}
              style={styles.card}
              onPress={() =>
                navigation.navigate('Appointments', {
                  screen: 'EditAppointment',
                  params: { appointment },
                })
              }
            >
              <View style={styles.cardLeft}>
                <Text style={styles.time}>{appointment.time}</Text>
                <Text style={styles.date}>{formatDisplayDate(appointment.date)}</Text>
              </View>

              <View style={styles.cardMiddle}>
                <Text style={styles.customerName}>{appointment.customerName}</Text>
                {!!appointment.customerPhone && <Text style={styles.phone}>{appointment.customerPhone}</Text>}
                <Text style={styles.service}>{appointment.service}</Text>
              </View>

              <View style={styles.cardRight}>
                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[appointment.status] + '22' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[appointment.status] }]}>
                    {STATUS_LABEL[appointment.status]}
                  </Text>
                </View>

                {appointment.status !== 'cancelled' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => cancel(appointment)} style={styles.cancelBtn}>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#16213e',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  welcomeCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 2,
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  welcomeTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  welcomeSubtitle: { fontSize: 14, color: '#888' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  statNum: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  activeAccent: { color: '#10b981' },
  moneyAccent: { color: '#10b981' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 4,
  },
  tab: { flex: 1, padding: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#c9a84c' },
  tabText: { color: '#888', fontSize: 14 },
  tabTextActive: { color: '#1a1a2e', fontWeight: 'bold' },
  loader: { margin: 30 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#555', marginTop: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  cardLeft: { width: 56, alignItems: 'center', marginRight: 12 },
  time: { fontSize: 16, fontWeight: 'bold', color: '#c9a84c' },
  date: { fontSize: 11, color: '#666', marginTop: 2 },
  cardMiddle: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  phone: { fontSize: 12, color: '#c9a84c', marginTop: 2 },
  service: { fontSize: 13, color: '#888', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  cancelBtn: { backgroundColor: '#ef444422', borderRadius: 6, padding: 6 },
});
