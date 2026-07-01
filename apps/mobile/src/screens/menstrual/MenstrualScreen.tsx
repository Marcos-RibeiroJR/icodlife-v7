// apps/mobile/src/screens/menstrual/MenstrualScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, Alert, RefreshControl } from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api.client';

export default function MenstrualScreen() {
  const { accessToken } = useAuthStore();
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        apiClient.get('/menstrual', accessToken),
        apiClient.get('/menstrual/stats', accessToken).catch(() => null),
      ]);
      setCycles(Array.isArray(list) ? list : list?.data ?? []);
      setStats(s);
    } catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>🌸 Ciclo Menstrual</Text>
      </View>

      {stats && (
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statVal}>{stats.avgCycleLength ?? '—'}</Text>
            <Text style={s.statLabel}>Ciclo médio (dias)</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statVal}>{stats.avgPeriodLength ?? '—'}</Text>
            <Text style={s.statLabel}>Duração média</Text>
          </View>
          {stats.nextPredictedDate && (
            <View style={s.statCard}>
              <Text style={s.statVal}>{new Date(stats.nextPredictedDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</Text>
              <Text style={s.statLabel}>Próximo ciclo</Text>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={cycles}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={s.list}
        ListEmptyComponent={!loading ? <Text style={s.empty}>Nenhum ciclo registrado.</Text> : null}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.cardIcon}>🌸</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Início: {new Date(item.startDate).toLocaleDateString('pt-BR')}</Text>
              {item.endDate && <Text style={s.cardSub}>Fim: {new Date(item.endDate).toLocaleDateString('pt-BR')}</Text>}
              {item.cycleLength && <Text style={s.cardSub}>{item.cycleLength} dias de ciclo</Text>}
            </View>
            <View style={[s.badge, { backgroundColor: item.isComplete ? '#DCFCE7' : '#FEF3C7' }]}>
              <Text style={[s.badgeText, { color: item.isComplete ? '#166534' : '#92400E' }]}>
                {item.isComplete ? 'Completo' : 'Em curso'}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#F4F8FF' },
  header:    { backgroundColor: '#002B5C', padding: 20, paddingTop: 16 },
  title:     { fontSize: 20, fontWeight: '800', color: '#fff' },
  statsRow:  { flexDirection: 'row', padding: 12, gap: 10 },
  statCard:  { flex: 1, backgroundColor: '#FDF2F8', borderRadius: 12, padding: 12, alignItems: 'center' },
  statVal:   { fontSize: 22, fontWeight: '800', color: '#9D174D' },
  statLabel: { fontSize: 10, color: '#9D174D', textAlign: 'center', marginTop: 2 },
  list:      { padding: 16, gap: 10 },
  empty:     { textAlign: 'center', color: '#94A3B8', marginTop: 60, fontSize: 14 },
  card:      { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardIcon:  { fontSize: 26 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  cardSub:   { fontSize: 12, color: '#64748B', marginTop: 2 },
  badge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
