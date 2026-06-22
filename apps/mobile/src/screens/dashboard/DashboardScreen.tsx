// apps/mobile/src/screens/dashboard/DashboardScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api.client';

export default function DashboardScreen({ navigation }: any) {
  const { user, token } = useAuthStore();
  const [todayChat, setTodayChat] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const history = await apiClient.get('/ai-chat/history?days=1', token);
      setTodayChat(history[0] ?? null);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user?.fullName?.split(' ')[0] ?? '';

  const CARDS = [
    { icon: '🧪', label: 'Exames', color: '#EFF6FF', screen: 'Records' },
    { icon: '💊', label: 'Medicamentos', color: '#F0FDF4', screen: 'Medications' },
    { icon: '📅', label: 'Agenda', color: '#FFF7ED', screen: 'Appointments' },
    { icon: '👨‍👩‍👧', label: 'Família', color: '#F5F3FF', screen: 'Family' },
    ...(user?.gender !== 'male' ? [{ icon: '🌸', label: 'Ciclo', color: '#FDF2F8', screen: 'Menstrual' }] : []),
    { icon: '🔗', label: 'Compartilhar', color: '#ECFDF5', screen: 'Share' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting}, {firstName} 👋</Text>
            <Text style={s.sub}>{new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}</Text>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{firstName.charAt(0)}</Text>
          </View>
        </View>

        {/* HealthBot CTA */}
        <TouchableOpacity style={[s.chatCard, todayChat?.completed && s.chatCardDone]}
          onPress={() => navigation.navigate('Chat')}>
          <Text style={s.chatIcon}>🤖</Text>
          <View style={s.chatInfo}>
            <Text style={s.chatTitle}>
              {todayChat?.completed ? 'Check-in de hoje concluído ✓' : 'Check-in de saúde pendente'}
            </Text>
            <Text style={s.chatSub}>
              {todayChat?.completed ? 'Você completou o check-in diário!' : 'Toque para responder as perguntas de saúde de hoje'}
            </Text>
          </View>
          {!todayChat?.completed && <Text style={s.chatArrow}>→</Text>}
        </TouchableOpacity>

        {/* Flags de alerta */}
        {todayChat?.flags?.length > 0 && (
          <View style={s.flagsCard}>
            <Text style={s.flagsTitle}>⚠️ Atenção</Text>
            {todayChat.flags.map((f: string) => (
              <Text key={f} style={s.flagItem}>
                {f === 'severe_pain' ? '• Dor intensa relatada' :
                 f === 'possible_illness' ? '• Possível mal-estar' :
                 f === 'sleep_issue' ? '• Problema de sono' : `• ${f}`}
              </Text>
            ))}
          </View>
        )}

        {/* Quick access */}
        <Text style={s.sectionTitle}>Acesso rápido</Text>
        <View style={s.grid}>
          {CARDS.map(c => (
            <TouchableOpacity key={c.screen} style={[s.gridCard, { backgroundColor: c.color }]}
              onPress={() => navigation.navigate(c.screen)}>
              <Text style={s.gridIcon}>{c.icon}</Text>
              <Text style={s.gridLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Blood type & donor */}
        {user?.bloodType && user.bloodType !== 'unknown' && (
          <View style={s.healthBar}>
            <View style={s.healthItem}>
              <Text style={s.healthValue}>🩸 {user.bloodType}</Text>
              <Text style={s.healthLabel}>Tipo sanguíneo</Text>
            </View>
            <View style={s.healthDivider} />
            <View style={s.healthItem}>
              <Text style={s.healthValue}>{user.isDonor ? '✅' : '—'}</Text>
              <Text style={s.healthLabel}>Doador de órgãos</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F8FF' },
  scroll: { flex: 1 },
  header: { backgroundColor: '#002B5C', padding: 20, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 20, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00A896', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  chatCard: { margin: 16, marginBottom: 8, backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#BFDBFE' },
  chatCardDone: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  chatIcon: { fontSize: 28 },
  chatInfo: { flex: 1 },
  chatTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  chatSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  chatArrow: { fontSize: 18, color: '#0066CC', fontWeight: '700' },
  flagsCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  flagsTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  flagItem: { fontSize: 12, color: '#78350F', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#334155', marginHorizontal: 16, marginTop: 8, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  gridCard: { width: '30%', aspectRatio: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6 },
  gridIcon: { fontSize: 26 },
  gridLabel: { fontSize: 11, fontWeight: '600', color: '#334155' },
  healthBar: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  healthItem: { flex: 1, alignItems: 'center' },
  healthValue: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  healthLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  healthDivider: { width: 1, height: 40, backgroundColor: '#E2E8F0' },
});
