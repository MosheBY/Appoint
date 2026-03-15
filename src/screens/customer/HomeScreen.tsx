import React, { useCallback, useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import {
  deleteCurrentCustomerAccount,
  getBarbers,
  logout,
  UserProfile,
} from '../../services/authService';
import BookingScreen from './BookingScreen';
import {
  getBarberAvailability,
  isCustomerBlocked,
  ServiceType,
} from '../../services/appointmentService';
import { getServiceSettings, ServiceSetting } from '../../services/serviceSettingsService';

export default function HomeScreen() {
  const { user, setUser } = useAuth();
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [barbers, setBarbers] = useState<UserProfile[]>([]);
  const [services, setServices] = useState<ServiceSetting[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [loadingBarbers, setLoadingBarbers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const load = async (showLoader = false) => {
    if (showLoader) {
      setLoadingBarbers(true);
    }

    try {
      const [barberData, serviceSettings] = await Promise.all([getBarbers(), getServiceSettings()]);
      const availabilityEntries = await Promise.all(
        barberData.map(async (barber) => ({
          barber,
          availability: await getBarberAvailability(barber.uid),
          blocked: user ? await isCustomerBlocked(barber.uid, user.uid) : false,
        }))
      );

      const availableBarbers = availabilityEntries
        .filter(({ availability, blocked }) => {
          if (blocked) return false;
          if (!availability?.schedule) return false;
          return Object.values(availability.schedule).some((day) => day?.isOpen);
        })
        .map(({ barber }) => barber);

      setBarbers(availableBarbers);
      setServices(serviceSettings);
      setSelectedBarberId((current) => {
        if (current && availableBarbers.some((barber) => barber.uid === current)) {
          return current;
        }
        return availableBarbers[0]?.uid ?? null;
      });
    } catch (error) {
      console.error('Failed to load customer home data', error);
      setBarbers([]);
      setServices([]);
      setSelectedBarberId(null);
    } finally {
      setLoadingBarbers(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(true);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [user])
  );

  const selectedBarber = barbers.find((barber) => barber.uid === selectedBarberId) ?? null;

  const handleLogout = () => {
    Alert.alert('יציאה', 'האם אתה בטוח שברצונך להתנתק?', [
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
                Alert.alert('נדרשת התחברות מחדש', 'למחיקת חשבון צריך להתחבר מחדש ואז לנסות שוב.');
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

  if (selectedService && selectedBarber) {
    return (
      <BookingScreen
        barberId={selectedBarber.uid}
        service={selectedService}
        onBack={() => setSelectedService(null)}
      />
    );
  }

  if (loadingBarbers) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c9a84c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#c9a84c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>קביעת תור</Text>
        <View style={styles.headerSpacer} />
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
        <Text style={styles.greeting}>שלום, {user?.name}</Text>
        <Text style={styles.subtitle}>בחר ספר ואז שירות לקביעת תור</Text>

        <Text style={styles.sectionTitle}>בחר ספר</Text>
        {barbers.length === 0 ? (
          <Text style={styles.emptyState}>לא נמצא ספר פעיל במערכת.</Text>
        ) : (
          <View style={styles.barberList}>
            {barbers.map((barber) => {
              const isSelected = barber.uid === selectedBarberId;
              return (
                <TouchableOpacity
                  key={barber.uid}
                  style={[styles.barberCard, isSelected && styles.barberCardSelected]}
                  onPress={() => setSelectedBarberId(barber.uid)}
                >
                  <View style={styles.barberAvatar}>
                    <Ionicons name="person" size={20} color="#c9a84c" />
                  </View>
                  <View style={styles.barberInfo}>
                    <Text style={styles.barberName}>{barber.name}</Text>
                    {!!barber.phone && <Text style={styles.barberMeta}>{barber.phone}</Text>}
                  </View>
                  <Text style={styles.barberStatus}>זמין</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color="#c9a84c" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>בחר שירות</Text>
        {services.map((service) => (
          <TouchableOpacity
            key={service.type}
            style={[styles.card, !selectedBarber && styles.cardDisabled]}
            onPress={() => setSelectedService(service.type)}
            disabled={!selectedBarber}
          >
            <View style={styles.cardIcon}>
              <Ionicons name={service.icon as any} size={28} color="#c9a84c" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{service.type}</Text>
              <Text style={styles.cardSub}>{service.duration} דקות</Text>
            </View>
            <Text style={styles.cardPrice}>₪{service.price}</Text>
            <Ionicons name="chevron-back" size={20} color="#555" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.deleteAccountButton, deletingAccount && styles.deleteAccountButtonDisabled]}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
          <Text style={styles.deleteAccountText}>
            {deletingAccount ? 'מוחק חשבון...' : 'מחק חשבון לקוח'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
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
  headerSpacer: { width: 24 },
  content: { padding: 20 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#c9a84c', marginBottom: 12 },
  emptyState: { color: '#ef4444', marginBottom: 16, textAlign: 'center' },
  barberList: { marginBottom: 24 },
  barberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  barberCardSelected: { borderColor: '#c9a84c', backgroundColor: '#c9a84c22' },
  barberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1a1a3e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  barberInfo: { flex: 1 },
  barberName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  barberMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  barberStatus: { color: '#10b981', fontSize: 12, marginRight: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  cardDisabled: { opacity: 0.45 },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a1a3e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  cardSub: { fontSize: 13, color: '#888', marginTop: 2 },
  cardPrice: { fontSize: 16, fontWeight: 'bold', color: '#c9a84c', marginRight: 8 },
  deleteAccountButton: {
    marginTop: 12,
    marginBottom: 32,
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
  deleteAccountButtonDisabled: { opacity: 0.6 },
  deleteAccountText: { color: '#ef4444', fontSize: 15, fontWeight: 'bold' },
});
