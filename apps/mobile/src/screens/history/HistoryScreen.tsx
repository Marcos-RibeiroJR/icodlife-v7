// apps/mobile/src/screens/history/HistoryScreen.tsx
// Sprint 17 — Histórico de saúde agregado: exames, BP, glicemia, vacinas
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  RefreshControl, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api.client';

type BpEntry      = { id: string; systolic: number; diastolic: number; heartRate?: number; measuredAt: string; notes?: string };
type GlucoseEntry = { id: string; value: number; context?: string; measuredAt: string };
type Vaccine      = { id: string; name: string; date: string; dueDate?: string; batch?: string; location?: string };
type Exam         = { id: string; examName?: string; title?: string; resultDate?: string; date?: string; status?: string; fileUrl?: string };
type Appointment  = { id: string; appointmentAt?: string; scheduledAt?: string; status: string; doctorName?: string; doctor?: any; specialty?: string };

function bpClass(s: number, d: number): { label: string; color: string } {
  if (s < 120 && d < 80)  return { label: 'Normal',     color: '#22C55E' };
  if (s < 130 && d < 80)  return { label: 'Elevada',    color: '#84CC16' };
  if (s < 140 || d < 90)  return { label: 'Estágio 1',  color: '#F59E0B' };
  return                          { label: 'Estágio 2',  color: '#EF4444' };
}

function glucoseClass(v: number, ctx?: string): { label: string; color: string } {
  const fasting = !ctx || ctx === 'fasting' || ctx === 'jejum';
  if (fasting) {
    if (v < 100) return { label: 'Normal',   color: '#22C55E' };
    if (v < 126) return { label: 'Pré-diab', color: '#F59E0B' };
    return              { label: 'Diabetes', color: '#EF4444' };
  }
  if (v < 140) return { label: 'Normal',   color: '#22C55E' };
  if (v < 200) return { label: 'Elevada',  color: '#F59E0B' };
  return              { label: 'Alta',     color: '#EF4444' };
}

// Mini sparkline em texto (ASCII-like) usando os últimos valores
function SparkLine({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const mn = Math.min(...values), mx = Math.max(...values), range = mx - mn || 1;
  const bars = ['▁','▂','▃','▄','▅','▆','▇','█'];
  const line = values.slice(-8).map(v => bars[Math.round(((v - mn) / range) * 7)]).join('');
  return <Text style={{ color, fontSize: 16, letterSpacing: 2, marginTop: 4 }}>{line}</Text>;
}

export default function HistoryScreen({ navigation }: any) {
  const { accessToken } = useAuthStore();
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefresh] = useState(false);

  const [bpList,      setBp]       = useState<BpEntry[]>([]);
  const [glucoseList, setGlucose]  = useState<GlucoseEntry[]>([]);
  const [vaccines,    setVaccines] = useState<Vaccine[]>([]);
  const [exams,       setExams]    = useState<Exam[]>([]);
  const [appts,       setAppts]    = useState<Appointment[]>([]);

  const load = useCallback(async () => {
    const safe = (p: Promise<any>) => p.catch(() => null);
    const [bp, gl, vac, ex, ap] = await Promise.all([
      safe(apiClient.get('/blood-pressure?limit=20', accessToken)),
      safe(apiClient.get('/glucose?limit=20', accessToken)),
      safe(apiClient.get('/vaccines', accessToken)),
      safe(apiClient.get('/exams?limit=10', accessToken)),
      safe(apiClient.get('/appointments?limit=20', accessToken)),
    ]);

    const arr = (v: any): any[] => Array.isArray(v) ? v : v?.data ?? [];
    setBp(arr(bp).sort((a,b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()));
    setGlucose(arr(gl).sort((a,b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()));
    setVaccines(arr(vac));
    setExams(arr(ex));
    setAppts(arr(ap).filter((a: Appointment) => a.status === 'completed')
      .sort((a: Appointment, b: Appointment) =>
        new Date(b.appointmentAt ?? b.scheduledAt ?? '').getTime() -
        new Date(a.appointmentAt ?? a.scheduledAt ?? '').getTime()
      ));
    setLoading(false);
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefresh(true); await load(); setRefresh(false); };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}><Text style={s.title}>📊 Histórico</Text></View>
        <ActivityIndicator style={{ marginTop: 60 }} color="#002B5C" size="large" />
      </SafeAreaView>
    );
  }

  const bpValues      = bpList.map(b => b.systolic).reverse();
  const glucoseValues = glucoseList.map(g => Number(g.value)).reverse();
  const lastBp        = bpList[0];
  const lastGl        = glucoseList[0];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>📊 Histórico de Saúde</Text>
        <Text style={s.headerSub}>Seu histórico clínico completo</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#002B5C" />}
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        {/* ── Pressão Arterial ──────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>🫀 Pressão Arterial</Text>
            <TouchableOpacity onPress={() => navigation.navigate('BloodPressure')}>
              <Text style={s.seeAll}>Ver tudo →</Text>
            </TouchableOpacity>
          </View>
          {lastBp ? (
            <View style={s.metricSummary}>
              <View>
                <Text style={s.metricBig}>{lastBp.systolic}/{lastBp.diastolic}</Text>
                <Text style={s.metricUnit}>mmHg{lastBp.heartRate ? ` · ❤️ ${lastBp.heartRate} bpm` : ''}</Text>
                <View style={[s.classBadge, { backgroundColor: bpClass(lastBp.systolic, lastBp.diastolic).color + '20' }]}>
                  <Text style={[s.classBadgeText, { color: bpClass(lastBp.systolic, lastBp.diastolic).color }]}>
                    {bpClass(lastBp.systolic, lastBp.diastolic).label}
                  </Text>
                </View>
                <Text style={s.metricDate}>
                  {new Date(lastBp.measuredAt).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <SparkLine values={bpValues} color="#EF4444" />
                <Text style={s.sparkLabel}>{bpList.length} medições</Text>
              </View>
            </View>
          ) : (
            <Text style={s.emptySection}>Nenhuma medição registrada.</Text>
          )}
          {bpList.slice(1, 4).map(b => (
            <View key={b.id} style={s.listRow}>
              <Text style={s.listRowDate}>
                {new Date(b.measuredAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })}
              </Text>
              <Text style={s.listRowValue}>{b.systolic}/{b.diastolic} mmHg</Text>
              <View style={[s.microBadge, { backgroundColor: bpClass(b.systolic, b.diastolic).color + '20' }]}>
                <Text style={[s.microBadgeText, { color: bpClass(b.systolic, b.diastolic).color }]}>
                  {bpClass(b.systolic, b.diastolic).label}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Glicemia ─────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>🩸 Glicemia</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Glucose')}>
              <Text style={s.seeAll}>Ver tudo →</Text>
            </TouchableOpacity>
          </View>
          {lastGl ? (
            <View style={s.metricSummary}>
              <View>
                <Text style={s.metricBig}>{Math.round(Number(lastGl.value))}</Text>
                <Text style={s.metricUnit}>mg/dL · {lastGl.context ?? 'jejum'}</Text>
                <View style={[s.classBadge, { backgroundColor: glucoseClass(Number(lastGl.value), lastGl.context).color + '20' }]}>
                  <Text style={[s.classBadgeText, { color: glucoseClass(Number(lastGl.value), lastGl.context).color }]}>
                    {glucoseClass(Number(lastGl.value), lastGl.context).label}
                  </Text>
                </View>
                <Text style={s.metricDate}>
                  {new Date(lastGl.measuredAt).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <SparkLine values={glucoseValues} color="#F59E0B" />
                <Text style={s.sparkLabel}>{glucoseList.length} medições</Text>
              </View>
            </View>
          ) : (
            <Text style={s.emptySection}>Nenhuma medição registrada.</Text>
          )}
          {glucoseList.slice(1, 3).map(g => (
            <View key={g.id} style={s.listRow}>
              <Text style={s.listRowDate}>
                {new Date(g.measuredAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })}
              </Text>
              <Text style={s.listRowValue}>{Math.round(Number(g.value))} mg/dL</Text>
              <View style={[s.microBadge, { backgroundColor: glucoseClass(Number(g.value), g.context).color + '20' }]}>
                <Text style={[s.microBadgeText, { color: glucoseClass(Number(g.value), g.context).color }]}>
                  {glucoseClass(Number(g.value), g.context).label}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Consultas realizadas ──────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>📅 Consultas Realizadas</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
              <Text style={s.seeAll}>Ver tudo →</Text>
            </TouchableOpacity>
          </View>
          {appts.length === 0 && <Text style={s.emptySection}>Nenhuma consulta realizada.</Text>}
          {appts.slice(0, 4).map(a => (
            <View key={a.id} style={s.listRow}>
              <Text style={s.listRowDate}>
                {new Date(a.appointmentAt ?? a.scheduledAt ?? '').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' })}
              </Text>
              <View style={{ flex: 1, paddingHorizontal: 8 }}>
                <Text style={s.listRowTitle}>{a.doctorName ?? a.doctor?.user?.fullName ?? 'Médico'}</Text>
                <Text style={s.listRowSub}>{a.specialty ?? ''}</Text>
              </View>
              <View style={[s.microBadge, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[s.microBadgeText, { color: '#15803D' }]}>✓</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Vacinas ───────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>💉 Vacinas</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Vaccines')}>
              <Text style={s.seeAll}>Ver carteira →</Text>
            </TouchableOpacity>
          </View>
          {vaccines.length === 0 && <Text style={s.emptySection}>Nenhuma vacina registrada.</Text>}
          {vaccines.slice(0, 4).map(v => {
            const due = v.dueDate ? new Date(v.dueDate) : null;
            const overdue = due && due < new Date();
            return (
              <View key={v.id} style={s.listRow}>
                <Text style={s.listRowDate}>
                  {new Date(v.date).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' })}
                </Text>
                <View style={{ flex: 1, paddingHorizontal: 8 }}>
                  <Text style={s.listRowTitle}>{v.name}</Text>
                  {v.location && <Text style={s.listRowSub}>📍 {v.location}</Text>}
                </View>
                {due && (
                  <View style={[s.microBadge, { backgroundColor: overdue ? '#FEE2E2' : '#F0FDF4' }]}>
                    <Text style={[s.microBadgeText, { color: overdue ? '#EF4444' : '#15803D' }]}>
                      {overdue ? 'Vencida' : 'Válida'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Exames ───────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>🧪 Exames</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Records')}>
              <Text style={s.seeAll}>Ver todos →</Text>
            </TouchableOpacity>
          </View>
          {exams.length === 0 && <Text style={s.emptySection}>Nenhum exame registrado.</Text>}
          {exams.slice(0, 4).map(e => (
            <View key={e.id} style={s.listRow}>
              <Text style={s.listRowDate}>
                {new Date(e.resultDate ?? e.date ?? '').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' })}
              </Text>
              <View style={{ flex: 1, paddingHorizontal: 8 }}>
                <Text style={s.listRowTitle}>{e.examName ?? e.title ?? 'Exame'}</Text>
              </View>
              {e.fileUrl && (
                <View style={[s.microBadge, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[s.microBadgeText, { color: '#1D4ED8' }]}>PDF</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F4F8FF' },
  header:        { backgroundColor: '#002B5C', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  title:         { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:     { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  section:       { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  seeAll:        { fontSize: 12, color: '#3B82F6', fontWeight: '600' },
  metricSummary: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  metricBig:     { fontSize: 32, fontWeight: '900', color: '#1E293B' },
  metricUnit:    { fontSize: 12, color: '#64748B', marginTop: 2 },
  classBadge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 },
  classBadgeText:{ fontSize: 11, fontWeight: '800' },
  metricDate:    { fontSize: 11, color: '#94A3B8', marginTop: 6 },
  sparkLabel:    { fontSize: 10, color: '#94A3B8', marginTop: 4 },
  listRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  listRowDate:   { fontSize: 11, color: '#94A3B8', width: 52 },
  listRowTitle:  { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  listRowSub:    { fontSize: 11, color: '#64748B', marginTop: 1 },
  listRowValue:  { flex: 1, fontSize: 13, fontWeight: '600', color: '#334155' },
  microBadge:    { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  microBadgeText:{ fontSize: 10, fontWeight: '700' },
  emptySection:  { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 8 },
});
