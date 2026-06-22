// apps/mobile/src/screens/profile/ProfileScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api.client';

export default function ProfileScreen() {
  const { user, logout, token } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('⚠️ Deletar conta', 'Todos os seus dados serão removidos permanentemente. Isso não pode ser desfeito.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Deletar', style: 'destructive', onPress: async () => {
          try {
            await apiClient.delete('/auth/account', token);
            logout();
          } catch (e: any) { Alert.alert('Erro', e.message); }
        }},
      ]
    );
  };

  const ITEMS = [
    { icon: '🔒', label: 'Gestão de acessos', action: () => Alert.alert('Em breve', 'Disponível na versão web') },
    { icon: '🛡️', label: 'Privacidade & LGPD', action: () => Alert.alert('Em breve') },
    { icon: '🔐', label: 'Segurança & MFA', action: () => Alert.alert('Em breve') },
    { icon: '📤', label: 'Exportar meus dados', action: () => Alert.alert('Solicitação enviada', 'Você receberá um e-mail em até 24h.') },
    { icon: '❓', label: 'Ajuda & suporte', action: () => Alert.alert('Suporte', 'suporte@icodlife.com.br') },
    { icon: '📋', label: 'Termos de uso', action: () => Alert.alert('Em breve') },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll}>
        <View style={s.header}>
          <View style={s.avatar}><Text style={s.avatarText}>{user?.fullName?.charAt(0) ?? '?'}</Text></View>
          <Text style={s.name}>{user?.fullName}</Text>
          <Text style={s.email}>{user?.email}</Text>
          <View style={s.badges}>
            <Text style={s.badge}>{user?.gender === 'female' ? '♀ Feminino' : user?.gender === 'male' ? '♂ Masculino' : '⊕ Outro'}</Text>
            {user?.bloodType && user.bloodType !== 'unknown' && <Text style={s.badge}>🩸 {user.bloodType}</Text>}
            <Text style={[s.badge, s.badgeGreen]}>✓ {user?.status}</Text>
          </View>
        </View>

        <View style={s.section}>
          {ITEMS.map((item, i) => (
            <TouchableOpacity key={i} style={[s.item, i < ITEMS.length - 1 && s.itemBorder]} onPress={item.action}>
              <Text style={s.itemIcon}>{item.icon}</Text>
              <Text style={s.itemLabel}>{item.label}</Text>
              <Text style={s.itemArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>🚪  Sair da conta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.deleteBtn} onPress={handleDeleteAccount}>
          <Text style={s.deleteText}>⚠️  Deletar minha conta (LGPD)</Text>
        </TouchableOpacity>

        <Text style={s.version}>IcodLife v0.1 MVP · LGPD Compliant</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F8FF' },
  scroll: { flex: 1 },
  header: { backgroundColor: '#002B5C', padding: 24, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#00A896', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: '#fff' },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: { backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, fontSize: 11, fontWeight: '600' },
  badgeGreen: { backgroundColor: 'rgba(16,185,129,0.3)' },
  section: { backgroundColor: '#fff', margin: 16, borderRadius: 16, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  itemLabel: { flex: 1, fontSize: 15, color: '#1E293B', fontWeight: '500' },
  itemArrow: { fontSize: 20, color: '#94A3B8' },
  logoutBtn: { margin: 16, marginTop: 0, backgroundColor: '#F1F5F9', borderRadius: 14, padding: 16, alignItems: 'center' },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#334155' },
  deleteBtn: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1.5, borderColor: '#FECACA', borderRadius: 14, padding: 14, alignItems: 'center' },
  deleteText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },
  version: { textAlign: 'center', color: '#94A3B8', fontSize: 11, marginBottom: 24 },
});
