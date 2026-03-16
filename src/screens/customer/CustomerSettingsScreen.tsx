import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  deleteCurrentCustomerAccount,
  logout,
  updatePushToken,
} from '../../services/authService';
import { registerForPushNotifications } from '../../services/notificationService';

export default function CustomerSettingsScreen() {
  const { user, setUser } = useAuth();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [refreshingNotifications, setRefreshingNotifications] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleRefreshNotifications = async () => {
    if (!user) return;

    try {
      setRefreshingNotifications(true);
      const token = await registerForPushNotifications();
      if (token) {
        await updatePushToken(user.uid, token);
        Alert.alert('נשמר', 'ההתראות הופעלו או עודכנו בהצלחה.');
      } else {
        Alert.alert('לא הופעל', 'לא הצלחנו לקבל הרשאת התראות או token למכשיר הזה.');
      }
    } catch (error) {
      console.error('Failed to refresh notifications', error);
      Alert.alert('שגיאה', 'לא הצלחנו לעדכן את ההגדרה של ההתראות.');
    } finally {
      setRefreshingNotifications(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('יציאה', 'להתנתק מהחשבון?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'יציאה',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoggingOut(true);
            await logout();
            setUser(null);
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'מחיקת חשבון',
      'החשבון יימחק יחד עם התורים שלך. אחרי המחיקה לא יהיה אפשר לשחזר את הנתונים.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק חשבון',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingAccount(true);
              await deleteCurrentCustomerAccount();
              setUser(null);
            } catch (error) {
              console.error('Failed to delete customer account', error);

              if (error instanceof Error && error.message === 'REQUIRES_RECENT_LOGIN') {
                Alert.alert('נדרשת התחברות מחדש', 'כדי למחוק חשבון צריך להתחבר מחדש ואז לנסות שוב.');
              } else if (
                error instanceof Error &&
                error.message === 'ONLY_CUSTOMER_SELF_DELETE_SUPPORTED'
              ) {
                Alert.alert('לא ניתן למחוק חשבון זה', 'האפשרות הזו זמינה כרגע רק ללקוחות.');
              } else {
                Alert.alert('שגיאה', 'לא הצלחנו למחוק את החשבון. נסה שוב.');
              }
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>הגדרות</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>חשבון</Text>
          <Text style={styles.infoLine}>שם: {user?.name ?? '-'}</Text>
          <Text style={styles.infoLine}>אימייל: {user?.email ?? '-'}</Text>
          <Text style={styles.infoLine}>טלפון: {user?.phone || 'לא הוגדר'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>התראות</Text>
          <Text style={styles.description}>
            אפשר לרענן הרשאת התראות ולוודא שהמכשיר הזה יקבל הודעות ועדכונים.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRefreshNotifications}
            disabled={refreshingNotifications}
          >
            {refreshingNotifications ? (
              <ActivityIndicator size="small" color="#1a1a2e" />
            ) : (
              <>
                <Ionicons name="notifications-outline" size={18} color="#1a1a2e" />
                <Text style={styles.primaryButtonText}>הפעל / רענן התראות</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>פעולות</Text>

          <TouchableOpacity
            style={[styles.secondaryButton, loggingOut && styles.secondaryButtonDisabled]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            <Ionicons name="log-out-outline" size={18} color="#c9a84c" />
            <Text style={styles.secondaryButtonText}>
              {loggingOut ? 'מתנתק...' : 'התנתק'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, deletingAccount && styles.deleteButtonDisabled]}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
            <Text style={styles.deleteButtonText}>
              {deletingAccount ? 'מוחק חשבון...' : 'מחק חשבון לקוח'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#16213e',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  content: { padding: 16 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  infoLine: { color: '#ddd', fontSize: 14, marginBottom: 8 },
  description: { color: '#888', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  primaryButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: '#1a1a2e', fontSize: 15, fontWeight: 'bold' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#c9a84c',
    borderRadius: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#c9a84c11',
    marginBottom: 12,
  },
  secondaryButtonDisabled: { opacity: 0.6 },
  secondaryButtonText: { color: '#c9a84c', fontSize: 15, fontWeight: 'bold' },
  deleteButton: {
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
});
