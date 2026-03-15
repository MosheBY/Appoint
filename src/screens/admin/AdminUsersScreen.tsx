import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAllUsers,
  updateUserDetails,
  updateUserRole,
  updateUserStatus,
  UserProfile,
  UserRole,
} from '../../services/authService';

const ROLE_LABEL: Record<UserRole, string> = {
  customer: 'לקוח',
  barber: 'ספר',
  admin: 'מנהל',
};

type EditFormState = {
  uid: string;
  name: string;
  phone: string;
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);

  const load = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      setUsers(await getAllUsers());
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

  const startEdit = (user: UserProfile) => {
    setEditForm({
      uid: user.uid,
      name: user.name,
      phone: user.phone,
    });
  };

  const cancelEdit = () => {
    setEditForm(null);
  };

  const handleSaveDetails = async () => {
    if (!editForm) return;

    const trimmedName = editForm.name.trim();
    const trimmedPhone = editForm.phone.trim();

    if (!trimmedName || !trimmedPhone) {
      Alert.alert('שגיאה', 'שם וטלפון הם שדות חובה.');
      return;
    }

    try {
      setBusyUserId(editForm.uid);
      await updateUserDetails(editForm.uid, {
        name: trimmedName,
        phone: trimmedPhone,
      });
      setUsers((current) =>
        current.map((entry) =>
          entry.uid === editForm.uid
            ? { ...entry, name: trimmedName, phone: trimmedPhone }
            : entry
        )
      );
      setEditForm(null);
    } catch (error) {
      console.error('Failed to update user details', error);
      Alert.alert('שגיאה', 'לא הצלחנו לשמור את פרטי המשתמש.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleChangeRole = (user: UserProfile, role: UserRole) => {
    if (user.role === role) return;

    Alert.alert('שינוי תפקיד', `להפוך את ${user.name} ל-${ROLE_LABEL[role]}?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'עדכן',
        onPress: async () => {
          try {
            setBusyUserId(user.uid);
            await updateUserRole(user.uid, role);
            setUsers((current) =>
              current.map((entry) => (entry.uid === user.uid ? { ...entry, role } : entry))
            );
          } catch (error) {
            console.error('Failed to update user role', error);
            Alert.alert('שגיאה', 'לא הצלחנו לעדכן את התפקיד.');
          } finally {
            setBusyUserId(null);
          }
        },
      },
    ]);
  };

  const handleToggleStatus = (user: UserProfile) => {
    const nextIsActive = !user.isActive;
    Alert.alert(
      nextIsActive ? 'הפעלת משתמש' : 'השבתת משתמש',
      nextIsActive
        ? 'המשתמש יחזור להיות פעיל במערכת.'
        : 'המשתמש לא יוכל להתחבר עד שתפעיל אותו שוב.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: nextIsActive ? 'הפעל' : 'השבת',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusyUserId(user.uid);
              await updateUserStatus(user.uid, nextIsActive);
              setUsers((current) =>
                current.map((entry) =>
                  entry.uid === user.uid ? { ...entry, isActive: nextIsActive } : entry
                )
              );
            } catch (error) {
              console.error('Failed to update user status', error);
              Alert.alert('שגיאה', 'לא הצלחנו לעדכן את סטטוס המשתמש.');
            } finally {
              setBusyUserId(null);
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter((user) => {
    const haystack = `${user.name} ${user.email} ${user.phone}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ניהול משתמשים</Text>
        <TouchableOpacity onPress={() => load(false)}>
          <Ionicons name="refresh-outline" size={24} color="#c9a84c" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="חפש לפי שם, מייל או טלפון"
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c9a84c" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.uid}
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
          ListEmptyComponent={<Text style={styles.empty}>לא נמצאו משתמשים</Text>}
          renderItem={({ item }) => {
            const isBusy = busyUserId === item.uid;
            const isEditing = editForm?.uid === item.uid;

            return (
              <View style={[styles.card, !item.isActive && styles.cardDisabled]}>
                <View style={styles.cardTop}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{ROLE_LABEL[item.role]}</Text>
                  </View>
                  <Text style={[styles.statusText, !item.isActive && styles.statusTextDisabled]}>
                    {item.isActive ? 'פעיל' : 'מושבת'}
                  </Text>
                </View>

                {isEditing ? (
                  <View style={styles.editSection}>
                    <TextInput
                      style={styles.input}
                      value={editForm.name}
                      onChangeText={(value) =>
                        setEditForm((current) => (current ? { ...current, name: value } : current))
                      }
                      placeholder="שם"
                      placeholderTextColor="#666"
                      textAlign="right"
                    />
                    <View style={styles.readonlyField}>
                      <Text style={styles.readonlyLabel}>מייל</Text>
                      <Text style={styles.readonlyValue}>{item.email || 'ללא מייל'}</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={editForm.phone}
                      onChangeText={(value) =>
                        setEditForm((current) => (current ? { ...current, phone: value } : current))
                      }
                      placeholder="טלפון"
                      placeholderTextColor="#666"
                      keyboardType="phone-pad"
                      textAlign="right"
                    />

                    <View style={styles.editActions}>
                      <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit} disabled={isBusy}>
                        <Text style={styles.cancelButtonText}>ביטול</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.saveButton} onPress={handleSaveDetails} disabled={isBusy}>
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#1a1a2e" />
                        ) : (
                          <>
                            <Ionicons name="save-outline" size={18} color="#1a1a2e" />
                            <Text style={styles.saveButtonText}>שמור פרטים</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.meta}>{item.email || 'ללא מייל'}</Text>
                    {!!item.phone && <Text style={styles.meta}>{item.phone}</Text>}

                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => startEdit(item)}
                      disabled={isBusy}
                    >
                      <Ionicons name="create-outline" size={18} color="#60a5fa" />
                      <Text style={styles.editButtonText}>ערוך שם וטלפון</Text>
                    </TouchableOpacity>
                  </>
                )}

                <View style={styles.roleRow}>
                  {(['customer', 'barber', 'admin'] as UserRole[]).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.roleButton, item.role === role && styles.roleButtonActive]}
                      onPress={() => handleChangeRole(item, role)}
                      disabled={isBusy || isEditing}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          item.role === role && styles.roleButtonTextActive,
                        ]}
                      >
                        {ROLE_LABEL[role]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.statusButton, item.isActive && styles.statusButtonDanger]}
                  onPress={() => handleToggleStatus(item)}
                  disabled={isBusy || isEditing}
                >
                  {isBusy && !isEditing ? (
                    <ActivityIndicator size="small" color={item.isActive ? '#ef4444' : '#1a1a2e'} />
                  ) : (
                    <>
                      <Ionicons
                        name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={18}
                        color={item.isActive ? '#ef4444' : '#1a1a2e'}
                      />
                      <Text
                        style={[
                          styles.statusButtonText,
                          !item.isActive && styles.statusButtonTextActive,
                        ]}
                      >
                        {item.isActive ? 'השבת משתמש' : 'הפעל משתמש'}
                      </Text>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    margin: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: { flex: 1, color: '#fff', padding: 10, fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 14 },
  empty: { color: '#555', textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  cardDisabled: { opacity: 0.72 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleBadge: {
    backgroundColor: '#c9a84c22',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: { color: '#c9a84c', fontSize: 12, fontWeight: 'bold' },
  statusText: { color: '#10b981', fontSize: 12, fontWeight: 'bold' },
  statusTextDisabled: { color: '#ef4444' },
  name: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 12 },
  meta: { color: '#888', fontSize: 13, marginTop: 4 },
  editButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editButtonText: { color: '#60a5fa', fontSize: 13, fontWeight: 'bold' },
  editSection: { marginTop: 12, gap: 10 },
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
  readonlyField: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  readonlyLabel: { color: '#888', fontSize: 12, marginBottom: 4, textAlign: 'right' },
  readonlyValue: { color: '#fff', fontSize: 14, textAlign: 'right' },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#aaa', fontSize: 14, fontWeight: 'bold' },
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
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#c9a84c',
    borderColor: '#c9a84c',
  },
  roleButtonText: { color: '#aaa', fontSize: 13, fontWeight: 'bold' },
  roleButtonTextActive: { color: '#1a1a2e' },
  statusButton: {
    marginTop: 14,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#c9a84c',
  },
  statusButtonDanger: {
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#ef444411',
  },
  statusButtonText: { color: '#1a1a2e', fontSize: 14, fontWeight: 'bold' },
  statusButtonTextActive: { color: '#1a1a2e' },
});
