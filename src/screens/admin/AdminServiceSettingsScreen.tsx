import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getServiceSettings,
  ServiceSetting,
  updateServiceSetting,
} from '../../services/serviceSettingsService';

type EditMap = Record<
  string,
  {
    price: string;
    duration: string;
  }
>;

export default function AdminServiceSettingsScreen() {
  const [services, setServices] = useState<ServiceSetting[]>([]);
  const [edits, setEdits] = useState<EditMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingType, setSavingType] = useState<string | null>(null);

  const load = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const settings = await getServiceSettings();
      setServices(settings);
      setEdits(
        settings.reduce((accumulator, service) => {
          accumulator[service.type] = {
            price: String(service.price),
            duration: String(service.duration),
          };
          return accumulator;
        }, {} as EditMap)
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

  const handleSave = async (service: ServiceSetting) => {
    const edit = edits[service.type];
    if (!edit) return;

    const price = Number(edit.price);
    const duration = Number(edit.duration);

    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(duration) || duration <= 0) {
      Alert.alert('שגיאה', 'יש להזין מחיר וזמן תקינים וגדולים מאפס.');
      return;
    }

    try {
      setSavingType(service.type);
      await updateServiceSetting(service.type, { price, duration });
      setServices((current) =>
        current.map((entry) =>
          entry.type === service.type ? { ...entry, price, duration } : entry
        )
      );
      Alert.alert('נשמר', `עודכנו המחיר והזמן של ${service.type}.`);
    } catch (error) {
      console.error('Failed to update service setting', error);
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את השירות.');
    } finally {
      setSavingType(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>שירותים ומחירים</Text>
        <TouchableOpacity onPress={() => load(false)}>
          <Ionicons name="refresh-outline" size={24} color="#c9a84c" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c9a84c" />
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.type}
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
          renderItem={({ item }) => {
            const edit = edits[item.type];
            const isSaving = savingType === item.type;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={item.icon as any} size={20} color="#c9a84c" />
                  </View>
                  <Text style={styles.serviceName}>{item.type}</Text>
                </View>

                <View style={styles.row}>
                  <View style={styles.field}>
                    <Text style={styles.label}>מחיר</Text>
                    <TextInput
                      style={styles.input}
                      value={edit?.price ?? ''}
                      onChangeText={(value) =>
                        setEdits((current) => ({
                          ...current,
                          [item.type]: { ...current[item.type], price: value },
                        }))
                      }
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>זמן בדקות</Text>
                    <TextInput
                      style={styles.input}
                      value={edit?.duration ?? ''}
                      onChangeText={(value) =>
                        setEdits((current) => ({
                          ...current,
                          [item.type]: { ...current[item.type], duration: value },
                        }))
                      }
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => handleSave(item)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#1a1a2e" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#1a1a2e" />
                      <Text style={styles.saveButtonText}>שמור שינויי שירות</Text>
                    </>
                  )}
                </TouchableOpacity>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 14 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1 },
  label: { color: '#888', fontSize: 12, marginBottom: 6, textAlign: 'right' },
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
  saveButton: {
    marginTop: 14,
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonText: { color: '#1a1a2e', fontSize: 14, fontWeight: 'bold' },
});
