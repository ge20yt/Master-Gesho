/**
 * app/admin.tsx — مستر جيشو
 * Premium Admin Analytics Dashboard
 * Stats · Category Charts · Tool Moderation · Activity Log
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withDelay, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert, useAuth } from '@/template';
import {
  fetchPlatformStats, fetchPendingTools, fetchRecentActivity,
  updateToolStatus, checkIsAdmin, featureTool, fetchCategoryStats,
} from '../services/adminService';
import { createNotification } from '../services/notificationsService';

const { width: W } = Dimensions.get('window');
const C4 = 'Cairo_400Regular';
const C5 = 'Cairo_500Medium';
const C6 = 'Cairo_600SemiBold';
const C7 = 'Cairo_700Bold';

type Tab = 'overview' | 'pending' | 'recent';

// ─── Animated Category Bar ─────────────────────────────────────────────────────
function CategoryBar({ label, count, pct, color, delay }: {
  label: string; count: number; pct: number; color: string; delay: number;
}) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(delay, withTiming(pct, { duration: 700 }));
  }, [pct]);
  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));

  return (
    <Animated.View entering={FadeInDown.duration(280).delay(delay)} style={cb.row}>
      <Text style={[cb.label, { color: '#94A3B8' }]} numberOfLines={1}>{label}</Text>
      <View style={cb.barTrack}>
        <Animated.View style={[cb.barFill, { backgroundColor: color }, animStyle]} />
      </View>
      <Text style={[cb.count, { color }]}>{count}</Text>
    </Animated.View>
  );
}
const cb = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  label:    { width: 100, fontSize: 11, fontFamily: C5, textAlign: 'right' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 4 },
  count:    { width: 28, fontSize: 12, fontFamily: C7, textAlign: 'left' },
});

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, index }: {
  icon: string; label: string; value: number; color: string; index: number;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(320).delay(index * 60)} style={{ width: (W - 48) / 2 }}>
      <LinearGradient colors={[color + '25', color + '08']} style={sc.card}>
        <View style={[sc.iconBg, { backgroundColor: color + '22' }]}>
          <MaterialIcons name={icon as any} size={24} color={color} />
        </View>
        <Text style={[sc.value, { color }]}>
          {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString()}
        </Text>
        <Text style={sc.label}>{label}</Text>
      </LinearGradient>
    </Animated.View>
  );
}
const sc = StyleSheet.create({
  card:   { borderRadius: 18, padding: 18, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  iconBg: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  value:  { fontSize: 30, fontFamily: C7 },
  label:  { fontSize: 12, fontFamily: C5, color: '#64748B' },
});

// ─── Pending Tool Card ─────────────────────────────────────────────────────────
function PendingCard({ tool, onApprove, onReject, onFeature, theme, index }: {
  tool: any; onApprove: () => void; onReject: () => void; onFeature: () => void;
  theme: any; index: number;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 60)} style={[pk.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Header */}
      <View style={pk.header}>
        <View style={[pk.logo, { backgroundColor: (tool.logoColor || '#3B82F6') + '20' }]}>
          <MaterialIcons name={(tool.logoIcon || 'apps') as any} size={22} color={tool.logoColor || '#3B82F6'} />
        </View>
        <View style={pk.info}>
          <Text style={[pk.name, { color: theme.textPrimary }]} numberOfLines={1}>{tool.name}</Text>
          <Text style={[pk.meta, { color: theme.textMuted }]}>
            {tool.category} · {tool.pricing}
          </Text>
        </View>
        <View style={pk.pendingBadge}>
          <Text style={pk.pendingText}>قيد المراجعة</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={[pk.desc, { color: theme.textSecondary }]} numberOfLines={2}>{tool.shortDescription}</Text>

      {/* Tags */}
      {(tool.tags || []).length > 0 && (
        <View style={pk.tagsRow}>
          {(tool.tags || []).slice(0, 4).map((tag: string) => (
            <View key={tag} style={[pk.tag, { backgroundColor: theme.backgroundSecondary }]}>
              <Text style={[pk.tagText, { color: theme.textMuted }]}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={pk.actions}>
        <Pressable onPress={onReject} style={[pk.btn, pk.rejectBtn, { borderColor: '#EF444450' }]}>
          <MaterialIcons name="close" size={16} color="#EF4444" />
          <Text style={[pk.btnText, { color: '#EF4444' }]}>رفض</Text>
        </Pressable>

        <Pressable onPress={onFeature} style={[pk.btn, { borderColor: '#F59E0B50', backgroundColor: '#F59E0B10' }]}>
          <MaterialIcons name="star-border" size={16} color="#F59E0B" />
          <Text style={[pk.btnText, { color: '#F59E0B' }]}>تمييز</Text>
        </Pressable>

        <Pressable onPress={onApprove} style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}>
          <LinearGradient colors={['#22C55E', '#10B981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pk.approveGrad}>
            <MaterialIcons name="check" size={16} color="#FFF" />
            <Text style={pk.approveText}>موافقة ونشر</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}
const pk = StyleSheet.create({
  card:        { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  logo:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info:        { flex: 1 },
  name:        { fontSize: 15, fontFamily: C7 },
  meta:        { fontSize: 11, fontFamily: C4, marginTop: 2 },
  pendingBadge:{ backgroundColor: '#F59E0B18', borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 3 },
  pendingText: { fontSize: 10, fontFamily: C6, color: '#F59E0B' },
  desc:        { fontSize: 13, fontFamily: C4, lineHeight: 20, textAlign: 'right', marginBottom: 10 },
  tagsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  tagText:     { fontSize: 10, fontFamily: C5 },
  actions:     { flexDirection: 'row', gap: 8 },
  btn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5 },
  rejectBtn:   { backgroundColor: '#EF444410' },
  btnText:     { fontSize: 13, fontFamily: C6 },
  approveGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10 },
  approveText: { fontSize: 13, fontFamily: C6, color: '#FFF' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function AdminScreen() {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isAdmin,        setIsAdmin]        = useState<boolean | null>(null);
  const [tab,            setTab]            = useState<Tab>('overview');
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [stats,          setStats]          = useState({ totalTools: 0, totalUsers: 0, totalVotes: 0, totalComments: 0 });
  const [pendingTools,   setPendingTools]   = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ recentTools: any[]; recentComments: any[] }>({ recentTools: [], recentComments: [] });
  const [categoryStats,  setCategoryStats]  = useState<{ category: string; count: number }[]>([]);

  const s = useMemo(() => createStyles(theme), [theme]);

  const loadData = useCallback(async () => {
    const [statsData, pending, activity, cats] = await Promise.all([
      fetchPlatformStats(),
      fetchPendingTools(),
      fetchRecentActivity(),
      fetchCategoryStats(),
    ]);
    setStats(statsData);
    setPendingTools(pending);
    setRecentActivity(activity);
    setCategoryStats(cats);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    checkIsAdmin(user.id).then(admin => {
      setIsAdmin(admin);
      if (admin) loadData().finally(() => setLoading(false));
      else setLoading(false);
    });
  }, [user?.id, loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [loadData]);

  const handleApprove = useCallback(async (tool: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await updateToolStatus(tool.id, 'approved');
      if (tool.submittedBy) {
        await createNotification({
          userId: tool.submittedBy,
          type: 'tool_approved',
          title: 'تمت الموافقة على أداتك',
          body: `تم قبول أداة "${tool.name}" ونشرها على المنصة 🎉`,
          toolId: tool.id,
        });
      }
      setPendingTools(prev => prev.filter(t => t.id !== tool.id));
      showAlert('تمت الموافقة', `تم نشر "${tool.name}" على المنصة`);
    } catch { showAlert('خطأ', 'حدث خطأ أثناء الموافقة'); }
  }, [showAlert]);

  const handleReject = useCallback(async (tool: any) => {
    showAlert('رفض الأداة', `هل تريد رفض "${tool.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'رفض', style: 'destructive', onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          try {
            await updateToolStatus(tool.id, 'rejected');
            if (tool.submittedBy) {
              await createNotification({
                userId: tool.submittedBy,
                type: 'tool_rejected',
                title: 'تم رفض أداتك',
                body: `للأسف، لم يتم قبول أداة "${tool.name}" في هذه المرحلة`,
                toolId: tool.id,
              });
            }
            setPendingTools(prev => prev.filter(t => t.id !== tool.id));
          } catch { showAlert('خطأ', 'حدث خطأ أثناء الرفض'); }
        },
      },
    ]);
  }, [showAlert]);

  const handleFeature = useCallback(async (tool: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateToolStatus(tool.id, 'approved');
      await featureTool(tool.id, true);
      if (tool.submittedBy) {
        await createNotification({
          userId: tool.submittedBy,
          type: 'tool_approved',
          title: 'أداتك مميزة الآن!',
          body: `تم قبول وتمييز أداة "${tool.name}" على الصفحة الرئيسية ⭐`,
          toolId: tool.id,
        });
      }
      setPendingTools(prev => prev.filter(t => t.id !== tool.id));
      showAlert('تم التمييز', `تم نشر وتمييز "${tool.name}" في الصفحة الرئيسية`);
    } catch { showAlert('خطأ', 'حدث خطأ أثناء التمييز'); }
  }, [showAlert]);

  // Category chart colours
  const CHART_COLORS = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#06B6D4','#EC4899','#F97316'];
  const maxCatCount  = Math.max(...categoryStats.map(c => c.count), 1);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[s.loadingTxt, { color: theme.textMuted }]}>جارٍ تحميل البيانات...</Text>
      </SafeAreaView>
    );
  }

  // ── Not Admin ────────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <SafeAreaView edges={['top']} style={[s.container, { alignItems: 'center', justifyContent: 'center', gap: 14 }]}>
        <LinearGradient colors={['#EF444420','#EF444408']} style={s.noAccessIcon}>
          <MaterialIcons name="admin-panel-settings" size={48} color="#EF4444" />
        </LinearGradient>
        <Text style={[s.noAccessTitle, { color: theme.textPrimary }]}>غير مصرح بالوصول</Text>
        <Text style={[s.noAccessSub, { color: theme.textMuted }]}>هذه الصفحة مخصصة للمسؤولين فقط</Text>
        <Pressable onPress={() => router.back()} style={[s.backBtnLarge, { borderColor: theme.border }]}>
          <Text style={[s.backBtnText, { color: theme.primary }]}>العودة</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const TABS: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: 'overview', label: 'نظرة عامة',     icon: 'dashboard' },
    { id: 'pending',  label: 'قيد المراجعة',  icon: 'pending-actions', badge: pendingTools.length },
    { id: 'recent',   label: 'النشاط الأخير', icon: 'history' },
  ];

  return (
    <SafeAreaView edges={['top']} style={s.container}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <MaterialIcons name="arrow-forward" size={20} color={theme.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: theme.textPrimary }]}>لوحة التحكم</Text>
          <Text style={[s.headerSub, { color: theme.textMuted }]}>مرحباً، مسؤول</Text>
        </View>
        <View style={s.adminBadge}>
          <MaterialIcons name="verified-user" size={13} color="#FFF" />
          <Text style={s.adminBadgeText}>Admin</Text>
        </View>
        <Pressable onPress={handleRefresh} style={[s.iconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <MaterialIcons name="refresh" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabsRow}
      >
        {TABS.map(t => (
          <Pressable
            key={t.id}
            onPress={() => { Haptics.selectionAsync(); setTab(t.id); }}
            style={[s.tabChip, tab === t.id && { backgroundColor: theme.primary }]}
          >
            <MaterialIcons name={t.icon as any} size={14} color={tab === t.id ? '#FFF' : theme.textSecondary} />
            <Text style={[s.tabText, tab === t.id && { color: '#FFF', fontFamily: C7 }]}>{t.label}</Text>
            {t.badge && t.badge > 0 ? (
              <View style={s.tabBadge}>
                <Text style={s.tabBadgeText}>{t.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} colors={[theme.primary]} />
        }
      >

        {/* ─ OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            {/* Stats grid */}
            <Text style={s.sectionLabel}>إحصائيات المنصة</Text>
            <View style={s.statsGrid}>
              {[
                { icon: 'apps',         label: 'الأدوات',       value: stats.totalTools,    color: '#3B82F6' },
                { icon: 'people',        label: 'المستخدمون',   value: stats.totalUsers,    color: '#10B981' },
                { icon: 'arrow-upward',  label: 'التصويتات',    value: stats.totalVotes,    color: '#F59E0B' },
                { icon: 'comment',       label: 'التعليقات',    value: stats.totalComments, color: '#A78BFA' },
              ].map((stat, i) => (
                <StatCard key={stat.label} {...stat} index={i} />
              ))}
            </View>

            {/* Pending alert banner */}
            {pendingTools.length > 0 && (
              <Animated.View entering={FadeIn.duration(300)} style={s.alertBanner}>
                <MaterialIcons name="pending-actions" size={20} color="#F59E0B" />
                <Text style={s.alertText}>{pendingTools.length} أداة تنتظر مراجعتك</Text>
                <Pressable onPress={() => { Haptics.selectionAsync(); setTab('pending'); }}>
                  <Text style={s.alertLink}>مراجعة الآن</Text>
                </Pressable>
              </Animated.View>
            )}

            {/* Category breakdown chart */}
            {categoryStats.length > 0 && (
              <Animated.View entering={FadeInDown.duration(380).delay(180)}
                style={[s.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={s.chartHeader}>
                  <LinearGradient colors={['#3B82F630','#3B82F610']} style={s.chartIcon}>
                    <MaterialIcons name="bar-chart" size={18} color="#3B82F6" />
                  </LinearGradient>
                  <Text style={[s.chartTitle, { color: theme.textPrimary }]}>توزيع الأدوات بالفئات</Text>
                  <Text style={[s.chartSub, { color: theme.textMuted }]}>{categoryStats.reduce((a, c) => a + c.count, 0)} أداة</Text>
                </View>
                <View style={{ gap: 4 }}>
                  {categoryStats.slice(0, 8).map((cat, i) => (
                    <CategoryBar
                      key={cat.category}
                      label={cat.category}
                      count={cat.count}
                      pct={(cat.count / maxCatCount) * 100}
                      color={CHART_COLORS[i % CHART_COLORS.length]}
                      delay={i * 60}
                    />
                  ))}
                </View>
              </Animated.View>
            )}

            {/* System info */}
            <Animated.View entering={FadeInDown.duration(360).delay(300)}
              style={[s.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={[s.infoCardTitle, { color: theme.textPrimary }]}>معلومات النظام</Text>
              {[
                { label: 'إصدار المنصة', value: '1.0.0' },
                { label: 'البيئة',       value: 'OnSpace Cloud' },
                { label: 'الحالة',       value: 'مفعّل', color: '#22C55E' },
              ].map((row, i) => (
                <View key={row.label} style={[s.infoRow, i < 2 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                  <Text style={[s.infoValue, { color: row.color || theme.textPrimary }]}>{row.value}</Text>
                  <Text style={[s.infoLabel, { color: theme.textMuted }]}>{row.label}</Text>
                </View>
              ))}
            </Animated.View>
          </>
        )}

        {/* ─ PENDING TAB ──────────────────────────────────────────────────── */}
        {tab === 'pending' && (
          <>
            <View style={s.pendingHeader}>
              <Text style={s.sectionLabel}>الأدوات قيد المراجعة</Text>
              <View style={s.pendingCountBadge}>
                <Text style={s.pendingCountText}>{pendingTools.length}</Text>
              </View>
            </View>

            {pendingTools.length === 0 ? (
              <Animated.View entering={FadeIn.duration(400)} style={s.emptyState}>
                <LinearGradient colors={['#22C55E20','#22C55E08']} style={s.emptyIcon}>
                  <MaterialIcons name="check-circle" size={44} color="#22C55E" />
                </LinearGradient>
                <Text style={[s.emptyTitle, { color: theme.textPrimary }]}>لا توجد أدوات قيد المراجعة</Text>
                <Text style={[s.emptySub, { color: theme.textMuted }]}>جميع الطلبات المرسلة تمت معالجتها</Text>
              </Animated.View>
            ) : (
              pendingTools.map((tool, i) => (
                <PendingCard
                  key={tool.id}
                  tool={tool}
                  theme={theme}
                  index={i}
                  onApprove={() => handleApprove(tool)}
                  onReject={() => handleReject(tool)}
                  onFeature={() => handleFeature(tool)}
                />
              ))
            )}
          </>
        )}

        {/* ─ RECENT ACTIVITY TAB ──────────────────────────────────────────── */}
        {tab === 'recent' && (
          <>
            <Text style={s.sectionLabel}>آخر الأدوات المضافة</Text>
            {recentActivity.recentTools.length === 0 ? (
              <Text style={[s.emptyInline, { color: theme.textMuted }]}>لا يوجد نشاط حديث</Text>
            ) : (
              recentActivity.recentTools.map((tool: any, i: number) => {
                const statusColor =
                  tool.status === 'approved' ? '#22C55E' :
                  tool.status === 'pending'  ? '#F59E0B' : '#EF4444';
                const statusLabel =
                  tool.status === 'approved' ? 'منشور' :
                  tool.status === 'pending'  ? 'قيد المراجعة' : 'مرفوض';
                return (
                  <Animated.View
                    key={tool.id}
                    entering={FadeInDown.duration(260).delay(i * 45)}
                    style={[s.actCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  >
                    <View style={[s.actIcon, { backgroundColor: (tool.logo_color || '#3B82F6') + '20' }]}>
                      <MaterialIcons name={(tool.logo_icon || 'apps') as any} size={18} color={tool.logo_color || '#3B82F6'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.actTitle, { color: theme.textPrimary }]}>{tool.name}</Text>
                      <Text style={[s.actSub, { color: theme.textMuted }]}>{tool.created_at?.split('T')[0]}</Text>
                    </View>
                    <View style={[s.statusChip, { backgroundColor: statusColor + '18' }]}>
                      <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                  </Animated.View>
                );
              })
            )}

            <Text style={[s.sectionLabel, { marginTop: 22 }]}>أحدث التعليقات</Text>
            {recentActivity.recentComments.length === 0 ? (
              <Text style={[s.emptyInline, { color: theme.textMuted }]}>لا توجد تعليقات حديثة</Text>
            ) : (
              recentActivity.recentComments.map((comment: any, i: number) => (
                <Animated.View
                  key={comment.id}
                  entering={FadeInDown.duration(260).delay(i * 45)}
                  style={[s.commentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={[s.commentAvatar, { backgroundColor: theme.primary }]}>
                    <Text style={s.commentAvatarText}>
                      {(comment.user_profiles?.username || comment.user_profiles?.email || 'م')[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.commentUser, { color: theme.textPrimary }]}>
                      {comment.user_profiles?.username || comment.user_profiles?.email || 'مستخدم'}
                    </Text>
                    <Text style={[s.commentText, { color: theme.textSecondary }]} numberOfLines={2}>
                      {comment.text}
                    </Text>
                    <Text style={[s.commentDate, { color: theme.textMuted }]}>
                      {comment.created_at?.split('T')[0]}
                    </Text>
                  </View>
                </Animated.View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  loadingTxt:{ marginTop: 12, fontSize: 14, fontFamily: C4 },

  // Header
  header:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  iconBtn:    { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 18, fontFamily: C7 },
  headerSub:  { fontSize: 11, fontFamily: C4, marginTop: 1 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999 },
  adminBadgeText: { fontSize: 11, fontFamily: C7, color: '#FFF' },

  // Tabs
  tabsRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  tabText: { fontSize: 12, fontFamily: C6, color: theme.textSecondary },
  tabBadge:{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { fontSize: 9, fontFamily: C7, color: '#FFF' },

  content: { paddingHorizontal: 16, paddingTop: 10 },
  sectionLabel: { fontSize: 12, fontFamily: C7, color: theme.textMuted, marginBottom: 12, letterSpacing: 0.6 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },

  // Alert banner
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F59E0B12', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#F59E0B30' },
  alertText:   { flex: 1, fontSize: 13, fontFamily: C6, color: '#F59E0B', textAlign: 'right' },
  alertLink:   { fontSize: 13, fontFamily: C7, color: '#F59E0B' },

  // Category chart card
  chartCard:   { borderRadius: 18, padding: 18, marginBottom: 20, borderWidth: 1 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  chartIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chartTitle:  { flex: 1, fontSize: 16, fontFamily: C7 },
  chartSub:    { fontSize: 12, fontFamily: C4 },

  // Info card
  infoCard:      { borderRadius: 18, padding: 18, marginBottom: 20, borderWidth: 1 },
  infoCardTitle: { fontSize: 16, fontFamily: C7, color: theme.textPrimary, marginBottom: 14 },
  infoRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  infoLabel:     { fontSize: 13, fontFamily: C5 },
  infoValue:     { fontSize: 14, fontFamily: C7, color: theme.textPrimary },

  // Pending
  pendingHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  pendingCountBadge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  pendingCountText:  { fontSize: 12, fontFamily: C7, color: '#FFF' },

  // Empty states
  emptyState:  { alignItems: 'center', paddingVertical: 60, gap: 14 },
  emptyIcon:   { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:  { fontSize: 18, fontFamily: C6 },
  emptySub:    { fontSize: 13, fontFamily: C4, textAlign: 'center' },
  emptyInline: { fontSize: 13, fontFamily: C4, textAlign: 'center', paddingVertical: 20 },

  // Activity cards
  actCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  actIcon:    { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  actTitle:   { fontSize: 14, fontFamily: C6 },
  actSub:     { fontSize: 11, fontFamily: C4, marginTop: 2 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  statusText: { fontSize: 10, fontFamily: C6 },

  // Comment cards
  commentCard:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  commentAvatar:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontSize: 14, fontFamily: C7, color: '#FFF' },
  commentUser:       { fontSize: 13, fontFamily: C6 },
  commentText:       { fontSize: 13, fontFamily: C4, lineHeight: 20, textAlign: 'right', marginTop: 2 },
  commentDate:       { fontSize: 10, fontFamily: C4, marginTop: 4 },

  // No access
  noAccessIcon:   { width: 100, height: 100, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  noAccessTitle:  { fontSize: 22, fontFamily: C7 },
  noAccessSub:    { fontSize: 14, fontFamily: C4 },
  backBtnLarge:   { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  backBtnText:    { fontSize: 16, fontFamily: C6 },
});
