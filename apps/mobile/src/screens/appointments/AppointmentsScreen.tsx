// apps/mobile/src/screens/appointments/AppointmentsScreen.tsx
// Sprint 17 — Consultas: próximas, passadas, agendar, telemedicina
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, Alert,
  RefreshControl, TouchableOpacity, Modal, TextInput, ScrollView, Platform,
} from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api.client';

const STATUS_COLOR: Record<string, string> = {
  scheduled: '#3B82F6', completed: '#22C55E', canceled: '#EF4444', no_show: '#F59E0B',
};
const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendado', completed: 'Realizado', canceled: 'Cancelado', no_show: 'Não compareceu',
};

const SPECIALTIES = [
  'Clínica Geral','Cardiologia','Dermatologia','Endocrinologia','Ginecologia',
  'Neurologia','Oftalmologia','Ortopedia','Pediatria','Psiquiatria','Urologia','Outro',
];

export default function AppointmentsScreen({ navigation }: any) {
  const { accessToken } = useAuthStore();
  const [all, setAll]           = useState<any[]>([]);
  const [tab, setTab]           = useState<'upcoming' | 'past'>('upcoming');
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]     = useState(false);

  // Formulário de novo agendamento
  const [form, setForm] = useState({
    doctorName: '', specialty: SPECIALTIES[0], appointmentAt: '', telehealth: false, notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/appointments', accessToken);
      setAll(Array.isArray(data) ? data : data?.data ?? []);
    } catch (e: any) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const now       = new Date();
  const upcoming  = all.filter(a => new Date(a.appointmentAt ?? a.scheduledAt) >= now && a.status === 'scheduled')
    .sort((a, b) => new Date(a.appointmentAt ?? a.scheduledAt).getTime() - new Date(b.appointmentAt ?? b.scheduledAt).getTime());
  const past      = all.filter(a => new Date(a.appointmentAt ?? a.scheduledAt) < now || a.status !== 'scheduled')
    .sort((a, b) => new Date(b.appointmentAt ?? b.scheduledAt).getTime() - new Date(a.appointmentAt ?? a.scheduledAt).getTime());
  const items     = tab === 'upcoming' ? upcoming : past;

  const handleSave = async () => {
    if (!form.doctorName.trim()) { Alert.alert('Preencha o nome do médico'); return; }
    if (!form.appointmentAt.trim()) { Alert.alert('Informe a data/hora'); return; }
    setSaving(true);
    try {
      await apiClient.post('/appointments', {
        doctorName:    form.doctorName,
        specialty:     form.specialty,
        appointmentAt: new Date(form.appointmentAt).toISOString(),
        telehealth:    form.telehealth,
        notes:         form.notes,
        status:        'scheduled',
      }, accessToken);
      setShowModal(false);
      setForm({ doctorName:'', specialty: SPECIALTIES[0], appointmentAt:'', telehealth:false, notes:'' });
      await load();
    } catch (e: any) { Alert.alert('Erro ao agendar', e.message); }
    finally { setSaving(false); }
  };

  const handleCancel = async (id: string) => {
    Alert.alert('Cancelar consulta', 'Tem certeza?', [
      { text: 'Não', style: 'cancel' },
      { text: 'Cancelar consulta', style: 'destructive', onPress: async () => {
        try {
          await apiClient.patch(`/appointments/${id}`, { status: 'canceled' }, accessToken);
          await load();
        } catch (e: any) { Alert.alert('Erro', e.message); }
      }},
    ]);
  };

  const renderItem = ({ item }: any) => {
    const date  = new Date(item.appointmentAt ?? item.scheduledAt);
    const color = STATUS_COLOR[item.status] ?? '#64748B';
    const isUpcoming = tab === 'upcoming';
    return (
      <View style={s.card}>
        <View style={[s.colorBar, { backgroundColor: color }]} />
        <View style={{ flex: 1, paddingLeft: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <Text style={s.cardTitle}>{item.doctorName ?? item.doctor?.user?.fullName ?? 'Médico'}</Text>
            {item.telehealth && <Text style={s.teleTag}>🎥 Tele</Text>}
          </View>
          <Text style={s.cardSub}>{item.specialty ?? ''}</Text>
          <Text style={s.cardDate}>
            {date.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
          </Text>
          {item.location && <Text style={s.cardLocation}>📍 {item.location}</Text>}
          {/* Ações */}
          {isUpcoming && (
            <View style={s.cardActions}>
              {item.telehealth && (
                <TouchableOpacity
                  style={[s.actionBtn, s.actionBtnPrimary]}
                  onPress={() => Alert.alert('Telemedicina', 'Token: ' + (item.telemedicineToken ?? 'Aguardando médico iniciar a sala.'))}
                >
                  <Text style={s.actionBtnTextPrimary}>Entrar na videochamada</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.actionBtn} onPress={() => handleCancel(item.id)}>
                <Text style={s.actionBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={[s.statusBadge, { backgroundColor: color + '20' }]}>
          <Text style={[s.statusText, { color }]}>{STATUS_LABEL[item.status] ?? item.status}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>📅 Consultas</Text>
          <Text style={s.headerSub}>{all.length} no total · {upcoming.length} próximas</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
          <Text style={s.addBtnText}>+ Agendar</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['upcoming', 'past'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>
              {t === 'upcoming' ? `Próximas (${upcoming.length})` : `Histórico (${past.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          !loading ? (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>📅</Text>
              <Text style={s.emptyText}>
                {tab === 'upcoming' ? 'Nenhuma consulta agendada.' : 'Sem histórico de consultas.'}
              </Text>
              {tab === 'upcoming' && (
                <TouchableOpacity style={s.emptyBtn} onPress={() => setShowModal(true)}>
                  <Text style={s.emptyBtnText}>Agendar agora</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        renderItem={renderItem}
      />

      {/* Modal de agendamento */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalSafe}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Nova consulta</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.modalContent}>
            <Text style={s.fieldLabel}>Médico *</Text>
            <TextInput
              style={s.input} placeholder="Nome do médico"
              value={form.doctorName} onChangeText={v => setForm(f => ({ ...f, doctorName: v }))}
            />

            <Text style={s.fieldLabel}>Especialidade</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {SPECIALTIES.map(sp => (
                  <TouchableOpacity
                    key={sp}
                    style={[s.chip, form.specialty === sp && s.chipActive]}
                    onPress={() => setForm(f => ({ ...f, specialty: sp }))}
                  >
                    <Text style={[s.chipText, form.specialty === sp && s.chipTextActive]}>{sp}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.fieldLabel}>Data e hora * (YYYY-MM-DD HH:MM)</Text>
            <TextInput
              style={s.input} placeholder="2026-07-15 14:30"
              value={form.appointmentAt} onChangeText={v => setForm(f => ({ ...f, appointmentAt: v }))}
              keyboardType="numbers-and-punctuation"
            />

            <TouchableOpacity
              style={s.toggleRow}
              onPress={() => setForm(f => ({ ...f, telehealth: !f.telehealth }))}
            >
              <Text style={s.toggleLabel}>🎥 Consulta por telemedicina</Text>
              <View style={[s.toggle, form.telehealth && s.toggleOn]}>
                <View style={[s.toggleThumb, form.telehealth && s.toggleThumbOn]} />
              </View>
            </TouchableOpacity>

            <Text style={s.fieldLabel}>Observações</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Motivo da consulta, sintomas..."
              value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              multiline
            />

            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              <Text style={s.saveBtnText}>{saving ? 'Agendando...' : 'Agendar consulta'}</Text>
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
  list:            { padding: 16, gap: 12 },
  card:            { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden', gap: 4 },
  colorBar:        { width: 4, alignSelf: 'stretch', borderRadius: 4 },
  cardTitle:       { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  cardSub:         { fontSize: 12, color: '#64748B', marginTop: 2 },
  cardDate:        { fontSize: 12, color: '#3B82F6', fontWeight: '600', marginTop: 4 },
  cardLocation:    { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  teleTag:         { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, fontSize: 10, color: '#1D4ED8', fontWeight: '700' },
  statusBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 4, alignSelf: 'flex-start' },
  statusText:      { fontSize: 10, fontWeight: '700' },
  cardActions:     { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn:       { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  actionBtnPrimary:{ backgroundColor: '#002B5C', borderColor: '#002B5C' },
  actionBtnText:   { fontSize: 12, color: '#64748B', fontWeight: '600' },
  actionBtnTextPrimary: { fontSize: 12, color: '#fff', fontWeight: '700' },
  emptyState:      { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyIcon:       { fontSize: 40 },
  emptyText:       { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
  emptyBtn:        { backgroundColor: '#002B5C', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyBtnText:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Modal
  modalSafe:       { flex: 1, backgroundColor: '#fff' },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle:      { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  modalClose:      { fontSize: 20, color: '#64748B', fontWeight: '700' },
  modalContent:    { padding: 20, gap: 4 },
  fieldLabel:      { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, marginTop: 8 },
  input:           { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1E293B', backgroundColor: '#F8FAFC' },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  chipActive:      { backgroundColor: '#002B5C', borderColor: '#002B5C' },
  chipText:        { fontSize: 13, color: '#64748B' },
  chipTextActive:  { color: '#fff', fontWeight: '700' },
  toggleRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 4 },
  toggleLabel:     { fontSize: 14, color: '#1E293B', fontWeight: '600' },
  toggle:          { width: 48, height: 28, borderRadius: 14, backgroundColor: '#E2E8F0', padding: 2, justifyContent: 'center' },
  toggleOn:        { backgroundColor: '#002B5C' },
  toggleThumb:     { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleThumbOn:   { alignSelf: 'flex-end' },
  saveBtn:         { backgroundColor: '#002B5C', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },
})