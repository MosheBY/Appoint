import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getBarbers, logout, UserProfile } from '../../services/authService';
import BookingScreen from './BookingScreen';
import { ServiceType } from '../../services/appointmentService';

const SERVICES: { type: ServiceType; icon: string; price: number; duration: string }[] = [
  { type: 'תספורת', icon: 'cut', price: 60, duration: '30 דקות' },
  { type: 'זקן', icon: 'man', price: 40, duration: '20 דקות' },
  { type: 'תספורת + זקן', icon: 'star', price: 90, duration: '50 דקות' },
];

export default function HomeScreen() {
  const { user, setUser } = useAuth();
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [barber, setBarber] = useState<UserProfile | null>(null);
  const [loadingBarber, setLoadingBarber] = useState(true);

  useEffect(() => {
    getBarbers()
      .then((barbers) => setBarber(barbers[0] ?? null))
      .catch((error) => {
        console.error('getBarbers error:', error);
        setBarber(null);
      })
      .finally(() => setLoadingBarber(false));
  }, []);

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

  if (selectedService && barber) {
    return (
      <BookingScreen
        barberId={barber.uid}
        service={selectedService}
        onBack={() => setSelectedService(null)}
      />
    );
  }

  if (loadingBarber) {
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
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>שלום, {user?.name}</Text>
        <Text style={styles.subtitle}>בחר שירות לקביעת תור</Text>

        {!barber && <Text style={styles.emptyState}>לא נמצא ספר פעיל במערכת.</Text>}

        {SERVICES.map((service) => (
          <TouchableOpacity
            key={service.type}
            style={[styles.card, !barber && styles.cardDisabled]}
            onPress={() => setSelectedService(service.type)}
            disabled={!barber}
          >
            <View style={styles.cardIcon}>
              <Ionicons name={service.icon as any} size={28} color="#c9a84c" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{service.type}</Text>
              <Text style={styles.cardSub}>{service.duration}</Text>
            </View>
            <Text style={styles.cardPrice}>₪{service.price}</Text>
            <Ionicons name="chevron-back" size={20} color="#555" />
          </TouchableOpacity>
        ))}
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
  content: { padding: 20 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  emptyState: { color: '#ef4444', marginBottom: 16, textAlign: 'center' },
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
});
