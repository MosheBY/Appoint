import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { getUserCounts, logout } from '../../services/authService';

type Counts = {
  total: number;
  active: number;
  customers: number;
  barbers: number;
  admins: number;
};

export default function AdminDashboard() {
  const { setUser } = useAuth();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      setCounts(await getUserCounts());
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

  const handleLogout = () => {
    Alert.alert('יציאה', 'להתנתק מחשבון המנהל?', [
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
        <Text style={styles.headerTitle}>ניהול מערכת</Text>
        <TouchableOpacity onPress={() => load(false)}>
          <Ionicons name="refresh-outline" size={24} color="#c9a84c" />
        </TouchableOpacity>
      </View>

      {loading || !counts ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c9a84c" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
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
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>לוח בקרה מנהל</Text>
            <Text style={styles.heroSubtitle}>מכאן אפשר לעקוב אחרי המשתמשים ולנהל הרשאות במערכת.</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{counts.total}</Text>
              <Text style={styles.cardLabel}>סה"כ משתמשים</Text>
            </View>
            <View style={styles.card}>
              <Text style={[styles.cardValue, styles.accent]}>{counts.active}</Text>
              <Text style={styles.cardLabel}>פעילים</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{counts.customers}</Text>
              <Text style={styles.cardLabel}>לקוחות</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{counts.barbers}</Text>
              <Text style={styles.cardLabel}>ספרים</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardValue}>{counts.admins}</Text>
              <Text style={styles.cardLabel}>מנהלים</Text>
            </View>
          </View>

          <View style={styles.notes}>
            <Text style={styles.notesTitle}>מומלץ להוסיף בהמשך</Text>
            <Text style={styles.note}>יומן פעולות מנהל</Text>
            <Text style={styles.note}>ניהול שירותים ומחירים</Text>
            <Text style={styles.note}>דוחות תורים יומיים ושבועיים</Text>
            <Text style={styles.note}>ניהול תלונות וחסימות</Text>
          </View>
        </ScrollView>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 14 },
  hero: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  heroSubtitle: { color: '#aaa', fontSize: 14, lineHeight: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '48%',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  cardValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  accent: { color: '#c9a84c' },
  cardLabel: { color: '#888', fontSize: 13, marginTop: 6 },
  notes: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    marginBottom: 20,
  },
  notesTitle: { color: '#c9a84c', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  note: { color: '#ddd', fontSize: 14, marginBottom: 8 },
});
