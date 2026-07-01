// apps/mobile/App.tsx
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { setupBackgroundHandler, setupForegroundHandler } from './src/services/push.service';

// Registra handler de background (deve estar no nível raiz, fora do componente)
setupBackgroundHandler();

export default function App() {
  useEffect(() => {
    // Listener de mensagens em foreground + toque em notificações
    const cleanup = setupForegroundHandler();
    return cleanup;
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#002B5C" />
      <AppNavigator />
    </>
  );
}
