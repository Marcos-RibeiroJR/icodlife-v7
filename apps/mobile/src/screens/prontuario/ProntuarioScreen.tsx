// apps/mobile/src/screens/prontuario/ProntuarioScreen.tsx
// Sprint 19 — Prontuário Digital PDF com Assinatura Digital
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import * as FileSystem  from 'expo-file-system';
import * as Sharing     from 'expo-sharing';
import { useAuthStore } from '../../store/auth.store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function ProntuarioScreen({ navigation }: any) {
  const { accessToken, user } = useAuthStore();
  const [loading, setLoading]   = useState(false);
  const [step, setStep]         = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  const generateAndShare = async () => {
    if (!accessToken) { Alert.alert('Erro', 'Sessão expirada. Faça login novamente.'); return; }

    setLoading(true);
    setStep('Gerando prontuário...');

    try {
      // 1. Baixar o PDF da API
      setStep('Solicitando prontuário à API...');
      const response = await fetch(`${API_URL}/api/v1/export/pdf/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => response.status.toString());
        throw new Error(`Erro ${response.status}: ${text}`);
      }

      setStep('Processando documento...');
      const blob       = await response.blob();
      const base64Data = await blobToBase64(blob);

      // 2. Salvar no cache do device
      setStep('Salvando documento...');
      const fileName   = `prontuario-${new Date().toISOString().slice(0, 10)}.pdf`;
      const fileUri    = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setLastGenerated(new Date());
      setStep(null);
      setLoading(false);

      // 3. Compartilhar
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType:    'application/pdf',
          dialogTitle: 'Prontuário Médico Digital — IcodLife',
          UTI:         'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF salvo', `Arquivo salvo em:\n${fileUri}`);
      }
    } catch (e: any) {
      setStep(null);
      setLoading(false);
      Alert.alert('Erro ao gerar prontuário', e.message ?? 'Tente novamente.');
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.title}>📄 Prontuário Digital</Text>
          <Text style={s.headerSub}>Documento médico com assinatura digital</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Card do paciente */}
        <View style={s.patientCard}>
          <View style={s.patientAvatar}>
            <Text style={s.avatarText}>{user?.fullName?.charAt(0) ?? '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.patientName}>{user?.fullName ?? '—'}</Text>
            <Text style={s.patientSub}>Paciente IcodLife</Text>
            {lastGenerated && (
              <Text style={s.lastGen}>
                Último prontuário: {lastGenerated.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
              </Text>
            )}
          </View>
        </View>

        {/* O que é incluído */}
        <View style={s.includesCard}>
          <Text style={s.includesTitle}>📋 O que é incluído no prontuário</Text>
          {[
            ['👤', 'Dados pessoais, tipo sanguíneo, alergias'],
            ['💊', 'Medicamentos ativos e histórico'],
            ['🫀', 'Medições de pressão arterial'],
            ['🩸', 'Leituras de glicemia e HbA1c'],
            ['🧪', 'Resultados de exames recentes'],
            ['📅', 'Histórico de consultas médicas'],
            ['💉', 'Carteira de vacinação'],
            ['⚖️', 'Métricas corporais (peso, altura, IMC)'],
            ['🔐', 'Assinatura digital + QR de verificação'],
          ].map(([icon, text]) => (
            <View key={text} style={s.includeRow}>
              <Text style={s.includeIcon}>{icon}</Text>
              <Text style={s.includeText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Assinatura digital info */}
        <View style={s.sigCard}>
          <Text style={s.sigTitle}>🔐 Assinatura Digital</Text>
          <Text style={s.sigBody}>
            O prontuário é gerado com assinatura digital HMAC-SHA256 e inclui um QR Code de verificação.
            Qualquer médico ou profissional de saúde pode escanear o QR para confirmar a autenticidade do documento.
          </Text>
          <View style={s.sigBadge}>
            <Text style={s.sigBadgeText}>✓ Válido por 1 ano após a geração</Text>
          </View>
        </View>

        {/* Aviso legal */}
        <View style={s.legalCard}>
          <Text style={s.legalTitle}>⚠️ Aviso Legal</Text>
          <Text style={s.legalText}>
            Este documento é de uso médico confidencial. Compartilhe apenas com profissionais de saúde autorizados.
            Protegido pela LGPD (Lei 13.709/2018).
          </Text>
        </View>

        {/* Botão de geração */}
        <TouchableOpacity
          style={[s.generateBtn, loading && s.generateBtnDisabled]}
          onPress={generateAndShare}
          disabled={loading}
        >
          {loading ? (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#fff" />
              <Text style={s.generateBtnText}>{step ?? 'Aguarde...'}</Text>
            </View>
          ) : (
            <>
              <Text style={s.generateBtnIcon}>📥</Text>
              <Text style={s.generateBtnText}>Gerar e Compartilhar Prontuário</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Opção de compartilhamento por link */}
        <TouchableOpacity style={s.shareTokenBtn} onPress={() => navigation.navigate('ShareProntuario')}>
          <Text style={s.shareTokenIcon}>🔗</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.shareTokenTitle}>Compartilhar com médico por link</Text>
            <Text style={s.shareTokenSub}>Gera um link temporário sem download</Text>
          </View>
          <Text style={s.shareTokenArrow}>→</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helper: Blob → Base64 ─────────────────────────────────────────────────────
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
    reader.onload  = () => {
      const result = reader.result as string;
      // Remove o prefixo data:application/pdf;base64,
      resolve(result.split(',')[1] ?? result);
    };
    reader.readAsDataURL(blob);
  });
}

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#F4F8FF' },
  header:             { backgroundColor: '#002B5C', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn:            { padding: 4 },
  backText:           { color: '#fff', fontSize: 22, fontWeight: '700' },
  title:              { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub:          { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  content:            { padding: 16, gap: 12 },
  patientCard:        { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  patientAvatar:      { width: 52, height: 52, borderRadius: 26, backgroundColor: '#002B5C', alignItems: 'center', justifyContent: 'center' },
  avatarText:         { color: '#fff', fontSize: 22, fontWeight: '800' },
  patientName:        { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  patientSub:         { fontSize: 12, color: '#64748B', marginTop: 2 },
  lastGen:            { fontSize: 11, color: '#22C55E', marginTop: 3, fontWeight: '600' },
  includesCard:       { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  includesTitle:      { fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  includeRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  includeIcon:        { fontSize: 18, width: 24 },
  includeText:        { fontSize: 13, color: '#334155', flex: 1 },
  sigCard:            { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  sigTitle:           { fontSize: 13, fontWeight: '800', color: '#1D4ED8', marginBottom: 8 },
  sigBody:            { fontSize: 12, color: '#334155', lineHeight: 18 },
  sigBadge:           { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', marginTop: 10 },
  sigBadgeText:       { fontSize: 12, color: '#15803D', fontWeight: '700' },
  legalCard:          { backgroundColor: '#FEF9C3', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  legalTitle:         { fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  legalText:          { fontSize: 11, color: '#78350F', lineHeight: 16 },
  generateBtn:        { backgroundColor: '#002B5C', borderRadius: 16, padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, shadowColor: '#002B5C', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  generateBtnDisabled:{ opacity: 0.7, flexDirection: 'column' },
  generateBtnIcon:    { fontSize: 22 },
  generateBtnText:    { color: '#fff', fontSize: 16, fontWeight: '800' },
  shareTokenBtn:      { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  shareTokenIcon:     { fontSize: 22 },
  shareTokenTitle:    { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  shareTokenSub:      { fontSize: 11, color: '#64748B', marginTop: 2 },
  shareTokenArrow:    { fontSize: 18, color: '#3B82F6', fontWeight: '700' },
});
