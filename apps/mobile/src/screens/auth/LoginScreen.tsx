// apps/mobile/src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api.client';

export default function LoginScreen({ navigation }: any) {
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Preencha todos os campos'); return; }
    setLoading(true);
    try {
      const data = await apiClient.post('/auth/login', { email, password, ...(requiresMfa && { mfaCode }) });
      if (data.requiresMfa) { setRequiresMfa(true); return; }
      setAuth(data.user, data.accessToken, data.refreshToken);
    } catch (e: any) {
      Alert.alert('Erro ao entrar', e.message || 'Verifique suas credenciais');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={s.logoWrap}>
            <Text style={s.logoEmoji}>❤️</Text>
            <Text style={s.logoText}>IcodLife</Text>
          </View>
          <Text style={s.title}>Entrar</Text>
          <Text style={s.sub}>Seus dados médicos, sempre com você.</Text>

          {!requiresMfa ? (
            <>
              <View style={s.field}>
                <Text style={s.label}>E-mail</Text>
                <TextInput style={s.input} keyboardType="email-address" autoCapitalize="none"
                  value={email} onChangeText={setEmail} placeholder="seu@email.com" placeholderTextColor="#94A3B8" />
              </View>
              <View style={s.field}>
                <Text style={s.label}>Senha</Text>
                <TextInput style={s.input} secureTextEntry
                  value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#94A3B8" />
              </View>
              <TouchableOpacity onPress={() => Alert.alert('Em breve', 'Recuperação de senha via e-mail')}>
                <Text style={s.forgotText}>Esqueci a senha</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={s.field}>
              <Text style={s.label}>Código MFA (6 dígitos)</Text>
              <TextInput style={[s.input, s.mfaInput]} keyboardType="number-pad" maxLength={6}
                value={mfaCode} onChangeText={setMfaCode} placeholder="000000" placeholderTextColor="#94A3B8" />
            </View>
          )}

          <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading}>
            <Text style={s.btnText}>{loading ? 'Entrando...' : requiresMfa ? 'Verificar' : 'Entrar'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.govBtn} onPress={() => Alert.alert('gov.br', 'Integração gov.br disponível em breve')}>
            <Text style={s.govBtnText}>🇧🇷  Entrar com gov.br</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={s.registerText}>Não tem conta? <Text style={s.registerLink}>Cadastrar grátis</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F8FF' },
  container: { padding: 28, paddingTop: 48 },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  logoEmoji: { fontSize: 28 },
  logoText: { fontSize: 24, fontWeight: '800', color: '#002B5C' },
  title: { fontSize: 28, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  sub: { fontSize: 14, color: '#64748B', marginBottom: 28 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1E293B' },
  mfaInput: { textAlign: 'center', letterSpacing: 12, fontSize: 24, fontWeight: '700' },
  forgotText: { textAlign: 'right', color: '#0066CC', fontSize: 13, fontWeight: '600', marginTop: -4, marginBottom: 20 },
  btn: { backgroundColor: '#0066CC', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  govBtn: { borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 12 },
  govBtnText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  registerText: { textAlign: 'center', color: '#64748B', fontSize: 14, marginTop: 24 },
  registerLink: { color: '#0066CC', fontWeight: '700' },
});
