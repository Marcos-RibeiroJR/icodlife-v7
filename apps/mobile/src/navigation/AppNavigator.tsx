// apps/mobile/src/navigation/AppNavigator.tsx
// Sprint 17 — Navigation atualizado: Início | Consultas | Medicamentos | Histórico | Perfil
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

// Auth
import LoginScreen    from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Bottom Tabs
import DashboardScreen    from '../screens/dashboard/DashboardScreen';
import AppointmentsScreen from '../screens/appointments/AppointmentsScreen';
import MedicationsScreen  from '../screens/medications/MedicationsScreen';
import HistoryScreen      from '../screens/history/HistoryScreen';
import ProfileScreen      from '../screens/profile/ProfileScreen';

// Stack-only screens (acessadas via navigation.navigate)
import RecordsScreen          from '../screens/records/RecordsScreen';
import HealthChatScreen       from '../screens/chat/HealthChatScreen';
import MenstrualScreen        from '../screens/menstrual/MenstrualScreen';
import FamilyScreen           from '../screens/family/FamilyScreen';
import VaccinesScreen         from '../screens/vaccines/VaccinesScreen';
import VidaScreen             from '../screens/vida/VidaScreen';
import NotificationsScreen    from '../screens/notifications/NotificationsScreen';
import BloodPressureScreen    from '../screens/vitals/BloodPressureScreen';
import GlucoseScreen          from '../screens/vitals/GlucoseScreen';
import ProntuarioScreen       from '../screens/prontuario/ProntuarioScreen';

import { useAuthStore } from '../store/auth.store';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:            false,
        tabBarStyle:            { backgroundColor: '#002B5C', borderTopWidth: 0, paddingBottom: 5, height: 62 },
        tabBarActiveTintColor:  '#00A896',
        tabBarInactiveTintColor:'rgba(255,255,255,0.45)',
        tabBarLabelStyle:       { fontSize: 10, marginBottom: 3, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Início',      tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tab.Screen name="Appointments"
        component={AppointmentsScreen}
        options={{ tabBarLabel: 'Consultas',   tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} /> }}
      />
      <Tab.Screen name="Medications"
        component={MedicationsScreen}
        options={{ tabBarLabel: 'Medicamentos',tabBarIcon: ({ focused }) => <TabIcon emoji="💊" focused={focused} /> }}
      />
      <Tab.Screen name="History"
        component={HistoryScreen}
        options={{ tabBarLabel: 'Histórico',   tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }}
      />
      <Tab.Screen name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Perfil',      tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main"           component={MainTabs} />
      {/* Stack screens acessadas pelo Dashboard e demais */}
      <Stack.Screen name="Records"        component={RecordsScreen}       options={{ presentation: 'card' }} />
      <Stack.Screen name="Chat"           component={HealthChatScreen}    options={{ presentation: 'card' }} />
      <Stack.Screen name="Notifications"  component={NotificationsScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="Vaccines"       component={VaccinesScreen}      options={{ presentation: 'card' }} />
      <Stack.Screen name="Menstrual"      component={MenstrualScreen}     options={{ presentation: 'card' }} />
      <Stack.Screen name="Family"         component={FamilyScreen}        options={{ presentation: 'card' }} />
      <Stack.Screen name="Vida"           component={VidaScreen}          options={{ presentation: 'card' }} />
      {/* Sprint 18 — Dados vitais */}
      <Stack.Screen name="BloodPressure"  component={BloodPressureScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="Glucose"        component={GlucoseScreen}       options={{ presentation: 'card' }} />
      {/* Sprint 19 — Prontuário Digital */}
      <Stack.Screen name="Prontuario"     component={ProntuarioScreen}    options={{ presentation: 'card' }} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login"    component={LoginScreen}    />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <Stack.Screen name="App" component={AppStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
