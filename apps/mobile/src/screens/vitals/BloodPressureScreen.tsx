// apps/mobile/src/screens/vitals/BloodPressureScreen.tsx
// Sprint 18 — Pressão Arterial: histórico, gráfico, adicionar medição
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, Alert,
  RefreshControl, TouchableOpacity, Modal, TextInput, ScrollView, Dimensions,
} from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient }    from '../../services/api.client';
import MiniLineChart    from '../../components/charts/MiniLineChart';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 48;

type Entry = {
  id: string;
  systolic: number;
  diastolic: number;
  heartRate?: number;
  measuredAt: string;
  notes?: string;
};

function classify(s: number, d: number): { label: string; color: string; desc: string } {
  if (s < 120 && d < 80)  return { label: 'Normal',     color: '#22C55E', desc: 'Ótimo! Continue assim.' };
  if (s < 130 && d < 80)  return { label: 'Elevada',    color: '#84CC16', desc: 'Atenção: faça monitoramento regular.' };
  if (s < 140 || d < 90)  return { label: 'Estágio 1',  color: '#F59E0B', desc: 'Hipertensão estágio 1. Converse com seu médico.' };
  if (s < 180 || d < 120) return { label: 'Estágio 2',  color: '#EF4444', desc: 'Hipertensão estágio 2. Consulte um médico.' };
  return                          { label: 'Crise',      color: '#7C3AED', desc: '⚠️ Pressão crítica. Procure atendimento imediato.' };
}

function fmtDate(iso: string, short = false) {
  const d = new Date(iso);
  if (short) return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function BloodPressureScreen({ navigation }: any) {
  const { accessToken } = useAuthStore();
  const [list, setList]         = useState<Entry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [period, setPeriod]     = useState<7 | 30 | 90>(30);
  const [form, setForm] = useState({
    systolic: '', diastolic: '', heartRate: '', notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/blood-pressure?limit=100', accessToken);
      const arr: Entry[] = (Array.isArray(data) ? data : data?.data ?? [])
        .sort((a: Entry, b: Entry) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
      setList(arr);
    } catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const s = Number(form.systolic), d = Number(form.diastolic);
    if (!s || !d)         { Alert.alert('Informe a pressão sistólica e diastólica'); return; }
    if (s < 50 || s > 300){ Alert.alert('Valor sistólico fora do intervalo (50–300)'); return; }
    if (d < 30 || d > 200){ Alert.alert('Valor diastólico fora do intervalo (30–200)'); return; }
    setSaving(true);
    try {
      await apiClient.post('/blood-pressure', {
        systolic:  s,
        diastolic: d,
        heartRate: form.heartRate ? Number(form.heartRate) : undefined,
        notes:     form.notes || undefined,
        measuredAt: new Date().toISOString(),
      }, accessToken);
      setShowModal(false);
      setForm({ systolic:'', diastolic:'', heartRate:'', notes:'' });
      await load();
    } catch (e: any) { Alert.alert('Erro ao salvar', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Excluir medição', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await apiClient.delete(`/blood-pressure/${id}`, accessToken);
          await load();
        } catch (e: any) { Alert.alert('Erro', e.message); }
      }},
    ]);
  };

  // Filtra pelo período selecionado
  const cutoff   = new Date(Date.now() - period * 86400_000);
  const filtered = list.filter(e => new Date(e.measuredAt) >= cutoff);
  const chartData = filtered.slice().reverse(); // cronológico
  const last      = list[0];
  const cls       = last ? classify(last.systolic, last.diastolic) : null;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>🫀 Pressão Arterial</Text>
          <Text style={s.headerSub}>{list.length} medições registradas</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
          <Text style={s.addBtnText}>+ Medir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Última medição */}
        {last && cls && (
          <View style={[s.summaryCard, { borderLeftColor: cls.color, borderLeftWidth: 5 }]}>
            <View style={s.summaryRow}>
              <View>
                <Text style={s.summaryLabel}>Última medição</Text>
                <Text style={s.summaryValue}>{last.systolic}/{last.diastolic}</Text>
                <Text style={s.summaryUnit}>mmHg{last.heartRate ? ` · ❤️ ${last.heartRate} bpm` : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[s.classBadge, { backgroundColor: cls.color + '20' }]}>
                  <Text style={[s.classBadgeText, { color: cls.color }]}>{cls.label}</Text>
                </View>
                <Text style={s.summaryDate}>{fmtDate(last.measuredAt)}</Text>
              </View>
            </View>
            <Text style={[s.clsDesc, { color: cls.color }]}>{cls.desc}</Text>
          </View>
        )}

        {/* Gráfico */}
        {chartData.length >= 2 && (
          <View style={s.chartCard}>
            <View style={s.chartHeader}>
              <Text style={s.chartTitle}>Evolução</Text>
              <View style={s.periodRow}>
                {([7, 30, 90] as const).map(p => (
                  <TouchableOpacity key={p} style={[s.periodBtn, period === p && s.periodBtnActive]}
                    onPress={() => setPeriod(p)}>
                    <Text style={[s.periodLabel, period === p && s.periodLabelActive]}>{p}d</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={s.legend}>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#EF4444' }]} /><Text style={s.legendText}>Sistólica</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#3B82F6' }]} /><Text style={s.legendText}>Diastólica</Text></View>
            </View>
            <MiniLineChart
              width={CHART_W}
              height={150}
              datasets={[
                { values: chartData.map(e => e.systolic),  color: '#EF4444', label: 'Sistólica' },
                { values: chartData.map(e => e.diastolic), color: '#3B82F6', label: 'Diastólica' },
              ]}
              refLines={[
                { value: 120, color: '#22C55E', label: '120' },
                { value: 140, color: '#F59E0B', label: '140' },
                { value: 80,  color: '#84CC16', label: '80'  },
                { value: 90,  color: '#F59E0B', label: '90'  },
              ]}
              xLabels={chartData.map(e => fmtDate(e.measuredAt, true))}
              yMin={50}
              yMax={Math.max(200, ...chartData.map(e => e.systolic)) + 10}
            />
          </View>
        )}

        {/* Lista */}
        <Text style={s.listTitle}>Histórico</Text>
        {list.map(e => {
          const c = classify(e.systolic, e.diastolic);
          return (
            <TouchableOpacity key={e.id} style={s.card} onLongPress={() => handleDelete(e.id)}>
              <View style={[s.cardBar, { backgroundColor: c.color }]} />
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Text style={s.cardValue}>{e.systolic}/{e.diastolic} <Text style={s.cardUnit}>mmHg</Text></Text>
                {e.heartRate && <Text style={s.cardFC}>❤️ {e.heartRate} bpm</Text>}
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
            <Text style={s.emptyIcon}>🫀</Text>
            <Text style={s.emptyText}>Nenhuma medição registrada ainda.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={s.emptyBtnText}>Registrar primeira medição</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={s.hint}>Toque e segure uma medição para excluí-la.</Text>
      </ScrollView>

      {/* Pull-to-refresh via custom button no scroll */}

      {/* Modal de nova medição */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalSafe}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Nova medição</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            {/* Preview da classificação em tempo real */}
            {form.systolic && form.diastolic && (() => {
              const s2 = Number(form.systolic), d2 = Number(form.diastolic);
              if (s2 > 50 && d2 > 30) {
                const c = classify(s2, d2);
                return (
                  <View style={[s.previewBadge, { backgroundColor: c.color + '20', borderColor: c.color }]}>
                    <Text style={[s.previewText, { color: c.color }]}>{c.label} — {c.desc}</Text>
                  </View>
                );
              }
              return null;
            })()}

            <Text style={s.fieldLabel}>Pressão Sistólica (mmHg) *</Text>
            <TextInput style={s.input} placeholder="Ex: 120" keyboardType="number-pad"
              value={form.systolic} onChangeText={v => setForm(f => ({ ...f, systolic: v }))} />

            <Text style={s.fieldLabel}>Pressão Diastólica (mmHg) *</Text>
            <TextInput style={s.input} placeholder="Ex: 80" keyboardType="number-pad"
              value={form.diastolic} onChangeText={v => setForm(f => ({ ...f, diastolic: v }))} />

            <Text style={s.fieldLabel}>Frequência Cardíaca (bpm)</Text>
            <TextInput style={s.input} placeholder="Ex: 72" keyboardType="number-pad"
              value={form.heartRate} onChangeText={v => setForm(f => ({ ...f, heartRate: v }))} />

            <Text style={s.fieldLabel}>Observações</Text>
            <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]}
              placeholder="Após atividade física, em repouso..."
              value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} multiline />

            <View style={s.refBox}>
              <Text style={s.refTitle}>Valores de referência</Text>
              <Text style={s.refRow}><Text style={{ color: '#22C55E' }}>●</Text> Normal: &lt;120/&lt;80</Text>
              <Text style={s.refRow}><Text style={{ color: '#84CC16' }}>●</Text> Elevada: 120–129/&lt;80</Text>
              <Text style={s.refRow}><Text style={{ color: '#F59E0B' }}>●</Text> Estágio 1: 130–139/80–89</Text>
              <Text style={s.refRow}><Text style={{ color: '#EF4444' }}>●</Text> Estágio 2: ≥140/≥90</Text>
            </View>

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
  safe:           { flex: 1, backgroundColor: '#F4F8FF' },
  header:         { backgroundColor: '#002B5C', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn:        { padding: 4 },
  backText:       { color: '#fff', fontSize: 22, fontWeight: '700' },
  title:          { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub:      { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  addBtn:         { backgroundColor: '#00A896', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  summaryCard:    { margin: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel:   { fontSize: 11, color: '#64748B', fontWeight: '600', marginBottom: 4 },
  summaryValue:   { fontSize: 36, fontWeight: '900', color: '#1E293B' },
  summaryUnit:    { fontSize: 12, color: '#64748B', marginTop: 2 },
  summaryDate:    { fontSize: 11, color: '#94A3B8', marginTop: 6 },
  classBadge:     { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  classBadgeText: { fontSize: 12, fontWeight: '800' },
  clsDesc:        { fontSize: 12, marginTop: 10, fontWeight: '600' },
  chartCard:      { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  chartHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  chartTitle:     { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  periodRow:      { flexDirection: 'row', gap: 4 },
  periodBtn:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#F1F5F9' },
  periodBtnActive:{ backgroundColor: '#002B5C' },
  periodLabel:    { fontSize: 11, color: '#64748B', fontWeight: '600' },
  periodLabelActive:{ color: '#fff' },
  legend:         { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:      { width: 8, height: 8, borderRadius: 4 },
  legendText:     { fontSize: 10, color: '#64748B' },
  listTitle:      { fontSize: 13, fontWeight: '700', color: '#334155', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  card:           { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardBar:        { width: 4, alignSelf: 'stretch', borderRadius: 4 },
  cardValue:      { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  cardUnit:       { fontSize: 13, fontWeight: '400', color: '#64748B' },
  cardFC:         { fontSize: 12, color: '#64748B', marginTop: 2 },
  cardNote:       { fontSize: 11, color: '#94A3B8', marginTop: 2, fontStyle: 'italic' },
  cardDate:       { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  microBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  microText:      { fontSize: 10, fontWeight: '700' },
  hint:           { textAlign: 'center', fontSize: 10, color: '#CBD5E1', marginTop: 8, marginBottom: 4 },
  empty:          { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyIcon:      { fontSize: 48 },
  emptyText:      { fontSize: 14, color: '#94A3B8' },
  emptyBtn:       { backgroundColor: '#002B5C', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText:   { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalSafe:      { flex: 1, backgroundColor: '#fff' },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle:     { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  modalClose:     { fontSize: 20, color: '#64748B', fontWeight: '700' },
  modalContent:   { padding: 20 },
  fieldLabel:     { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, marginTop: 14 },
  input:          { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1E293B', backgroundColor: '#F8FAFC' },
  previewBadge:   { borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 4 },
  previewText:    { fontSize: 12, fontWeight: '700' },
  refBox:         { marginTop: 16, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, gap: 4 },
  refTitle:       { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 },
  refRow:         { fontSize: 11, color: '#64748B', gap: 4 },
  saveBtn:        { backgroundColor: '#002B5C', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText:    { color: '#fff', fontSize: 16, fontWeight: '800' },
});
