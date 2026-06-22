// apps/mobile/App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#002B5C" />
      <AppNavigator />
    </>
  );
}
