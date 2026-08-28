/**
 * app/(tabs)/index.tsx — مستر جيشو
 * Premium AI-powered smart home feed — Redesigned
 * Two clean sections: ✨ مقترح لك + 🚀 استكشف المزيد
 */

import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useAppContext } from '../../contexts/AppContext';
import SearchBar from '../../components/SearchBar';
import { MOCK_POSTS, POST_CATEGORIES } from '../../services/postsService';
import {
  buildUserPrefs, buildSmartFeed, buildExploreMore, applyAIProfile,
  FeedItem, ToolFeedItem, PostFeedItem,
} from '../../services/smartFeedService';
import { getAIProfile } from '../../services/onboardingService';
import { SkeletonToolCard } from '../../components/ui/SkeletonToolCard';
import { SkeletonPostCard } from '../../components/ui/SkeletonPostCard';

const { width: SW } = Dimensions.get('window');
const R = 20; // card border radius

// ─── Reason Badge ──────────────────────────────────────────────────────────────
const ReasonBadge = memo(({ reason, icon, color }: {
  reason: string; icon: string; color: string;
}) => (
  <View style={[rb.wrap, { backgroundColor: color + '18', borderColor: color + '38' }]}>
    <MaterialIcons name={icon as any} size={10} color={color} />
    <Text style={[rb.text, { color }]} numberOfLines={1}>{reason}</Text>
  </View>
));
const rb = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999, borderWidth: 1,
    maxWidth: 160,
  },
  text: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
});

// ─── Premium Tool Card ─────────────────────────────────────────────────────────
const FeedToolCard = memo(({
  item, theme, index, onSave, onVote, isSaved, isVoted,
}: {
  item: ToolFeedItem; theme: any; index: number;
  onSave: (id: string) => void; onVote: (id: string) => void;
  isSaved: boolean; isVoted: boolean;
}) => {
  const router = useRouter();
  const tool = item.data;
  const catColor = theme.categoryColors?.[tool.category] || tool.logoColor;
  const voteDisplay = tool.votes >= 1000
    ? `${(tool.votes / 1000).toFixed(1)}k`
    : tool.votes.toString();

  const pricingColor = tool.pricing === 'مجاني' ? '#10B981'
    : tool.pricing === 'مفتوح المصدر' ? '#8B5CF6'
    : '#F59E0B';

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index * 45, 480))}>
      <Pressable
        onPress={() => { Haptics.selectionAsync(); router.push(`/tool/${tool.id}` as any); }}
        style={({ pressed }) => [
          tc.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && { opacity: 0.93, transform: [{ scale: 0.987 }] },
        ]}
      >
        {/* Accent line */}
        <View style={[tc.accent, { backgroundColor: tool.logoColor }]} />

        {/* Body */}
        <View style={tc.body}>
          {/* Icon */}
          <View style={[tc.iconWrap, { backgroundColor: tool.logoColor + '16' }]}>
            <MaterialIcons name={tool.logoIcon as any} size={28} color={tool.logoColor} />
          </View>

          {/* Info */}
          <View style={tc.info}>
            <View style={tc.nameRow}>
              <Text style={[tc.name, { color: theme.textPrimary }]} numberOfLines={1}>
                {tool.name}
              </Text>
              <ReasonBadge reason={item.reason} icon={item.reasonIcon} color={item.reasonColor} />
            </View>
            <Text style={[tc.desc, { color: theme.textSecondary }]} numberOfLines={2}>
              {tool.shortDescription}
            </Text>
            <View style={tc.chips}>
              <View style={[tc.catChip, { backgroundColor: catColor + '14' }]}>
                <Text style={[tc.catText, { color: catColor }]}>{tool.category}</Text>
              </View>
              <View style={tc.star}>
                <MaterialIcons name="star" size={12} color="#F59E0B" />
                <Text style={[tc.starText, { color: theme.textSecondary }]}>{tool.rating}</Text>
              </View>
              <View style={[tc.priceChip, { backgroundColor: pricingColor + '14' }]}>
                <Text style={[tc.priceText, { color: pricingColor }]}>{tool.pricing}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={[tc.footer, { borderTopColor: theme.border }]}>
          <View style={tc.voteRow}>
            <MaterialIcons name="arrow-upward" size={13} color={theme.textMuted} />
            <Text style={[tc.voteNum, { color: theme.textMuted }]}>{voteDisplay}</Text>
          </View>
          <View style={tc.actions}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onVote(tool.id); }}
              style={[
                tc.btn,
                isVoted
                  ? { backgroundColor: tool.logoColor + '22', borderColor: tool.logoColor + '55' }
                  : { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
              ]}
            >
              <MaterialIcons
                name="arrow-upward" size={13}
                color={isVoted ? tool.logoColor : theme.textMuted}
              />
              <Text style={[tc.btnTxt, { color: isVoted ? tool.logoColor : theme.textMuted }]}>
                صوّت
              </Text>
            </Pressable>

            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSave(tool.id); }}
              style={[
                tc.btn, tc.iconBtn,
                isSaved
                  ? { backgroundColor: tool.logoColor + '22', borderColor: tool.logoColor + '55' }
                  : { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
              ]}
            >
              <MaterialIcons
                name={isSaved ? 'bookmark' : 'bookmark-border'} size={14}
                color={isSaved ? tool.logoColor : theme.textMuted}
              />
            </Pressable>

            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push({ pathname: '/compare', params: { ids: tool.id } } as any); }}
              style={[tc.btn, tc.iconBtn, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
            >
              <MaterialIcons name="compare-arrows" size={14} color={theme.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push(`/tool/${tool.id}` as any); }}
              style={[tc.exploreBtn, { backgroundColor: tool.logoColor }]}
            >
              <Text style={tc.exploreTxt}>اكتشف</Text>
              <MaterialIcons name="arrow-back" size={12} color="#FFF" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const tc = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: R,
    borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  accent: { height: 3, width: '100%' },
  body: { flexDirection: 'row', gap: 12, padding: 14 },
  iconWrap: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  info: { flex: 1, gap: 6 },
  nameRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8,
  },
  name: { fontSize: 15, fontFamily: 'Cairo_700Bold', flex: 1 },
  desc: { fontSize: 13, fontFamily: 'Cairo_400Regular', lineHeight: 20 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  catChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  catText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  star: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  priceChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  priceText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1,
  },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  voteNum: { fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
  actions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, borderWidth: 1,
  },
  iconBtn: { paddingHorizontal: 8 },
  btnTxt: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  exploreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999,
  },
  exploreTxt: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#FFF' },
});

// ─── Premium Post Card ─────────────────────────────────────────────────────────
const FeedPostCard = memo(({ item, theme, index }: {
  item: PostFeedItem; theme: any; index: number;
}) => {
  const router = useRouter();
  const post = item.data;
  const catLabel = POST_CATEGORIES.find(c => c.id === post.category)?.label || post.category;
  const viewsDisplay = post.views >= 1000
    ? `${(post.views / 1000).toFixed(1)}k`
    : post.views.toString();
  const likesDisplay = post.likes >= 1000
    ? `${(post.likes / 1000).toFixed(1)}k`
    : post.likes.toString();

  return (
    <Animated.View entering={FadeInDown.duration(340).delay(Math.min(index * 45, 480))}>
      <Pressable
        onPress={() => { Haptics.selectionAsync(); router.push(`/post/${post.id}` as any); }}
        style={({ pressed }) => [
          pc.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && { opacity: 0.93, transform: [{ scale: 0.987 }] },
        ]}
      >
        {/* Cover image */}
        <View style={pc.imgWrap}>
          <Image
            source={{ uri: post.coverImage }}
            style={pc.img}
            contentFit="cover"
            transition={400}
          />
          {/* Bottom-up gradient */}
          <LinearGradient
            colors={['rgba(0,0,0,0.80)', 'rgba(0,0,0,0.35)', 'transparent']}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0.3 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Top-down soft fade */}
          <LinearGradient
            colors={['rgba(0,0,0,0.22)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Top right: category + featured */}
          <View style={pc.topRight}>
            <View style={[pc.catBadge, { backgroundColor: post.categoryColor }]}>
              <MaterialIcons name={post.categoryIcon as any} size={11} color="#FFF" />
              <Text style={pc.catBadgeText}>{catLabel}</Text>
            </View>
            {post.featured ? (
              <View style={pc.featuredBadge}>
                <MaterialIcons name="star" size={11} color="#F59E0B" />
                <Text style={pc.featuredText}>مميز</Text>
              </View>
            ) : null}
          </View>

          {/* Bottom: emoji + AI reason */}
          <View style={pc.bottomRow}>
            <View style={pc.emojiBox}>
              <Text style={{ fontSize: 18 }}>{post.emoji}</Text>
            </View>
            <ReasonBadge reason={item.reason} icon={item.reasonIcon} color={item.reasonColor} />
          </View>
        </View>

        {/* Content */}
        <View style={pc.content}>
          <Text style={[pc.title, { color: theme.textPrimary }]} numberOfLines={2}>
            {post.title}
          </Text>
          <Text style={[pc.summary, { color: theme.textSecondary }]} numberOfLines={1}>
            {post.summary}
          </Text>

          <View style={pc.footer}>
            <View style={pc.meta}>
              <MaterialIcons name="visibility" size={12} color={theme.textMuted} />
              <Text style={[pc.metaTxt, { color: theme.textMuted }]}>{viewsDisplay}</Text>
              <View style={[pc.sep, { backgroundColor: theme.textMuted }]} />
              <MaterialIcons name="schedule" size={12} color={theme.textMuted} />
              <Text style={[pc.metaTxt, { color: theme.textMuted }]}>{post.readTime} دق</Text>
              <View style={[pc.sep, { backgroundColor: theme.textMuted }]} />
              <MaterialIcons name="favorite-border" size={12} color={theme.textMuted} />
              <Text style={[pc.metaTxt, { color: theme.textMuted }]}>{likesDisplay}</Text>
            </View>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push(`/post/${post.id}` as any); }}
              style={[pc.readBtn, {
                backgroundColor: post.categoryColor + '15',
                borderColor: post.categoryColor + '45',
              }]}
            >
              <Text style={[pc.readTxt, { color: post.categoryColor }]}>اقرأ</Text>
              <MaterialIcons name="arrow-back" size={12} color={post.categoryColor} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const pc = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: R,
    borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  imgWrap: { height: 218, position: 'relative' },
  img: { width: '100%', height: '100%' },
  topRight: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', gap: 6, alignItems: 'center',
  },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999,
  },
  catBadgeText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  featuredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999,
    backgroundColor: 'rgba(245,158,11,0.22)', borderWidth: 1, borderColor: '#F59E0B70',
  },
  featuredText: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: '#F59E0B' },
  bottomRow: {
    position: 'absolute', bottom: 12, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  emojiBox: {
    backgroundColor: 'rgba(0,0,0,0.38)', borderRadius: 10,
    padding: 6, alignItems: 'center', justifyContent: 'center',
  },
  content: { padding: 14, gap: 6 },
  title: { fontSize: 16, fontFamily: 'Cairo_700Bold', lineHeight: 26 },
  summary: { fontSize: 13, fontFamily: 'Cairo_400Regular', lineHeight: 20 },
  footer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 4,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaTxt: { fontSize: 11, fontFamily: 'Cairo_500Medium' },
  sep: { width: 3, height: 3, borderRadius: 1.5 },
  readBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999, borderWidth: 1,
  },
  readTxt: { fontSize: 12, fontFamily: 'Cairo_700Bold' },
});

// ─── Compact Tool Card (Explore More horizontal scroll) ────────────────────────
const CompactToolCard = memo(({ tool, theme }: { tool: any; theme: any }) => {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); router.push(`/tool/${tool.id}` as any); }}
      style={({ pressed }) => [
        ct.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[ct.iconBg, { backgroundColor: tool.logoColor + '18' }]}>
        <MaterialIcons name={tool.logoIcon as any} size={26} color={tool.logoColor} />
      </View>
      <Text style={[ct.name, { color: theme.textPrimary }]} numberOfLines={2}>
        {tool.name}
      </Text>
      <View style={ct.metaRow}>
        <MaterialIcons name="star" size={11} color="#F59E0B" />
        <Text style={[ct.rating, { color: theme.textMuted }]}>{tool.rating}</Text>
        {tool.isNew ? (
          <View style={ct.newBadge}>
            <Text style={ct.newText}>جديد</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

const ct = StyleSheet.create({
  card: {
    width: 112, alignItems: 'center', gap: 8,
    paddingVertical: 16, paddingHorizontal: 8,
    borderRadius: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  iconBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', textAlign: 'center', lineHeight: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  newBadge: { backgroundColor: '#10B98120', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 9999 },
  newText: { fontSize: 9, fontFamily: 'Cairo_700Bold', color: '#10B981' },
});

// ─── Compact Post Row (Explore More list) ─────────────────────────────────────
const CompactPostRow = memo(({ post, theme }: { post: any; theme: any }) => {
  const router = useRouter();
  const views = post.views >= 1000 ? `${(post.views / 1000).toFixed(1)}k` : post.views;
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); router.push(`/post/${post.id}` as any); }}
      style={({ pressed }) => [
        cpr.row,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && { opacity: 0.87 },
      ]}
    >
      <Image
        source={{ uri: post.thumbnail }}
        style={cpr.thumb}
        contentFit="cover"
        transition={300}
      />
      <View style={cpr.info}>
        <Text style={[cpr.title, { color: theme.textPrimary }]} numberOfLines={2}>
          {post.title}
        </Text>
        <View style={cpr.meta}>
          <MaterialIcons name="visibility" size={11} color={theme.textMuted} />
          <Text style={[cpr.metaTxt, { color: theme.textMuted }]}>{views}</Text>
          <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: theme.textMuted }} />
          <Text style={[cpr.metaTxt, { color: theme.textMuted }]}>{post.readTime} دق</Text>
        </View>
      </View>
      <MaterialIcons name="arrow-back" size={16} color={theme.textMuted} />
    </Pressable>
  );
});

const cpr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, borderRadius: 14, borderWidth: 1, marginBottom: 8,
  },
  thumb: { width: 66, height: 66, borderRadius: 10, flexShrink: 0 },
  info: { flex: 1, gap: 5 },
  title: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', lineHeight: 20 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
});

// ─── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = memo(({
  icon, iconColor, title, badge, onAction, actionLabel, theme,
}: {
  icon: string; iconColor: string; title: string;
  badge?: string; onAction?: () => void; actionLabel?: string; theme: any;
}) => (
  <View style={hd.row}>
    <View style={hd.left}>
      <LinearGradient
        colors={[iconColor + '35', iconColor + '12']}
        style={hd.iconBg}
      >
        <MaterialIcons name={icon as any} size={18} color={iconColor} />
      </LinearGradient>
      <Text style={[hd.title, { color: theme.textPrimary }]}>{title}</Text>
      {badge ? (
        <View style={[hd.badge, { backgroundColor: iconColor + '20', borderColor: iconColor + '45' }]}>
          <Text style={[hd.badgeText, { color: iconColor }]}>{badge}</Text>
        </View>
      ) : null}
    </View>
    {onAction ? (
      <Pressable onPress={onAction}>
        <Text style={[hd.action, { color: theme.primary }]}>{actionLabel || 'عرض الكل'}</Text>
      </Pressable>
    ) : null}
  </View>
));
const hd = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 14,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  iconBg: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontFamily: 'Cairo_700Bold' },
  badge: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 9999, borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontFamily: 'Cairo_700Bold' },
  action: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const { unreadCount } = useNotifications();
  const {
    tools, loading, searchQuery, setSearchQuery,
    savedToolIds, votedToolIds, toggleSaveTool, toggleVoteTool, refreshTools,
  } = useAppContext();

  const [showAll, setShowAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [aiProfile, setAiProfile] = useState<any>(null);

  // Load onboarding AI profile once on mount
  useEffect(() => {
    getAIProfile().then(p => { if (p) setAiProfile(p); });
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshTools();
    await new Promise(resolve => setTimeout(resolve, 1200));
    setRefreshing(false);
  }, [refreshTools]);

  // ── AI preference profile (interactions + onboarding selections) ────────────
  const prefs = useMemo(() => {
    const base = buildUserPrefs(tools, savedToolIds, votedToolIds);
    return applyAIProfile(base, aiProfile);
  }, [tools, savedToolIds, votedToolIds, aiProfile]);

  // ── Smart mixed feed ───────────────────────────────────────────────────────
  const allFeedItems = useMemo(
    () => buildSmartFeed(tools, MOCK_POSTS, prefs, savedToolIds),
    [tools, prefs, savedToolIds],
  );

  // ── Explore more data ──────────────────────────────────────────────────────
  const { newTools, latestPosts } = useMemo(
    () => buildExploreMore(tools, MOCK_POSTS),
    [tools],
  );

  // ── Visible feed (paginated) ───────────────────────────────────────────────
  const visibleItems = useMemo(
    () => (showAll ? allFeedItems : allFeedItems.slice(0, 10)),
    [allFeedItems, showAll],
  );

  // ── Search results ─────────────────────────────────────────────────────────
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return tools.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.shortDescription.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q)),
    );
  }, [tools, searchQuery]);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return MOCK_POSTS.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.tags.some(tag => tag.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;
  const totalSearchResults = filteredTools.length + filteredPosts.length;
  const s = useMemo(() => createStyles(theme), [theme]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={s.container}>
        {/* Header skeleton */}
        <View style={s.header}>
          <View>
            <View style={{ width: 120, height: 22, borderRadius: 8, backgroundColor: theme.surface }} />
            <View style={{ width: 180, height: 13, borderRadius: 6, backgroundColor: theme.surface, marginTop: 6 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[s.notifBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} />
            <View style={[s.notifBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} />
          </View>
        </View>
        {/* Search skeleton */}
        <View style={{ marginHorizontal: 16, marginVertical: 10, height: 46, borderRadius: 12, backgroundColor: theme.surface }} />
        {/* Feed skeletons — 2 tool cards + 1 post card + 2 tool cards */}
        <SkeletonToolCard />
        <SkeletonToolCard />
        <SkeletonPostCard />
        <SkeletonToolCard />
        <SkeletonToolCard />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 36 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={[s.logo, { color: theme.textPrimary }]}>مستر جيشو</Text>
            <Text style={[s.tagline, { color: theme.textMuted }]}>
              منصتك العربية لأدوات الذكاء الاصطناعي
            </Text>
          </View>
          <View style={s.headerBtns}>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push('/ai-chat' as any); }}
              style={[s.notifBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <MaterialIcons name="psychology" size={22} color={theme.primary} />
            </Pressable>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.push('/(tabs)/notifications'); }}
            style={[s.notifBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <MaterialIcons
              name={unreadCount > 0 ? 'notifications' : 'notifications-none'}
              size={22}
              color={unreadCount > 0 ? theme.primary : theme.textSecondary}
            />
            {unreadCount > 0 ? (
              <View style={s.notifDot}>
                <Text style={s.notifDotTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
          </View>
        </View>

        {/* ── Search Bar ─────────────────────────────────────────────────── */}
        <View style={s.searchWrap}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {isSearching ? (
          /* ── Search Results ─────────────────────────────────────────────── */
          <View style={{ marginTop: 4 }}>
            {/* Result count */}
            <View style={[s.searchHeader, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <MaterialIcons name="search" size={15} color={theme.primary} />
              <Text style={[s.searchHeaderTxt, { color: theme.textPrimary }]}>
                {totalSearchResults > 0 ? (
                  <>{totalSearchResults} نتيجة لـ <Text style={{ color: theme.primary }}>"{searchQuery}"</Text></>
                ) : (
                  <>لا توجد نتائج لـ <Text style={{ color: theme.primary }}>"{searchQuery}"</Text></>
                )}
              </Text>
            </View>

            {totalSearchResults === 0 ? (
              <Animated.View entering={FadeIn.duration(300)} style={s.emptyBox}>
                <MaterialIcons name="search-off" size={56} color={theme.textMuted} />
                <Text style={[s.emptyTitle, { color: theme.textSecondary }]}>لا توجد نتائج</Text>
                <Text style={[s.emptyHint, { color: theme.textMuted }]}>جرّب كلمات مفتاحية مختلفة</Text>
              </Animated.View>
            ) : (
              <>
                {/* Tool results */}
                {filteredTools.length > 0 && (
                  <View>
                    <Text style={[s.searchGroupLabel, { color: theme.textMuted }]}>
                      أدوات ({filteredTools.length})
                    </Text>
                    {filteredTools.map((tool, i) => (
                      <Animated.View key={tool.id} entering={FadeInDown.duration(260).delay(i * 35)}>
                        <Pressable
                          onPress={() => { Haptics.selectionAsync(); router.push(`/tool/${tool.id}` as any); }}
                          style={[s.searchCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        >
                          <View style={[s.searchIconWrap, { backgroundColor: tool.logoColor + '18' }]}>
                            <MaterialIcons name={tool.logoIcon as any} size={22} color={tool.logoColor} />
                          </View>
                          <View style={s.searchInfo}>
                            <Text style={[s.searchName, { color: theme.textPrimary }]} numberOfLines={1}>
                              {tool.name}
                            </Text>
                            <Text style={[s.searchDesc, { color: theme.textSecondary }]} numberOfLines={1}>
                              {tool.shortDescription}
                            </Text>
                            <View style={s.searchMeta}>
                              <MaterialIcons name="star" size={11} color="#F59E0B" />
                              <Text style={[s.searchMetaTxt, { color: theme.textMuted }]}>{tool.rating}</Text>
                              <Text style={[s.searchDot, { color: theme.textMuted }]}>·</Text>
                              <Text style={[s.searchMetaTxt, { color: theme.textMuted }]}>{tool.category}</Text>
                            </View>
                          </View>
                          <MaterialIcons name="arrow-back" size={16} color={theme.textMuted} />
                        </Pressable>
                      </Animated.View>
                    ))}
                  </View>
                )}

                {/* Post results */}
                {filteredPosts.length > 0 && (
                  <View style={{ marginTop: filteredTools.length > 0 ? 8 : 0 }}>
                    <Text style={[s.searchGroupLabel, { color: theme.textMuted }]}>
                      مقالات ({filteredPosts.length})
                    </Text>
                    {filteredPosts.map((post, i) => (
                      <Animated.View key={post.id} entering={FadeInDown.duration(260).delay(i * 35)}>
                        <Pressable
                          onPress={() => { Haptics.selectionAsync(); router.push(`/post/${post.id}` as any); }}
                          style={[s.searchCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        >
                          <Image
                            source={{ uri: post.thumbnail }}
                            style={s.searchThumb}
                            contentFit="cover"
                            transition={200}
                          />
                          <View style={s.searchInfo}>
                            <Text style={[s.searchName, { color: theme.textPrimary }]} numberOfLines={1}>
                              {post.title}
                            </Text>
                            <Text style={[s.searchDesc, { color: theme.textSecondary }]} numberOfLines={1}>
                              {post.summary}
                            </Text>
                            <View style={s.searchMeta}>
                              <MaterialIcons name="visibility" size={11} color={theme.textMuted} />
                              <Text style={[s.searchMetaTxt, { color: theme.textMuted }]}>
                                {post.views >= 1000 ? `${(post.views / 1000).toFixed(1)}k` : post.views}
                              </Text>
                              <Text style={[s.searchDot, { color: theme.textMuted }]}>·</Text>
                              <Text style={[s.searchMetaTxt, { color: theme.textMuted }]}>{post.readTime} دق</Text>
                            </View>
                          </View>
                          <MaterialIcons name="arrow-back" size={16} color={theme.textMuted} />
                        </Pressable>
                      </Animated.View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        ) : (
          <>
            {/* ── SECTION 1: ✨ مقترح لك ──────────────────────────────────── */}
            <View style={s.section}>
              <SectionHeader
                icon="auto-awesome"
                iconColor="#A78BFA"
                title="مقترح لك"
                badge={prefs.hasInteractions ? `AI مخصص` : undefined}
                theme={theme}
              />

              {/* Personalization chip */}
              <Animated.View
                entering={FadeIn.duration(400)}
                style={[s.aiChip, { borderColor: theme.border }]}
              >
                <LinearGradient
                  colors={['#A78BFA18', '#3B82F614']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.aiChipGrad}
                >
                  <MaterialIcons name="psychology" size={15} color="#A78BFA" />
                  <Text style={[s.aiChipTxt, { color: theme.textSecondary }]}>
                    {prefs.hasInteractions
                      ? `مرتّب ذكياً بناءً على اهتماماتك وتفاعلاتك السابقة`
                      : 'مرتّب بناءً على الجودة، الرواج، وحداثة المحتوى'}
                  </Text>
                </LinearGradient>
              </Animated.View>

              {/* Feed items */}
              <View style={{ marginTop: 4 }}>
                {visibleItems.map((item, i) =>
                  item.type === 'tool' ? (
                    <FeedToolCard
                      key={`t-${item.data.id}`}
                      item={item as ToolFeedItem}
                      theme={theme}
                      index={i}
                      onSave={toggleSaveTool}
                      onVote={toggleVoteTool}
                      isSaved={savedToolIds.includes(item.data.id)}
                      isVoted={votedToolIds.includes(item.data.id)}
                    />
                  ) : (
                    <FeedPostCard
                      key={`p-${item.data.id}`}
                      item={item as PostFeedItem}
                      theme={theme}
                      index={i}
                    />
                  ),
                )}
              </View>

              {/* Show more / less */}
              {allFeedItems.length > 10 && (
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setShowAll(v => !v); }}
                  style={[s.showMoreBtn, {
                    borderColor: '#A78BFA45',
                    backgroundColor: '#A78BFA0E',
                  }]}
                >
                  <MaterialIcons
                    name={showAll ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={20} color="#A78BFA"
                  />
                  <Text style={[s.showMoreTxt, { color: '#A78BFA' }]}>
                    {showAll ? 'عرض أقل' : `عرض ${allFeedItems.length - 10} عنصر إضافي`}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* ── SECTION 2: 🚀 استكشف المزيد ─────────────────────────────── */}
            <View style={[s.exploreSection, { borderTopColor: theme.border }]}>
              <SectionHeader
                icon="rocket-launch"
                iconColor="#F97316"
                title="استكشف المزيد"
                onAction={() => { Haptics.selectionAsync(); router.push('/explore' as any); }}
                actionLabel="عرض الكل"
                theme={theme}
              />

              {/* New & trending tools — horizontal scroll */}
              {newTools.length > 0 && (
                <>
                  <View style={s.subLabel}>
                    <MaterialIcons name="fiber-new" size={14} color="#10B981" />
                    <Text style={[s.subLabelTxt, { color: theme.textSecondary }]}>
                      أدوات جديدة ورائجة
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.hScroll}
                    style={{ marginBottom: 22 }}
                  >
                    {newTools.map(tool => (
                      <CompactToolCard key={tool.id} tool={tool} theme={theme} />
                    ))}
                  </ScrollView>
                </>
              )}

              {/* Latest posts — vertical compact */}
              {latestPosts.length > 0 && (
                <>
                  <View style={s.subLabel}>
                    <MaterialIcons name="article" size={14} color="#3B82F6" />
                    <Text style={[s.subLabelTxt, { color: theme.textSecondary }]}>أحدث المقالات</Text>
                    <Pressable onPress={() => { Haptics.selectionAsync(); router.push('/news' as any); }}>
                      <Text style={[s.subAction, { color: theme.primary }]}>الكل</Text>
                    </Pressable>
                  </View>
                  <View style={{ paddingHorizontal: 16 }}>
                    {latestPosts.map(post => (
                      <CompactPostRow key={post.id} post={post} theme={theme} />
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* ── Stats Bar ────────────────────────────────────────────────── */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(180)}
              style={[s.statsBar, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              {[
                { val: `+${tools.length}`, lbl: 'أداة ذكية' },
                { val: `${MOCK_POSTS.length}`, lbl: 'مقال' },
                { val: '+15K', lbl: 'مستخدم' },
              ].map((stat, i) => (
                <React.Fragment key={stat.lbl}>
                  {i > 0 && <View style={[s.statSep, { backgroundColor: theme.border }]} />}
                  <View style={s.statItem}>
                    <Text style={[s.statVal, { color: theme.primary }]}>{stat.val}</Text>
                    <Text style={[s.statLbl, { color: theme.textMuted }]}>{stat.lbl}</Text>
                  </View>
                </React.Fragment>
              ))}
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  loadingTxt: { marginTop: 12, fontSize: 14, fontFamily: 'Cairo_400Regular' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8,
  },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { fontSize: 26, fontFamily: 'Cairo_700Bold', letterSpacing: -0.5 },
  tagline: { fontSize: 12, fontFamily: 'Cairo_400Regular', marginTop: 2 },
  notifBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifDotTxt: { fontSize: 9, fontWeight: '700', color: '#FFF' },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 8 },

  // Search results
  searchHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  searchHeaderTxt: { fontSize: 13, fontFamily: 'Cairo_500Medium' },
  searchGroupLabel: {
    fontSize: 12, fontFamily: 'Cairo_700Bold',
    paddingHorizontal: 16, paddingBottom: 8, letterSpacing: 0.4,
  },
  searchCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 8,
    padding: 12, borderRadius: 14, borderWidth: 1,
  },
  searchIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  searchThumb: { width: 56, height: 56, borderRadius: 10 },
  searchInfo: { flex: 1, gap: 3 },
  searchName: { fontSize: 14, fontFamily: 'Cairo_700Bold' },
  searchDesc: { fontSize: 12, fontFamily: 'Cairo_400Regular' },
  searchMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  searchMetaTxt: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  searchDot: { fontSize: 10 },
  emptyBox: { alignItems: 'center', paddingVertical: 64, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: 'Cairo_600SemiBold' },
  emptyHint: { fontSize: 13, fontFamily: 'Cairo_400Regular' },

  // Sections
  section: { marginTop: 14 },
  exploreSection: { marginTop: 28, paddingTop: 24, borderTopWidth: 1 },

  // AI chip
  aiChip: {
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 12, overflow: 'hidden', borderWidth: 1,
  },
  aiChipGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  aiChipTxt: { fontSize: 12, fontFamily: 'Cairo_400Regular', flex: 1 },

  // Show more
  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 4, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1.5,
  },
  showMoreTxt: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },

  // Explore sub-labels
  subLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, marginBottom: 12,
  },
  subLabelTxt: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', flex: 1 },
  subAction: { fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
  hScroll: { paddingHorizontal: 16, gap: 10 },

  // Stats bar
  statsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 24, paddingVertical: 20,
    borderRadius: 18, borderWidth: 1,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: { fontSize: 22, fontFamily: 'Cairo_700Bold' },
  statLbl: { fontSize: 11, fontFamily: 'Cairo_500Medium' },
  statSep: { width: 1, height: 32 },
});
