// apps/mobile/src/screens/auth/RegisterScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert
} from 'react-native';
import { apiClient } from '../../services/api.client';

type Step = 0 | 1 | 2 | 3;
type Gender = 'male' | 'female' | 'other';

export default function RegisterScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    dateOfBirth: '', gender: '' as Gender | '',
    bloodType: 'unknown', isDonor: false, phone: '',
    allergies: '', chronicConditions: '',
    emergencyContactName: '', emergencyContactPhone: '',
    acceptedTerms: false, acceptedDataProcessing: false, acceptedMarketing: false,
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!form.fullName || !form.email || !form.password || !form.gender || !form.dateOfBirth) {
        Alert.alert('Preencha todos os campos obrigatórios'); return false;
      }
      if (form.password !== form.confirmPassword) {
        Alert.alert('Senhas não coincidem'); return false;
      }
      if (form.password.length < 8) {
        Alert.alert('Senha deve ter pelo menos 8 caracteres'); return false;
      }
    }
    if (step === 3) {
      if (!form.acceptedTerms || !form.acceptedDataProcessing) {
        Alert.alert('Você deve aceitar os termos obrigatórios'); return false;
      }
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep(s => (s + 1) as Step); };
  const back = () => setStep(s => (s - 1) as Step);

  const submit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    try {
      await apiClient.post('/auth/register', {
        ...form,
        allergies: form.allergies.split(',').map(s => s.trim()).filter(Boolean),
        chronicConditions: form.chronicConditions.split(',').map(s => s.trim()).filter(Boolean),
      });
      Alert.alert('✅ Cadastro realizado!', 'Verifique seu e-mail para ativar a conta.',
        [{ text: 'Ir para Login', onPress: () => navigation.navigate('Login') }]
      );
    } catch (e: any) {
      Alert.alert('Erro ao cadastrar', e.message || 'Tente novamente.');
    } finally { setLoading(false); }
  };

  const STEPS = ['Dados Pessoais', 'Saúde', 'Emergência', 'Termos'];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <TouchableOpacity onPress={() => step > 0 ? back() : navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Voltar</Text>
        </TouchableOpacity>

        {/* Progress */}
        <View style={s.progressRow}>
          {STEPS.map((_, i) => (
            <View key={i} style={[s.progressDot, { backgroundColor: i <= step ? '#0066CC' : '#E2E8F0' }]} />
          ))}
        </View>
        <Text style={s.stepLabel}>{STEPS[step]}</Text>
        <Text style={s.title}>Criar conta</Text>

        {/* STEP 0 — Dados pessoais */}
        {step === 0 && (
          <View>
            <Text style={s.label}>Nome completo *</Text>
            <TextInput style={s.input} value={form.fullName} onChangeText={v => set('fullName', v)} placeholder="João Carlos Silva" placeholderTextColor="#94A3B8" />

            <Text style={s.label}>E-mail *</Text>
            <TextInput style={s.input} keyboardType="email-address" autoCapitalize="none"
              value={form.email} onChangeText={v => set('email', v)} placeholder="seu@email.com" placeholderTextColor="#94A3B8" />

            <Text style={s.label}>Senha *</Text>
            <TextInput style={s.input} secureTextEntry value={form.password} onChangeText={v => set('password', v)} placeholder="Mín. 8 caracteres" placeholderTextColor="#94A3B8" />

            <Text style={s.label}>Confirmar senha *</Text>
            <TextInput style={s.input} secureTextEntry value={form.confirmPassword} onChangeText={v => set('confirmPassword', v)} placeholder="Repita a senha" placeholderTextColor="#94A3B8" />

            <Text style={s.label}>Data de nascimento * (AAAA-MM-DD)</Text>
            <TextInput style={s.input} value={form.dateOfBirth} onChangeText={v => set('dateOfBirth', v)} placeholder="1990-01-15" placeholderTextColor="#94A3B8" />

            <Text style={s.label}>Gênero *</Text>
            <View style={s.genderRow}>
              {[{v:'male',l:'♂ Masc.'},{v:'female',l:'♀ Fem.'},{v:'other',l:'⊕ Outro'}].map(g => (
                <TouchableOpacity key={g.v} style={[s.genderBtn, form.gender === g.v && s.genderBtnActive]}
                  onPress={() => set('gender', g.v)}>
                  <Text style={[s.genderBtnText, form.gender === g.v && s.genderBtnTextActive]}>{g.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {form.gender === 'female' && (
              <View style={s.femaleBadge}>
                <Text style={s.femaleBadgeText}>♀ Você terá acesso ao módulo de ciclo menstrual</Text>
              </View>
            )}
          </View>
        )}

        {/* STEP 1 — Saúde */}
        {step === 1 && (
          <View>
            <Text style={s.note}>Informações opcionais que ajudam em emergências.</Text>
            <Text style={s.label}>Alergias</Text>
            <TextInput style={s.input} value={form.allergies} onChangeText={v => set('allergies', v)} placeholder="Penicilina, látex... (separadas por vírgula)" placeholderTextColor="#94A3B8" />

            <Text style={s.label}>Condições crônicas</Text>
            <TextInput style={s.input} value={form.chronicConditions} onChangeText={v => set('chronicConditions', v)} placeholder="Hipertensão, diabetes..." placeholderTextColor="#94A3B8" />

            <Text style={s.label}>Tipo sanguíneo</Text>
            <View style={s.bloodRow}>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => (
                <TouchableOpacity key={b} style={[s.bloodBtn, form.bloodType === b && s.bloodBtnActive]}
                  onPress={() => set('bloodType', b)}>
                  <Text style={[s.bloodBtnText, form.bloodType === b && s.bloodBtnTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.checkRow} onPress={() => set('isDonor', !form.isDonor)}>
              <View style={[s.checkbox, form.isDonor && s.checkboxChecked]}>
                {form.isDonor && <Text style={s.checkmark}>✓</Text>}
              </View>
              <Text style={s.checkText}>Sou doador(a) de órgãos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2 — Emergência */}
        {step === 2 && (
          <View>
            <Text style={s.note}>Dados exibidos em emergências sem necessidade de login.</Text>
            <Text style={s.label}>Nome do contato</Text>
            <TextInput style={s.input} value={form.emergencyContactName} onChangeText={v => set('emergencyContactName', v)} placeholder="Maria Silva" placeholderTextColor="#94A3B8" />

            <Text style={s.label}>Telefone</Text>
            <TextInput style={s.input} keyboardType="phone-pad" value={form.emergencyContactPhone} onChangeText={v => set('emergencyContactPhone', v)} placeholder="+55 11 99999-9999" placeholderTextColor="#94A3B8" />

            <Text style={s.label}>Telefone pessoal</Text>
            <TextInput style={s.input} keyboardType="phone-pad" value={form.phone} onChangeText={v => set('phone', v)} placeholder="+55 11 99999-9999" placeholderTextColor="#94A3B8" />
          </View>
        )}

        {/* STEP 3 — Termos */}
        {step === 3 && (
          <View>
            <View style={s.termsBox}>
              <Text style={s.termsTitle}>Privacidade e Termos de Uso</Text>
              <Text style={s.termsText}>
                O IcodLife armazena seus dados com criptografia AES-256 em servidores no Brasil.
                Seus dados são de sua propriedade. Você pode exportá-los ou excluí-los a qualquer
                momento (LGPD Art. 18).
              </Text>
            </View>

            {[
              { key: 'acceptedTerms', label: '* Aceito os Termos de Uso', required: true },
              { key: 'acceptedDataProcessing', label: '* Autorizo o processamento dos meus dados (LGPD Art. 11)', required: true },
              { key: 'acceptedMarketing', label: 'Aceito receber comunicações do IcodLife (opcional)', required: false },
            ].map(item => (
              <TouchableOpacity key={item.key} style={s.checkRow} onPress={() => set(item.key, !(form as any)[item.key])}>
                <View style={[s.checkbox, (form as any)[item.key] && s.checkboxChecked]}>
                  {(form as any)[item.key] && <Text style={s.checkmark}>✓</Text>}
                </View>
                <Text style={[s.checkText, { flex: 1 }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Buttons */}
        <View style={s.btnRow}>
          {step < 3 ? (
            <TouchableOpacity style={s.btn} onPress={next}>
              <Text style={s.btnText}>Próximo →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={submit} disabled={loading}>
              <Text style={s.btnText}>{loading ? 'Criando conta...' : 'Criar conta ✓'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={s.loginText}>Já tem conta? <Text style={s.loginLink}>Entrar</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F8FF' },
  container: { padding: 24, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#0066CC', fontSize: 14, fontWeight: '600' },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  progressDot: { flex: 1, height: 4, borderRadius: 2 },
  stepLabel: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#1E293B', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 12, marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 13, fontSize: 15, color: '#1E293B' },
  note: { fontSize: 13, color: '#64748B', marginBottom: 12, lineHeight: 18 },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: { flex: 1, padding: 12, borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 10, alignItems: 'center', backgroundColor: '#fff' },
  genderBtnActive: { borderColor: '#0066CC', backgroundColor: '#EFF6FF' },
  genderBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  genderBtnTextActive: { color: '#0066CC' },
  femaleBadge: { backgroundColor: '#FDF2F8', borderWidth: 1, borderColor: '#F9A8D4', borderRadius: 10, padding: 10, marginTop: 10 },
  femaleBadgeText: { fontSize: 12, color: '#9D174D' },
  bloodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  bloodBtn: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#fff' },
  bloodBtnActive: { borderColor: '#0066CC', backgroundColor: '#EFF6FF' },
  bloodBtnText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  bloodBtnTextActive: { color: '#0066CC' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  checkboxChecked: { backgroundColor: '#0066CC', borderColor: '#0066CC' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '800' },
  checkText: { fontSize: 13, color: '#334155', lineHeight: 18 },
  termsBox: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, marginBottom: 8 },
  termsTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  termsText: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  btnRow: { marginTop: 28 },
  btn: { backgroundColor: '#0066CC', borderRadius: 14, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginText: { textAlign: 'center', color: '#64748B', fontSize: 14, marginTop: 20 },
  loginLink: { color: '#0066CC', fontWeight: '700' },
});
