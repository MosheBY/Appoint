import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { CALENDAR_THEME, todayString } from '../../constants';
import { formatDisplayDate } from '../../utils/dateFormat';
import {
  BookingSettings,
  getBookingSettings,
  updateBookingSettings,
} from '../../services/bookingSettingsService';

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.settingBlock}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, value && styles.toggleButtonActive]}
          onPress={() => onChange(true)}
        >
          <Text style={[styles.toggleText, value && styles.toggleTextActive]}>כן</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, !value && styles.toggleButtonActive]}
          onPress={() => onChange(false)}
        >
          <Text style={[styles.toggleText, !value && styles.toggleTextActive]}>לא</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminSystemSettingsScreen() {
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = todayString();

  const load = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const nextSettings = await getBookingSettings();
      setSettings(nextSettings);
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

  const updateLocal = (changes: Partial<BookingSettings>) => {
    setSettings((current) => (current ? { ...current, ...changes } : current));
  };

  const save = async () => {
    if (!settings) return;

    if (!Number.isFinite(settings.minAdvanceBookingHours) || settings.minAdvanceBookingHours < 0) {
      Alert.alert('שגיאה', 'מינימום שעות מראש חייב להיות 0 או יותר.');
      return;
    }

    if (!Number.isFinite(settings.reminderLeadTimeMinutes) || settings.reminderLeadTimeMinutes < 0) {
      Alert.alert('שגיאה', 'זמן התזכורת חייב להיות 0 או יותר.');
      return;
    }

    try {
      setSaving(true);
      await updateBookingSettings(settings);
      Alert.alert('נשמר', 'הגדרות המערכת עודכנו.');
    } catch (error) {
      console.error('Failed to update booking settings', error);
      Alert.alert('שגיאה', 'לא הצלחנו לשמור את הגדרות המערכת.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c9a84c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>הגדרות מערכת</Text>
      </View>

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
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>פתוח להזמנה עד</Text>
          <Text style={styles.description}>
            הלקוחות יוכלו לקבוע ולשנות תורים רק עד {formatDisplayDate(settings.bookingWindowEndDate)}.
          </Text>
          <Calendar
            minDate={today}
            current={settings.bookingWindowEndDate}
            onDayPress={(day: { dateString: string }) =>
              updateLocal({ bookingWindowEndDate: day.dateString })
            }
            markedDates={{
              [settings.bookingWindowEndDate]: { selected: true, selectedColor: '#c9a84c' },
            }}
            theme={CALENDAR_THEME}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>כללי הזמנה</Text>

          <ToggleRow
            label="מותר לקבוע להיום"
            value={settings.allowSameDayBooking}
            onChange={(next) => updateLocal({ allowSameDayBooking: next })}
          />

          <View style={styles.settingBlock}>
            <Text style={styles.settingLabel}>מינימום שעות מראש</Text>
            <TextInput
              style={styles.input}
              value={String(settings.minAdvanceBookingHours)}
              onChangeText={(value) =>
                updateLocal({ minAdvanceBookingHours: Number(value.replace(/[^0-9]/g, '') || 0) })
              }
              keyboardType="numeric"
              textAlign="right"
            />
          </View>

          <ToggleRow
            label="מותר ללקוח לבטל"
            value={settings.allowCustomerCancellation}
            onChange={(next) => updateLocal({ allowCustomerCancellation: next })}
          />

          <ToggleRow
            label="מותר ללקוח לשנות תור"
            value={settings.allowCustomerReschedule}
            onChange={(next) => updateLocal({ allowCustomerReschedule: next })}
          />

          <View style={styles.settingBlock}>
            <Text style={styles.settingLabel}>זמן תזכורת לפני תור בדקות</Text>
            <TextInput
              style={styles.input}
              value={String(settings.reminderLeadTimeMinutes)}
              onChangeText={(value) =>
                updateLocal({ reminderLeadTimeMinutes: Number(value.replace(/[^0-9]/g, '') || 0) })
              }
              keyboardType="numeric"
              textAlign="right"
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#1a1a2e" />
            ) : (
              <Text style={styles.saveButtonText}>שמור הגדרות</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#16213e',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  content: { padding: 14 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  description: { color: '#888', fontSize: 13, marginBottom: 12 },
  settingBlock: { marginTop: 6, marginBottom: 14 },
  settingLabel: { color: '#c9a84c', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  input: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  toggleButtonActive: {
    backgroundColor: '#c9a84c',
    borderColor: '#c9a84c',
  },
  toggleText: { color: '#ccc', fontSize: 14, fontWeight: 'bold' },
  toggleTextActive: { color: '#1a1a2e' },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: '#1a1a2e', fontSize: 15, fontWeight: 'bold' },
});
