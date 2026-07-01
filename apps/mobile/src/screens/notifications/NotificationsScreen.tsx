// apps/mobile/src/screens/notifications/NotificationsScreen.tsx
// Sprint 17 — Notificações do paciente
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api.client';

const TYPE_ICON: Record<string, string> = {
  appointment:        '📅',
  appointment_reminder:'⏰',
  exam_result:        '🧪',
  medication:         '💊',
  telemedicine_admit: '🎥',
  lab_result:         '📋',
  system:             '🔔',
};

export default function NotificationsScreen() {
  const { accessToken } = useAuthStore();
  const [notifs, setNotifs]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/notifications', accessToken);
      setNotifs(Array.isArray(data) ? data : data?.data ?? []);
    } catch {} finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`, {}, accessToken);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all', {}, accessToken);
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  const unread = notifs.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>🔔 Notificações</Text>
          <Text style={s.headerSub}>{unread} não lidas</Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity style={s.readAllBtn} onPress={markAllRead}>
            <Text style={s.readAllText}>Marcar todas lidas</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifs}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#002B5C" />}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🔕</Text>
              <Text style={s.emptyText}>Nenhuma notificação ainda.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.card, !item.isRead && s.cardUnread]}
            onPress={() => !item.isRead && markRead(item.id)}
          >
            <Text style={s.icon}>{TYPE_ICON[item.type] ?? '🔔'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, !item.isRead && s.cardTitleUnread]}>{item.title}</Text>
              {item.body && <Text style={s.cardBody} numberOfLines={2}>{item.body}</Text>}
              <Text style={s.cardTime}>
                {new Date(item.createdAt).toLocaleString('pt-BR', {
                  day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'
                })}
              </Text>
            </View>
            {!item.isRead && <View style={s.dot} />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F4F8FF' },
  header:          { backgroundColor: '#002B5C', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:           { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:       { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  readAllBtn:      { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  readAllText:     { color: '#fff', fontSize: 12, fontWeight: '600' },
  list:            { padding: 16, gap: 8 },
  card:            { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardUnread:      { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  icon:            { fontSize: 22, marginTop: 2 },
  cardTitle:       { fontSize: 13, fontWeight: '600', color: '#334155' },
  cardTitleUnread: { fontWeight: '800', color: '#1E293B' },
  cardBody:        { fontSize: 12, color: '#64748B', marginTop: 2 },
  cardTime:        { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  dot:             { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6', marginTop: 4 },
  empty:           { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyIcon:       { fontSize: 48 },
  emptyText:       { fontSize: 14, color: '#94A3B8' },
});
