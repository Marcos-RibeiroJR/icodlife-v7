// apps/mobile/src/screens/vida/VidaScreen.tsx — Módulo Vida resumido
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Alert, RefreshControl } from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api.client';

function StatBox({ icon, label, value }: { icon: string; label: string; value: string | number | null | undefined }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={s.statVal}>{value ?? '—'}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export default function VidaScreen() {
  const { accessToken } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        apiClient.get('/lifestyle', accessToken),
        apiClient.get('/body-metrics/history', accessToken).catch(() => []),
      ]);
      setProfile(p);
      setHistory(Array.isArray(h) ? h.slice(0, 5) : []);
    } catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const bmi = profile?.bmi;
  const bmiLabel = !bmi ? '' : bmi < 18.5 ? 'Abaixo do peso' : bmi < 25 ? 'Peso normal' : bmi < 30 ? 'Sobrepeso' : 'Obeso';
  const bmiColor = !bmi ? '#64748B' : bmi < 18.5 ? '#60A5FA' : bmi < 25 ? '#22C55E' : bmi < 30 ? '#F59E0B' : '#EF4444';

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>🌱 Módulo Vida</Text>
      </View>
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        {!profile ? (
          <Text style={s.empty}>Perfil de saúde não preenchido.\nAcesse o app web para completar.</Text>
        ) : (
          <>
            {/* IMC */}
            {bmi && (
              <View style={[s.bmiCard, { borderColor: bmiColor }]}>
                <Text style={s.bmiVal}>{bmi}</Text>
                <View>
                  <Text style={s.bmiLabel}>IMC</Text>
                  <Text style={[s.bmiCategory, { color: bmiColor }]}>{bmiLabel}</Text>
                </View>
              </View>
            )}

            {/* Biometria */}
            <Text style={s.section}>Biometria</Text>
            <View style={s.statsGrid}>
              <StatBox icon="📏" label="Altura" value={profile.heightCm ? `${profile.heightCm} cm` : null} />
              <StatBox icon="⚖️" label="Peso" value={profile.weightKg ? `${profile.weightKg} kg` : null} />
              <StatBox icon="📐" label="Cintura" value={profile.waistCm ? `${profile.waistCm} cm` : null} />
              <StatBox icon="❤️" label="PA Sistólica" value={profile.systolicBp ? `${profile.systolicBp} mmHg` : null} />
            </View>

            {/* Hábitos */}
            <Text style={s.section}>Hábitos</Text>
            <View style={s.statsGrid}>
              <StatBox icon="🏃" label="Exercício" value={profile.exerciseFrequency} />
              <StatBox icon="😴" label="Sono" value={profile.sleepHoursAvg ? `${profile.sleepHoursAvg}h` : null} />
              <StatBox icon="🚬" label="Tabagismo" value={profile.smokingStatus} />
              <StatBox icon="🍺" label="Álcool" value={profile.alcoholStatus} />
            </View>

            {/* Histórico de peso */}
            {history.length > 0 && (
              <>
                <Text style={s.section}>Últimas Medições</Text>
                {history.map((h: any, i) => (
                  <View key={i} style={s.histRow}>
                    <Text style={s.histDate}>{new Date(h.measuredAt ?? h.snapshotAt).toLocaleDateString('pt-BR')}</Text>
                    <Text style={s.histVal}>{h.weightKg} kg</Text>
                    {h.bmi && <Text style={s.histBmi}>IMC {h.bmi}</Text>}
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#F4F8FF' },
  header:    { backgroundColor: '#002B5C', padding: 20, paddingTop: 16 },
  title:     { fontSize: 20, fontWeight: '800', color: '#fff' },
  content:   { padding: 16 },
  empty:     { textAlign: 'center', color: '#94A3B8', marginTop: 60, fontSize: 14, lineHeight: 22 },
  bmiCard:   { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20, borderLeftWidth: 4, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  bmiVal:    { fontSize: 40, fontWeight: '900', color: '#1E293B' },
  bmiLabel:  { fontSize: 13, color: '#64748B' },
  bmiCategory:{ fontSize: 16, fontWeight: '700', marginTop: 2 },
  section:   { fontSize: 13, fontWeight: '700', color: '#64748B', marginTop: 8, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statBox:   { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  statIcon:  { fontSize: 22, marginBottom: 4 },
  statVal:   { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  statLabel: { fontSize: 10, color: '#64748B', marginTop: 2, textAlign: 'center' },
  histRow:   { backgroundColor: '#fff', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 12 },
  histDate:  { fontSize: 13, color: '#64748B', flex: 1 },
  histVal:   { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  histBmi:   { fontSize: 11, color: '#94A3B8' },
});
