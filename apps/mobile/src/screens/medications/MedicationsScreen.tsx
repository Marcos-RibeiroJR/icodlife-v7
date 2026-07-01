// apps/mobile/src/screens/medications/MedicationsScreen.tsx
// Sprint 17 — Medicamentos: timeline do dia, registrar tomada, adicionar, estoque
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, Alert,
  RefreshControl, TouchableOpacity, Modal, TextInput, ScrollView, SectionList,
} from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api.client';

const ROUTES  = ['oral','sublingual','injetável','tópico','inalado','ocular','nasal','outro'];
const FREQS   = ['1x ao dia','2x ao dia','3x ao dia','4x ao dia','a cada 8h','a cada 12h','semanal','conforme necessário'];

function getNextTime(times: string[]): string | null {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  return times.find(t => t > hhmm) ?? null;
}

function timeLabel(t: string): string {
  const [h] = t.split(':').map(Number);
  if (h < 6)  return '🌙 Madrugada';
  if (h < 12) return '☀️ Manhã';
  if (h < 18) return '🌤️ Tarde';
  return '🌙 Noite';
}

export default function MedicationsScreen() {
  const { accessToken } = useAuthStore();
  const [meds, setMeds]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'today' | 'all'>('today');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [taken, setTaken]       = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    name: '', dosage: '', route: ROUTES[0], frequencyLabel: FREQS[0],
    scheduledTimes: '08:00', notes: '', stockQuantity: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/medications', accessToken);
      setMeds(Array.isArray(data) ? data : data?.data ?? []);
    } catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  // Monta timeline de hoje: { period, items }
  const todayTimeline = () => {
    const slots: Record<string, { time: string; med: any }[]> = {};
    meds.filter(m => m.isActive).forEach(med => {
      const times: string[] = med.scheduledTimes ?? [];
      times.forEach(t => {
        const period = timeLabel(t);
        if (!slots[period]) slots[period] = [];
        slots[period].push({ time: t, med });
      });
    });
    return Object.entries(slots)
      .sort(([a], [b]) => {
        const order = ['☀️ Manhã','🌤️ Tarde','🌙 Noite','🌙 Madrugada'];
        return order.indexOf(a) - order.indexOf(b);
      })
      .map(([title, data]) => ({ title, data: data.sort((a,b) => a.time.localeCompare(b.time)) }));
  };

  const handleTake = (medId: string, time: string) => {
    const key = `${medId}_${time}`;
    setTaken(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    // TODO: registrar log no backend via /medications/:id/log
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Informe o nome do medicamento'); return; }
    setSaving(true);
    try {
      const times = form.scheduledTimes.split(',').map(t => t.trim()).filter(Boolean);
      await apiClient.post('/medications', {
        name:          form.name,
        dosage:        form.dosage,
        route:         form.route,
        frequency:     form.frequencyLabel,
        scheduledTimes: times,
        notes:         form.notes,
        stockQuantity: form.stockQuantity ? Number(form.stockQuantity) : undefined,
        isActive:      true,
      }, accessToken);
      setShowModal(false);
      setForm({ name:'', dosage:'', route: ROUTES[0], frequencyLabel: FREQS[0], scheduledTimes:'08:00', notes:'', stockQuantity:'' });
      await load();
    } catch (e: any) { Alert.alert('Erro ao salvar', e.message); }
    finally { setSaving(false); }
  };

  const activeMeds   = meds.filter(m => m.isActive);
  const inactiveMeds = meds.filter(m => !m.isActive);
  const sections     = todayTimeline();

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>💊 Medicamentos</Text>
          <Text style={s.headerSub}>{activeMeds.length} ativos · {meds.length} total</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
          <Text style={s.addBtnText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['today','all'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>
              {t === 'today' ? 'Hoje' : `Todos (${meds.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'today' ? (
        /* ── Timeline do dia ─────────────────────────────────────────── */
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => `${item.med.id}_${item.time}_${i}`}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          contentContainerStyle={{ padding: 16, gap: 4 }}
          ListEmptyComponent={
            !loading ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>💊</Text>
                <Text style={s.emptyText}>Nenhum medicamento ativo para hoje.</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => setShowModal(true)}>
                  <Text style={s.emptyBtnText}>Adicionar medicamento</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          renderSectionHeader={({ section }) => (
            <Text style={s.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => {
            const key      = `${item.med.id}_${item.time}`;
            const isTaken  = taken.has(key);
            const isNext   = getNextTime(item.med.scheduledTimes ?? []) === item.time;
            const lowStock = item.med.stockQuantity !== null && item.med.stockQuantity !== undefined
              && item.med.lowStockAlert !== null && item.med.stockQuantity <= item.med.lowStockAlert;

            return (
              <View style={[s.timelineCard, isTaken && s.timelineCardTaken]}>
                <View style={s.timeBubble}>
                  <Text style={s.timeText}>{item.time}</Text>
                  {isNext && !isTaken && <View style={s.nextDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.medName, isTaken && s.medNameTaken]}>
                    {item.med.name} {item.med.dosage}
                  </Text>
                  <Text style={s.medRoute}>{item.med.route}</Text>
                  {lowStock && (
                    <Text style={s.stockWarn}>⚠️ Estoque baixo: {item.med.stockQuantity} restantes</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[s.takeBtn, isTaken && s.takeBtnDone]}
                  onPress={() => handleTake(item.med.id, item.time)}
                >
                  <Text style={[s.takeBtnText, isTaken && s.takeBtnTextDone]}>
                    {isTaken ? '✓ Tomado' : 'Tomar'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      ) : (
        /* ── Lista de todos ──────────────────────────────────────────── */
        <FlatList
          data={[...activeMeds, ...inactiveMeds]}
          keyExtractor={i => i.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          contentContainerStyle={s.list}
          ListEmptyComponent={!loading ? <Text style={s.empty}>Nenhum medicamento registrado.</Text> : null}
          renderItem={({ item }) => (
            <View style={[s.card, !item.isActive && { opacity: 0.55 }]}>
              <Text style={s.cardIcon}>💊</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{item.name} {item.dosage}</Text>
                <Text style={s.cardSub}>{item.route} · {item.frequency}</Text>
                {(item.scheduledTimes ?? []).length > 0 && (
                  <Text style={s.cardTimes}>⏰ {(item.scheduledTimes as string[]).join(' · ')}</Text>
                )}
                {item.stockQuantity !== null && item.stockQuantity !== undefined && (
                  <Text style={[s.cardStock, item.stockQuantity <= (item.lowStockAlert ?? 0) && { color: '#EF4444' }]}>
                    📦 Estoque: {item.stockQuantity} unidades
                  </Text>
                )}
              </View>
              <View style={[s.badge, { backgroundColor: item.isActive ? '#DCFCE7' : '#F1F5F9' }]}>
                <Text style={[s.badgeText, { color: item.isActive ? '#15803D' : '#64748B' }]}>
                  {item.isActive ? 'Ativo' : 'Inativo'}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal novo medicamento */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalSafe}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Novo medicamento</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.modalContent}>
            <Text style={s.fieldLabel}>Nome do medicamento *</Text>
            <TextInput style={s.input} placeholder="Ex: Losartana"
              value={form.name} onChangeText={v => setForm(f => ({...f, name: v}))} />

            <Text style={s.fieldLabel}>Dosagem</Text>
            <TextInput style={s.input} placeholder="Ex: 50mg"
              value={form.dosage} onChangeText={v => setForm(f => ({...f, dosage: v}))} />

            <Text style={s.fieldLabel}>Via</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ROUTES.map(r => (
                  <TouchableOpacity key={r} style={[s.chip, form.route === r && s.chipActive]}
                    onPress={() => setForm(f => ({...f, route: r}))}>
                    <Text style={[s.chipText, form.route === r && s.chipTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.fieldLabel}>Frequência</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {FREQS.map(f => (
                  <TouchableOpacity key={f} style={[s.chip, form.frequencyLabel === f && s.chipActive]}
                    onPress={() => setForm(ff => ({...ff, frequencyLabel: f}))}>
                    <Text style={[s.chipText, form.frequencyLabel === f && s.chipTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.fieldLabel}>Horários (separados por vírgula)</Text>
            <TextInput style={s.input} placeholder="08:00, 14:00, 20:00"
              value={form.scheduledTimes} onChangeText={v => setForm(f => ({...f, scheduledTimes: v}))} />

            <Text style={s.fieldLabel}>Estoque atual (unidades)</Text>
            <TextInput style={s.input} placeholder="Ex: 30" keyboardType="number-pad"
              value={form.stockQuantity} onChangeText={v => setForm(f => ({...f, stockQuantity: v}))} />

            <Text style={s.fieldLabel}>Observações</Text>
            <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]}
              placeholder="Tomar com água, após refeição..."
              value={form.notes} onChangeText={v => setForm(f => ({...f, notes: v}))} multiline />

            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              <Text style={s.saveBtnText}>{saving ? 'Salvando...' : 'Salvar medicamento'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F4F8FF' },
  header:          { backgroundColor: '#002B5C', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:           { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:       { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn:          { backgroundColor: '#00A896', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:      { color: '#fff', fontSize: 13, fontWeight: '700' },
  tabRow:          { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabBtn:          { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive:    { borderBottomColor: '#002B5C' },
  tabLabel:        { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  tabLabelActive:  { color: '#002B5C' },
  sectionHeader:   { fontSize: 12, fontWeight: '700', color: '#64748B', marginTop: 16, marginBottom: 8 },
  timelineCard:    { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  timelineCardTaken:{ backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  timeBubble:      { width: 52, alignItems: 'center', position: 'relative' },
  timeText:        { fontSize: 13, fontWeight: '700', color: '#334155' },
  nextDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3B82F6', marginTop: 3 },
  medName:         { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  medNameTaken:    { textDecorationLine: 'line-through', color: '#94A3B8' },
  medRoute:        { fontSize: 12, color: '#64748B', marginTop: 2 },
  stockWarn:       { fontSize: 11, color: '#F59E0B', fontWeight: '600', marginTop: 3 },
  takeBtn:         { backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  takeBtnDone:     { backgroundColor: '#DCFCE7' },
  takeBtnText:     { fontSize: 12, color: '#1D4ED8', fontWeight: '700' },
  takeBtnTextDone: { color: '#15803D' },
  list:            { padding: 16, gap: 10 },
  card:            { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardIcon:        { fontSize: 28 },
  cardTitle:       { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  cardSub:         { fontSize: 12, color: '#64748B', marginTop: 2 },
  cardTimes:       { fontSize: 11, color: '#3B82F6', marginTop: 3 },
  cardStock:       { fontSize: 11, color: '#64748B', marginTop: 2 },
  badge:           { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:       { fontSize: 11, fontWeight: '700' },
  empty:           { textAlign: 'center', color: '#94A3B8', marginTop: 60, fontSize: 14 },
  emptyState:      { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyIcon:       { fontSize: 40 },
  emptyText:       { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
  emptyBtn:        { backgroundColor: '#002B5C', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalSafe:       { flex: 1, backgroundColor: '#fff' },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle:      { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  modalClose:      { fontSize: 20, color: '#64748B', fontWeight: '700' },
  modalContent:    { padding: 20 },
  fieldLabel:      { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, marginTop: 10 },
  input:           { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1E293B', backgroundColor: '#F8FAFC' },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  chipActive:      { backgroundColor: '#002B5C', borderColor: '#002B5C' },
  chipText:        { fontSize: 13, color: '#64748B' },
  chipTextActive:  { color: '#fff', fontWeight: '700' },
  saveBtn:         { backgroundColor: '#002B5C', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },
});
