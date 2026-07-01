// apps/mobile/src/screens/vaccines/VaccinesScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, Alert, RefreshControl } from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api.client';

export default function VaccinesScreen() {
  const { accessToken } = useAuthStore();
  const [records, setRecords]   = useState<any[]>([]);
  const [catalog, setCatalog]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [recs, cats] = await Promise.all([
        apiClient.get('/vaccinations', accessToken),
        apiClient.get('/vaccinations/catalog', accessToken).catch(() => []),
      ]);
      setRecords(Array.isArray(recs) ? recs : recs?.data ?? []);
      setCatalog(Array.isArray(cats) ? cats : cats?.vaccines ?? []);
    } catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const recordedIds = new Set(records.map((r: any) => r.vaccineId));

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>💉 Cartão de Vacinas</Text>
        <Text style={s.sub}>{records.length} dose(s) registrada(s)</Text>
      </View>

      <FlatList
        data={catalog}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={s.list}
        ListEmptyComponent={!loading ? <Text style={s.empty}>Catálogo de vacinas indisponível.</Text> : null}
        renderItem={({ item }) => {
          const done = recordedIds.has(item.id);
          const rec  = records.find((r: any) => r.vaccineId === item.id);
          return (
            <View style={[s.card, done && s.cardDone]}>
              <Text style={s.cardIcon}>{done ? '✅' : '💉'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{item.name}</Text>
                <Text style={s.cardSub}>{item.diseases?.join(', ') ?? ''}</Text>
                {done && rec?.appliedAt && (
                  <Text style={s.cardDate}>Aplicada em {new Date(rec.appliedAt).toLocaleDateString('pt-BR')}</Text>
                )}
              </View>
              <View style={[s.badge, { backgroundColor: done ? '#DCFCE7' : '#F1F5F9' }]}>
                <Text style={[s.badgeText, { color: done ? '#166534' : '#64748B' }]}>
                  {done ? 'OK' : 'Pendente'}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#F4F8FF' },
  header:    { backgroundColor: '#002B5C', padding: 20, paddingTop: 16 },
  title:     { fontSize: 20, fontWeight: '800', color: '#fff' },
  sub:       { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  list:      { padding: 16, gap: 8 },
  empty:     { textAlign: 'center', color: '#94A3B8', marginTop: 60, fontSize: 14 },
  card:      { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardDone:  { backgroundColor: '#F0FDF4' },
  cardIcon:  { fontSize: 24 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  cardSub:   { fontSize: 11, color: '#64748B', marginTop: 1 },
  cardDate:  { fontSize: 11, color: '#22C55E', fontWeight: '600', marginTop: 2 },
  badge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
