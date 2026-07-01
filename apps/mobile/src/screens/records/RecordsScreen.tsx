// apps/mobile/src/screens/records/RecordsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Alert, RefreshControl } from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api.client';

export default function RecordsScreen() {
  const { accessToken } = useAuthStore();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/records', accessToken);
      setRecords(Array.isArray(data) ? data : []);
    } catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>🧪 Meus Exames</Text>
      </View>
      <FlatList
        data={records}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={s.list}
        ListEmptyComponent={!loading ? <Text style={s.empty}>Nenhum exame encontrado.\nFaça upload pelo app web.</Text> : null}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.cardIcon}>📄</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.cardSub}>
                {item.labName ? `${item.labName} · ` : ''}
                {new Date(item.recordDate).toLocaleDateString('pt-BR')}
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
  list:      { padding: 16, gap: 10 },
  empty:     { textAlign: 'center', color: '#94A3B8', marginTop: 60, fontSize: 14, lineHeight: 22 },
  card:      { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardIcon:  { fontSize: 28 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  cardSub:   { fontSize: 12, color: '#64748B', marginTop: 2 },
});
