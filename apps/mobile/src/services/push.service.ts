// apps/mobile/src/services/push.service.ts
// Sprint 16 — Push Notifications (Expo + FCM)
//
// Dependências: expo-notifications, expo-device, @react-native-firebase/app, @react-native-firebase/messaging
// Instalar: pnpm --filter @icodlife/mobile add expo-notifications expo-device @react-native-firebase/app @react-native-firebase/messaging

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { apiClient } from './api.client';

// ── Configuração de apresentação das notificações ─────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ── Solicita permissão e registra token FCM ───────────────────────────────────
export async function registerForPushNotifications(authToken: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[Push] Push notifications only work on physical devices');
    return null;
  }

  // Permissão via expo-notifications (iOS + Android 13+)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Permission not granted');
    return null;
  }

  // Canal padrão (Android)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:            'IcodLife',
      importance:      Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:      '#DC2626',
    });
  }

  // Token FCM via Firebase Messaging
  const fcmToken = await messaging().getToken();
  if (!fcmToken) return null;

  // Registra na API
  await apiClient.post(
    '/api/v1/push/token',
    { token: fcmToken, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
    { headers: { Authorization: `Bearer ${authToken}` } },
  );

  console.log('[Push] FCM token registered');
  return fcmToken;
}

// ── Listeners de mensagem em foreground ──────────────────────────────────────
export function setupForegroundHandler() {
  // FCM foreground
  const unsubFCM = messaging().onMessage(async (remoteMessage) => {
    const title = remoteMessage.notification?.title ?? 'IcodLife';
    const body  = remoteMessage.notification?.body  ?? '';
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: remoteMessage.data ?? {} },
      trigger: null, // imediato
    });
  });

  // Notificação tocada pelo usuário
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, string>;
    handleNotificationTap(data);
  });

  return () => {
    unsubFCM();
    sub.remove();
  };
}

// ── Background / Quit handler (registrar no ponto de entrada do app) ─────────
export function setupBackgroundHandler() {
  messaging().setBackgroundMessageHandler(async (_remoteMessage) => {
    // O sistema já exibe automaticamente via `onBackgroundMessage`
  });
}

// ── Deep link ao tocar na notificação ────────────────────────────────────────
function handleNotificationTap(data: Record<string, string>) {
  const { type } = data;
  // Navegação: adapte ao seu NavigationService / router
  console.log('[Push] Notification tapped', type, data);
  // Exemplos:
  // if (type === 'appointment_created') NavigationService.navigate('Appointments');
  // if (type === 'medication_reminder') NavigationService.navigate('Medications');
  // if (type === 'telemedicine_admit')  NavigationService.navigate('Telemedicine', { roomToken: data.roomToken });
}

// ── Remove token ao fazer logout ─────────────────────────────────────────────
export async function unregisterPushToken(authToken: string) {
  try {
    const token = await messaging().getToken();
    if (!token) return;
    await apiClient.delete('/api/v1/push/token', {
      data:    { token },
      headers: { Authorization: `Bearer ${authToken}` },
    });
    await messaging().deleteToken();
    console.log('[Push] Token unregistered');
  } catch (err) {
    console.warn('[Push] Unregister error', err);
  }
}
