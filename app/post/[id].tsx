/**
 * app/post/[id].tsx — مستر جيشو
 * Premium article reader with AI summary, reading progress, reactions.
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Share,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedRN, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useTheme } from '../../contexts/ThemeContext';
import { getPostById, formatPostDate, POST_CATEGORIES, PostSection } from '../../services/postsService';
import { getSupabaseClient } from '@/template';

const { width: W } = Dimensions.get('window');
const TJ   = 'Tajawal_400Regular';
const TJM  = 'Tajawal_500Medium';
const TJB  = 'Tajawal_700Bold';
const TJEB = 'Tajawal_800ExtraBold';

// ─── Reading Progress Bar ──────────────────────────────────────────────────────
function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <View style={pb.track}>
      <View style={[pb.fill, {
        width: `${Math.min(100, Math.max(0, progress * 100))}%` as any,
        backgroundColor: color,
      }]} />
    </View>
  );
}
const pb = StyleSheet.create({
  track: { height: 3, backgroundColor: 'rgba(0,0,0,0.08)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  fill:  { height: '100%' },
});

// ─── AI Summary Card ───────────────────────────────────────────────────────────
type SummaryState = 'idle' | 'loading' | 'success' | 'error';

function AISummaryCard({ post, theme }: { post: ReturnType<typeof getPostById> & {}; theme: any }) {
  const [state, setState] = useState<SummaryState>('idle');
  const [summary, setSummary] = useState('');

  const handleGenerate = useCallback(async () => {
    setState('loading');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const supabase = getSupabaseClient();
      const textContent = (post!.sections || [])
        .filter((s: any) => ['paragraph', 'heading', 'highlight', 'bullet'].includes(s.type))
        .map((s: any) => s.text || (s.items?.join(' ') ?? ''))
        .join('\n\n')
        .slice(0, 4000);

      const { data, error } = await supabase.functions.invoke('ai-summary', {
        body: { title: post!.title, content: textContent },
      });

      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const txt = await error.context?.text();
            if (txt) msg = txt;
          } catch {}
        }
        console.warn('AI Summary error:', msg);
        setState('error');
        return;
      }

      setSummary(data?.summary || '');
      setState('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('AI Summary exception:', e);
      setState('error');
    }
  }, [post]);

  return (
    <AnimatedRN.View entering={FadeInDown.duration(340).delay(260)}>
      <LinearGradient
        colors={['#A78BFA1E', '#3B82F610']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[ais.card, { borderColor: '#A78BFA35' }]}
      >
        {/* Header row */}
        <View style={ais.header}>
          <View style={ais.iconBg}>
            <MaterialIcons name="auto-awesome" size={15} color="#A78BFA" />
          </View>
          <Text style={[ais.label, { color: theme.textPrimary }]}>ملخص الذكاء الاصطناعي</Text>
          {state === 'success' && (
            <View style={ais.doneBadge}>
              <MaterialIcons name="check-circle" size={12} color="#10B981" />
              <Text style={[ais.doneText, { color: '#10B981' }]}>جاهز</Text>
            </View>
          )}
          <View style={ais.poweredBy}>
            <Text style={[ais.poweredText, { color: theme.textMuted }]}>Gemini 3</Text>
          </View>
        </View>

        {/* Idle */}
        {state === 'idle' && (
          <View style={ais.idleBody}>
            <Text style={[ais.idleDesc, { color: theme.textSecondary }]}>
              احصل على ملخص ذكي للمقال في ثوانٍ، مولّد بواسطة الذكاء الاصطناعي
            </Text>
            <Pressable
              onPress={handleGenerate}
              style={ais.genBtn}
            >
              <LinearGradient
                colors={['#A78BFA', '#7C3AED']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={ais.genGradient}
              >
                <MaterialIcons name="psychology" size={15} color="#FFF" />
                <Text style={ais.genBtnText}>اطلب الملخص الذكي</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Loading */}
        {state === 'loading' && (
          <View style={ais.loadingWrap}>
            <ActivityIndicator size="small" color="#A78BFA" />
            <View style={ais.loadingDots}>
              {['يحلل...', 'يلخص...', 'يصيغ...'].map((label, i) => (
                <View key={i} style={[ais.loadingStep, { backgroundColor: '#A78BFA' + (i === 0 ? 'FF' : i === 1 ? '80' : '40') }]}>
                  <Text style={ais.loadingStepText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Success */}
        {state === 'success' && summary ? (
          <View style={ais.summaryWrap}>
            <Text style={[ais.summaryText, { color: theme.textPrimary }]}>{summary}</Text>
            <Pressable
              onPress={() => { setState('idle'); setSummary(''); Haptics.selectionAsync(); }}
              style={[ais.resetBtn, { borderColor: '#A78BFA40' }]}
            >
              <MaterialIcons name="refresh" size={13} color="#A78BFA" />
              <Text style={ais.resetBtnText}>إعادة التلخيص</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Error */}
        {state === 'error' && (
          <View style={ais.errorWrap}>
            <MaterialIcons name="error-outline" size={18} color="#EF4444" />
            <Text style={[ais.errorText, { color: '#EF4444' }]}>
              لم يتمكن من إنشاء الملخص. تحقق من الاتصال وحاول مجدداً.
            </Text>
            <Pressable onPress={handleGenerate} style={ais.retryBtn}>
              <MaterialIcons name="refresh" size={13} color="#EF4444" />
              <Text style={ais.retryText}>إعادة المحاولة</Text>
            </Pressable>
          </View>
        )}
      </LinearGradient>
    </AnimatedRN.View>
  );
}

const ais = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  iconBg: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: '#A78BFA20',
    alignItems: 'center', justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 14, fontFamily: TJEB },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  doneText: { fontSize: 11, fontFamily: TJB },
  poweredBy: {
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6, backgroundColor: '#A78BFA15',
  },
  poweredText: { fontSize: 9, fontFamily: TJM },
  idleBody: { gap: 10 },
  idleDesc: { fontSize: 13, fontFamily: TJ, lineHeight: 22, textAlign: 'right' },
  genBtn: { borderRadius: 10, overflow: 'hidden' },
  genGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11 },
  genBtnText: { fontSize: 14, fontFamily: TJB, color: '#FFF' },
  loadingWrap: { gap: 12, alignItems: 'center', paddingVertical: 8 },
  loadingDots: { flexDirection: 'row', gap: 8 },
  loadingStep: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  loadingStepText: { fontSize: 11, fontFamily: TJB, color: '#FFF' },
  summaryWrap: { gap: 10 },
  summaryText: { fontSize: 14, fontFamily: TJ, lineHeight: 26, textAlign: 'right' },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginTop: 4,
  },
  resetBtnText: { fontSize: 12, fontFamily: TJB, color: '#A78BFA' },
  errorWrap: { gap: 8, alignItems: 'center', paddingVertical: 4 },
  errorText: { fontSize: 13, fontFamily: TJ, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#EF444415', borderWidth: 1, borderColor: '#EF444435',
  },
  retryText: { fontSize: 12, fontFamily: TJB, color: '#EF4444' },
});

// ─── Section Renderer ──────────────────────────────────────────────────────────
function RenderSection({ section, index, theme, catColor }: {
  section: PostSection; index: number; theme: any; catColor: string;
}) {
  const delay = Math.min(index * 45, 500);
  switch (section.type) {
    case 'heading':
      return (
        <AnimatedRN.View entering={FadeInDown.duration(280).delay(delay)}>
          <View style={[rs.headingRow, { borderRightColor: catColor }]}>
            <Text style={[rs.headingText, { color: theme.textPrimary }]}>{section.text}</Text>
          </View>
        </AnimatedRN.View>
      );
    case 'paragraph':
      return (
        <AnimatedRN.View entering={FadeInDown.duration(280).delay(delay)}>
          <Text style={[rs.paraText, { color: theme.textSecondary }]}>{section.text}</Text>
        </AnimatedRN.View>
      );
    case 'bullet':
      return (
        <AnimatedRN.View entering={FadeInDown.duration(280).delay(delay)} style={rs.bulletList}>
          {section.items?.map((item, i) => (
            <View key={i} style={rs.bulletItem}>
              <View style={[rs.bulletDot, { backgroundColor: catColor }]} />
              <Text style={[rs.bulletText, { color: theme.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </AnimatedRN.View>
      );
    case 'highlight':
      return (
        <AnimatedRN.View entering={FadeInDown.duration(280).delay(delay)}>
          <LinearGradient
            colors={[(section.color || catColor) + '20', (section.color || catColor) + '08']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[rs.highlight, { borderRightColor: section.color || catColor }]}
          >
            <MaterialIcons name="auto-awesome" size={15} color={section.color || catColor} style={{ marginBottom: 6 }} />
            <Text style={[rs.highlightText, { color: theme.textPrimary }]}>{section.text}</Text>
          </LinearGradient>
        </AnimatedRN.View>
      );
    case 'quote':
      return (
        <AnimatedRN.View entering={FadeInDown.duration(280).delay(delay)}>
          <View style={[rs.quote, { borderRightColor: catColor + '80', backgroundColor: theme.surface }]}>
            <Text style={[rs.quoteIcon, { color: catColor }]}>"</Text>
            <Text style={[rs.quoteText, { color: theme.textSecondary }]}>{section.text}</Text>
          </View>
        </AnimatedRN.View>
      );
    case 'divider':
      return <View style={[rs.divider, { backgroundColor: theme.border }]} />;
    default:
      return null;
  }
}

const rs = StyleSheet.create({
  headingRow: { borderRightWidth: 4, paddingRight: 12, paddingVertical: 4, marginVertical: 4 },
  headingText: { fontSize: 19, fontFamily: TJEB, lineHeight: 30, textAlign: 'right' },
  paraText: { fontSize: 15, fontFamily: TJ, lineHeight: 28, textAlign: 'right' },
  bulletList: { gap: 10 },
  bulletItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bulletDot: { width: 8, height: 8, borderRadius: 4, marginTop: 10, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 15, fontFamily: TJ, lineHeight: 26, textAlign: 'right' },
  highlight: { borderRadius: 14, padding: 16, borderRightWidth: 4 },
  highlightText: { fontSize: 15, fontFamily: TJB, lineHeight: 26, textAlign: 'right' },
  quote: { borderRadius: 14, padding: 16, borderRightWidth: 3 },
  quoteIcon: { fontSize: 40, fontFamily: TJEB, lineHeight: 36, opacity: 0.6 },
  quoteText: { fontSize: 15, fontFamily: TJM, lineHeight: 26, textAlign: 'right', fontStyle: 'italic' },
  divider: { height: 1, marginVertical: 8 },
});

// ─── Reactions Bar ─────────────────────────────────────────────────────────────
const BASE_REACTIONS = [
  { emoji: '👍', label: 'مفيد', baseCount: 45 },
  { emoji: '❤️', label: 'رائع', baseCount: 72 },
  { emoji: '🔥', label: 'ممتاز', baseCount: 38 },
  { emoji: '👏', label: 'إبداع', baseCount: 29 },
  { emoji: '😍', label: 'أحبه', baseCount: 54 },
];

function ReactionsBar({ catColor, theme }: { catColor: string; theme: any }) {
  const [reactions, setReactions] = useState(
    BASE_REACTIONS.map(r => ({ ...r, count: r.baseCount + Math.floor(Math.random() * 30), active: false }))
  );

  const toggle = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReactions(prev => prev.map((r, idx) =>
      idx === i ? { ...r, active: !r.active, count: r.active ? r.count - 1 : r.count + 1 } : r
    ));
  };

  return (
    <View style={rbs.wrap}>
      <Text style={[rbs.title, { color: theme.textPrimary }]}>تفاعل مع المنشور</Text>
      <View style={rbs.row}>
        {reactions.map((r, i) => (
          <Pressable
            key={i}
            onPress={() => toggle(i)}
            style={[
              rbs.btn,
              {
                backgroundColor: r.active ? catColor + '20' : theme.surface,
                borderColor: r.active ? catColor : theme.border,
              },
            ]}
          >
            <Text style={rbs.emoji}>{r.emoji}</Text>
            <Text style={[rbs.count, { color: r.active ? catColor : theme.textMuted }]}>{r.count}</Text>
            <Text style={[rbs.label, { color: r.active ? catColor : theme.textMuted }]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const rbs = StyleSheet.create({
  wrap:  { paddingHorizontal: 20, marginTop: 8, gap: 12 },
  title: { fontSize: 15, fontFamily: TJEB, textAlign: 'right' },
  row:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  btn:   { alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, minWidth: 58 },
  emoji: { fontSize: 22 },
  count: { fontSize: 13, fontFamily: TJB },
  label: { fontSize: 10, fontFamily: TJM },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const post = useMemo(() => getPostById(id || ''), [id]);
  const category = useMemo(() => POST_CATEGORIES.find(c => c.id === post?.category), [post]);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const max = contentSize.height - layoutMeasurement.height;
    if (max > 0) setScrollProgress(contentOffset.y / max);
  }, []);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!post) return;
    await Share.share({ title: post.title, message: `📖 ${post.title}\n\n${post.summary}\n\n🔗 مستر جيشو` });
  };

  if (!post) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name="article" size={64} color={theme.textMuted} />
        <Text style={{ fontFamily: TJB, color: theme.textMuted, fontSize: 16, marginTop: 12 }}>المنشور غير موجود</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: theme.primary, borderRadius: 10 }}>
          <Text style={{ fontFamily: TJB, color: '#FFF', fontSize: 14 }}>العودة</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const catColor = post.categoryColor;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Reading progress */}
      <ProgressBar progress={scrollProgress} color={catColor} />

      {/* Header */}
      <View style={[ps.header, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[ps.iconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <MaterialIcons name="arrow-forward" size={20} color={theme.textPrimary} />
        </Pressable>

        {/* Progress text */}
        <View style={[ps.progressChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <MaterialIcons name="schedule" size={12} color={theme.textMuted} />
          <Text style={[ps.progressChipText, { color: theme.textMuted }]}>
            {post.readTime} دق · {Math.round(scrollProgress * 100)}%
          </Text>
        </View>

        <View style={ps.headerActions}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setLiked(v => !v); }}
            style={[ps.iconBtn, { backgroundColor: liked ? '#EF444420' : theme.surface, borderColor: liked ? '#EF444440' : theme.border }]}
          >
            <MaterialIcons name={liked ? 'favorite' : 'favorite-border'} size={18} color={liked ? '#EF4444' : theme.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setBookmarked(v => !v); }}
            style={[ps.iconBtn, { backgroundColor: bookmarked ? catColor + '20' : theme.surface, borderColor: bookmarked ? catColor + '40' : theme.border }]}
          >
            <MaterialIcons name={bookmarked ? 'bookmark' : 'bookmark-border'} size={18} color={bookmarked ? catColor : theme.textMuted} />
          </Pressable>
          <Pressable onPress={handleShare} style={[ps.iconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MaterialIcons name="share" size={18} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      >
        {/* ── Article Header ── */}
        <AnimatedRN.View entering={FadeInDown.duration(400)} style={ps.articleHeader}>
          {/* Category chip */}
          <AnimatedRN.View entering={ZoomIn.springify().damping(14).delay(80)}>
            <View style={[ps.catChip, { backgroundColor: catColor + '20', borderColor: catColor + '40' }]}>
              <MaterialIcons name={post.categoryIcon as any} size={14} color={catColor} />
              <Text style={[ps.catChipText, { color: catColor }]}>{category?.label || post.category}</Text>
            </View>
          </AnimatedRN.View>

          {/* Title */}
          <AnimatedRN.View entering={FadeInDown.duration(360).delay(120)}>
            <Text style={[ps.title, { color: theme.textPrimary }]}>{post.title}</Text>
          </AnimatedRN.View>

          {/* Summary */}
          <AnimatedRN.View entering={FadeInDown.duration(340).delay(160)}>
            <Text style={[ps.summary, { color: theme.textSecondary }]}>{post.summary}</Text>
          </AnimatedRN.View>

          {/* Author + date row */}
          <AnimatedRN.View entering={FadeInDown.duration(300).delay(200)} style={ps.authorRow}>
            <View style={[ps.authorAvatar, { backgroundColor: catColor }]}>
              <Text style={ps.authorInitial}>مج</Text>
            </View>
            <View>
              <Text style={[ps.authorName, { color: theme.textPrimary }]}>{post.author}</Text>
              <Text style={[ps.authorDate, { color: theme.textMuted }]}>{formatPostDate(post.date)}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <View style={[ps.verifiedBadge, { backgroundColor: catColor + '20', borderColor: catColor + '40' }]}>
              <MaterialIcons name="verified" size={12} color={catColor} />
              <Text style={[ps.verifiedText, { color: catColor }]}>موثّق</Text>
            </View>
          </AnimatedRN.View>
        </AnimatedRN.View>

        {/* ── Cover Image ── */}
        <AnimatedRN.View entering={FadeInDown.duration(400).delay(240)} style={ps.coverWrap}>
          <Image
            source={{ uri: post.coverImage }}
            style={ps.coverImage}
            contentFit="cover"
            transition={400}
          />
          <LinearGradient
            colors={[catColor + '25', 'transparent']}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
          />
        </AnimatedRN.View>

        {/* ── Stats row ── */}
        <AnimatedRN.View entering={FadeInDown.duration(300).delay(280)} style={ps.statsRow}>
          {[
            { icon: 'visibility', val: post.views.toLocaleString('ar-EG'), label: 'مشاهدة' },
            { icon: 'schedule', val: `${post.readTime} دق`, label: 'للقراءة' },
            { icon: 'format-size', val: `${post.wordCount}`, label: 'كلمة' },
            { icon: 'favorite-border', val: `${post.likes}`, label: 'إعجاب' },
            { icon: 'share', val: `${post.shares}`, label: 'مشاركة' },
          ].map((s, i) => (
            <View key={i} style={[ps.statItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MaterialIcons name={s.icon as any} size={14} color={catColor} />
              <Text style={[ps.statVal, { color: theme.textPrimary }]}>{s.val}</Text>
              <Text style={[ps.statLabel, { color: theme.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </AnimatedRN.View>

        {/* ── AI Summary Card ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
          <AISummaryCard post={post} theme={theme} />
        </View>

        {/* ── Content Sections ── */}
        <View style={ps.content}>
          {post.sections.map((section, i) => (
            <RenderSection key={i} section={section} index={i} theme={theme} catColor={catColor} />
          ))}
        </View>

        {/* ── Tags ── */}
        <AnimatedRN.View entering={FadeInDown.duration(300).delay(300)} style={ps.tagsSection}>
          <Text style={[ps.tagsTitle, { color: theme.textPrimary }]}>الوسوم</Text>
          <View style={ps.tagsRow}>
            {post.tags.map(tag => (
              <View key={tag} style={[ps.tagChip, { backgroundColor: catColor + '12', borderColor: catColor + '30' }]}>
                <Text style={[ps.tagText, { color: catColor }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        </AnimatedRN.View>

        {/* ── Reactions ── */}
        <AnimatedRN.View entering={FadeInDown.duration(300).delay(340)}>
          <View style={[ps.reactionsWrap, { borderColor: theme.border }]}>
            <ReactionsBar catColor={catColor} theme={theme} />
          </View>
        </AnimatedRN.View>

        {/* ── Author Card ── */}
        <AnimatedRN.View entering={FadeInDown.duration(340).delay(370)} style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <LinearGradient
            colors={[catColor + '20', catColor + '08']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[ps.authorCard, { borderColor: catColor + '30' }]}
          >
            <LinearGradient colors={[catColor, catColor + 'CC']} style={ps.authorCardAvatar}>
              <Text style={ps.authorCardInitial}>مج</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[ps.authorCardName, { color: theme.textPrimary }]}>{post.author}</Text>
              <Text style={[ps.authorCardDesc, { color: theme.textMuted }]}>
                مصمم ومبرمج · خبرة في البرمجة منذ 2006
              </Text>
            </View>
          </LinearGradient>
        </AnimatedRN.View>

        {/* ── Share CTA ── */}
        <AnimatedRN.View entering={FadeInDown.duration(300).delay(400)} style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <Pressable
            onPress={handleShare}
            style={[ps.shareCTA, { backgroundColor: catColor + '15', borderColor: catColor + '40' }]}
          >
            <MaterialIcons name="share" size={20} color={catColor} />
            <Text style={[ps.shareCTAText, { color: catColor }]}>شارك هذا المنشور مع أصدقائك</Text>
            <MaterialIcons name="arrow-back" size={16} color={catColor} />
          </Pressable>
        </AnimatedRN.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ps = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 8,
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  progressChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, borderWidth: 1,
  },
  progressChipText: { fontSize: 11, fontFamily: TJM },
  headerActions: { flexDirection: 'row', gap: 6 },

  articleHeader: { padding: 20, paddingTop: 22, gap: 14 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 9999, borderWidth: 1, alignSelf: 'flex-start',
  },
  catChipText: { fontSize: 12, fontFamily: TJB },
  title:   { fontSize: 24, fontFamily: TJEB, lineHeight: 38, textAlign: 'right' },
  summary: { fontSize: 15, fontFamily: TJ, lineHeight: 26, textAlign: 'right' },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  authorInitial: { fontSize: 15, fontFamily: TJB, color: '#FFF' },
  authorName: { fontSize: 14, fontFamily: TJB },
  authorDate: { fontSize: 12, fontFamily: TJ, marginTop: 1 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, borderWidth: 1,
  },
  verifiedText: { fontSize: 11, fontFamily: TJB },

  coverWrap:  { marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  coverImage: { width: '100%', height: W * 0.55, borderRadius: 20 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  statItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  statVal:   { fontSize: 12, fontFamily: TJB },
  statLabel: { fontSize: 10, fontFamily: TJ },

  content: { paddingHorizontal: 20, gap: 16, marginBottom: 24 },

  tagsSection: { paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  tagsTitle: { fontSize: 15, fontFamily: TJEB, textAlign: 'right' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 9999, borderWidth: 1 },
  tagText: { fontSize: 12, fontFamily: TJB },

  reactionsWrap: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 20, marginBottom: 16 },

  authorCard:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1 },
  authorCardAvatar:  { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  authorCardInitial: { fontSize: 20, fontFamily: TJB, color: '#FFF' },
  authorCardName:    { fontSize: 16, fontFamily: TJEB },
  authorCardDesc:    { fontSize: 12, fontFamily: TJ, marginTop: 2 },

  shareCTA: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14, borderWidth: 1.5, justifyContent: 'center',
  },
  shareCTAText: { flex: 1, fontSize: 15, fontFamily: TJB, textAlign: 'center' },
});
