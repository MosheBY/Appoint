import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/customer/HomeScreen';
import MyAppointmentsScreen from '../screens/customer/MyAppointmentsScreen';

const Tab = createBottomTabNavigator();

export default function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#c9a84c',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { backgroundColor: '#1a1a2e', borderTopColor: '#333' },
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = route.name === 'Home'
            ? (focused ? 'cut' : 'cut-outline')
            : (focused ? 'calendar' : 'calendar-outline');
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'קביעת תור' }} />
      <Tab.Screen name="MyAppointments" component={MyAppointmentsScreen} options={{ title: 'התורים שלי' }} />
    </Tab.Navigator>
  );
}
