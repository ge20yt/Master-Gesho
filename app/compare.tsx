/**
 * app/compare.tsx — مستر جيشو
 * Side-by-side tool comparison for 2–3 tools.
 * Navigate here with: router.push({ pathname: '/compare', params: { ids: 't1,t2' } })
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput,
  Dimensions, Modal, FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAppContext } from '../contexts/AppContext';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

const { width: W } = Dimensions.get('window');
const C4 = 'Cairo_400Regular';
const C5 = 'Cairo_500Medium';
const C6 = 'Cairo_600SemiBold';
const C7 = 'Cairo_700Bold';
const MAX_TOOLS = 3;

// Comparison row definitions
const ROWS = [
  { key: 'rating',               label: 'التقييم',             type: 'rating'  },
  { key: 'ratingCount',          label: 'عدد التقييمات',       type: 'number'  },
  { key: 'votes',                label: 'التصويتات',           type: 'number'  },
  { key: 'pricing',              label: 'التسعير',             type: 'text'    },
  { key: 'category',             label: 'الفئة',               type: 'text'    },
  { key: 'trending',             label: 'رائج',                type: 'bool'    },
  { key: 'featured',             label: 'مميز',                type: 'bool'    },
  { key: 'editorPick',           label: 'اختيار المحررين',     type: 'bool'    },
  { key: 'isNew',                label: 'جديد',                type: 'bool'    },
  { key: 'developerName',        label: 'المطور',              type: 'text'    },
  { key: 'developerToolsCount',  label: 'أدوات المطور',        type: 'number'  },
  { key: 'developerFollowers',   label: 'متابعو المطور',       type: 'number'  },
  { key: 'tags',                 label: 'الوسوم',              type: 'tags'    },
] as const;

type RowKey = typeof ROWS[number]['key'];

function getBest(values: any[], type: string): number[] {
  if (type === 'rating' || type === 'number') {
    const nums = values.map(v => Number(v) || 0);
    const max  = Math.max(...nums);
    return nums.map(n => n === max && max > 0 ? 1 : 0);
  }
  return values.map(() => 0);
}

function CellValue({ value, type, isBest, theme }: { value: any; type: string; isBest: boolean; theme: any }) {
  const base = { color: isBest ? '#10B981' : theme.textPrimary };
  if (type === 'bool') {
    return (
      <MaterialIcons
        name={value ? 'check-circle' : 'cancel'}
        size={20}
        color={value ? '#10B981' : theme.textMuted}
      />
    );
  }
  if (type === 'rating') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <MaterialIcons name="star" size={14} color="#F59E0B" />
        <Text style={[cv.text, base]}>{value}</Text>
      </View>
    );
  }
  if (type === 'tags') {
    const tags: string[] = Array.isArray(value) ? value.slice(0, 3) : [];
    return (
      <View style={{ gap: 3 }}>
        {tags.map(t => (
          <View key={t} style={[cv.tagChip, { backgroundColor: theme.border }]}>
            <Text style={[cv.tagText, { color: theme.textSecondary }]}>#{t}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (type === 'number') {
    const n = Number(value);
    const disp = n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
    return <Text style={[cv.text, base]}>{disp}</Text>;
  }
  return <Text style={[cv.text, { color: theme.textPrimary }]} numberOfLines={2}>{String(value ?? '—')}</Text>;
}
const cv = StyleSheet.create({
  text:    { fontSize: 13, fontFamily: C6, textAlign: 'center' },
  tagChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999 },
  tagText: { fontSize: 10, fontFamily: C5 },
});

// ─── Tool picker modal ─────────────────────────────────────────────────────────
function ToolPicker({ visible, onClose, onSelect, excludeIds, theme }: any) {
  const { tools } = useAppContext();
  const [q, setQ] = useState('');
  const filtered  = tools.filter(t =>
    !excludeIds.includes(t.id) &&
    (!q || t.name.toLowerCase().includes(q.toLowerCase()) || t.category.includes(q))
  );

  return (
    <Modal transparent visible={visible} animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[pm.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={pm.handle} />
          <Text style={[pm.title, { color: theme.textPrimary }]}>اختر أداة للمقارنة</Text>
          <View style={[pm.search, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <MaterialIcons name="search" size={17} color={theme.textMuted} />
            <TextInput
              style={[pm.searchIn, { color: theme.textPrimary }]}
              placeholder="ابحث..."
              placeholderTextColor={theme.textMuted}
              value={q} onChangeText={setQ} textAlign="right"
            />
          </View>
          <FlatList
            data={filtered.slice(0, 30)}
            keyExtractor={t => t.id}
            style={{ maxHeight: 320 }}
            renderItem={({ item: t }) => (
              <Pressable onPress={() => { Haptics.selectionAsync(); onSelect(t.id); onClose(); setQ(''); }}
                style={({ pressed }) => [pm.item, { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[pm.icon, { backgroundColor: t.logoColor + '18' }]}>
                  <MaterialIcons name={t.logoIcon as any} size={20} color={t.logoColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[pm.name, { color: theme.textPrimary }]} numberOfLines={1}>{t.name}</Text>
                  <Text style={[pm.cat, { color: theme.textMuted }]}>{t.category} · {t.pricing}</Text>
                </View>
                <MaterialIcons name="add-circle-outline" size={20} color={theme.primary} />
              </Pressable>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}
const pm = StyleSheet.create({
  sheet:  { borderRadius: 24, borderWidth: 1, padding: 20, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#64748B', alignSelf: 'center', marginBottom: 4 },
  title:  { fontSize: 17, fontFamily: C7, textAlign: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchIn: { flex: 1, fontSize: 14, fontFamily: C4 },
  item:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  icon:   { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  name:   { fontSize: 14, fontFamily: C6 },
  cat:    { fontSize: 11, fontFamily: C4, marginTop: 2 },
});

// ─── Main screen ───────────────────────────────────────────────────────────────
function CompareInner() {
  const { theme }  = useTheme();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const { tools }  = useAppContext();
  const params     = useLocalSearchParams<{ ids?: string }>();
  const [showPicker, setShowPicker] = useState(false);

  const [toolIds, setToolIds] = useState<string[]>(() => {
    if (params.ids) return params.ids.split(',').filter(Boolean).slice(0, MAX_TOOLS);
    return [];
  });

  const selected = useMemo(() => toolIds.map(id => tools.find(t => t.id === id)).filter(Boolean) as any[], [toolIds, tools]);

  const addTool    = useCallback((id: string) => setToolIds(prev => [...prev, id].slice(0, MAX_TOOLS)), []);
  const removeTool = useCallback((id: string) => { Haptics.selectionAsync(); setToolIds(prev => prev.filter(x => x !== id)); }, []);

  const colW = selected.length === 0 ? 0 : Math.max((W - 100) / selected.length, 120);

  return (
    <SafeAreaView edges={['top']} style={[cp.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[cp.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={[cp.iconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <MaterialIcons name="arrow-forward" size={20} color={theme.textPrimary} />
        </Pressable>
        <Text style={[cp.title, { color: theme.textPrimary }]}>مقارنة الأدوات</Text>
        {toolIds.length < MAX_TOOLS && (
          <Pressable onPress={() => setShowPicker(true)} style={[cp.addBtn, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="add" size={18} color="#FFF" />
            <Text style={cp.addTxt}>إضافة</Text>
          </Pressable>
        )}
      </View>

      {selected.length === 0 ? (
        /* Empty state */
        <Animated.View entering={FadeIn.duration(400)} style={cp.emptyWrap}>
          <MaterialIcons name="compare-arrows" size={64} color={theme.textMuted} />
          <Text style={[cp.emptyTitle, { color: theme.textSecondary }]}>لا توجد أدوات للمقارنة</Text>
          <Text style={[cp.emptySub, { color: theme.textMuted }]}>أضف أداتين أو أكثر لبدء المقارنة</Text>
          <Pressable onPress={() => setShowPicker(true)} style={[cp.emptyBtn, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="add" size={16} color="#FFF" />
            <Text style={cp.emptyBtnTxt}>إضافة أداة</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {/* Tool headers (sticky-ish) */}
          <Animated.View entering={FadeInDown.duration(300)} style={[cp.toolsRow, { borderBottomColor: theme.border }]}>
            {/* Label column */}
            <View style={cp.labelHdr}><Text style={[cp.labelHdrTxt, { color: theme.textMuted }]}>الخاصية</Text></View>
            {selected.map(tool => (
              <View key={tool.id} style={[cp.toolHdr, { width: colW }]}>
                <Pressable onPress={() => removeTool(tool.id)} style={cp.removeBtn}>
                  <MaterialIcons name="close" size={13} color="rgba(255,255,255,0.8)" />
                </Pressable>
                <View style={[cp.toolIcon, { backgroundColor: tool.logoColor + '20' }]}>
                  <MaterialIcons name={tool.logoIcon as any} size={28} color={tool.logoColor} />
                </View>
                <Text style={[cp.toolName, { color: theme.textPrimary }]} numberOfLines={2}>{tool.name}</Text>
                <View style={[cp.toolCat, { backgroundColor: tool.logoColor + '18' }]}>
                  <Text style={[cp.toolCatTxt, { color: tool.logoColor }]}>{tool.pricing}</Text>
                </View>
                <Pressable
                  onPress={() => router.push(`/tool/${tool.id}` as any)}
                  style={[cp.visitBtn, { borderColor: tool.logoColor + '50', backgroundColor: tool.logoColor + '12' }]}
                >
                  <Text style={[cp.visitTxt, { color: tool.logoColor }]}>اكتشف</Text>
                </Pressable>
              </View>
            ))}
            {toolIds.length < MAX_TOOLS && (
              <Pressable onPress={() => setShowPicker(true)} style={[cp.addCol, { width: colW, borderColor: theme.border }]}>
                <MaterialIcons name="add-circle-outline" size={32} color={theme.textMuted} />
                <Text style={[cp.addColTxt, { color: theme.textMuted }]}>إضافة أداة</Text>
              </Pressable>
            )}
          </Animated.View>

          {/* Comparison rows */}
          {ROWS.map((row, rowIdx) => {
            const values  = selected.map(t => t[row.key as RowKey]);
            const bests   = getBest(values, row.type);
            const isOdd   = rowIdx % 2 === 0;

            return (
              <Animated.View
                key={row.key}
                entering={FadeInDown.duration(240).delay(rowIdx * 25)}
                style={[cp.row, { backgroundColor: isOdd ? theme.surface : 'transparent', borderBottomColor: theme.border }]}
              >
                <View style={cp.labelCell}>
                  <Text style={[cp.labelTxt, { color: theme.textMuted }]}>{row.label}</Text>
                </View>
                {selected.map((tool, colIdx) => (
                  <View key={tool.id} style={[cp.cell, { width: colW, borderRightColor: theme.border }]}>
                    <CellValue value={values[colIdx]} type={row.type} isBest={bests[colIdx] === 1} theme={theme} />
                    {bests[colIdx] === 1 && values.filter((_, i) => i !== colIdx).some(v => Number(v) !== Number(values[colIdx])) && (
                      <View style={cp.bestBadge}>
                        <Text style={cp.bestTxt}>الأفضل</Text>
                      </View>
                    )}
                  </View>
                ))}
              </Animated.View>
            );
          })}

          {/* AI Verdict */}
          {selected.length >= 2 && (
            <Animated.View entering={FadeInDown.duration(360).delay(200)} style={[cp.verdict, { backgroundColor: theme.surface, borderColor: '#A78BFA40' }]}>
              <LinearGradient colors={['#A78BFA18','#3B82F610']} start={{x:0,y:0}} end={{x:1,y:1}} style={cp.verdictGrad}>
                <View style={cp.verdictHdr}>
                  <MaterialIcons name="auto-awesome" size={16} color="#A78BFA" />
                  <Text style={[cp.verdictTitle, { color: theme.textPrimary }]}>ملخص المقارنة</Text>
                </View>
                {(() => {
                  const best = [...selected].sort((a, b) => b.rating * b.votes - a.rating * a.votes)[0];
                  return (
                    <Text style={[cp.verdictText, { color: theme.textSecondary }]}>
                      بناءً على التقييمات والتصويتات، <Text style={{ color: '#A78BFA', fontFamily: C7 }}>{best.name}</Text> يحقق أفضل أداء عام في هذه المقارنة.
                      {best.editorPick ? ' وقد حظي باختيار المحررين.' : ''}
                      {best.trending ? ' وهو من الأدوات الرائجة حالياً.' : ''}
                    </Text>
                  );
                })()}
              </LinearGradient>
            </Animated.View>
          )}
        </ScrollView>
      )}

      <ToolPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={addTool}
        excludeIds={toolIds}
        theme={theme}
      />
    </SafeAreaView>
  );
}

export default function CompareScreen() {
  const router = useRouter();
  return (
    <ErrorBoundary onNavigateHome={() => router.replace('/(tabs)' as any)}>
      <CompareInner />
    </ErrorBoundary>
  );
}

const cp = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title:   { flex: 1, fontSize: 18, fontFamily: C7, textAlign: 'center' },
  addBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addTxt:  { fontSize: 13, fontFamily: C6, color: '#FFF' },

  emptyWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle:   { fontSize: 18, fontFamily: C6, textAlign: 'center' },
  emptySub:     { fontSize: 13, fontFamily: C4, textAlign: 'center', lineHeight: 20 },
  emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, marginTop: 8 },
  emptyBtnTxt:  { fontSize: 14, fontFamily: C6, color: '#FFF' },

  toolsRow:  { flexDirection: 'row', paddingBottom: 12, borderBottomWidth: 1 },
  labelHdr:  { width: 90, justifyContent: 'flex-end', paddingHorizontal: 8, paddingBottom: 4 },
  labelHdrTxt: { fontSize: 11, fontFamily: C5 },
  toolHdr:   { alignItems: 'center', gap: 8, padding: 12, position: 'relative' },
  removeBtn: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#EF444480', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  toolIcon:  { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  toolName:  { fontSize: 13, fontFamily: C7, textAlign: 'center', lineHeight: 19 },
  toolCat:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  toolCatTxt:{ fontSize: 10, fontFamily: C6 },
  visitBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, borderWidth: 1 },
  visitTxt:  { fontSize: 11, fontFamily: C6 },
  addCol:    { alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, marginTop: 12, marginHorizontal: 4 },
  addColTxt: { fontSize: 11, fontFamily: C5, textAlign: 'center' },

  row:       { flexDirection: 'row', borderBottomWidth: 1, minHeight: 52 },
  labelCell: { width: 90, justifyContent: 'center', paddingHorizontal: 10 },
  labelTxt:  { fontSize: 12, fontFamily: C5, textAlign: 'right' },
  cell:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 10, borderRightWidth: 1, gap: 3 },
  bestBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 9999, backgroundColor: '#10B98120' },
  bestTxt:   { fontSize: 9, fontFamily: C7, color: '#10B981' },

  verdict:     { marginHorizontal: 16, marginTop: 20, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  verdictGrad: { padding: 16, gap: 10 },
  verdictHdr:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verdictTitle:{ fontSize: 15, fontFamily: C7 },
  verdictText: { fontSize: 13, fontFamily: C4, lineHeight: 22, textAlign: 'right' },
});
