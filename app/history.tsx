/**
 * app/history.tsx — مستر جيشو
 * Recently viewed tools — AsyncStorage-backed, grouped by date, max 50 entries.
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, Pressable, FlatList, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAppContext } from '../contexts/AppContext';
import { SkeletonToolCard } from '../components/ui/SkeletonToolCard';
import { Tool } from '../services/mockData';

export const HISTORY_STORAGE_KEY = '@mg_tool_history_v1';
export const MAX_HISTORY_ITEMS = 50;

export interface HistoryEntry {
  toolId: string;
  viewedAt: string; // ISO timestamp
}

/** Append or update a tool visit — call this from tool detail page */
export async function recordToolView(toolId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
    const history: HistoryEntry[] = raw ? JSON.parse(raw) : [];
    // Remove existing entry for same toolId, then prepend fresh one
    const filtered = history.filter(e => e.toolId !== toolId);
    const updated: HistoryEntry[] = [{ toolId, viewedAt: new Date().toISOString() }, ...filtered];
    // Enforce max cap
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated.slice(0, MAX_HISTORY_ITEMS)));
  } catch {}
}

// ─── Date grouping ─────────────────────────────────────────────────────────────
type DateGroup = 'today' | 'week' | 'older';

function getDateGroup(iso: string): DateGroup {
  const viewed = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - viewed.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return 'today';
  if (diffDays < 7) return 'week';
  return 'older';
}

const GROUP_LABELS: Record<DateGroup, { label: string; icon: string; color: string }> = {
  today: { label: 'اليوم',          icon: 'wb-sunny',    color: '#F59E0B' },
  week:  { label: 'هذا الأسبوع',    icon: 'date-range',  color: '#3B82F6' },
  older: { label: 'أقدم',           icon: 'history',     color: '#64748B' },
};

interface GroupedItem {
  group: DateGroup;
  items: (HistoryEntry & { tool: Tool })[];
}

function groupHistory(entries: (HistoryEntry & { tool: Tool })[]): GroupedItem[] {
  const map: Record<DateGroup, (HistoryEntry & { tool: Tool })[]> = { today: [], week: [], older: [] };
  entries.forEach(e => { map[getDateGroup(e.viewedAt)].push(e); });
  return (['today', 'week', 'older'] as DateGroup[])
    .filter(g => map[g].length > 0)
    .map(g => ({ group: g, items: map[g] }));
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

// ─── History Tool Row ──────────────────────────────────────────────────────────
const HistoryRow = React.memo(function HistoryRow({
  entry, index, onRemove, theme, router,
}: {
  entry: HistoryEntry & { tool: Tool };
  index: number;
  onRemove: (toolId: string) => void;
  theme: any;
  router: any;
}) {
  const { tool } = entry;
  const pricingColor = tool.pricing === 'مجاني' ? '#10B981'
    : tool.pricing === 'مفتوح المصدر' ? '#8B5CF6'
    : '#F59E0B';

  return (
    <Animated.View
      entering={FadeInDown.duration(260).delay(Math.min(index * 35, 400))}
      layout={Layout.springify().damping(16)}
    >
      <Pressable
        onPress={() => { Haptics.selectionAsync(); router.push(`/tool/${tool.id}` as any); }}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`فتح ${tool.name}`}
      >
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: tool.logoColor + '18' }]}>
          <MaterialIcons name={tool.logoIcon as any} size={26} color={tool.logoColor} />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.toolName, { color: theme.textPrimary }]} numberOfLines={1}>
            {tool.name}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.catChip, { backgroundColor: (theme.categoryColors?.[tool.category] || tool.logoColor) + '16' }]}>
              <Text style={[styles.catText, { color: theme.categoryColors?.[tool.category] || tool.logoColor }]}>
                {tool.category}
              </Text>
            </View>
            <View style={[styles.priceChip, { backgroundColor: pricingColor + '14' }]}>
              <Text style={[styles.priceText, { color: pricingColor }]}>{tool.pricing}</Text>
            </View>
            <MaterialIcons name="star" size={11} color="#F59E0B" />
            <Text style={[styles.rating, { color: theme.textMuted }]}>{tool.rating}</Text>
          </View>
          <Text style={[styles.timeText, { color: theme.textMuted }]}>
            {formatRelativeTime(entry.viewedAt)}
          </Text>
        </View>

        {/* Remove */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRemove(tool.id); }}
          hitSlop={10}
          style={[styles.removeBtn, { backgroundColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel={`إزالة ${tool.name} من السجل`}
        >
          <MaterialIcons name="close" size={13} color={theme.textMuted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
});

// ─── Group Header ──────────────────────────────────────────────────────────────
function GroupHeader({ group, theme }: { group: DateGroup; theme: any }) {
  const cfg = GROUP_LABELS[group];
  return (
    <View style={[gh.row]}>
      <View style={[gh.iconBg, { backgroundColor: cfg.color + '18' }]}>
        <MaterialIcons name={cfg.icon as any} size={14} color={cfg.color} />
      </View>
      <Text style={[gh.label, { color: theme.textMuted }]}>{cfg.label}</Text>
      <View style={[gh.line, { backgroundColor: theme.border }]} />
    </View>
  );
}
const gh = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 18, marginBottom: 10 },
  iconBg:{ width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontFamily: 'Cairo_700Bold', letterSpacing: 0.3 },
  line:  { flex: 1, height: 1 },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { tools } = useAppContext();

  const [rawHistory, setRawHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Load history from AsyncStorage
  const loadHistory = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      setRawHistory(raw ? JSON.parse(raw) : []);
    } catch {
      setRawHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Resolve entries to tools
  const resolvedEntries = useMemo<(HistoryEntry & { tool: Tool })[]>(() => {
    if (tools.length === 0) return [];
    return rawHistory
      .map(e => {
        const tool = tools.find(t => t.id === e.toolId);
        return tool ? { ...e, tool } : null;
      })
      .filter(Boolean) as (HistoryEntry & { tool: Tool })[];
  }, [rawHistory, tools]);

  // Grouped data
  const grouped = useMemo(() => groupHistory(resolvedEntries), [resolvedEntries]);

  // Flatten for FlatList with group headers
  type FlatItem =
    | { type: 'header'; group: DateGroup; key: string }
    | { type: 'row'; entry: HistoryEntry & { tool: Tool }; index: number; key: string };

  const flatData = useMemo<FlatItem[]>(() => {
    const result: FlatItem[] = [];
    let rowIndex = 0;
    grouped.forEach(g => {
      result.push({ type: 'header', group: g.group, key: `hdr-${g.group}` });
      g.items.forEach(e => {
        result.push({ type: 'row', entry: e, index: rowIndex++, key: `row-${e.toolId}` });
      });
    });
    return result;
  }, [grouped]);

  // Remove single entry
  const handleRemove = useCallback(async (toolId: string) => {
    const updated = rawHistory.filter(e => e.toolId !== toolId);
    setRawHistory(updated);
    await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  }, [rawHistory]);

  // Clear all
  const handleClearAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'مسح السجل',
      'هل تريد مسح سجل التصفح بالكامل؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مسح الكل',
          style: 'destructive',
          onPress: async () => {
            setRawHistory([]);
            await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }, []);

  const s = useMemo(() => createStyles(theme), [theme]);
  const isEmpty = !loading && resolvedEntries.length === 0;

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[s.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
        >
          <MaterialIcons name="arrow-forward" size={20} color={theme.textPrimary} />
        </Pressable>

        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: theme.textPrimary }]}>سجل التصفح</Text>
          {resolvedEntries.length > 0 && (
            <View style={[s.countBadge, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '35' }]}>
              <Text style={[s.countBadgeText, { color: theme.primary }]}>{resolvedEntries.length}</Text>
            </View>
          )}
        </View>

        {resolvedEntries.length > 0 ? (
          <Pressable
            onPress={handleClearAll}
            style={[s.clearBtn, { backgroundColor: '#EF444412', borderColor: '#EF444430' }]}
            accessibilityRole="button"
            accessibilityLabel="مسح السجل"
          >
            <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
            <Text style={s.clearBtnText}>مسح</Text>
          </Pressable>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ paddingTop: 8 }}>
          {[1, 2, 3, 4].map(i => <SkeletonToolCard key={i} />)}
        </View>
      ) : isEmpty ? (
        <Animated.View entering={FadeIn.duration(400)} style={s.emptyWrap}>
          <View style={[s.emptyIconBg, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MaterialIcons name="history" size={44} color={theme.textMuted} />
          </View>
          <Text style={[s.emptyTitle, { color: theme.textSecondary }]}>لا يوجد سجل تصفح</Text>
          <Text style={[s.emptySub, { color: theme.textMuted }]}>
            ستظهر الأدوات التي تزورها هنا لسهولة الوصول إليها لاحقاً.
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)' as any)}
            style={[s.exploreBtn, { backgroundColor: theme.primary }]}
            accessibilityRole="button"
          >
            <MaterialIcons name="explore" size={16} color="#FFF" />
            <Text style={s.exploreBtnText}>استكشف الأدوات</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={item => item.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 4 }}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <GroupHeader group={item.group} theme={theme} />;
            }
            return (
              <HistoryRow
                entry={item.entry}
                index={item.index}
                onRemove={handleRemove}
                theme={theme}
                router={router}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold' },
  countBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999, borderWidth: 1,
  },
  countBadgeText: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  clearBtnText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#EF4444' },

  // Empty
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyIconBg: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Cairo_600SemiBold', textAlign: 'center' },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', textAlign: 'center', lineHeight: 22 },
  exploreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 6,
  },
  exploreBtnText: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#FFF' },
});

// ─── Row styles (static — no theme dependency) ─────────────────────────────────
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 8, padding: 12,
    borderRadius: 14, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  iconWrap: { width: 48, height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info: { flex: 1, gap: 4 },
  toolName: { fontSize: 14, fontFamily: 'Cairo_700Bold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  catChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 9999 },
  catText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  priceChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 9999 },
  priceText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  rating: { fontSize: 10, fontFamily: 'Cairo_600SemiBold' },
  timeText: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  removeBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
