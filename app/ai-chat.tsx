/**
 * app/ai-chat.tsx — مستر جيشو
 * AI Chat Assistant "جيشو" — multi-turn Arabic conversation about AI tools.
 * Persists chat history in AsyncStorage.
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, FlatList,
  KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useTheme } from '../contexts/ThemeContext';
import { getSupabaseClient } from '@/template';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

const { width: W } = Dimensions.get('window');
const C4 = 'Cairo_400Regular';
const C5 = 'Cairo_500Medium';
const C6 = 'Cairo_600SemiBold';
const C7 = 'Cairo_700Bold';
const HISTORY_KEY = '@mg_chat_history_v1';
const MAX_HISTORY = 50;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

const SUGGESTIONS = [
  'ما هي أفضل أدوات كتابة المحتوى بالذكاء الاصطناعي؟',
  'أريد أداة لتصميم الشعارات مجاناً',
  'ما الفرق بين ChatGPT وClaude وGemini؟',
  'اقترح لي أدوات للمطورين',
  'ما هي أفضل أدوات AI للتسويق؟',
  'كيف أختار الأداة المناسبة لاحتياجاتي؟',
];

// ─── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots({ color }: { color: string }) {
  return (
    <View style={td.wrap}>
      {[0, 1, 2].map(i => (
        <Animated.View key={i} entering={FadeIn.duration(300).delay(i * 150)} style={[td.dot, { backgroundColor: color }]} />
      ))}
    </View>
  );
}
const td = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 4 },
  dot:  { width: 7, height: 7, borderRadius: 3.5 },
});

// ─── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, theme, index }: { msg: Message; theme: any; index: number }) {
  const isUser = msg.role === 'user';
  const time = new Date(msg.ts).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  return (
    <Animated.View
      entering={FadeInDown.duration(260).delay(Math.min(index * 30, 200))}
      style={[bb.wrap, isUser ? bb.userWrap : bb.aiWrap]}
    >
      {!isUser && (
        <LinearGradient colors={['#3B82F6','#8B5CF6']} style={bb.avatar}>
          <Text style={{ fontSize: 13 }}>🤖</Text>
        </LinearGradient>
      )}
      <View style={[bb.bubble,
        isUser
          ? { backgroundColor: theme.primary, borderBottomRightRadius: 4 }
          : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderBottomLeftRadius: 4 },
        { maxWidth: W * 0.75 },
      ]}>
        <Text style={[bb.text, { color: isUser ? '#FFF' : theme.textPrimary }]}>
          {msg.content}
        </Text>
        <Text style={[bb.time, { color: isUser ? 'rgba(255,255,255,0.6)' : theme.textMuted }]}>
          {time}
        </Text>
      </View>
      {isUser && (
        <View style={[bb.avatar, { backgroundColor: theme.primaryDark }]}>
          <MaterialIcons name="person" size={14} color="#FFF" />
        </View>
      )}
    </Animated.View>
  );
}
const bb = StyleSheet.create({
  wrap:         { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'flex-end' },
  userWrap:     { justifyContent: 'flex-end' },
  aiWrap:       { justifyContent: 'flex-start' },
  avatar:       { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble:       { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  text:         { fontSize: 14, fontFamily: C4, lineHeight: 22 },
  time:         { fontSize: 10, fontFamily: C4, textAlign: 'right' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
function AIChatInner() {
  const { theme } = useTheme();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const listRef   = useRef<FlatList>(null);

  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [typing,    setTyping]    = useState(false);
  const [histLoaded, setHistLoaded] = useState(false);

  // Load history
  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then(raw => {
      if (raw) setMessages(JSON.parse(raw));
      setHistLoaded(true);
    });
  }, []);

  // Persist history
  const persist = useCallback((msgs: Message[]) => {
    const slice = msgs.slice(-MAX_HISTORY);
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(slice));
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || typing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim(), ts: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    persist(updated);
    setTyping(true);

    try {
      const supabase = getSupabaseClient();
      const apiMsgs  = updated.map(m => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke('ai-chat', { body: { messages: apiMsgs } });

      let reply = '';
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { const t = await error.context?.text(); if (t) msg = t; } catch {}
        }
        reply = 'حدث خطأ أثناء الاتصال. تحقق من الإنترنت وحاول مجدداً.';
        console.warn('ai-chat error:', msg);
      } else {
        reply = data?.reply || 'لم أتمكن من الرد. حاول مجدداً.';
      }

      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, ts: Date.now() };
      const withReply = [...updated, aiMsg];
      setMessages(withReply);
      persist(withReply);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('ai-chat exception:', e);
      const errMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'حدث خطأ غير متوقع. حاول مجدداً.', ts: Date.now() };
      const withErr = [...updated, errMsg];
      setMessages(withErr);
      persist(withErr);
    } finally {
      setTyping(false);
    }
  }, [messages, typing, persist]);

  const clearHistory = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages([]);
    AsyncStorage.removeItem(HISTORY_KEY);
  }, []);

  // Reversed for inverted FlatList
  const reversed = useMemo(() => [...messages].reverse(), [messages]);
  const isEmpty  = messages.length === 0 && histLoaded;

  return (
    <SafeAreaView edges={['top']} style={[cs.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[cs.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={[cs.iconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <MaterialIcons name="arrow-forward" size={20} color={theme.textPrimary} />
        </Pressable>

        <View style={cs.headerInfo}>
          <View style={cs.headerAvatar}>
            <LinearGradient colors={['#3B82F6','#8B5CF6']} style={cs.headerGrad}>
              <Text style={{ fontSize: 16 }}>🤖</Text>
            </LinearGradient>
            <View style={[cs.onlineDot, { backgroundColor: '#10B981' }]} />
          </View>
          <View>
            <Text style={[cs.headerName, { color: theme.textPrimary }]}>جيشو AI</Text>
            <Text style={[cs.headerSub, { color: '#10B981' }]}>متاح الآن · Gemini 3</Text>
          </View>
        </View>

        {messages.length > 0 && (
          <Pressable onPress={clearHistory} style={[cs.iconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MaterialIcons name="delete-outline" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Messages / Empty state */}
        {isEmpty ? (
          <Animated.View entering={FadeIn.duration(400)} style={cs.emptyWrap}>
            <LinearGradient colors={['#3B82F620','#8B5CF610']} style={cs.emptyIcon}>
              <MaterialIcons name="psychology" size={40} color={theme.primary} />
            </LinearGradient>
            <Text style={[cs.emptyTitle, { color: theme.textPrimary }]}>مرحباً! أنا جيشو</Text>
            <Text style={[cs.emptySub, { color: theme.textSecondary }]}>
              اسألني عن أي أداة AI، أو اطلب مني المقارنة والتوصية
            </Text>

            <View style={cs.suggestionsWrap}>
              {SUGGESTIONS.map((s, i) => (
                <Animated.View key={i} entering={FadeInDown.duration(260).delay(i * 50)}>
                  <Pressable
                    onPress={() => send(s)}
                    style={[cs.suggChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  >
                    <MaterialIcons name="lightbulb-outline" size={13} color={theme.primary} />
                    <Text style={[cs.suggText, { color: theme.textSecondary }]} numberOfLines={2}>{s}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        ) : (
          <FlatList
            ref={listRef}
            data={reversed}
            keyExtractor={m => m.id}
            inverted
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            renderItem={({ item, index }) => <Bubble msg={item} theme={theme} index={index} />}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={typing ? (
              <View style={cs.typingWrap}>
                <LinearGradient colors={['#3B82F6','#8B5CF6']} style={[bb.avatar, { marginLeft: 8 }]}>
                  <Text style={{ fontSize: 13 }}>🤖</Text>
                </LinearGradient>
                <View style={[cs.typingBubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <TypingDots color={theme.primary} />
                </View>
              </View>
            ) : null}
          />
        )}

        {/* Input bar */}
        <View style={[cs.inputBar, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={[cs.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
            placeholder="اسأل جيشو عن أي أداة AI..."
            placeholderTextColor={theme.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            textAlign="right"
            onSubmitEditing={() => send(input)}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || typing}
            style={[cs.sendBtn, { backgroundColor: input.trim() && !typing ? theme.primary : theme.border }]}
          >
            {typing
              ? <ActivityIndicator size="small" color="#FFF" />
              : <MaterialIcons name="send" size={18} color={input.trim() ? '#FFF' : theme.textMuted} />
            }
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function AIChatScreen() {
  const router = useRouter();
  return (
    <ErrorBoundary onNavigateHome={() => router.replace('/(tabs)' as any)}>
      <AIChatInner />
    </ErrorBoundary>
  );
}

const cs = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { position: 'relative' },
  headerGrad: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#FFF' },
  headerName: { fontSize: 16, fontFamily: C7 },
  headerSub: { fontSize: 11, fontFamily: C5 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  emptyIcon: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontFamily: C7, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: C4, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  suggestionsWrap: { width: '100%', gap: 8 },
  suggChip: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  suggText: { flex: 1, fontSize: 13, fontFamily: C5, lineHeight: 20 },
  typingWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 },
  typingBubble: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, borderBottomLeftRadius: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: C4, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
