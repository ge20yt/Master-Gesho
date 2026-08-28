/**
 * app/tool/[id].tsx — مستر جيشو
 * Premium tool detail with sticky action bar & screenshots pagination
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Share } from 'react-native';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppContext } from '../../contexts/AppContext';
import ToolCard from '../../components/ToolCard';

const { width: SW } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SCREENSHOT_W = SW - 64;

export default function ToolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const {
    getToolById, toggleSaveTool, toggleVoteTool, rateTool, addComment, loadComments,
    isToolSaved, isToolVoted, getUserRating, tools, toolComments,
  } = useAppContext();

  const tool = getToolById(id);
  const [commentText, setCommentText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [ssIndex, setSsIndex] = useState(0);

  const saved  = isToolSaved(id);
  const voted  = isToolVoted(id);
  const userRating = getUserRating(id);
  const comments = toolComments[id] || [];

  useEffect(() => { if (id) loadComments(id); }, [id, loadComments]);

  // ── Animations ───────────────────────────────────────────────────────────
  const voteScale   = useSharedValue(1);
  const saveScale   = useSharedValue(1);
  const launchScale = useSharedValue(1);
  const starScales  = [1, 2, 3, 4, 5].map(() => useSharedValue(1));

  const voteAnimStyle   = useAnimatedStyle(() => ({ transform: [{ scale: voteScale.value }] }));
  const saveAnimStyle   = useAnimatedStyle(() => ({ transform: [{ scale: saveScale.value }] }));
  const launchAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: launchScale.value }] }));
  const starAnimStyles  = starScales.map(s => useAnimatedStyle(() => ({ transform: [{ scale: s.value }] })));

  const relatedTools = useMemo(
    () => tools.filter(t => t.category === tool?.category && t.id !== id).slice(0, 6),
    [tools, tool, id]
  );

  // ── Rating distribution ───────────────────────────────────────────────────
  const ratingDistribution = useMemo(() => {
    if (!tool) return [];
    const avg = tool.rating;
    const count = tool.ratingCount;
    if (count === 0) return [1, 2, 3, 4, 5].map(s => ({ star: s, count: 0, pct: 0 }));
    const gaussianWeight = (star: number) => Math.exp(-0.5 * Math.pow((star - avg) / 0.9, 2));
    const totalW = [1, 2, 3, 4, 5].reduce((acc, s) => acc + gaussianWeight(s), 0);
    const weights: Record<number, number> = {};
    [1, 2, 3, 4, 5].forEach(s => { weights[s] = Math.round((gaussianWeight(s) / totalW) * count); });
    const maxCount = Math.max(...Object.values(weights), 1);
    return [5, 4, 3, 2, 1].map(s => ({
      star: s, count: weights[s], pct: Math.round((weights[s] / maxCount) * 100),
    }));
  }, [tool]);

  const recommendationPct = useMemo(() => {
    if (!tool || tool.ratingCount === 0) return 0;
    return Math.round(Math.min(100, Math.max(0, ((tool.rating - 1) / 4) * 100)));
  }, [tool]);

  const s = useMemo(() => createStyles(theme), [theme]);

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
    try {
      await Share.share({
        title: tool?.name || '',
        message: `${tool?.name}\n${tool?.shortDescription}${tool?.url ? '\n' + tool.url : ''}`,
        url: tool?.url || undefined,
      });
    } catch {}
  }, [tool]);

  const handleRate = useCallback((rating: number) => {
    const idx = rating - 1;
    starScales[idx].value = withSequence(
      withSpring(1.5, { damping: 8, stiffness: 400 }),
      withSpring(0.9, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    rateTool(id, rating);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [id, rateTool]);

  const handleSubmitComment = useCallback(() => {
    if (!commentText.trim()) return;
    addComment(id, commentText.trim());
    setCommentText('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [commentText, id, addComment]);

  // ── Screenshots scroll ────────────────────────────────────────────────────
  const handleSsScroll = useCallback((e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (SCREENSHOT_W + 12));
    setSsIndex(Math.max(0, Math.min(idx, (tool?.screenshots.length ?? 1) - 1)));
  }, [tool]);

  if (!tool) {
    return (
      <SafeAreaView edges={['top']} style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <MaterialIcons name="error-outline" size={48} color={theme.textMuted} />
        <Text style={{ color: theme.textSecondary, marginTop: 12, fontSize: 16, fontFamily: 'Cairo_400Regular' }}>الأداة غير موجودة</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.primary, fontSize: 16, fontFamily: 'Cairo_600SemiBold' }}>رجوع</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const catColor = theme.categoryColors[tool.category] || theme.primary;
  const displayedComments = showAllComments ? comments : comments.slice(0, 3);
  const pricingColor = tool.pricing === 'مجاني' ? '#10B981' : tool.pricing === 'مفتوح المصدر' ? '#8B5CF6' : '#F59E0B';

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* ── Main Scroll ── */}
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top bar */}
          <View style={s.topBar}>
            <Pressable onPress={() => router.back()} style={s.backButton}>
              <MaterialIcons name="arrow-forward" size={22} color={theme.textPrimary} />
            </Pressable>
            <View style={s.topActions}>
              <Pressable onPress={handleShare} style={s.topAction}>
                <MaterialIcons name="share" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Hero gradient banner */}
          <Animated.View entering={FadeInDown.duration(400)}>
            <LinearGradient
              colors={[tool.logoColor + '22', tool.logoColor + '08', 'transparent']}
              style={s.heroBanner}
            >
              <View style={[s.logoHero, { backgroundColor: tool.logoColor + '20', borderColor: tool.logoColor + '30' }]}>
                <MaterialIcons name={tool.logoIcon as any} size={44} color={tool.logoColor} />
              </View>
              <Text style={s.toolName}>{tool.name}</Text>
              <View style={s.metaRow}>
                <View style={[s.catBadge, { backgroundColor: catColor + '20' }]}>
                  <Text style={[s.catBadgeText, { color: catColor }]}>{tool.category}</Text>
                </View>
                <View style={[s.pricingBadge, { backgroundColor: pricingColor + '18' }]}>
                  <Text style={[s.pricingBadgeText, { color: pricingColor }]}>{tool.pricing}</Text>
                </View>
                {tool.trending && (
                  <View style={s.trendingBadge}>
                    <MaterialIcons name="local-fire-department" size={11} color="#F97316" />
                    <Text style={s.trendingText}>رائج</Text>
                  </View>
                )}
                {tool.editorPick && (
                  <View style={s.editorBadge}>
                    <MaterialIcons name="verified" size={11} color="#3B82F6" />
                    <Text style={s.editorText}>اختيار المحررين</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={() => router.push(`/developer/${encodeURIComponent(tool.developerName)}` as any)}>
                <Text style={[s.developerName, { color: theme.primary }]}>بواسطة {tool.developerName}</Text>
              </Pressable>
            </LinearGradient>
          </Animated.View>

          {/* Stats row */}
          <Animated.View entering={FadeInDown.duration(400).delay(80)} style={[s.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={s.statBox}>
              <MaterialIcons name="star" size={20} color={theme.star} />
              <Text style={[s.statBoxValue, { color: theme.textPrimary }]}>{tool.rating}</Text>
              <Text style={[s.statBoxLabel, { color: theme.textMuted }]}>{tool.ratingCount} تقييم</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: theme.border }]} />
            <View style={s.statBox}>
              <MaterialIcons name="arrow-upward" size={20} color={theme.upvote} />
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

          {/* Description */}
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

          {/* Screenshots */}
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
              {/* Pagination dots */}
              {tool.screenshots.length > 1 && (
                <View style={s.ssDots}>
                  {tool.screenshots.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        s.ssDot,
                        {
                          backgroundColor: i === ssIndex ? tool.logoColor : theme.border,
                          width: i === ssIndex ? 16 : 6,
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Rating distribution */}
          {tool.ratingCount > 0 && (
            <Animated.View entering={FadeInDown.duration(400).delay(200)} style={s.section}>
              <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>إحصائيات التقييم</Text>

              <View style={[s.recBadge, {
                backgroundColor: recommendationPct >= 75 ? '#22C55E15' : '#F59E0B15',
                borderColor: recommendationPct >= 75 ? '#22C55E40' : '#F59E0B40',
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
                      <MaterialIcons name="star" size={11} color={theme.star} />
                    </View>
                    <View style={[s.barBg, { backgroundColor: theme.border }]}>
                      <View
                        style={[
                          s.barFill,
                          {
                            width: `${item.pct}%` as any,
                            backgroundColor: item.star >= 4 ? '#22C55E' : item.star === 3 ? '#F59E0B' : '#EF4444',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[s.barCount, { color: theme.textMuted }]}>{item.count}</Text>
                  </View>
                ))}
              </View>

              <View style={[s.statsSummaryRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={s.statsSummaryItem}>
                  <Text style={[s.statsSummaryVal, { color: theme.star }]}>{tool.rating}</Text>
                  <Text style={[s.statsSummaryLabel, { color: theme.textMuted }]}>متوسط</Text>
                </View>
                <View style={[s.statsSumDivider, { backgroundColor: theme.border }]} />
                <View style={s.statsSummaryItem}>
                  <Text style={[s.statsSummaryVal, { color: theme.primary }]}>{tool.ratingCount}</Text>
                  <Text style={[s.statsSummaryLabel, { color: theme.textMuted }]}>تقييم</Text>
                </View>
                <View style={[s.statsSumDivider, { backgroundColor: theme.border }]} />
                <View style={s.statsSummaryItem}>
                  <Text style={[s.statsSummaryVal, { color: '#22C55E' }]}>{recommendationPct}%</Text>
                  <Text style={[s.statsSummaryLabel, { color: theme.textMuted }]}>توصية</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Rate section */}
          <Animated.View entering={FadeInUp.duration(400).delay(300)} style={s.rateSection}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>قيّم هذه الأداة</Text>
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((star, idx) => (
                <Animated.View key={star} style={starAnimStyles[idx]}>
                  <Pressable onPress={() => handleRate(star)} hitSlop={6}>
                    <MaterialIcons
                      name={star <= userRating ? 'star' : 'star-border'}
                      size={38}
                      color={star <= userRating ? theme.star : theme.textMuted}
                    />
                  </Pressable>
                </Animated.View>
              ))}
            </View>
            {userRating > 0 && (
              <Text style={[s.ratedText, { color: theme.star }]}>قيّمت هذه الأداة {userRating}/5</Text>
            )}
          </Animated.View>

          {/* Comments */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>التعليقات ({comments.length})</Text>
            <View style={[s.commentInput, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TextInput
                style={[s.commentTextInput, { color: theme.textPrimary }]}
                placeholder="اكتب تعليقاً..."
                placeholderTextColor={theme.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                textAlign="right"
              />
              <Pressable
                onPress={handleSubmitComment}
                style={[s.sendButton, { backgroundColor: theme.primary, opacity: commentText.trim() ? 1 : 0.4 }]}
                disabled={!commentText.trim()}
              >
                <MaterialIcons name="send" size={18} color="#FFF" />
              </Pressable>
            </View>
            {displayedComments.map(comment => (
              <View key={comment.id} style={[s.commentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={s.commentHeader}>
                  <View style={[s.commentAvatar, { backgroundColor: theme.primaryDark }]}>
                    <Text style={s.commentAvatarText}>
                      {comment.userName.split(' ').map((n: string) => n[0]).join('')}
                    </Text>
                  </View>
                  <View>
                    <Text style={[s.commentName, { color: theme.textPrimary }]}>{comment.userName}</Text>
                    <Text style={[s.commentDate, { color: theme.textMuted }]}>{comment.createdAt}</Text>
                  </View>
                </View>
                <Text style={[s.commentTextStyle, { color: theme.textSecondary }]}>{comment.text}</Text>
              </View>
            ))}
            {comments.length > 3 && (
              <Pressable onPress={() => setShowAllComments(!showAllComments)}>
                <Text style={[s.showMoreText, { color: theme.primary }]}>
                  {showAllComments ? 'عرض أقل' : `عرض جميع التعليقات (${comments.length})`}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Developer */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>المطور</Text>
            <View style={[s.developerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[s.devAvatar, { backgroundColor: theme.primaryDark }]}>
                <Text style={s.devAvatarText}>{tool.developerName.split(' ').map(n => n[0]).join('').slice(0, 2)}</Text>
              </View>
              <View style={s.devInfo}>
                <Pressable onPress={() => router.push(`/developer/${encodeURIComponent(tool.developerName)}` as any)}>
                  <Text style={[s.devName, { color: theme.primary }]}>{tool.developerName}</Text>
                </Pressable>
                <Text style={[s.devBio, { color: theme.textSecondary }]}>{tool.developerBio}</Text>
                <View style={s.devMeta}>
                  <View style={s.devStat}>
                    <MaterialIcons name="apps" size={14} color={theme.textMuted} />
                    <Text style={[s.devStatText, { color: theme.textMuted }]}>{tool.developerToolsCount} أدوات</Text>
                  </View>
                  <View style={s.devStat}>
                    <MaterialIcons name="people" size={14} color={theme.textMuted} />
                    <Text style={[s.devStatText, { color: theme.textMuted }]}>{tool.developerFollowers.toLocaleString()} متابع</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Related tools */}
          {relatedTools.length > 0 && (
            <View style={s.relatedSection}>
              <Text style={[s.sectionTitle, { color: theme.textPrimary, paddingHorizontal: 16 }]}>أدوات مشابهة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.relatedScroll}>
                {relatedTools.map(t => <ToolCard key={t.id} tool={t} variant="compact" width={160} />)}
              </ScrollView>
            </View>
          )}
        </ScrollView>

        {/* ── Sticky Bottom Action Bar ── */}
        <View style={[s.stickyBar, {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: insets.bottom + 8,
        }]}>
          {/* Vote button */}
          <AnimatedPressable
            style={[
              s.stickyVoteBtn,
              voted
                ? { backgroundColor: theme.upvote, borderColor: theme.upvote }
                : { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
              voteAnimStyle,
            ]}
            onPress={handleVotePress}
          >
            <MaterialIcons name="arrow-upward" size={16} color={voted ? '#FFF' : theme.upvote} />
            <Text style={[s.stickyVoteText, { color: voted ? '#FFF' : theme.upvote }]}>
              {tool.votes >= 1000 ? `${(tool.votes / 1000).toFixed(1)}k` : tool.votes}
            </Text>
          </AnimatedPressable>

          {/* Save button */}
          <AnimatedPressable
            style={[
              s.stickySaveBtn,
              saved
                ? { backgroundColor: tool.logoColor + '22', borderColor: tool.logoColor + '55' }
                : { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
              saveAnimStyle,
            ]}
            onPress={handleSavePress}
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

          {/* Compare button */}
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.push({ pathname: '/compare', params: { ids: id } } as any); }}
            style={[s.stickySaveBtn, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, minWidth: 56 }]}
          >
            <MaterialIcons name="compare-arrows" size={16} color={theme.textMuted} />
          </Pressable>

          {/* Launch button */}
          <AnimatedPressable
            style={[s.stickyLaunchBtn, launchAnimStyle]}
            onPressIn={() => { launchScale.value = withSpring(0.95, { damping: 15, stiffness: 300 }); }}
            onPressOut={() => { launchScale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
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
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.border,
  },
  topActions: { flexDirection: 'row', gap: 8 },
  topAction: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.border,
  },

  // Hero
  heroBanner: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 },
  logoHero: {
    width: 88, height: 88, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 1.5,
  },
  toolName: { fontSize: 26, fontFamily: 'Cairo_700Bold', color: theme.textPrimary, textAlign: 'center', marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  catBadgeText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  pricingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  pricingBadgeText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  trendingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999,
    backgroundColor: '#F9731615',
  },
  trendingText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold', color: '#F97316' },
  editorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999,
    backgroundColor: '#3B82F615',
  },
  editorText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold', color: '#3B82F6' },
  developerName: { fontSize: 13, fontFamily: 'Cairo_500Medium' },

  // Stats card
  statsCard: {
    flexDirection: 'row', marginHorizontal: 16, borderRadius: 16,
    padding: 16, borderWidth: 1, marginBottom: 20,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statBoxValue: { fontSize: 22, fontFamily: 'Cairo_700Bold' },
  statBoxLabel: { fontSize: 10, fontFamily: 'Cairo_500Medium' },
  statDivider: { width: 1 },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', marginBottom: 12 },
  description: { fontSize: 15, fontFamily: 'Cairo_400Regular', lineHeight: 26, textAlign: 'right', marginBottom: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, borderWidth: 1 },
  tagText: { fontSize: 11, fontFamily: 'Cairo_500Medium' },

  // Screenshots
  ssSection: { marginBottom: 24 },
  ssScroll: { paddingHorizontal: 16, gap: 12 },
  ssFrame: {
    width: SCREENSHOT_W, height: SCREENSHOT_W * 0.6,
    borderRadius: 14, overflow: 'hidden', borderWidth: 2,
  },
  ssImage: { width: '100%', height: '100%' },
  ssDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 12 },
  ssDot: { height: 6, borderRadius: 3, backgroundColor: '#64748B' },

  // Rating stats
  recBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, marginBottom: 16,
  },
  recText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
  barChart: { gap: 8, marginBottom: 16 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barStarRow: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 26 },
  barStar: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
  barBg: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5, minWidth: 4 },
  barCount: { fontSize: 11, fontFamily: 'Cairo_500Medium', width: 24, textAlign: 'right' },
  statsSummaryRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 14, borderWidth: 1,
  },
  statsSummaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  statsSummaryVal: { fontSize: 20, fontFamily: 'Cairo_700Bold' },
  statsSummaryLabel: { fontSize: 11, fontFamily: 'Cairo_500Medium' },
  statsSumDivider: { width: 1, height: 28 },

  // Rate
  rateSection: { paddingHorizontal: 16, marginBottom: 24, alignItems: 'center' },
  starsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  ratedText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', marginTop: 8 },

  // Comments
  commentInput: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 14,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
  },
  commentTextInput: {
    flex: 1, fontSize: 15, fontFamily: 'Cairo_400Regular',
    maxHeight: 80, minHeight: 36, writingDirection: 'rtl',
  },
  sendButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  commentCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  commentName: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
  commentDate: { fontSize: 11, fontFamily: 'Cairo_500Medium' },
  commentTextStyle: { fontSize: 15, fontFamily: 'Cairo_400Regular', lineHeight: 24, textAlign: 'right' },
  showMoreText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', textAlign: 'center', paddingVertical: 8 },

  // Developer
  developerCard: { flexDirection: 'row', gap: 14, borderRadius: 16, padding: 16, borderWidth: 1 },
  devAvatar: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  devAvatarText: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#FFF' },
  devInfo: { flex: 1 },
  devName: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', marginBottom: 4 },
  devBio: { fontSize: 13, fontFamily: 'Cairo_400Regular', marginBottom: 8 },
  devMeta: { flexDirection: 'row', gap: 16 },
  devStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  devStatText: { fontSize: 11, fontFamily: 'Cairo_500Medium' },

  // Related
  relatedSection: { marginBottom: 12 },
  relatedScroll: { paddingHorizontal: 16, gap: 12 },

  // ── Sticky Bottom Bar ──────────────────────────────────────────────────────
  stickyBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1,
  },
  stickyVoteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
    minWidth: 68,
  },
  stickyVoteText: { fontSize: 13, fontFamily: 'Cairo_700Bold' },
  stickySaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
    minWidth: 72,
  },
  stickySaveText: { fontSize: 13, fontFamily: 'Cairo_700Bold' },
  stickyLaunchBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  stickyLaunchGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13,
  },
  stickyLaunchText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#FFF' },
});
