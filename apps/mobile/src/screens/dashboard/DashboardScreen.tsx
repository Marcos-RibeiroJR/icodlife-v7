// apps/mobile/src/screens/dashboard/DashboardScreen.tsx
// Sprint 17 — Dashboard completo do paciente
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api.client';

const BT_LABEL: Record<string, string> = {
  A_PLUS:'A+', A_MINUS:'A-', B_PLUS:'B+', B_MINUS:'B-',
  AB_PLUS:'AB+', AB_MINUS:'AB-', O_PLUS:'O+', O_MINUS:'O-', unknown:'—',
};

export default function DashboardScreen({ navigation }: any) {
  const { user, accessToken: token } = useAuthStore();
  const [data, setData] = useState<{
    chat: any; nextAppt: any; nextMed: any; unread: number;
    bp: any; glucose: any; score: number | null;
  }>({ chat: null, nextAppt: null, nextMed: null, unread: 0, bp: null, glucose: null, score: null });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]       = useState(true);

  const load = useCallback(async () => {
    try {
      const safe = (p: Promise<any>) => p.catch(() => null);
      const [chat, appts, meds, notifCount, bp, glucose] = await Promise.all([
        safe(apiClient.get('/ai-chat/history?days=1', token)),
        safe(apiClient.get('/appointments', token)),
        safe(apiClient.get('/medications', token)),
        safe(apiClient.get('/notifications/unread-count', token)),
        safe(apiClient.get('/blood-pressure?limit=1', token)),
        safe(apiClient.get('/glucose?limit=1', token)),
      ]);

      const apptList: any[] = Array.isArray(appts) ? appts : appts?.data ?? [];
      const medList:  any[] = Array.isArray(meds)  ? meds  : meds?.data  ?? [];

      // Próxima consulta futura
      const now = new Date();
      const nextAppt = apptList
        .filter(a => new Date(a.appointmentAt ?? a.scheduledAt) > now && a.status === 'scheduled')
        .sort((a, b) => new Date(a.appointmentAt ?? a.scheduledAt).getTime() - new Date(b.appointmentAt ?? b.scheduledAt).getTime())[0] ?? null;

      // Próximo medicamento do dia
      const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const nextMed = medList
        .filter(m => m.isActive)
        .find(m => {
          const times: string[] = m.scheduledTimes ?? m.frequency?.times ?? [];
          return times.some(t => t > hhmm);
        }) ?? null;

      // Score simulado baseado em dados existentes
      let score: number | null = null;
      if (apptList.length || medList.length) {
        const hasRecentAppt  = apptList.some(a => a.status === 'completed');
        const hasMeds        = medList.filter(m => m.isActive).length > 0;
        score = 60 + (hasRecentAppt ? 20 : 0) + (hasMeds ? 10 : 0) + (chat?.[0]?.completed ? 10 : 0);
      }

      setData({
        chat:     chat?.[0] ?? null,
        nextAppt,
        nextMed,
        unread:   notifCount?.count ?? 0,
        bp:       (Array.isArray(bp) ? bp[0] : bp?.data?.[0]) ?? null,
        glucose:  (Array.isArray(glucose) ? glucose[0] : glucose?.data?.[0]) ?? null,
        score,
      });
    } catch {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const bloodType = user?.bloodType ? (BT_LABEL[user.bloodType] ?? null) : null;

  const scoreColor = (s: number) =>
    s >= 85 ? '#22C55E' : s >= 70 ? '#84CC16' : s >= 55 ? '#F59E0B' : '#EF4444';

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Text style={s.greeting}>{greeting}, {firstName} 👋</Text>
        </View>
        <ActivityIndicator style={{ marginTop: 60 }} color="#002B5C" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#002B5C" />}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting}, {firstName} 👋</Text>
            <Text style={s.sub}>
              {new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Badge de notificações */}
            <TouchableOpacity style={s.notifBtn} onPress={() => navigation.navigate('Notifications')}>
              <Text style={s.notifIcon}>🔔</Text>
              {data.unread > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{data.unread > 9 ? '9+' : data.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.avatar} onPress={() => navigation.navigate('Profile')}>
              <Text style={s.avatarText}>{firstName.charAt(0)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Score de saúde ───────────────────────────────────────────── */}
        {data.score !== null && (
          <View style={s.scoreCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.scoreLabel}>Score de saúde</Text>
              <Text style={[s.scoreValue, { color: scoreColor(data.score) }]}>{data.score}/100</Text>
              <Text style={s.scoreSub}>
                {data.score >= 85 ? 'Excelente! Continue assim.' :
                 data.score >= 70 ? 'Bom, mas há espaço pra melhorar.' :
                 data.score >= 55 ? 'Atenção: revise seus hábitos.' : 'Consulte seu médico.'}
              </Text>
            </View>
            {bloodType && bloodType !== '—' && (
              <View style={s.btBadge}>
                <Text style={s.btIcon}>🩸</Text>
                <Text style={s.btText}>{bloodType}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── HealthBot CTA ────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.chatCard, data.chat?.completed && s.chatCardDone]}
          onPress={() => navigation.navigate('Chat')}
        >
          <Text style={s.chatIcon}>🤖</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.chatTitle}>
              {data.chat?.completed ? 'Check-in concluído ✓' : 'Check-in de saúde pendente'}
            </Text>
            <Text style={s.chatSub}>
              {data.chat?.completed
                ? 'Você completou o check-in diário!'
                : 'Responda as perguntas de hoje'}
            </Text>
          </View>
          {!data.chat?.completed && <Text style={s.arrow}>→</Text>}
        </TouchableOpacity>

        {/* ── Alertas do HealthBot ─────────────────────────────────────── */}
        {(data.chat?.flags?.length ?? 0) > 0 && (
          <View style={s.alertCard}>
            <Text style={s.alertTitle}>⚠️ Alertas de hoje</Text>
            {data.chat.flags.map((f: string) => (
              <Text key={f} style={s.alertItem}>
                {f === 'severe_pain' ? '• Dor intensa relatada' :
                 f === 'possible_illness' ? '• Possível mal-estar' :
                 f === 'sleep_issue' ? '• Problema de sono' : `• ${f}`}
              </Text>
            ))}
          </View>
        )}

        {/* ── Próxima consulta ─────────────────────────────────────────── */}
        {data.nextAppt ? (
          <TouchableOpacity style={s.widgetCard} onPress={() => navigation.navigate('Appointments')}>
            <View style={s.widgetRow}>
              <Text style={s.widgetIcon}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.widgetLabel}>Próxima consulta</Text>
                <Text style={s.widgetTitle}>
                  {data.nextAppt.doctorName ?? data.nextAppt.doctor?.user?.fullName ?? 'Médico'}
                </Text>
                <Text style={s.widgetSub}>
                  {data.nextAppt.specialty ?? ''} · {new Date(data.nextAppt.appointmentAt ?? data.nextAppt.scheduledAt)
                    .toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              {data.nextAppt.telehealth && (
                <View style={s.teleBadge}><Text style={s.teleBadgeText}>🎥 Tele</Text></View>
              )}
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.widgetCard, s.widgetEmpty]} onPress={() => navigation.navigate('Appointments')}>
            <Text style={s.emptyIcon}>📅</Text>
            <Text style={s.emptyText}>Nenhuma consulta próxima</Text>
            <Text style={s.emptyAction}>Agendar →</Text>
          </TouchableOpacity>
        )}

        {/* ── Próximo medicamento ──────────────────────────────────────── */}
        {data.nextMed ? (
          <TouchableOpacity style={s.widgetCard} onPress={() => navigation.navigate('Medications')}>
            <View style={s.widgetRow}>
              <Text style={s.widgetIcon}>💊</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.widgetLabel}>Próximo medicamento</Text>
                <Text style={s.widgetTitle}>{data.nextMed.name} {data.nextMed.dosage}</Text>
                <Text style={s.widgetSub}>
                  {(() => {
                    const hhmm = `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
                    const times: string[] = data.nextMed.scheduledTimes ?? data.nextMed.frequency?.times ?? [];
                    const next = times.find(t => t > hhmm);
                    return next ? `Às ${next}` : '';
                  })()}
                </Text>
              </View>
              <View style={s.medBadge}><Text style={s.medBadgeText}>Tomar</Text></View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.widgetCard, s.widgetEmpty]} onPress={() => navigation.navigate('Medications')}>
            <Text style={s.emptyIcon}>💊</Text>
            <Text style={s.emptyText}>Sem medicamentos hoje</Text>
            <Text style={s.emptyAction}>Ver lista →</Text>
          </TouchableOpacity>
        )}

        {/* ── Medições recentes ─────────────────────────────────────────── */}
        {(data.bp || data.glucose) && (
          <View style={s.metricsRow}>
            {data.bp && (
              <TouchableOpacity style={s.metricCard} onPress={() => navigation.navigate('History')}>
                <Text style={s.metricIcon}>🫀</Text>
                <Text style={s.metricValue}>
                  {data.bp.systolic}/{data.bp.diastolic}
                </Text>
                <Text style={s.metricLabel}>mmHg</Text>
                <Text style={s.metricName}>Pressão</Text>
              </TouchableOpacity>
            )}
            {data.glucose && (
              <TouchableOpacity style={s.metricCard} onPress={() => navigation.navigate('History')}>
                <Text style={s.metricIcon}>🩸</Text>
                <Text style={s.metricValue}>{Math.round(Number(data.glucose.value))}</Text>
                <Text style={s.metricLabel}>mg/dL</Text>
                <Text style={s.metricName}>Glicemia</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Acesso rápido ────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Acesso rápido</Text>
        <View style={s.grid}>
          {[
            { icon: '🧪', label: 'Exames',     screen: 'Records',    color: '#EFF6FF' },
            { icon: '💊', label: 'Medicamentos',screen: 'Medications',color: '#F0FDF4' },
            { icon: '📅', label: 'Consultas',  screen: 'Appointments',color: '#FFF7ED' },
            { icon: '📊', label: 'Histórico',  screen: 'History',    color: '#F5F3FF' },
            { icon: '📄', label: 'Prontuário', screen: 'Prontuario', color: '#F0F9FF' },
            { icon: '👨‍👩‍👧', label: 'Família',  screen: 'Family',     color: '#FDF4FF' },
          ].map(c => (
            <TouchableOpacity
              key={c.screen}
              style={[s.gridCard, { backgroundColor: c.color }]}
              onPress={() => navigation.navigate(c.screen)}
            >
              <Text style={s.gridIcon}>{c.icon}</Text>
              <Text style={s.gridLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F4F8FF' },
  scroll:        { flex: 1 },
  header:        { backgroundColor: '#002B5C', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
  greeting:      { fontSize: 20, fontWeight: '800', color: '#fff' },
  sub:           { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  avatar:        { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00A896', alignItems: 'center', justifyContent: 'center' },
  avatarText:    { color: '#fff', fontWeight: '700', fontSize: 16 },
  notifBtn:      { position: 'relative', padding: 4 },
  notifIcon:     { fontSize: 22 },
  badge:         { position: 'absolute', top: 0, right: 0, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  badgeText:     { color: '#fff', fontSize: 9, fontWeight: '800' },
  scoreCard:     { margin: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  scoreLabel:    { fontSize: 12, color: '#64748B', fontWeight: '600' },
  scoreValue:    { fontSize: 32, fontWeight: '900', marginTop: 2 },
  scoreSub:      { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  btBadge:       { alignItems: 'center', gap: 2 },
  btIcon:        { fontSize: 20 },
  btText:        { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  chatCard:      { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#EFF6FF', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#BFDBFE' },
  chatCardDone:  { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  chatIcon:      { fontSize: 26 },
  chatTitle:     { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  chatSub:       { fontSize: 12, color: '#64748B', marginTop: 2 },
  arrow:         { fontSize: 18, color: '#0066CC', fontWeight: '700' },
  alertCard:     { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  alertTitle:    { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  alertItem:     { fontSize: 12, color: '#78350F', marginTop: 2 },
  widgetCard:    { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  widgetEmpty:   { flexDirection: 'row', alignItems: 'center', gap: 10, opacity: 0.7 },
  widgetRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  widgetIcon:    { fontSize: 26 },
  widgetLabel:   { fontSize: 11, color: '#64748B', fontWeight: '600', marginBottom: 2 },
  widgetTitle:   { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  widgetSub:     { fontSize: 12, color: '#64748B', marginTop: 2 },
  emptyIcon:     { fontSize: 20 },
  emptyText:     { flex: 1, fontSize: 13, color: '#94A3B8' },
  emptyAction:   { fontSize: 12, color: '#3B82F6', fontWeight: '700' },
  teleBadge:     { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  teleBadgeText: { fontSize: 11, color: '#1D4ED8', fontWeight: '700' },
  medBadge:      { backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  medBadgeText:  { fontSize: 11, color: '#15803D', fontWeight: '700' },
  metricsRow:    { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, gap: 10 },
  metricCard:    { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  metricIcon:    { fontSize: 22, marginBottom: 4 },
  metricValue:   { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  metricLabel:   { fontSize: 10, color: '#64748B', marginTop: 1 },
  metricName:    { fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: '600' },
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: '#334155', marginHorizontal: 16, marginTop: 8, marginBottom: 10 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  gridCard:      { width: '30%', aspectRatio: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6 },
  gridIcon:      { fontSize: 26 },
  gridLabel:     { fontSize: 11, fontWeight: '600', color: '#334155' },
});
