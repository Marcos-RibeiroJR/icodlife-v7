// apps/mobile/src/screens/chat/HealthChatScreen.tsx
// Tela principal do chatbot de saúde — mobile-first
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, SafeAreaView
} from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api.client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_REPLIES = [
  'Sim, dormei bem ✓',
  'Não dormi bem',
  'Mais ou menos',
  'Sim, tenho dor',
  'Não tenho dor',
  'Estou bem hoje',
  'Não estou muito bem',
];

export default function HealthChatScreen() {
  const { user, accessToken: token } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [flags, setFlags] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => { startSession(); }, []);

  const startSession = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/ai-chat/start', {}, token);
      if (res.alreadyCompleted) {
        setSessionComplete(true);
        setMessages([{
          id: 'done',
          role: 'assistant',
          content: 'Você já completou o check-in de saúde de hoje! Volte amanhã. 🌟',
          timestamp: new Date().toISOString(),
        }]);
      } else if (res.nextQuestion) {
        setMessages([{ id: Date.now().toString(), ...res.nextQuestion }]);
        setStarted(true);
      }
    } catch (e) {
      console.error('Error starting chat:', e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    setInput('');
    setLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await apiClient.post('/ai-chat/message', { message: messageText }, token);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.message,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);

      if (res.sessionComplete) {
        setSessionComplete(true);
        setFlags(res.flags || []);
      }
    } catch (e) {
      console.error('Error sending message:', e);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, tive um problema. Tente novamente.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowBot]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Text style={styles.botAvatarText}>🤖</Text>
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleBot
        ]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}>
            {item.content}
          </Text>
          <Text style={styles.bubbleTime}>
            {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>HealthBot</Text>
          <Text style={styles.headerSub}>Check-in de saúde diário</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: sessionComplete ? '#10B981' : '#0066CC' }]} />
      </View>

      {/* Flags de alerta */}
      {flags.length > 0 && (
        <View style={styles.flagsContainer}>
          <Text style={styles.flagsTitle}>⚠️ Pontos de atenção registrados</Text>
          {flags.map(f => (
            <Text key={f} style={styles.flagItem}>
              {f === 'severe_pain' ? '• Dor intensa — considere consultar um médico' :
               f === 'possible_illness' ? '• Possível mal-estar detectado' :
               f === 'sleep_issue' ? '• Problema de sono registrado' : `• ${f}`}
            </Text>
          ))}
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Loading indicator */}
      {loading && (
        <View style={styles.typingIndicator}>
          <View style={styles.botAvatar}><Text style={styles.botAvatarText}>🤖</Text></View>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color="#0066CC" />
          </View>
        </View>
      )}

      {/* Quick replies */}
      {!sessionComplete && !loading && messages.length > 0 && (
        <View>
          <FlatList
            data={QUICK_REPLIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={i => i}
            contentContainerStyle={styles.quickReplies}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.quickReply} onPress={() => sendMessage(item)}>
                <Text style={styles.quickReplyText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={sessionComplete ? 'Check-in completo! ✓' : 'Digite sua resposta...'}
            placeholderTextColor="#94A3B8"
            editable={!sessionComplete && !loading}
            multiline
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading || sessionComplete) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading || sessionComplete}
          >
            <Text style={styles.sendBtnText}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F8FF' },
  header: {
    backgroundColor: '#003F7D', padding: 16, paddingTop: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  headerInfo: {},
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  flagsContainer: {
    backgroundColor: '#FEF3C7', margin: 12, borderRadius: 10,
    padding: 12, borderLeftWidth: 4, borderLeftColor: '#F59E0B'
  },
  flagsTitle: { fontWeight: '700', fontSize: 13, color: '#92400E', marginBottom: 4 },
  flagItem: { fontSize: 12, color: '#78350F', marginTop: 2 },
  messageList: { padding: 16, paddingBottom: 8 },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowBot: { justifyContent: 'flex-start' },
  botAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
    marginRight: 6, marginBottom: 4
  },
  botAvatarText: { fontSize: 16 },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: 12 },
  bubbleUser: { backgroundColor: '#0066CC', borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextBot: { color: '#1E293B' },
  bubbleTime: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4, textAlign: 'right' },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4 },
  typingBubble: { backgroundColor: '#fff', borderRadius: 16, padding: 12, elevation: 1 },
  quickReplies: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  quickReply: {
    backgroundColor: '#fff', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: '#BFDBFE', marginRight: 6
  },
  quickReplyText: { color: '#0066CC', fontSize: 13, fontWeight: '500' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: '#fff', padding: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 8
  },
  input: {
    flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, padding: 12,
    fontSize: 15, maxHeight: 100, color: '#1E293B'
  },
  sendBtn: { backgroundColor: '#0066CC', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
