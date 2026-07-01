// apps/mobile/src/screens/vitals/GlucoseScreen.tsx
// Sprint 18 — Glicemia: histórico, gráfico, adicionar medição
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Alert,
  RefreshControl, TouchableOpacity, Modal, TextInput, ScrollView, Dimensions,
} from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient }    from '../../services/api.client';
import MiniLineChart    from '../../components/charts/MiniLineChart';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 48;

type Entry = {
  id: string;
  value: number | string;
  context?: string;
  measuredAt: string;
  notes?: string;
};

const CONTEXTS = [
  { key: 'fasting',        label: 'Jejum',           icon: '🌙' },
  { key: 'before_meal',    label: 'Pré-refeição',    icon: '🍽️' },
  { key: 'after_meal',     label: 'Pós-refeição',    icon: '✅' },
  { key: 'before_exercise',label: 'Pré-exercício',   icon: '🏃' },
  { key: 'after_exercise', label: 'Pós-exercício',   icon: '💪' },
  { key: 'random',         label: 'Aleatório',       icon: '🎲' },
];

function ctxLabel(key?: string) {
  return CONTEXTS.find(c => c.key === key)?.label ?? key ?? 'Aleatório';
}
function ctxIcon(key?: string) {
  return CONTEXTS.find(c => c.key === key)?.icon ?? '🩸';
}

function classify(v: number, ctx?: string): { label: string; color: string; desc: string } {
  const fasting = !ctx || ctx === 'fasting' || ctx === 'jejum';
  if (fasting) {
    if (v < 70)  return { label: 'Hipoglicemia', color: '#7C3AED', desc: 'Glicemia baixa. Ingira açúcar imediatamente se sintomas.' };
    if (v < 100) return { label: 'Normal',        color: '#22C55E', desc: 'Glicemia em jejum normal.' };
    if (v < 126) return { label: 'Pré-diabetes',  color: '#F59E0B', desc: 'Glicemia elevada. Acompanhe com seu médico.' };
    return              { label: 'Diabetes',      color: '#EF4444', desc: 'Glicemia muito elevada. Consulte seu médico.' };
  }
  // Pós-refeição (2h)
  if (v < 70)  return { label: 'Hipoglicemia', color: '#7C3AED', desc: 'Glicemia baixa. Atenção.' };
  if (v < 140) return { label: 'Normal',        color: '#22C55E', desc: 'Glicemia pós-refeição normal.' };
  if (v < 200) return { label: 'Elevada',       color: '#F59E0B', desc: 'Glicemia pós-refeição elevada.' };
  return              { label: 'Muito alta',    color: '#EF4444', desc: 'Glicemia muito alta. Consulte seu médico.' };
}

function fmtDate(iso: string, short = false) {
  const d = new Date(iso);
  if (short) return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function GlucoseScreen({ navigation }: any) {
  const { accessToken } = useAuthStore();
  const [list, setList]           = useState<Entry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [period, setPeriod]       = useState<7 | 30 | 90>(30);
  const [form, setForm] = useState({ value: '', context: 'fasting', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/glucose?limit=100', accessToken);
      const arr: Entry[] = (Array.isArray(data) ? data : data?.data ?? [])
        .sort((a: Entry, b: Entry) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
      setList(arr);
    } catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const v = Number(form.value);
    if (!v || v < 20 || v > 600) { Alert.alert('Valor de glicemia inválido (20–600 mg/dL)'); return; }
    setSaving(true);
    try {
      await apiClient.post('/glucose', {
        value:      v,
        context:    form.context,
        notes:      form.notes || undefined,
        measuredAt: new Date().toISOString(),
      }, accessToken);
      setShowModal(false);
      setForm({ value: '', context: 'fasting', notes: '' });
      await load();
    } catch (e: any) { Alert.alert('Erro ao salvar', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Excluir medição', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try { await apiClient.delete(`/glucose/${id}`, accessToken); await load(); }
        catch (e: any) { Alert.alert('Erro', e.message); }
      }},
    ]);
  };

  // Filtro por período
  const cutoff   = new Date(Date.now() - period * 86400_000);
  const filtered = list.filter(e => new Date(e.measuredAt) >= cutoff);
  const chartData= filtered.slice().reverse();
  const last     = list[0];
  const cls      = last ? classify(Number(last.value), last.context) : null;

  // Estatísticas do período
  const periodVals = filtered.map(e => Number(e.value));
  const avg = periodVals.length ? Math.round(periodVals.reduce((a,b) => a+b, 0) / periodVals.length) : null;
  const mn  = periodVals.length ? Math.min(...periodVals) : null;
  const mx  = periodVals.length ? Math.max(...periodVals) : null;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>🩸 Glicemia</Text>
          <Text style={s.headerSub}>{list.length} medições registradas</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
          <Text style={s.addBtnText}>+ Medir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#002B5C" />}
      >
        {/* Última medição */}
        {last && cls && (
          <View style={[s.summaryCard, { borderLeftColor: cls.color }]}>
            <View style={s.summaryRow}>
              <View>
                <Text style={s.summaryLabel}>Última medição · {ctxLabel(last.context)}</Text>
                <Text style={s.summaryValue}>{Math.round(Number(last.value))}</Text>
                <Text style={s.summaryUnit}>mg/dL</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[s.classBadge, { backgroundColor: cls.color + '20' }]}>
                  <Text style={[s.classBadgeText, { color: cls.color }]}>{cls.label}</Text>
                </View>
                <Text style={s.summaryDate}>{fmtDate(last.measuredAt)}</Text>
              </View>
            </View>
            <Text style={[s.clsDesc, { color: cls.color }]}>{cls.desc}</Text>
          </View>
        )}

        {/* Estatísticas do período */}
        {avg !== null && (
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statValue}>{avg}</Text>
              <Text style={s.statLabel}>Média</Text>
            </View>
            <View style={s.statBox}>
              <Text style={[s.statValue, { color: '#7C3AED' }]}>{mn}</Text>
              <Text style={s.statLabel}>Mínima</Text>
            </View>
            <View style={s.statBox}>
              <Text style={[s.statValue, { color: '#EF4444' }]}>{mx}</Text>
              <Text style={s.statLabel}>Máxima</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statValue}>{filtered.length}</Text>
              <Text style={s.statLabel}>Medições</Text>
            </View>
          </View>
        )}

        {/* Gráfico */}
        {chartData.length >= 2 && (
          <View style={s.chartCard}>
            <View style={s.chartHeader}>
              <Text style={s.chartTitle}>Evolução (mg/dL)</Text>
              <View style={s.periodRow}>
                {([7, 30, 90] as const).map(p => (
                  <TouchableOpacity key={p} style={[s.periodBtn, period === p && s.periodBtnActive]}
                    onPress={() => setPeriod(p)}>
                    <Text style={[s.periodLabel, period === p && s.periodLabelActive]}>{p}d</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <MiniLineChart
              width={CHART_W}
              height={150}
              datasets={[
                { values: chartData.map(e => Math.round(Number(e.value))), color: '#F59E0B', label: 'Glicemia' },
              ]}
              refLines={[
                { value: 70,  color: '#7C3AED', label: '70' },
                { value: 100, color: '#22C55E', label: '100' },
                { value: 126, color: '#F59E0B', label: '126' },
                { value: 180, color: '#EF4444', label: '180' },
              ]}
              xLabels={chartData.map(e => fmtDate(e.measuredAt, true))}
              yMin={50}
              yMax={Math.max(220, ...chartData.map(e => Number(e.value))) + 20}
            />
            {/* Legenda de zonas */}
            <View style={s.zoneLegend}>
              {[
                { color:'#7C3AED', label:'<70 Hipo' },
                { color:'#22C55E', label:'70–99 Normal' },
                { color:'#F59E0B', label:'100–125 Pré-diab' },
                { color:'#EF4444', label:'≥126 Diabetes' },
              ].map(z => (
                <View key={z.label} style={s.zoneItem}>
                  <View style={[s.zoneDot, { backgroundColor: z.color }]} />
                  <Text style={s.zoneText}>{z.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Lista */}
        <Text style={s.listTitle}>Histórico</Text>
        {list.map(e => {
          const c = classify(Number(e.value), e.context);
          return (
            <TouchableOpacity key={e.id} style={s.card} onLongPress={() => handleDelete(e.id)}>
              <Text style={s.cardCtxIcon}>{ctxIcon(e.context)}</Text>
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Text style={s.cardValue}>{Math.round(Number(e.value))} <Text style={s.cardUnit}>mg/dL</Text></Text>
                <Text style={s.cardCtx}>{ctxLabel(e.context)}</Text>
                {e.notes && <Text style={s.cardNote}>{e.notes}</Text>}
                <Text style={s.cardDate}>{fmtDate(e.measuredAt)}</Text>
              </View>
              <View style={[s.microBadge, { backgroundColor: c.color + '20' }]}>
                <Text style={[s.microText, { color: c.color }]}>{c.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {!loading && list.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🩸</Text>
            <Text style={s.emptyText}>Nenhuma medição registrada ainda.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={s.emptyBtnText}>Registrar primeira medição</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={s.hint}>Toque e segure uma medição para excluí-la.</Text>
      </ScrollView>

      {/* Modal nova medição */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalSafe}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Nova medição de glicemia</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            {/* Preview classificação */}
            {form.value && (() => {
              const v2 = Number(form.value);
              if (v2 >= 20 && v2 <= 600) {
                const c = classify(v2, form.context);
                return (
                  <View style={[s.previewBadge, { backgroundColor: c.color + '20', borderColor: c.color }]}>
                    <Text style={[s.previewText, { color: c.color }]}>{c.label} — {c.desc}</Text>
                  </View>
                );
              }
              return null;
            })()}

            <Text style={s.fieldLabel}>Glicemia (mg/dL) *</Text>
            <TextInput style={s.input} placeholder="Ex: 95" keyboardType="number-pad"
              value={form.value} onChangeText={v => setForm(f => ({ ...f, value: v }))} />

            <Text style={s.fieldLabel}>Contexto da medição</Text>
            <View style={s.ctxGrid}>
              {CONTEXTS.map(c => (
                <TouchableOpacity key={c.key}
                  style={[s.ctxBtn, form.context === c.key && s.ctxBtnActive]}
                  onPress={() => setForm(f => ({ ...f, context: c.key }))}>
                  <Text style={s.ctxBtnIcon}>{c.icon}</Text>
                  <Text style={[s.ctxBtnLabel, form.context === c.key && s.ctxBtnLabelActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Observações</Text>
            <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]}
              placeholder="Insulina tomada, sintomas..."
              value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} multiline />

            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              <Text style={s.saveBtnText}>{saving ? 'Salvando...' : 'Salvar medição'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F4F8FF' },
  header:          { backgroundColor: '#002B5C', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn:         { padding: 4 },
  backText:        { color: '#fff', fontSize: 22, fontWeight: '700' },
  title:           { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub:       { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  addBtn:          { backgroundColor: '#00A896', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText:      { color: '#fff', fontSize: 13, fontWeight: '700' },
  summaryCard:     { margin: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderLeftWidth: 5, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  summaryRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel:    { fontSize: 11, color: '#64748B', fontWeight: '600', marginBottom: 4 },
  summaryValue:    { fontSize: 40, fontWeight: '900', color: '#1E293B' },
  summaryUnit:     { fontSize: 13, color: '#64748B', marginTop: 2 },
  summaryDate:     { fontSize: 11, color: '#94A3B8' },
  classBadge:      { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  classBadgeText:  { fontSize: 12, fontWeight: '800' },
  clsDesc:         { fontSize: 12, marginTop: 10, fontWeight: '600' },
  statsRow:        { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, gap: 8 },
  statBox:         { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  statValue:       { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  statLabel:       { fontSize: 10, color: '#94A3B8', marginTop: 2, fontWeight: '600' },
  chartCard:       { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  chartHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  chartTitle:      { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  periodRow:       { flexDirection: 'row', gap: 4 },
  periodBtn:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#F1F5F9' },
  periodBtnActive: { backgroundColor: '#002B5C' },
  periodLabel:     { fontSize: 11, color: '#64748B', fontWeight: '600' },
  periodLabelActive:{ color: '#fff' },
  zoneLegend:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  zoneItem:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  zoneDot:         { width: 7, height: 7, borderRadius: 4 },
  zoneText:        { fontSize: 9, color: '#64748B' },
  listTitle:       { fontSize: 13, fontWeight: '700', color: '#334155', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  card:            { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardCtxIcon:     { fontSize: 24 },
  cardValue:       { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  cardUnit:        { fontSize: 13, fontWeight: '400', color: '#64748B' },
  cardCtx:         { fontSize: 11, color: '#64748B', marginTop: 2 },
  cardNote:        { fontSize: 11, color: '#94A3B8', marginTop: 2, fontStyle: 'italic' },
  cardDate:        { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  microBadge:      { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  microText:       { fontSize: 10, fontWeight: '700' },
  hint:            { textAlign: 'center', fontSize: 10, color: '#CBD5E1', marginTop: 8, marginBottom: 4 },
  empty:           { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyIcon:       { fontSize: 48 },
  emptyText:       { fontSize: 14, color: '#94A3B8' },
  emptyBtn:        { backgroundColor: '#002B5C', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalSafe:       { flex: 1, backgroundColor: '#fff' },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle:      { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  modalClose:      { fontSize: 20, color: '#64748B', fontWeight: '700' },
  modalContent:    { padding: 20 },
  fieldLabel:      { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, marginTop: 14 },
  input:           { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1E293B', backgroundColor: '#F8FAFC' },
  previewBadge:    { borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 4 },
  previewText:     { fontSize: 12, fontWeight: '700' },
  ctxGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  ctxBtn:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  ctxBtnActive:    { backgroundColor: '#002B5C', borderColor: '#002B5C' },
  ctxBtnIcon:      { fontSize: 14 },
  ctxBtnLabel:     { fontSize: 12, color: '#64748B', fontWeight: '600' },
  ctxBtnLabelActive: { color: '#fff' },
  saveBtn:         { backgroundColor: '#002B5C', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },
});
