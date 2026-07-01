// apps/web/src/hooks/usePushNotifications.ts
// Sprint 16 — Firebase Cloud Messaging (Web Push)
'use client';

import { useEffect, useRef, useState } from 'react';

const VAPID_KEY    = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const FIREBASE_CONFIG = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Registra o Service Worker e inicia o Firebase Messaging */
async function initFirebaseMessaging() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (!FIREBASE_CONFIG.projectId) {
    console.warn('[Push] Firebase config not set. Define NEXT_PUBLIC_FIREBASE_* env vars.');
    return null;
  }

  // Importação dinâmica do SDK Firebase (client-side only)
  const { initializeApp, getApps } = await import('firebase/app');
  const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

  const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
  const messaging = getMessaging(app);

  // Registra o SW e repassa a config para ele poder inicializar firebase compat
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  await navigator.serviceWorker.ready;
  registration.active?.postMessage({ type: 'FIREBASE_CONFIG', config: FIREBASE_CONFIG });

  return { messaging, getToken, onMessage };
}

export interface PushState {
  supported:   boolean;
  permission:  NotificationPermission;
  token:       string | null;
  requesting:  boolean;
  error:       string | null;
}

/**
 * Hook para habilitar push no browser web.
 *
 * Uso:
 *   const { permission, requestPermission } = usePushNotifications(authToken);
 */
export function usePushNotifications(authToken: string | null) {
  const [state, setState] = useState<PushState>({
    supported:  typeof window !== 'undefined' && 'Notification' in window,
    permission: typeof window !== 'undefined' ? Notification.permission : 'default',
    token:      null,
    requesting: false,
    error:      null,
  });
  const initialized = useRef(false);

  // Ao montar: se já tem permissão e token, registra automaticamente
  useEffect(() => {
    if (!authToken || initialized.current) return;
    if (state.permission === 'granted') {
      void requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  async function requestPermission() {
    if (!state.supported || state.requesting) return;
    setState(s => ({ ...s, requesting: true, error: null }));

    try {
      const permission = await Notification.requestPermission();
      setState(s => ({ ...s, permission }));

      if (permission !== 'granted') {
        setState(s => ({ ...s, requesting: false }));
        return;
      }

      const firebase = await initFirebaseMessaging();
      if (!firebase) throw new Error('Firebase not initialized');

      const token = await firebase.getToken(firebase.messaging, {
        vapidKey:            VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.ready,
      });

      if (!token) throw new Error('FCM token empty');

      // Salva token na API
      await fetch(`${API_BASE_URL}/api/v1/push/token`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body:    JSON.stringify({ token, platform: 'web', deviceId: getDeviceId() }),
      });

      // Listener de mensagens em foreground
      firebase.onMessage(firebase.messaging, (payload) => {
        const { title, body } = payload.notification ?? {};
        if (title && Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/icons/icon-192x192.png' });
        }
      });

      initialized.current = true;
      setState(s => ({ ...s, token, requesting: false }));
    } catch (err: any) {
      console.error('[Push]', err);
      setState(s => ({ ...s, error: err.message ?? 'Erro ao habilitar push', requesting: false }));
    }
  }

  async function unregister(token: string) {
    if (!authToken) return;
    await fetch(`${API_BASE_URL}/api/v1/push/token`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body:    JSON.stringify({ token }),
    });
    setState(s => ({ ...s, token: null }));
  }

  return { ...state, requestPermission, unregister };
}

/** Gera um ID estável de dispositivo via localStorage */
function getDeviceId(): string {
  try {
    const KEY = '__icl_device_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}
