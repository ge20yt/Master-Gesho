/**
 * app/tool/[id].tsx — مستر جيشو
 * Premium tool detail: real DB comments, similar tools, QR share,
 * scroll-direction-aware sticky bar, skeleton loading.
 */

import React, {
  useState, useMemo, useCallback, useEffect, useRef,
} from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, Dimensions, Share, Modal,
  ActivityIndicator, Clipboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  FadeInDown, FadeIn,
  useSharedValue, useAnimatedStyle,
  withSpring, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { recordToolView } from '../history';
import { useAppContext } from '../../contexts/AppContext';
import { useAuth } from '@/template';
import ToolCard from '../../components/ToolCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

const { width: SW } = Dimensions.get('window');
const SCREENSHOT_W = SW - 64;
const SCROLL_THRESHOLD = 80;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Comment Skeleton ──────────────────────────────────────────────────────────
function CommentSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={[csk.wrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={csk.header}>
        <SkeletonCard width={32} height={32} borderRadius={16} />
        <View style={csk.headerInfo}>
          <SkeletonCard width={90} height={13} borderRadius={6} />
          <SkeletonCard width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      </View>
      <SkeletonCard width="95%" height={13} borderRadius={6} style={{ marginTop: 8 }} />
      <SkeletonCard width="70%" height={13} borderRadius={6} style={{ marginTop: 6 }} />
    </View>
  );
}
const csk = StyleSheet.create({
  wrap: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerInfo: { gap: 2 },
});

// ─── Similar Tool Skeleton ────────────────────────────────────────────────────
function SimilarToolSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={[sts.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <SkeletonCard width={52} height={52} borderRadius={14} />
      <SkeletonCard width={100} height={13} borderRadius={6} style={{ marginTop: 8 }} />
      <SkeletonCard width={72} height={11} borderRadius={4} style={{ marginTop: 6 }} />
      <SkeletonCard width={56} height={20} borderRadius={9999} style={{ marginTop: 8 }} />
    </View>
  );
}
const sts = StyleSheet.create({
  card: { width: 128, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
});

// ─── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({
  visible, toolName, toolUrl, onClose, theme,
}: {
  visible: boolean; toolName: string; toolUrl: string; onClose: () => void; theme: any;
}) {
  const handleShareQR = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Share.share({ title: toolName, message: `اكتشف أداة "${toolName}" على مستر جيشو\n\n🔗 ${toolUrl}` });
  }, [toolName, toolUrl]);

  const handleCopyLink = useCallback(() => {
    Clipboard.setString(toolUrl);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [toolUrl]);

  return (
    <Modal transparent visible={visible} animationType="slide" statusBarTranslucent>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}
        onPress={onClose}
      >
        <Pressable
          onPress={() => {}}
          style={[qm.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          {/* Icon */}
          <Animated.View entering={FadeIn.springify().damping(14)}>
            <LinearGradient
              colors={['#3B82F6', '#8B5CF6']}
              style={qm.iconCircle}
            >
              <MaterialIcons name="qr-code-2" size={30} color="#FFF" />
            </LinearGradient>
          </Animated.View>

          <Text style={[qm.title, { color: theme.textPrimary }]}>{toolName}</Text>
          <Text style={[qm.sub, { color: theme.textMuted }]}>امسح الرمز لفتح هذه الأداة</Text>

          {/* QR code */}
          <Animated.View
            entering={FadeIn.springify().damping(12).delay(100)}
            style={[qm.qrWrap, { backgroundColor: '#FFF' }]}
          >
            <QRCode value={toolUrl} size={180} color="#1E293B" backgroundColor="#FFFFFF" />
          </Animated.View>

          <Text style={[qm.urlText, { color: theme.textMuted }]} numberOfLines={2}>{toolUrl}</Text>

          {/* Actions */}
          <View style={qm.actions}>
            <Pressable
              onPress={handleCopyLink}
              style={[qm.copyBtn, { backgroundColor: theme.backgroundSecondary || theme.surface, borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel="نسخ الرابط"
            >
              <MaterialIcons name="content-copy" size={16} color={theme.textSecondary} />
              <Text style={[qm.copyTxt, { color: theme.textSecondary }]}>نسخ الرابط</Text>
            </Pressable>
            <Pressable
              onPress={handleShareQR}
              style={qm.shareBtn}
              accessibilityRole="button"
              accessibilityLabel="مشاركة الأداة"
            >
              <LinearGradient colors={['#3B82F6', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={qm.shareGrad}>
                <MaterialIcons name="share" size={16} color="#FFF" />
                <Text style={qm.shareTxt}>مشاركة QR</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <Pressable onPress={onClose} style={[qm.closeBtn, { borderColor: theme.border }]}>
            <Text style={[qm.closeTxt, { color: theme.textMuted }]}>إغلاق</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const qm = StyleSheet.create({
  sheet: {
    width: '100%', borderRadius: 24, padding: 22, alignItems: 'center', gap: 12,
    borderWidth: 1,
  },
  iconCircle: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: 'Cairo_700Bold', textAlign: 'center' },
  sub: { fontSize: 13, fontFamily: 'Cairo_400Regular', textAlign: 'center' },
  qrWrap: { padding: 14, borderRadius: 16 },
  urlText: { fontSize: 11, fontFamily: 'Cairo_400Regular', textAlign: 'center', maxWidth: 260 },
  actions: { flexDirection: 'row', gap: 10, width: '100%' },
  copyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  copyTxt: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
  shareBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  shareGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12,
  },
  shareTxt: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  closeBtn: {
    width: '100%', paddingVertical: 11, borderRadius: 12,
    alignItems: 'center', borderWidth: 1, marginTop: 2,
  },
  closeTxt: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
});

// ─── Similar tools score ───────────────────────────────────────────────────────
function computeSimilarityScore(base: any, candidate: any): number {
  let score = 0;
  if (candidate.category === base.category) score += 10;
  const baseTags = new Set<string>(base.tags);
  for (const tag of candidate.tags) {
    if (baseTags.has(tag)) score += 3;
  }
  return score;
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
function ToolDetailInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    getToolById, toggleSaveTool, toggleVoteTool, rateTool,
    addComment, loadComments,
    isToolSaved, isToolVoted, getUserRating, tools, toolComments,
  } = useAppContext();

  const tool = getToolById(id);
  const [commentText, setCommentText]       = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError]   = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [ssIndex, setSsIndex]               = useState(0);
  const [showQR, setShowQR]                 = useState(false);
  const [similarLoading, setSimilarLoading] = useState(true);

  const saved      = isToolSaved(id);
  const voted      = isToolVoted(id);
  const userRating = getUserRating(id);
  const comments   = toolComments[id] || [];

  // ── Sticky bar scroll-direction logic ─────────────────────────────────────
  const scrollY          = useRef(0);
  const lastScrollY      = useRef(0);
  const stickyVisible    = useSharedValue(0); // 0 = hidden, 1 = visible
  const stickyTranslateY = useSharedValue(80);

  const stickyAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: stickyTranslateY.value }],
    opacity: stickyVisible.value,
  }));

  const handleScroll = useCallback((e: any) => {
    const y       = e.nativeEvent.contentOffset.y;
    const delta   = y - lastScrollY.current;
    lastScrollY.current = y;

    if (y > SCROLL_THRESHOLD && delta > 0) {
      // Scrolling DOWN past threshold → show bar
      if (stickyVisible.value !== 1) {
        stickyVisible.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
        stickyTranslateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
    } else if (delta < -4 || y <= SCROLL_THRESHOLD) {
      // Scrolling UP or back near top → hide bar
      if (stickyVisible.value !== 0) {
        stickyVisible.value = withTiming(0, { duration: 200 });
        stickyTranslateY.value = withTiming(80, { duration: 220, easing: Easing.in(Easing.ease) });
      }
    }
    scrollY.current = y;
  }, []);

  // ── Record this tool view in history ────────────────────────────────────
  useEffect(() => { if (id) recordToolView(id); }, [id]);

  // ── Load comments ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setCommentsLoading(true);
    setCommentsError(false);
    loadComments(id);
    const timer = setTimeout(() => {
      if (!cancelled) setCommentsLoading(false);
    }, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [id]);

  // ── Similar tools (computed, with fake delay for skeleton) ─────────────────
  const similarTools = useMemo(() => {
    if (!tool || tools.length === 0) return [];
    return tools
      .filter(t => t.id !== id && t.status !== 'rejected')
      .map(t => ({ tool: t, score: computeSimilarityScore(tool, t) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ tool: t }) => t);
  }, [tools, tool, id]);

  useEffect(() => {
    const timer = setTimeout(() => setSimilarLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // ── Animations ────────────────────────────────────────────────────────────
  const voteScale   = useSharedValue(1);
  const saveScale   = useSharedValue(1);
  const launchScale = useSharedValue(1);
  // Stable array - no conditional hooks
  const s1 = useSharedValue(1); const s2 = useSharedValue(1); const s3 = useSharedValue(1);
  const s4 = useSharedValue(1); const s5 = useSharedValue(1);
  const starScales = [s1, s2, s3, s4, s5];

  const voteAnimStyle   = useAnimatedStyle(() => ({ transform: [{ scale: voteScale.value }] }));
  const saveAnimStyle   = useAnimatedStyle(() => ({ transform: [{ scale: saveScale.value }] }));
  const launchAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: launchScale.value }] }));
  const star1 = useAnimatedStyle(() => ({ transform: [{ scale: s1.value }] }));
  const star2 = useAnimatedStyle(() => ({ transform: [{ scale: s2.value }] }));
  const star3 = useAnimatedStyle(() => ({ transform: [{ scale: s3.value }] }));
  const star4 = useAnimatedStyle(() => ({ transform: [{ scale: s4.value }] }));
  const star5 = useAnimatedStyle(() => ({ transform: [{ scale: s5.value }] }));
  const starAnimStyles = [star1, star2, star3, star4, star5];

  // ── Rating distribution ───────────────────────────────────────────────────
  const ratingDistribution = useMemo(() => {
    if (!tool) return [];
    const avg   = tool.rating;
    const count = tool.ratingCount;
    if (count === 0) return [1, 2, 3, 4, 5].map(s => ({ star: s, count: 0, pct: 0 }));
    const gaussW = (star: number) => Math.exp(-0.5 * Math.pow((star - avg) / 0.9, 2));
    const totalW = [1, 2, 3, 4, 5].reduce((a, s) => a + gaussW(s), 0);
    const weights: Record<number, number> = {};
    [1, 2, 3, 4, 5].forEach(s => { weights[s] = Math.round((gaussW(s) / totalW) * count); });
    const maxC = Math.max(...Object.values(weights), 1);
    return [5, 4, 3, 2, 1].map(s => ({ star: s, count: weights[s], pct: Math.round((weights[s] / maxC) * 100) }));
  }, [tool]);

  const recommendationPct = useMemo(
    () => !tool || tool.ratingCount === 0 ? 0 : Math.round(Math.min(100, Math.max(0, ((tool.rating - 1) / 4) * 100))),
    [tool]
  );

  const toolUrl = useMemo(() => {
    if (!tool) return '';
    return tool.url && tool.url.startsWith('http') ? tool.url : `https://mistergisho.app/tool/${id}`;
  }, [tool, id]);

  const s = useMemo(() => createStyles(theme), [theme]);
  const pricingColor = tool?.pricing === 'مجاني' ? '#10B981' : tool?.pricing === 'مفتوح المصدر' ? '#8B5CF6' : '#F59E0B';
  const catColor = tool ? (theme.categoryColors?.[tool.category] || theme.primary) : theme.primary;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleVotePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    voteScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 400 }),
      withSpring(0.85, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    toggleVoteTool(id);
  }, [id, toggleVoteTool]);

  const handleSavePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    saveScale.value = withSequence(
      withSpring(1.4, { damping: 8, stiffness: 400 }),
      withSpring(0.85, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    toggleSaveTool(id);
  }, [id, toggleSaveTool]);

  const handleShare = useCallback(async () => {
    Haptics.selectionAsync();
    if (!tool) return;
    try {
      await Share.share({
        title: tool.name,
        message: `اكتشف أداة "${tool.name}" على مستر جيشو 🤖\n\n${tool.shortDescription}\n\n🔗 ${toolUrl}`,
        url: toolUrl,
      });
    } catch {}
  }, [tool, toolUrl]);

  const handleRate = useCallback((rating: number) => {
    const sv = starScales[rating - 1];
    if (sv) sv.value = withSequence(
      withSpring(1.5, { damping: 8, stiffness: 400 }),
      withSpring(0.9, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    rateTool(id, rating);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [id, rateTool]);

  const handleSubmitComment = useCallback(async () => {
    const trimmed = commentText.trim();
    if (!trimmed || commentLoading) return;
    if (trimmed.length > 500) return;
    setCommentLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      addComment(id, trimmed);
      setCommentText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // addComment already handles UI update
    } finally {
      setCommentLoading(false);
    }
  }, [commentText, id, addComment, commentLoading]);

  const handleRetryComments = useCallback(() => {
    setCommentsLoading(true);
    setCommentsError(false);
    loadComments(id);
    setTimeout(() => setCommentsLoading(false), 800);
  }, [id, loadComments]);

  const handleSsScroll = useCallback((e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (SCREENSHOT_W + 12));
    setSsIndex(Math.max(0, Math.min(idx, (tool?.screenshots.length ?? 1) - 1)));
  }, [tool]);

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!tool) {
    return (
      <SafeAreaView edges={['top']} style={[s.container, s.centered]}>
        <MaterialIcons name="error-outline" size={48} color={theme.textMuted} />
        <Text style={[s.notFoundText, { color: theme.textSecondary }]}>الأداة غير موجودة</Text>
        <Pressable onPress={() => router.back()} style={[s.notFoundBack, { backgroundColor: theme.primary }]}>
          <Text style={{ color: '#FFF', fontFamily: 'Cairo_600SemiBold', fontSize: 14 }}>رجوع</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const displayedComments = showAllComments ? comments : comments.slice(0, 3);

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* ── Top bar ──────────────────────────────────────────────────── */}
          <View style={s.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={[s.iconCircleBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel="رجوع"
            >
              <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
            </Pressable>
            <View style={s.topActions}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowQR(true); }}
                style={[s.iconCircleBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel="رمز QR"
              >
                <MaterialIcons name="qr-code" size={18} color={theme.textSecondary} />
              </Pressable>
              <Pressable
                onPress={handleShare}
                style={[s.iconCircleBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel="مشاركة"
              >
                <MaterialIcons name="share" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <LinearGradient
              colors={[tool.logoColor + '22', tool.logoColor + '08', 'transparent']}
              style={s.heroBanner}
            >
              <View style={[s.logoHero, { backgroundColor: tool.logoColor + '20', borderColor: tool.logoColor + '30' }]}>
                <MaterialIcons name={tool.logoIcon as any} size={44} color={tool.logoColor} />
              </View>
              <Text style={[s.toolName, { color: theme.textPrimary }]}>{tool.name}</Text>
              <View style={s.metaRow}>
                <View style={[s.catBadge, { backgroundColor: catColor + '20' }]}>
                  <Text style={[s.catBadgeText, { color: catColor }]}>{tool.category}</Text>
                </View>
                <View style={[s.pricingBadge, { backgroundColor: pricingColor + '18' }]}>
                  <Text style={[s.pricingBadgeText, { color: pricingColor }]}>{tool.pricing}</Text>
                </View>
                {tool.trending ? (
                  <View style={s.trendingBadge}>
                    <MaterialIcons name="local-fire-department" size={11} color="#F97316" />
                    <Text style={s.trendingText}>رائج</Text>
                  </View>
                ) : null}
                {tool.editorPick ? (
                  <View style={s.editorBadge}>
                    <MaterialIcons name="verified" size={11} color="#3B82F6" />
                    <Text style={s.editorText}>اختيار المحررين</Text>
                  </View>
                ) : null}
              </View>
              <Pressable onPress={() => router.push(`/developer/${encodeURIComponent(tool.developerName)}` as any)}>
                <Text style={[s.developerLink, { color: theme.primary }]}>بواسطة {tool.developerName}</Text>
              </Pressable>
            </LinearGradient>
          </Animated.View>

          {/* ── Stats card ───────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.duration(400).delay(80)}
            style={[s.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={s.statBox}>
              <MaterialIcons name="star" size={20} color={theme.star || '#F59E0B'} />
              <Text style={[s.statBoxValue, { color: theme.textPrimary }]}>{tool.rating}</Text>
              <Text style={[s.statBoxLabel, { color: theme.textMuted }]}>{tool.ratingCount} تقييم</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: theme.border }]} />
            <View style={s.statBox}>
              <MaterialIcons name="arrow-upward" size={20} color={theme.upvote || '#22C55E'} />
              <Text style={[s.statBoxValue, { color: theme.textPrimary }]}>
                {tool.votes >= 1000 ? `${(tool.votes / 1000).toFixed(1)}k` : tool.votes}
              </Text>
              <Text style={[s.statBoxLabel, { color: theme.textMuted }]}>تصويت</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: theme.border }]} />
            <View style={s.statBox}>
              <MaterialIcons name="comment" size={20} color={theme.primary} />
              <Text style={[s.statBoxValue, { color: theme.textPrimary }]}>{comments.length}</Text>
              <Text style={[s.statBoxLabel, { color: theme.textMuted }]}>تعليق</Text>
            </View>
          </Animated.View>

          {/* ── Description ─────────────────────────────────────────────── */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>نبذة</Text>
            <Text style={[s.description, { color: theme.textSecondary }]}>{tool.description}</Text>
            <View style={s.tagsRow}>
              {tool.tags.map(tag => (
                <View key={tag} style={[s.tag, { backgroundColor: tool.logoColor + '12', borderColor: tool.logoColor + '30' }]}>
                  <Text style={[s.tagText, { color: tool.logoColor }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Screenshots ──────────────────────────────────────────────── */}
          {tool.screenshots.length > 0 && (
            <View style={s.ssSection}>
              <Text style={[s.sectionTitle, { color: theme.textPrimary, paddingHorizontal: 16 }]}>لقطات الشاشة</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.ssScroll}
                snapToInterval={SCREENSHOT_W + 12}
                decelerationRate="fast"
                onMomentumScrollEnd={handleSsScroll}
              >
                {tool.screenshots.map((ss, i) => (
                  <Animated.View
                    key={i}
                    entering={FadeInDown.duration(300).delay(i * 80)}
                    style={[s.ssFrame, { borderColor: i === ssIndex ? tool.logoColor : theme.border }]}
                  >
                    <Image source={{ uri: ss }} style={s.ssImage} contentFit="cover" transition={300} />
                  </Animated.View>
                ))}
              </ScrollView>
              {tool.screenshots.length > 1 && (
                <View style={s.ssDots}>
                  {tool.screenshots.map((_, i) => (
                    <View key={i} style={[s.ssDot, {
                      backgroundColor: i === ssIndex ? tool.logoColor : theme.border,
                      width: i === ssIndex ? 16 : 6,
                    }]} />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Rating distribution ──────────────────────────────────────── */}
          {tool.ratingCount > 0 && (
            <Animated.View entering={FadeInDown.duration(400).delay(200)} style={s.section}>
              <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>إحصائيات التقييم</Text>
              <View style={[s.recBadge, {
                backgroundColor: recommendationPct >= 75 ? '#22C55E15' : '#F59E0B15',
                borderColor:     recommendationPct >= 75 ? '#22C55E40' : '#F59E0B40',
              }]}>
                <MaterialIcons
                  name={recommendationPct >= 75 ? 'thumb-up' : 'thumbs-up-down'}
                  size={18}
                  color={recommendationPct >= 75 ? '#22C55E' : '#F59E0B'}
                />
                <Text style={[s.recText, { color: recommendationPct >= 75 ? '#22C55E' : '#F59E0B' }]}>
                  {recommendationPct}% يوصون بهذه الأداة
                </Text>
              </View>
              <View style={s.barChart}>
                {ratingDistribution.map(item => (
                  <View key={item.star} style={s.barRow}>
                    <View style={s.barStarRow}>
                      <Text style={[s.barStar, { color: theme.textSecondary }]}>{item.star}</Text>
                      <MaterialIcons name="star" size={11} color="#F59E0B" />
                    </View>
                    <View style={[s.barBg, { backgroundColor: theme.border }]}>
                      <View style={[s.barFill, {
                        width: `${item.pct}%` as any,
                        backgroundColor: item.star >= 4 ? '#22C55E' : item.star === 3 ? '#F59E0B' : '#EF4444',
                      }]} />
                    </View>
                    <Text style={[s.barCount, { color: theme.textMuted }]}>{item.count}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* ── Rate section ─────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.duration(400).delay(260)} style={s.rateSection}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>قيّم هذه الأداة</Text>
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((star, idx) => (
                <Animated.View key={star} style={starAnimStyles[idx]}>
                  <Pressable onPress={() => handleRate(star)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${star} نجوم`}>
                    <MaterialIcons
                      name={star <= userRating ? 'star' : 'star-border'}
                      size={38}
                      color={star <= userRating ? (theme.star || '#F59E0B') : theme.textMuted}
                    />
                  </Pressable>
                </Animated.View>
              ))}
            </View>
            {userRating > 0 && (
              <Text style={[s.ratedText, { color: theme.star || '#F59E0B' }]}>قيّمت هذه الأداة {userRating}/5 ⭐</Text>
            )}
          </Animated.View>

          {/* ── Comments ─────────────────────────────────────────────────── */}
          <View style={s.section}>
            <View style={s.commentsTitleRow}>
              <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>التعليقات</Text>
              {!commentsLoading && (
                <View style={[s.countBadge, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '40' }]}>
                  <Text style={[s.countBadgeText, { color: theme.primary }]}>{comments.length}</Text>
                </View>
              )}
            </View>

            {/* Input: require login */}
            {user ? (
              <View style={[s.commentInputWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[s.commentAvatar, { backgroundColor: theme.primaryDark || theme.primary }]}>
                  <Text style={s.commentAvatarText}>
                    {(user.username || user.email || 'م').slice(0, 2)}
                  </Text>
                </View>
                <TextInput
                  style={[s.commentTextInput, { color: theme.textPrimary }]}
                  placeholder="اكتب تعليقك هنا..."
                  placeholderTextColor={theme.textMuted}
                  value={commentText}
                  onChangeText={t => t.length <= 500 ? setCommentText(t) : null}
                  multiline
                  textAlign="right"
                  editable={!commentLoading}
                  accessibilityLabel="حقل التعليق"
                />
                <Pressable
                  onPress={handleSubmitComment}
                  disabled={!commentText.trim() || commentLoading}
                  style={[s.sendBtn, {
                    backgroundColor: commentText.trim() && !commentLoading ? theme.primary : theme.border,
                  }]}
                  accessibilityRole="button"
                  accessibilityLabel="إرسال التعليق"
                >
                  {commentLoading
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <MaterialIcons name="send" size={17} color={commentText.trim() ? '#FFF' : theme.textMuted} />
                  }
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push('/login' as any); }}
                style={[s.loginPrompt, { backgroundColor: theme.surface, borderColor: theme.border }]}
                accessibilityRole="button"
              >
                <MaterialIcons name="login" size={18} color={theme.primary} />
                <Text style={[s.loginPromptText, { color: theme.textSecondary }]}>
                  سجّل الدخول لإضافة تعليق
                </Text>
                <MaterialIcons name="arrow-back" size={15} color={theme.primary} />
              </Pressable>
            )}

            {/* Comments list */}
            {commentsLoading ? (
              // Skeleton loading state
              <View>
                {[1, 2, 3].map(i => <CommentSkeleton key={i} />)}
              </View>
            ) : commentsError ? (
              // Error state
              <View style={s.commentsErrorWrap}>
                <MaterialIcons name="cloud-off" size={36} color={theme.textMuted} />
                <Text style={[s.commentsErrorText, { color: theme.textSecondary }]}>تعذر تحميل التعليقات</Text>
                <Pressable onPress={handleRetryComments} style={[s.retryBtn, { borderColor: theme.primary + '40' }]}>
                  <MaterialIcons name="refresh" size={14} color={theme.primary} />
                  <Text style={[s.retryBtnText, { color: theme.primary }]}>إعادة المحاولة</Text>
                </Pressable>
              </View>
            ) : comments.length === 0 ? (
              // Empty state
              <View style={s.commentsEmptyWrap}>
                <MaterialIcons name="chat-bubble-outline" size={40} color={theme.textMuted} />
                <Text style={[s.commentsEmptyTitle, { color: theme.textSecondary }]}>لا توجد تعليقات حتى الآن</Text>
                <Text style={[s.commentsEmptySub, { color: theme.textMuted }]}>
                  كن أول من يشارك رأيه حول هذه الأداة.
                </Text>
              </View>
            ) : (
              // Comments
              <View>
                {displayedComments.map(comment => (
                  <Animated.View
                    key={comment.id}
                    entering={FadeInDown.duration(260)}
                    style={[s.commentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  >
                    <View style={s.commentHeader}>
                      <View style={[s.commentAvatar, { backgroundColor: theme.primaryDark || theme.primary }]}>
                        <Text style={s.commentAvatarText}>
                          {(comment.userName || 'م').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </Text>
                      </View>
                      <View>
                        <Text style={[s.commentName, { color: theme.textPrimary }]}>{comment.userName}</Text>
                        <Text style={[s.commentDate, { color: theme.textMuted }]}>
                          {typeof comment.createdAt === 'string'
                            ? comment.createdAt.split('T')[0]
                            : comment.createdAt}
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.commentText, { color: theme.textSecondary }]}>{comment.text}</Text>
                  </Animated.View>
                ))}
                {comments.length > 3 && (
                  <Pressable
                    onPress={() => { Haptics.selectionAsync(); setShowAllComments(v => !v); }}
                    style={[s.showMoreBtn, { borderColor: theme.primary + '40', backgroundColor: theme.primary + '0E' }]}
                  >
                    <MaterialIcons
                      name={showAllComments ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={18} color={theme.primary}
                    />
                    <Text style={[s.showMoreText, { color: theme.primary }]}>
                      {showAllComments ? 'عرض أقل' : `عرض جميع التعليقات (${comments.length})`}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* ── Developer ────────────────────────────────────────────────── */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>المطور</Text>
            <View style={[s.developerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[s.devAvatar, { backgroundColor: theme.primaryDark || theme.primary }]}>
                <Text style={s.devAvatarText}>
                  {tool.developerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </Text>
              </View>
              <View style={s.devInfo}>
                <Pressable onPress={() => router.push(`/developer/${encodeURIComponent(tool.developerName)}` as any)}>
                  <Text style={[s.devName, { color: theme.primary }]}>{tool.developerName}</Text>
                </Pressable>
                <Text style={[s.devBio, { color: theme.textSecondary }]}>{tool.developerBio}</Text>
                <View style={s.devMeta}>
                  <View style={s.devStat}>
                    <MaterialIcons name="apps" size={14} color={theme.textMuted} />
                    <Text style={[s.devStatText, { color: theme.textMuted }]}>{tool.developerToolsCount} أداة</Text>
                  </View>
                  <View style={s.devStat}>
                    <MaterialIcons name="people" size={14} color={theme.textMuted} />
                    <Text style={[s.devStatText, { color: theme.textMuted }]}>{tool.developerFollowers.toLocaleString()} متابع</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ── Similar Tools ────────────────────────────────────────────── */}
          <View style={s.relatedSection}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary, paddingHorizontal: 16 }]}>أدوات قد تعجبك</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.relatedScroll}>
              {similarLoading
                ? [1, 2, 3, 4].map(i => <SimilarToolSkeleton key={i} />)
                : similarTools.length > 0
                  ? similarTools.map(t => <ToolCard key={t.id} tool={t} variant="compact" width={160} />)
                  : (
                    <View style={[s.noSimilarWrap, { borderColor: theme.border }]}>
                      <Text style={[s.noSimilarText, { color: theme.textMuted }]}>لا توجد أدوات مشابهة حالياً</Text>
                    </View>
                  )
              }
            </ScrollView>
          </View>
        </ScrollView>

        {/* ── Sticky Bottom Action Bar (scroll-direction aware) ─────────── */}
        <Animated.View
          style={[
            s.stickyBar,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom + 8,
            },
            stickyAnimStyle,
          ]}
          pointerEvents={stickyVisible.value > 0 ? 'auto' : 'none'}
        >
          <AnimatedPressable
            style={[
              s.stickyVoteBtn,
              voted
                ? { backgroundColor: theme.upvote || '#22C55E', borderColor: theme.upvote || '#22C55E' }
                : { backgroundColor: theme.backgroundSecondary || theme.surface, borderColor: theme.border },
              voteAnimStyle,
            ]}
            onPress={handleVotePress}
            accessibilityRole="button"
            accessibilityLabel="تصويت"
          >
            <MaterialIcons name="arrow-upward" size={16} color={voted ? '#FFF' : (theme.upvote || '#22C55E')} />
            <Text style={[s.stickyVoteText, { color: voted ? '#FFF' : (theme.upvote || '#22C55E') }]}>
              {tool.votes >= 1000 ? `${(tool.votes / 1000).toFixed(1)}k` : tool.votes}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[
              s.stickySaveBtn,
              saved
                ? { backgroundColor: tool.logoColor + '22', borderColor: tool.logoColor + '55' }
                : { backgroundColor: theme.backgroundSecondary || theme.surface, borderColor: theme.border },
              saveAnimStyle,
            ]}
            onPress={handleSavePress}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'إلغاء الحفظ' : 'حفظ الأداة'}
          >
            <MaterialIcons
              name={saved ? 'bookmark' : 'bookmark-border'}
              size={18}
              color={saved ? tool.logoColor : theme.textMuted}
            />
            <Text style={[s.stickySaveText, { color: saved ? tool.logoColor : theme.textMuted }]}>
              {saved ? 'محفوظ' : 'حفظ'}
            </Text>
          </AnimatedPressable>

          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.push({ pathname: '/compare', params: { ids: id } } as any); }}
            style={[s.stickySaveBtn, { backgroundColor: theme.backgroundSecondary || theme.surface, borderColor: theme.border, minWidth: 46 }]}
            accessibilityRole="button"
            accessibilityLabel="مقارنة الأداة"
          >
            <MaterialIcons name="compare-arrows" size={16} color={theme.textMuted} />
          </Pressable>

          <AnimatedPressable
            style={[s.stickyLaunchBtn, launchAnimStyle]}
            onPressIn={() => { launchScale.value = withSpring(0.95, { damping: 15, stiffness: 300 }); }}
            onPressOut={() => { launchScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
            accessibilityRole="button"
            accessibilityLabel="فتح الأداة"
          >
            <LinearGradient
              colors={[tool.logoColor, tool.logoColor + 'CC']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.stickyLaunchGrad}
            >
              <MaterialIcons name="launch" size={18} color="#FFF" />
              <Text style={s.stickyLaunchText}>زيارة الأداة</Text>
            </LinearGradient>
          </AnimatedPressable>
        </Animated.View>

      </KeyboardAvoidingView>

      {/* QR Modal */}
      <QRModal
        visible={showQR}
        toolName={tool.name}
        toolUrl={toolUrl}
        onClose={() => setShowQR(false)}
        theme={theme}
      />
    </SafeAreaView>
  );
}

// ─── Wrapped with ErrorBoundary ────────────────────────────────────────────────
export default function ToolDetailScreen() {
  const router = useRouter();
  return (
    <ErrorBoundary onNavigateHome={() => router.replace('/(tabs)' as any)}>
      <ToolDetailInner />
    </ErrorBoundary>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container:    { flex: 1, backgroundColor: theme.background },
  centered:     { alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, fontFamily: 'Cairo_400Regular', marginTop: 12 },
  notFoundBack: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  iconCircleBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  topActions: { flexDirection: 'row', gap: 8 },

  heroBanner: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 },
  logoHero: {
    width: 88, height: 88, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 1.5,
  },
  toolName: { fontSize: 26, fontFamily: 'Cairo_700Bold', textAlign: 'center', marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  catBadgeText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  pricingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  pricingBadgeText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  trendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: '#F9731615' },
  trendingText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold', color: '#F97316' },
  editorBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: '#3B82F615' },
  editorText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold', color: '#3B82F6' },
  developerLink: { fontSize: 13, fontFamily: 'Cairo_500Medium' },

  statsCard: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20 },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statBoxValue: { fontSize: 22, fontFamily: 'Cairo_700Bold' },
  statBoxLabel: { fontSize: 10, fontFamily: 'Cairo_500Medium' },
  statDivider: { width: 1 },

  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', marginBottom: 12 },
  description: { fontSize: 15, fontFamily: 'Cairo_400Regular', lineHeight: 26, textAlign: 'right', marginBottom: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, borderWidth: 1 },
  tagText: { fontSize: 11, fontFamily: 'Cairo_500Medium' },

  ssSection: { marginBottom: 24 },
  ssScroll: { paddingHorizontal: 16, gap: 12 },
  ssFrame: { width: SCREENSHOT_W, height: SCREENSHOT_W * 0.6, borderRadius: 14, overflow: 'hidden', borderWidth: 2 },
  ssImage: { width: '100%', height: '100%' },
  ssDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 12 },
  ssDot: { height: 6, borderRadius: 3 },

  recBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  recText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
  barChart: { gap: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barStarRow: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 26 },
  barStar: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
  barBg: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5, minWidth: 4 },
  barCount: { fontSize: 11, fontFamily: 'Cairo_500Medium', width: 24, textAlign: 'right' },

  rateSection: { paddingHorizontal: 16, marginBottom: 24, alignItems: 'center' },
  starsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  ratedText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', marginTop: 8 },

  commentsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999, borderWidth: 1 },
  countBadgeText: { fontSize: 12, fontFamily: 'Cairo_700Bold' },

  commentInputWrap: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14,
    borderRadius: 14, borderWidth: 1, padding: 10,
  },
  commentTextInput: {
    flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular',
    maxHeight: 80, minHeight: 36, writingDirection: 'rtl',
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  loginPrompt: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, marginBottom: 14, justifyContent: 'center',
  },
  loginPromptText: { flex: 1, fontSize: 14, fontFamily: 'Cairo_500Medium', textAlign: 'center' },

  commentCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  commentName: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
  commentDate: { fontSize: 11, fontFamily: 'Cairo_500Medium' },
  commentText: { fontSize: 14, fontFamily: 'Cairo_400Regular', lineHeight: 24, textAlign: 'right' },

  commentsErrorWrap: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  commentsErrorText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1 },
  retryBtnText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },

  commentsEmptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  commentsEmptyTitle: { fontSize: 15, fontFamily: 'Cairo_600SemiBold' },
  commentsEmptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', textAlign: 'center', lineHeight: 20 },

  showMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  showMoreText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },

  developerCard: { flexDirection: 'row', gap: 14, borderRadius: 16, padding: 16, borderWidth: 1 },
  devAvatar: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  devAvatarText: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  devInfo: { flex: 1 },
  devName: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', marginBottom: 4 },
  devBio: { fontSize: 13, fontFamily: 'Cairo_400Regular', marginBottom: 8 },
  devMeta: { flexDirection: 'row', gap: 16 },
  devStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  devStatText: { fontSize: 11, fontFamily: 'Cairo_500Medium' },

  relatedSection: { marginBottom: 16 },
  relatedScroll: { paddingHorizontal: 16, gap: 12 },
  noSimilarWrap: { paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
  noSimilarText: { fontSize: 13, fontFamily: 'Cairo_500Medium' },

  // Sticky bar
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1,
  },
  stickyVoteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, minWidth: 64,
  },
  stickyVoteText: { fontSize: 12, fontFamily: 'Cairo_700Bold' },
  stickySaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, minWidth: 64,
  },
  stickySaveText: { fontSize: 12, fontFamily: 'Cairo_700Bold' },
  stickyLaunchBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  stickyLaunchGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13 },
  stickyLaunchText: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#FFF' },
});
