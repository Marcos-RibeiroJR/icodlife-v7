// apps/mobile/src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// App screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import RecordsScreen from '../screens/records/RecordsScreen';
import HealthChatScreen from '../screens/chat/HealthChatScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import MenstrualScreen from '../screens/menstrual/MenstrualScreen';
import FamilyScreen from '../screens/family/FamilyScreen';

import { useAuthStore } from '../store/auth.store';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function MainTabs() {
  const { user } = useAuthStore();
  const isFemale = user?.gender === 'female' || user?.gender === 'other';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#002B5C',
          borderTopWidth: 0,
          paddingBottom: 5,
          height: 60,
        },
        tabBarActiveTintColor: '#00A896',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: { fontSize: 10, marginBottom: 2 },
      }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{ tabBarLabel: 'Início', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="Records" component={RecordsScreen}
        options={{ tabBarLabel: 'Exames', tabBarIcon: ({ focused }) => <TabIcon emoji="🧪" focused={focused} /> }} />
      <Tab.Screen name="Chat" component={HealthChatScreen}
        options={{ tabBarLabel: 'HealthBot', tabBarIcon: ({ focused }) => <TabIcon emoji="🤖" focused={focused} /> }} />
      {isFemale && (
        <Tab.Screen name="Menstrual" component={MenstrualScreen}
          options={{ tabBarLabel: 'Ciclo', tabBarIcon: ({ focused }) => <TabIcon emoji="🌸" focused={focused} /> }} />
      )}
      <Tab.Screen name="Family" component={FamilyScreen}
        options={{ tabBarLabel: 'Família', tabBarIcon: ({ focused }) => <TabIcon emoji="👨‍👩‍👧" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarLabel: 'Perfil', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
