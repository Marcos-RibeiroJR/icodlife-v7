// apps/mobile/src/screens/ophthalmology/OphthalmologyScreen.tsx
// Tela de Oftalmologia — React Native / Expo
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Alert, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '../../services/api.client';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Screen = 'home' | 'intro' | 'symptoms' | 'snellen' | 'astigmatism' | 'contrast' | 'result';
type Eye = 'right' | 'left';

// ─── Snellen rows ─────────────────────────────────────────────────────────────
const SNELLEN_ROWS = [
  { acuity: '20/200', letters: ['E'],                sizePx: 72 },
  { acuity: '20/100', letters: ['F','P'],             sizePx: 48 },
  { acuity: '20/70',  letters: ['T','O','Z'],          sizePx: 38 },
  { acuity: '20/50',  letters: ['L','P','E','D'],      sizePx: 32 },
  { acuity: '20/40',  letters: ['P','E','C','F','D'],  sizePx: 26 },
  { acuity: '20/30',  letters: ['E','D','F','C','Z','P'], sizePx: 22 },
  { acuity: '20/20',  letters: ['D','E','F','P','O','T'], sizePx: 18 },
];

const SYMPTOMS = [
  '🌫️ Visão turva',
  '🏔️ Dificuldade no longe',
  '📖 Dificuldade no perto',
  '🤕 Dor de cabeça',
  '😴 Olhos cansados',
  '💡 Halos em luzes',
];

const RISK_COLOR: Record<string, string> = {
  none: '#16a34a', low: '#ca8a04', moderate: '#ea580c', high: '#dc2626',
};
const RISK_LABEL: Record<string, string> = {
  none: '🟢 Normal', low: '🟡 Leve alteração', moderate: '🟠 Moderado', high: '🔴 Elevado',
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function OphthalmologyScreen() {
  const navigation = useNavigation();
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [snellenEye, setSnellenEye] = useState<Eye>('right');
  const [rowIdx, setRowIdx] = useState(0);
  const [acuityRight, setAcuityRight] = useState<string | null>(null);
  const [acuityLeft, setAcuityLeft] = useState<string | null>(null);
  const [astigRight, setAstigRight] = useState<boolean | null>(null);
  const [astigLeft, setAstigLeft] = useState<boolean | null>(null);
  const [contrastPhase, setContrastPhase] = useState<'right' | 'left' | 'done'>('right');
  const [contrastRight, setContrastRight] = useState<number>(1.0);
  const [contrastLeft, setContrastLeft] = useState<number>(1.0);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [recentExams, setRecentExams] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/ophthalmology/exams').then(({ data }) => setRecentExams(data.slice(0, 3))).catch(() => {});
  }, []);

  // ── Snellen: avançar linha ─────────────────────────────────────────────────
  const snellenAnswer = (canRead: boolean) => {
    const row = SNELLEN_ROWS[rowIdx];
    const nextIdx = rowIdx + 1;
    const isLast = nextIdx >= SNELLEN_ROWS.length;

    if (!canRead || isLast) {
      const acuity = canRead ? row.acuity : (rowIdx > 0 ? SNELLEN_ROWS[rowIdx - 1].acuity : '20/200');
      if (snellenEye === 'right') {
        setAcuityRight(acuity);
        setSnellenEye('left');
        setRowIdx(0);
      } else {
        setAcuityLeft(acuity);
        setScreen('astigmatism');
      }
    } else {
      setRowIdx(nextIdx);
    }
  };

  // ── Astigmatismo ───────────────────────────────────────────────────────────
  const answerAstig = (phase: 'right' | 'left', value: boolean) => {
    if (phase === 'right') {
      setAstigRight(value);
    } else {
      setAstigLeft(value);
      setScreen('contrast');
    }
  };

  // ── Contraste ──────────────────────────────────────────────────────────────
  const answerContrast = (phase: 'right' | 'left', score: number) => {
    if (phase === 'right') {
      setContrastRight(score);
      setContrastPhase('left');
    } else {
      setContrastLeft(score);
      submitExam(score);
    }
  };

  // ── Enviar exame ───────────────────────────────────────────────────────────
  const submitExam = async (contrastL: number) => {
    setLoading(true);
    try {
      const { data } = await apiClient.post('/ophthalmology/exams', {
        acuityRightEye: acuityRight ?? '20/20',
        acuityLeftEye:  acuityLeft  ?? '20/20',
        astigmatismRight: astigRight ?? false,
        astigmatismLeft:  astigLeft  ?? false,
        contrastScoreRight: contrastRight,
        contrastScoreLeft:  contrastL,
        symptoms: selectedSymptoms,
        deviceType: Platform.OS,
      });
      setResult(data);
      setScreen('result');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o exame. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER SCREENS
  // ─────────────────────────────────────────────────────────────────────────

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (screen === 'home') return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.headerIcon}>👁️</Text>
        <Text style={s.headerTitle}>Oftalmologia</Text>
        <Text style={s.headerSub}>Triagem visual digital</Text>
      </View>

      <TouchableOpacity style={s.ctaCard} onPress={() => setScreen('intro')}>
        <Text style={s.ctaIcon}>🔍</Text>
        <Text style={s.ctaTitle}>Iniciar Pré-Triagem Visual</Text>
        <Text style={s.ctaSub}>Miopia · Astigmatismo · Contraste · Estimativa por IA · ~5 min</Text>
      </TouchableOpacity>

      {recentExams.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>📋 Triagens recentes</Text>
          {recentExams.map((e: any) => (
            <View key={e.id} style={s.examCard}>
              <View style={s.examRow}>
                <Text style={s.examDate}>{new Date(e.createdAt).toLocaleDateString('pt-BR')}</Text>
                <Text style={[s.riskBadge, { color: RISK_COLOR[e.riskLevel] ?? '#64748b' }]}>
                  {RISK_LABEL[e.riskLevel] ?? '—'}
                </Text>
              </View>
              <Text style={s.examSub}>OD: {e.acuityRightEye ?? '—'} · OE: {e.acuityLeftEye ?? '—'}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={s.secondaryBtn} onPress={() => (navigation as any).navigate('Appointments', { specialty: 'Oftalmologia' })}>
        <Text style={s.secondaryBtnText}>📅 Agendar consulta com oftalmologista</Text>
      </TouchableOpacity>

      <View style={s.warning}>
        <Text style={s.warningText}>⚠️ Este exame é de pré-triagem e NÃO substitui avaliação presencial com oftalmologista.</Text>
      </View>
    </ScrollView>
  );

  // ── INTRO ─────────────────────────────────────────────────────────────────
  if (screen === 'intro') return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.stepTitle}>📋 Antes de começar</Text>
      {[
        '💡 Ambiente bem iluminado',
        '📱 Celular a ~40 cm dos olhos',
        '🙈 Você cobrirá um olho de cada vez',
        '👓 Remova os óculos para o teste',
        '⏱️ Reserve ~5 minutos',
      ].map((t, i) => <Text key={i} style={s.tip}>{t}</Text>)}
      <TouchableOpacity style={s.primaryBtn} onPress={() => setScreen('symptoms')}>
        <Text style={s.primaryBtnText}>Iniciar Exame →</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── SYMPTOMS ──────────────────────────────────────────────────────────────
  if (screen === 'symptoms') return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.stepTitle}>🩺 Você sente algum destes sintomas?</Text>
      {SYMPTOMS.map(sym => (
        <TouchableOpacity key={sym} style={[s.symBtn, selectedSymptoms.includes(sym) && s.symBtnActive]}
          onPress={() => setSelectedSymptoms(p => p.includes(sym) ? p.filter(x => x !== sym) : [...p, sym])}>
          <Text style={[s.symBtnText, selectedSymptoms.includes(sym) && s.symBtnTextActive]}>{sym}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={s.primaryBtn} onPress={() => { setScreen('snellen'); setSnellenEye('right'); setRowIdx(0); }}>
        <Text style={s.primaryBtnText}>Continuar →</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── SNELLEN ───────────────────────────────────────────────────────────────
  if (screen === 'snellen') {
    const row = SNELLEN_ROWS[rowIdx];
    return (
      <View style={s.container}>
        <View style={s.content}>
          <Text style={s.stepTitle}>🔤 Acuidade Visual</Text>
          <View style={[s.eyeBadge, snellenEye === 'right' ? s.eyeBadgeRight : s.eyeBadgeLeft]}>
            <Text style={s.eyeBadgeText}>👁️ Olho {snellenEye === 'right' ? 'Direito' : 'Esquerdo'}</Text>
          </View>
          <Text style={s.instruction}>
            {snellenEye === 'right'
              ? '🙈 Cubra o OLHO ESQUERDO e leia com o olho direito'
              : '🙈 Cubra o OLHO DIREITO e leia com o olho esquerdo'}
          </Text>

          {/* Optótipo */}
          <View style={s.snellenBox}>
            <Text style={s.snellenAcuity}>{row.acuity}</Text>
            <View style={s.snellenLetters}>
              {row.letters.map((l, i) => (
                <Text key={i} style={[s.snellenLetter, { fontSize: row.sizePx }]}>{l}</Text>
              ))}
            </View>
          </View>

          <Text style={s.instruction}>Consegue ler claramente?</Text>
          <View style={s.rowGap}>
            <TouchableOpacity style={[s.answerBtn, { backgroundColor: '#16a34a' }]} onPress={() => snellenAnswer(true)}>
              <Text style={s.answerBtnText}>✅ Sim, consigo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.answerBtn, { backgroundColor: '#dc2626' }]} onPress={() => snellenAnswer(false)}>
              <Text style={s.answerBtnText}>❌ Não consigo</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.rowCount}>Linha {rowIdx + 1} de {SNELLEN_ROWS.length}</Text>
        </View>
      </View>
    );
  }

  // ── ASTIGMATISM ───────────────────────────────────────────────────────────
  if (screen === 'astigmatism') {
    const phase: 'right' | 'left' = astigRight === null ? 'right' : 'left';
    return (
      <View style={s.container}>
        <View style={s.content}>
          <Text style={s.stepTitle}>⭕ Teste de Astigmatismo</Text>
          <View style={[s.eyeBadge, phase === 'right' ? s.eyeBadgeRight : s.eyeBadgeLeft]}>
            <Text style={s.eyeBadgeText}>👁️ Olho {phase === 'right' ? 'Direito' : 'Esquerdo'}</Text>
          </View>
          <Text style={s.instruction}>
            {phase === 'right' ? '🙈 Cubra o OLHO ESQUERDO.' : '🙈 Cubra o OLHO DIREITO.'}
            {'\n'}Fixe o olhar no ponto central por 5 segundos.
          </Text>
          {/* Roda SVG simplificada com linhas em texto */}
          <View style={s.astigBox}>
            {[0,30,60,90,120,150].map(deg => (
              <View key={deg} style={[s.astigLine, { transform: [{ rotate: `${deg}deg` }] }]} />
            ))}
            <View style={s.astigCenter} />
          </View>
          <Text style={s.instruction}>Algumas linhas aparecem mais escuras ou grossas?</Text>
          <View style={s.rowGap}>
            <TouchableOpacity style={[s.answerBtn, { backgroundColor: '#ea580c' }]} onPress={() => answerAstig(phase, true)}>
              <Text style={s.answerBtnText}>⚠️ Sim, são diferentes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.answerBtn, { backgroundColor: '#16a34a' }]} onPress={() => answerAstig(phase, false)}>
              <Text style={s.answerBtnText}>✅ Não, todas iguais</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── CONTRAST ──────────────────────────────────────────────────────────────
  if (screen === 'contrast') {
    const LEVELS = [
      { score: 1.0, bg: '#000', txt: '#fff' },
      { score: 0.6, bg: '#3d3d3d', txt: '#b8b8b8' },
      { score: 0.3, bg: '#7a7a7a', txt: '#9a9a9a' },
    ];
    const [levelIdx, setLevelIdx] = useState(0);
    const currentLevel = LEVELS[levelIdx];

    const handleContrastAnswer = (canSee: boolean) => {
      if (canSee && levelIdx < LEVELS.length - 1) {
        setLevelIdx(l => l + 1);
        return;
      }
      const score = canSee ? currentLevel.score : (levelIdx > 0 ? LEVELS[levelIdx - 1].score : 0);
      answerContrast(contrastPhase, score);
      setLevelIdx(0);
    };

    return (
      <View style={s.container}>
        <View style={s.content}>
          <Text style={s.stepTitle}>🔲 Sensibilidade ao Contraste</Text>
          <Text style={s.instruction}>
            Olho {contrastPhase === 'right' ? 'Direito' : 'Esquerdo'}: Você consegue identificar a letra abaixo?
          </Text>
          <View style={[s.contrastBox, { backgroundColor: currentLevel.bg }]}>
            <Text style={[s.contrastLetter, { color: currentLevel.txt }]}>E</Text>
          </View>
          <View style={s.rowGap}>
            <TouchableOpacity style={[s.answerBtn, { backgroundColor: '#16a34a' }]} onPress={() => handleContrastAnswer(true)}>
              <Text style={s.answerBtnText}>✅ Consigo ver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.answerBtn, { backgroundColor: '#dc2626' }]} onPress={() => handleContrastAnswer(false)}>
              <Text style={s.answerBtnText}>🙈 Não consigo</Text>
            </TouchableOpacity>
          </View>
          {loading && <Text style={s.instruction}>⏳ Processando resultados…</Text>}
        </View>
      </View>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (screen === 'result' && result) return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.stepTitle}>📋 Resultado da Triagem</Text>

      <View style={[s.riskCard, { borderColor: RISK_COLOR[result.riskLevel] ?? '#64748b' }]}>
        <Text style={[s.riskText, { color: RISK_COLOR[result.riskLevel] ?? '#64748b' }]}>
          {RISK_LABEL[result.riskLevel] ?? '—'}
        </Text>
        {result.confidenceScore && (
          <Text style={s.riskSub}>Confiança estimada: {result.confidenceScore}%</Text>
        )}
      </View>

      {result.reportSummary && <Text style={s.summaryText}>{result.reportSummary}</Text>}

      <View style={s.section}>
        <Text style={s.sectionTitle}>🔬 Acuidade Visual</Text>
        <View style={s.rowGap}>
          <View style={s.metricBox}><Text style={s.metricLabel}>OD</Text><Text style={s.metricValue}>{acuityRight ?? '—'}</Text></View>
          <View style={s.metricBox}><Text style={s.metricLabel}>OE</Text><Text style={s.metricValue}>{acuityLeft ?? '—'}</Text></View>
        </View>
      </View>

      {result.recommendations?.map((r: string, i: number) => (
        <Text key={i} style={s.rec}>{r}</Text>
      ))}

      <TouchableOpacity style={s.primaryBtn} onPress={() => setScreen('home')}>
        <Text style={s.primaryBtnText}>← Voltar ao início</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.secondaryBtn} onPress={() => (navigation as any).navigate('Appointments', { specialty: 'Oftalmologia' })}>
        <Text style={s.secondaryBtnText}>📅 Agendar consulta</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return null;
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f8fafc' },
  content:        { padding: 20, paddingBottom: 40 },
  header:         { alignItems: 'center', marginBottom: 24 },
  headerIcon:     { fontSize: 48, marginBottom: 4 },
  headerTitle:    { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  headerSub:      { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  ctaCard:        { backgroundColor: '#002B5C', borderRadius: 20, padding: 20, marginBottom: 20 },
  ctaIcon:        { fontSize: 36, marginBottom: 8, color: '#fff' },
  ctaTitle:       { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 4 },
  ctaSub:         { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  section:        { marginBottom: 16 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 10 },
  examCard:       { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  examRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  examDate:       { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  riskBadge:      { fontSize: 12, fontWeight: '700' },
  examSub:        { fontSize: 12, color: '#94a3b8' },
  warning:        { backgroundColor: '#fef9c3', borderRadius: 12, padding: 12, marginTop: 8 },
  warningText:    { fontSize: 12, color: '#854d0e', lineHeight: 16 },
  primaryBtn:     { backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryBtn:   { borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 2, borderColor: '#cbd5e1', marginBottom: 10 },
  secondaryBtnText:{ color: '#334155', fontWeight: '600', fontSize: 14 },
  stepTitle:      { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  tip:            { fontSize: 14, color: '#475569', marginBottom: 10, lineHeight: 20 },
  instruction:    { fontSize: 14, color: '#475569', marginBottom: 12, lineHeight: 20, textAlign: 'center' },
  eyeBadge:       { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  eyeBadgeRight:  { backgroundColor: '#eff6ff' },
  eyeBadgeLeft:   { backgroundColor: '#f5f3ff' },
  eyeBadgeText:   { fontWeight: '700', fontSize: 13, color: '#1e40af' },
  snellenBox:     { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginVertical: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  snellenAcuity:  { fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 8 },
  snellenLetters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  snellenLetter:  { fontFamily: 'monospace', fontWeight: '900', color: '#0f172a' },
  rowGap:         { flexDirection: 'row', gap: 10, marginVertical: 12 },
  answerBtn:      { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  answerBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  rowCount:       { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 4 },
  astigBox:       { width: 180, height: 180, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 20, position: 'relative' },
  astigLine:      { position: 'absolute', width: 2, height: 160, backgroundColor: '#0f172a', top: 10 },
  astigCenter:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6' },
  contrastBox:    { width: 160, height: 160, borderRadius: 16, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  contrastLetter: { fontSize: 80, fontWeight: '900', fontFamily: 'monospace' },
  riskCard:       { borderRadius: 16, borderWidth: 2, padding: 16, marginBottom: 16 },
  riskText:       { fontSize: 16, fontWeight: '800' },
  riskSub:        { fontSize: 12, color: '#64748b', marginTop: 4 },
  summaryText:    { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16 },
  metricBox:      { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  metricLabel:    { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  metricValue:    { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  rec:            { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 8 },
  symBtn:         { borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 },
  symBtnActive:   { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  symBtnText:     { fontSize: 14, color: '#475569' },
  symBtnTextActive:{ color: '#1d4ed8', fontWeight: '600' },
});
