import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminAppointmentsScreen from '../screens/admin/AdminAppointmentsScreen';
import AdminBroadcastScreen from '../screens/admin/AdminBroadcastScreen';
import AdminServiceSettingsScreen from '../screens/admin/AdminServiceSettingsScreen';
import AdminSystemSettingsScreen from '../screens/admin/AdminSystemSettingsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';

const Tab = createBottomTabNavigator();

export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#c9a84c',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { backgroundColor: '#1a1a2e', borderTopColor: '#333' },
        tabBarIcon: ({ focused, color, size }) => {
          const iconName =
            route.name === 'AdminDashboard'
              ? focused
                ? 'speedometer'
                : 'speedometer-outline'
              : route.name === 'AdminAppointments'
                ? focused
                  ? 'calendar'
                  : 'calendar-outline'
                : route.name === 'AdminBroadcast'
                  ? focused
                    ? 'megaphone'
                    : 'megaphone-outline'
                  : route.name === 'AdminServices'
                    ? focused
                      ? 'pricetags'
                      : 'pricetags-outline'
                    : route.name === 'AdminSettings'
                      ? focused
                        ? 'settings'
                        : 'settings-outline'
                      : focused
                        ? 'people'
                        : 'people-outline';

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="AdminDashboard" component={AdminDashboard} options={{ title: 'דשבורד' }} />
      <Tab.Screen name="AdminAppointments" component={AdminAppointmentsScreen} options={{ title: 'תורים' }} />
      <Tab.Screen name="AdminBroadcast" component={AdminBroadcastScreen} options={{ title: 'הודעות' }} />
      <Tab.Screen name="AdminServices" component={AdminServiceSettingsScreen} options={{ title: 'שירותים' }} />
      <Tab.Screen name="AdminSettings" component={AdminSystemSettingsScreen} options={{ title: 'הגדרות' }} />
      <Tab.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'משתמשים' }} />
    </Tab.Navigator>
  );
}
