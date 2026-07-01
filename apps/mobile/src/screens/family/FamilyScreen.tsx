// apps/mobile/src/screens/family/FamilyScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, Alert, RefreshControl } from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api.client';

const RELATION_LABELS: Record<string, string> = {
  parent: 'Pai/Mãe', sibling: 'Irmão/Irmã', child: 'Filho(a)',
  grandparent: 'Avô/Avó', spouse: 'Cônjuge', other: 'Outro',
};
const GENDER_ICON: Record<string, string> = { male: '👨', female: '👩', other: '🧑' };

export default function FamilyScreen() {
  const { accessToken } = useAuthStore();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/family', accessToken);
      setMembers(Array.isArray(data) ? data : data?.data ?? []);
    } catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>👨‍👩‍👧 Família</Text>
      </View>
      <FlatList
        data={members}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={s.list}
        ListEmptyComponent={!loading ? <Text style={s.empty}>Nenhum membro familiar cadastrado.</Text> : null}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.cardIcon}>{GENDER_ICON[item.gender] ?? '🧑'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{item.fullName}</Text>
              <Text style={s.cardSub}>
                {RELATION_LABELS[item.relationship] ?? item.relationship}
                {item.dateOfBirth ? ` · ${new Date(item.dateOfBirth).toLocaleDateString('pt-BR')}` : ''}
              </Text>
              {item.bloodType && item.bloodType !== 'unknown' && (
                <Text style={s.blood}>🩸 {item.bloodType}</Text>
              )}
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
  empty:     { textAlign: 'center', color: '#94A3B8', marginTop: 60, fontSize: 14 },
  card:      { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardIcon:  { fontSize: 28 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  cardSub:   { fontSize: 12, color: '#64748B', marginTop: 2 },
  blood:     { fontSize: 11, color: '#EF4444', marginTop: 2 },
});
