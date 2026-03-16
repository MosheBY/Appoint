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
  createServiceSetting,
  deleteServiceSetting,
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

const DEFAULT_NEW_ICON = 'cut';

export default function AdminServiceSettingsScreen() {
  const [services, setServices] = useState<ServiceSetting[]>([]);
  const [edits, setEdits] = useState<EditMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const settings = await getServiceSettings(true);
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

  const handleDelete = (service: ServiceSetting) => {
    Alert.alert(
      'מחיקת שירות',
      `למחוק את ${service.type}? הוא ייעלם מבחירה חדשה, אבל תורים ישנים יישארו.`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              setSavingType(service.type);
              await deleteServiceSetting(service.type);
              setServices((current) => current.filter((entry) => entry.type !== service.type));
              setEdits((current) => {
                const next = { ...current };
                delete next[service.type];
                return next;
              });
            } catch (error) {
              console.error('Failed to delete service setting', error);
              Alert.alert('שגיאה', 'לא הצלחנו למחוק את השירות.');
            } finally {
              setSavingType(null);
            }
          },
        },
      ]
    );
  };

  const handleCreate = async () => {
    const type = newServiceName.trim();
    const price = Number(newServicePrice);
    const duration = Number(newServiceDuration);

    if (!type || !Number.isFinite(price) || price <= 0 || !Number.isFinite(duration) || duration <= 0) {
      Alert.alert('שגיאה', 'יש להזין שם שירות, מחיר וזמן תקינים.');
      return;
    }

    if (services.some((service) => service.type === type)) {
      Alert.alert('שגיאה', 'כבר קיים שירות בשם הזה.');
      return;
    }

    const newService: ServiceSetting = {
      type,
      price,
      duration,
      icon: DEFAULT_NEW_ICON,
      isActive: true,
      isDeleted: false,
    };

    try {
      setCreating(true);
      await createServiceSetting(newService);
      setServices((current) => [...current, newService].sort((a, b) => a.type.localeCompare(b.type)));
      setEdits((current) => ({
        ...current,
        [newService.type]: {
          price: String(newService.price),
          duration: String(newService.duration),
        },
      }));
      setNewServiceName('');
      setNewServicePrice('');
      setNewServiceDuration('');
      Alert.alert('נשמר', `השירות ${newService.type} נוסף בהצלחה.`);
    } catch (error) {
      console.error('Failed to create service setting', error);
      Alert.alert('שגיאה', 'לא הצלחנו להוסיף את השירות.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>שירותים</Text>
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
          ListHeaderComponent={
            <View style={styles.addCard}>
              <Text style={styles.sectionTitle}>הוסף שירות חדש</Text>
              <TextInput
                style={styles.input}
                value={newServiceName}
                onChangeText={setNewServiceName}
                placeholder="שם השירות"
                placeholderTextColor="#666"
                textAlign="right"
              />

              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>מחיר</Text>
                  <TextInput
                    style={styles.input}
                    value={newServicePrice}
                    onChangeText={setNewServicePrice}
                    keyboardType="numeric"
                    textAlign="right"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>זמן בדקות</Text>
                  <TextInput
                    style={styles.input}
                    value={newServiceDuration}
                    onChangeText={setNewServiceDuration}
                    keyboardType="numeric"
                    textAlign="right"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.createButton} onPress={handleCreate} disabled={creating}>
                {creating ? (
                  <ActivityIndicator size="small" color="#1a1a2e" />
                ) : (
                  <>
                    <Ionicons name="add-outline" size={18} color="#1a1a2e" />
                    <Text style={styles.createButtonText}>הוסף שירות</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const edit = edits[item.type];
            const isSaving = savingType === item.type;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={item.icon as any} size={20} color="#c9a84c" />
                  </View>

                  <View style={styles.serviceHeaderText}>
                    <Text style={styles.serviceName}>{item.type}</Text>
                  </View>
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
                          [item.type]: {
                            ...current[item.type],
                            price: value,
                          },
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
                          [item.type]: {
                            ...current[item.type],
                            duration: value,
                          },
                        }))
                      }
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.deleteButton, isSaving && styles.deleteButtonDisabled]}
                    onPress={() => handleDelete(item)}
                    disabled={isSaving}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text style={styles.deleteButtonText}>מחק</Text>
                  </TouchableOpacity>

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
                        <Text style={styles.saveButtonText}>שמור שינויים</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
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
  addCard: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
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
  serviceHeaderText: { flex: 1 },
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
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  deleteButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#ef444411',
  },
  deleteButtonDisabled: { opacity: 0.6 },
  deleteButtonText: { color: '#ef4444', fontSize: 15, fontWeight: 'bold' },
  createButton: {
    marginTop: 14,
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  createButtonText: { color: '#1a1a2e', fontSize: 14, fontWeight: 'bold' },
  saveButton: {
    flex: 1,
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
