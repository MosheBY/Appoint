import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { formatDisplayDate } from '../../utils/dateFormat';
import {
  Appointment,
  blockCustomer,
  getAppointmentsByCustomer,
  isCustomerBlocked,
  unblockCustomer,
} from '../../services/appointmentService';
import { STATUS_COLOR, STATUS_LABEL } from '../../constants';
import { DEFAULT_SERVICE_SETTINGS } from '../../services/serviceSettingsService';

export default function CustomerHistoryScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { customerId, customerName } = route.params;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [updatingBlock, setUpdatingBlock] = useState(false);

  const load = async (showLoader = false) => {
    if (!user) return;
    if (showLoader) {
      setLoading(true);
    }

    const [appointmentsData, isBlocked] = await Promise.all([
      getAppointmentsByCustomer(user.uid, customerId),
      isCustomerBlocked(user.uid, customerId),
    ]);

    setAppointments(appointmentsData);
    setBlocked(isBlocked);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [customerId, user?.uid])
  );

  const handleToggleBlock = () => {
    const nextBlocked = !blocked;

    Alert.alert(
      nextBlocked ? 'חסימת לקוח' : 'ביטול חסימה',
      nextBlocked
        ? 'הלקוח לא יוכל לקבוע אצלך תורים חדשים עד שתבטל את החסימה.'
        : 'הלקוח יוכל שוב לקבוע אצלך תורים חדשים.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: nextBlocked ? 'חסום לקוח' : 'בטל חסימה',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdatingBlock(true);
              if (nextBlocked) {
                await blockCustomer(user!.uid, customerId);
              } else {
                await unblockCustomer(user!.uid, customerId);
              }
              setBlocked(nextBlocked);
            } catch (error) {
              console.error('Failed to toggle customer block', error);
              Alert.alert('שגיאה', 'לא הצלחנו לעדכן את מצב החסימה. נסה שוב.');
            } finally {
              setUpdatingBlock(false);
            }
          },
        },
      ]
    );
  };

  const completedCount = appointments.filter((appointment) => appointment.status === 'confirmed').length;
  const totalSpent = appointments
    .filter((appointment) => appointment.status === 'confirmed')
    .reduce(
      (sum, appointment) => sum + (appointment.price ?? DEFAULT_SERVICE_SETTINGS[appointment.service]?.price ?? 0),
      0
    );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#c9a84c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{customerName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={appointments}
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
        ListHeaderComponent={
          <>
            <View style={[styles.blockPanel, blocked && styles.blockPanelActive]}>
              <View style={styles.blockPanelHeader}>
                <View style={styles.blockPanelTitleRow}>
                  <Ionicons
                    name={blocked ? 'ban-outline' : 'shield-checkmark-outline'}
                    size={18}
                    color={blocked ? '#ef4444' : '#c9a84c'}
                  />
                  <Text style={[styles.blockPanelTitle, blocked && styles.blockPanelTitleActive]}>
                    {blocked ? 'הלקוח חסום כרגע' : 'אפשרויות לקוח'}
                  </Text>
                </View>
                <Text style={[styles.blockPanelStatus, blocked && styles.blockPanelStatusActive]}>
                  {blocked ? 'חסום' : 'פעיל'}
                </Text>
              </View>

              <Text style={[styles.blockPanelText, blocked && styles.blockPanelTextActive]}>
                {blocked
                  ? 'הלקוח לא יכול לקבוע אצלך תורים חדשים עד שתבטל את החסימה.'
                  : 'אם תחסום את הלקוח, הוא לא יוכל לקבוע אצלך תורים חדשים.'}
              </Text>

              <TouchableOpacity
                onPress={handleToggleBlock}
                disabled={updatingBlock}
                style={[styles.blockButton, blocked ? styles.unblockButton : styles.blockButtonDanger]}
              >
                {updatingBlock ? (
                  <ActivityIndicator size="small" color={blocked ? '#1a1a2e' : '#ef4444'} />
                ) : (
                  <>
                    <Ionicons
                      name={blocked ? 'lock-open-outline' : 'ban-outline'}
                      size={18}
                      color={blocked ? '#1a1a2e' : '#ef4444'}
                    />
                    <Text style={[styles.blockButtonText, blocked && styles.unblockButtonText]}>
                      {blocked ? 'בטל חסימה ללקוח' : 'חסום לקוח'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.summary}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNum}>{appointments.length}</Text>
                <Text style={styles.summaryLabel}>סה"כ תורים</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNum, styles.summaryNumSuccess]}>{completedCount}</Text>
                <Text style={styles.summaryLabel}>הושלמו</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryNum, styles.summaryNumAccent]}>₪{totalSpent}</Text>
                <Text style={styles.summaryLabel}>סה"כ שילם</Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? <ActivityIndicator color="#c9a84c" style={styles.loader} /> : <Text style={styles.empty}>אין היסטוריה</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.time}>{item.time}</Text>
              <Text style={styles.date}>{formatDisplayDate(item.date)}</Text>
            </View>
            <View style={styles.cardRight}>
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
  headerSpacer: { width: 24 },
  listContent: { padding: 14, paddingBottom: 24 },
  blockPanel: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    backgroundColor: '#16213e',
  },
  blockPanelActive: {
    borderColor: '#ef4444',
    backgroundColor: '#ef444411',
  },
  blockPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockPanelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockPanelTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  blockPanelTitleActive: { color: '#ef4444' },
  blockPanelStatus: { color: '#c9a84c', fontSize: 12, fontWeight: 'bold' },
  blockPanelStatusActive: { color: '#ef4444' },
  blockPanelText: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 10,
    marginBottom: 12,
    textAlign: 'right',
  },
  blockPanelTextActive: { color: '#f1b4b4' },
  blockButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  blockButtonDanger: {
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#ef444411',
  },
  unblockButton: { backgroundColor: '#c9a84c' },
  blockButtonText: { color: '#ef4444', fontSize: 14, fontWeight: 'bold' },
  unblockButtonText: { color: '#1a1a2e' },
  summary: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  summaryNum: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  summaryNumSuccess: { color: '#10b981' },
  summaryNumAccent: { color: '#c9a84c' },
  summaryLabel: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  loader: { marginTop: 40 },
  empty: { color: '#555', textAlign: 'center', marginTop: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  time: { fontSize: 16, fontWeight: 'bold', color: '#c9a84c' },
  date: { fontSize: 12, color: '#666', marginTop: 2 },
  service: { fontSize: 14, color: '#fff' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
});
