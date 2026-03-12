import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import BarberDashboard from '../screens/barber/BarberDashboard';
import ManageAppointments from '../screens/barber/ManageAppointments';
import EditAppointmentScreen from '../screens/barber/EditAppointmentScreen';
import AddAppointmentScreen from '../screens/barber/AddAppointmentScreen';
import CustomerHistoryScreen from '../screens/barber/CustomerHistoryScreen';
import AvailabilityScreen from '../screens/barber/AvailabilityScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AppointmentsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ManageAppointments" component={ManageAppointments} />
      <Stack.Screen name="EditAppointment" component={EditAppointmentScreen} />
      <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} />
      <Stack.Screen name="CustomerHistory" component={CustomerHistoryScreen} />
    </Stack.Navigator>
  );
}

export default function BarberTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#c9a84c',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { backgroundColor: '#1a1a2e', borderTopColor: '#333' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'grid-outline';
          if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Appointments') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Availability') iconName = focused ? 'time' : 'time-outline';
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={BarberDashboard} options={{ title: 'לוח בקרה' }} />
      <Tab.Screen name="Appointments" component={AppointmentsStack} options={{ title: 'תורים' }} />
      <Tab.Screen name="Availability" component={AvailabilityScreen} options={{ title: 'זמינות' }} />
    </Tab.Navigator>
  );
}
