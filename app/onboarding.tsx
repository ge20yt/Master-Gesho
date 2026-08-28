/**
 * app/onboarding.tsx — مستر جيشو
 * Premium 3-screen first-launch onboarding with interest selection.
 * Shown once; saves preferences to AsyncStorage for AI personalisation.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput,
  ScrollView, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeIn, ZoomIn,
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { INTEREST_CATEGORIES, saveUserInterests, markOnboardingComplete } from '../services/onboardingService';

const { width: W } = Dimensions.get('window');
const C4 = 'Cairo_400Regular';
const C5 = 'Cairo_500Medium';
const C6 = 'Cairo_600SemiBold';
const C7 = 'Cairo_700Bold';
const MIN_SEL = 2;

const FEATURES = [
  { icon: 'psychology',      label: 'مئات أدوات AI',   desc: 'مراجعة ومصنّفة',     color: '#3B82F6' },
  { icon: 'auto-awesome',    label: 'توصيات ذكية',     desc: 'مخصصة لك',           color: '#A78BFA' },
  { icon: 'compare-arrows',  label: 'مقارنة فورية',    desc: 'بين الأدوات',        color: '#10B981' },
  { icon: 'forum',           label: 'مجتمع عربي',      desc: 'تقييمات حقيقية',     color: '#F97316' },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();
  const [page, setPage]       = useState(0);
  const [sel, setSel]         = useState<string[]>([]);
  const [search, setSearch]   = useState('');
  const [saving, setSaving]   = useState(false);

  const tx = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  const goto = useCallback((i: number) => {
    Haptics.selectionAsync();
    tx.value = withSpring(-i * W, { damping: 22, stiffness: 200 });
    setPage(i);
  }, []);

  const toggle = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const finish = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveUserInterests(sel);
    await markOnboardingComplete();
    router.replace('/');
  }, [saving, sel, router]);

  const skip = useCallback(async () => {
    Haptics.selectionAsync();
    await markOnboardingComplete();
    router.replace('/');
  }, [router]);

  const filtered = INTEREST_CATEGORIES.filter(c => !search || c.label.includes(search));
  const canNext  = sel.length >= MIN_SEL;
  const selCats  = INTEREST_CATEGORIES.filter(c => sel.includes(c.id));

  return (
    <View style={s.root}>
      {/* Sliding pages */}
      <Animated.View style={[s.pagesWrap, animStyle]}>

        {/* ── Page 0 · Welcome ──────────────────────────────────────────── */}
        <View style={s.page}>
          <LinearGradient colors={['#090E1A','#1E1B4B','#090E1A']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']} style={{ flex: 1 }}>
            <Pressable onPress={skip} style={s.skipBtn}>
              <Text style={s.skipTxt}>تخطي</Text>
              <MaterialIcons name="arrow-back" size={13} color="rgba(255,255,255,0.5)" />
            </Pressable>

            <View style={s.wBody}>
              <Animated.View entering={ZoomIn.springify().damping(14)} style={s.logoWrap}>
                <LinearGradient colors={['#3B82F6','#8B5CF6','#EC4899']} style={s.logoGrad}>
                  <Text style={{ fontSize: 46 }}>🤖</Text>
                </LinearGradient>
                <View style={s.ring1} />
                <View style={s.ring2} />
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(400).delay(180)}>
                <Text style={s.wTitle}>مرحباً بك في{'\n'}مستر جيشو</Text>
              </Animated.View>
              <Animated.View entering={FadeInDown.duration(380).delay(280)}>
                <Text style={s.wSub}>منصتك العربية لاكتشاف ومقارنة أفضل أدوات الذكاء الاصطناعي</Text>
              </Animated.View>

              <View style={s.featGrid}>
                {FEATURES.map((f, i) => (
                  <Animated.View key={f.label} entering={FadeInDown.duration(320).delay(360 + i * 60)}
                    style={[s.featCard, { borderColor: f.color + '38' }]}
                  >
                    <View style={[s.featIcon, { backgroundColor: f.color + '22' }]}>
                      <MaterialIcons name={f.icon as any} size={22} color={f.color} />
                    </View>
                    <Text style={s.featLabel}>{f.label}</Text>
                    <Text style={s.featDesc}>{f.desc}</Text>
                  </Animated.View>
                ))}
              </View>
            </View>

            <Animated.View entering={FadeInDown.duration(380).delay(700)} style={[s.wCTA, { paddingBottom: insets.bottom + 60 }]}>
              <Pressable onPress={() => goto(1)} style={{ borderRadius: 16, overflow: 'hidden' }}>
                <LinearGradient colors={['#3B82F6','#8B5CF6']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.ctaGrad}>
                  <Text style={s.ctaTxt}>ابدأ الآن</Text>
                  <MaterialIcons name="arrow-back" size={20} color="#FFF" />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </SafeAreaView>
        </View>

        {/* ── Page 1 · Interests ────────────────────────────────────────── */}
        <View style={s.page}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111827' }]} />
          <SafeAreaView edges={['top']} style={{ flex: 1 }}>
            <View style={s.intHdr}>
              <Pressable onPress={() => goto(0)} style={s.backBtn}>
                <MaterialIcons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={s.intTitle}>اختر اهتماماتك</Text>
                <Text style={[s.intSub, { color: canNext ? '#10B981' : 'rgba(255,255,255,0.4)' }]}>
                  {canNext ? `✓ تم اختيار ${sel.length}` : `اختر ${MIN_SEL - sel.length} على الأقل`}
                </Text>
              </View>
              <View style={s.badge}><Text style={s.badgeTxt}>{sel.length}</Text></View>
            </View>

            <View style={s.searchBox}>
              <MaterialIcons name="search" size={16} color="rgba(255,255,255,0.3)" />
              <TextInput style={s.searchIn} placeholder="ابحث..." placeholderTextColor="rgba(255,255,255,0.28)"
                value={search} onChangeText={setSearch} textAlign="right" />
              {search ? <Pressable onPress={() => setSearch('')}><MaterialIcons name="close" size={15} color="rgba(255,255,255,0.4)" /></Pressable> : null}
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.chips} showsVerticalScrollIndicator={false}>
              {!search && (
                <View style={s.popRow}>
                  <MaterialIcons name="local-fire-department" size={12} color="#F97316" />
                  <Text style={s.popLbl}>الأكثر اختيارًا</Text>
                </View>
              )}
              {filtered.map((cat, i) => {
                const isSel = sel.includes(cat.id);
                return (
                  <Animated.View key={cat.id} entering={FadeInDown.duration(200).delay(Math.min(i * 25, 350))}>
                    <Pressable onPress={() => toggle(cat.id)} style={[
                      s.chip,
                      isSel
                        ? { backgroundColor: cat.color, borderColor: cat.color }
                        : { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.13)' },
                    ]}>
                      <View style={[s.chipIcon, { backgroundColor: isSel ? 'rgba(255,255,255,0.22)' : cat.color + '22' }]}>
                        <MaterialIcons name={cat.icon as any} size={13} color={isSel ? '#FFF' : cat.color} />
                      </View>
                      <Text style={[s.chipLbl, { color: isSel ? '#FFF' : 'rgba(255,255,255,0.85)' }]}>{cat.label}</Text>
                      {cat.popular && !isSel && <View style={s.hotBadge}><Text style={{ fontSize: 9 }}>🔥</Text></View>}
                      {isSel && <MaterialIcons name="check-circle" size={13} color="rgba(255,255,255,0.85)" />}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </ScrollView>

            <View style={[s.wCTA, { paddingBottom: insets.bottom + 60 }]}>
              <Pressable onPress={canNext ? () => goto(2) : undefined} style={{ borderRadius: 16, overflow: 'hidden' }}>
                <LinearGradient
                  colors={canNext ? ['#10B981','#3B82F6'] : ['#1F2937','#1F2937']}
                  start={{x:0,y:0}} end={{x:1,y:0}}
                  style={[s.ctaGrad, { opacity: canNext ? 1 : 0.5 }]}
                >
                  <Text style={s.ctaTxt}>التالي</Text>
                  <MaterialIcons name="arrow-back" size={18} color="#FFF" />
                </LinearGradient>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        {/* ── Page 2 · Confirm ──────────────────────────────────────────── */}
        <View style={s.page}>
          <LinearGradient colors={['#090E1A','#064E3B','#090E1A']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']} style={{ flex: 1 }}>
            <Pressable onPress={() => goto(1)} style={[s.backBtn, { margin: 16 }]}>
              <MaterialIcons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
            </Pressable>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              <Animated.View entering={ZoomIn.springify().damping(12)} style={s.successWrap}>
                <LinearGradient colors={['#10B981','#3B82F6']} style={s.successGrad}>
                  <MaterialIcons name="auto-awesome" size={42} color="#FFF" />
                </LinearGradient>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(380).delay(180)}>
                <Text style={s.conTitle}>جاهز للانطلاق!</Text>
                <Text style={s.conSub}>سيعرض لك الذكاء الاصطناعي أفضل الأدوات بناءً على اهتماماتك</Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(360).delay(300)} style={s.sumCard}>
                <View style={s.sumHdr}>
                  <MaterialIcons name="favorite" size={14} color="#10B981" />
                  <Text style={s.sumHdrTxt}>اهتماماتك ({sel.length})</Text>
                </View>
                <View style={s.sumChips}>
                  {selCats.map(cat => (
                    <View key={cat.id} style={[s.sumChip, { backgroundColor: cat.color + '22', borderColor: cat.color + '50' }]}>
                      <MaterialIcons name={cat.icon as any} size={11} color={cat.color} />
                      <Text style={[s.sumChipTxt, { color: cat.color }]}>{cat.label}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(360).delay(400)} style={s.benCard}>
                {[
                  { icon: 'auto-awesome', text: 'ترتيب ذكي مخصص لك' },
                  { icon: 'recommend',    text: 'اقتراحات دقيقة تناسب اهتماماتك' },
                  { icon: 'trending-up',  text: 'اكتشاف الأدوات الأكثر صلة' },
                ].map((b, i) => (
                  <View key={i} style={s.benRow}>
                    <View style={s.benIcon}><MaterialIcons name={b.icon as any} size={14} color="#10B981" /></View>
                    <Text style={s.benTxt}>{b.text}</Text>
                  </View>
                ))}
              </Animated.View>

              <Animated.View entering={FadeIn.duration(300).delay(500)} style={s.privRow}>
                <MaterialIcons name="lock" size={12} color="rgba(255,255,255,0.3)" />
                <Text style={s.privTxt}>بياناتك محفوظة محلياً ولا تُشارك</Text>
              </Animated.View>
            </ScrollView>

            <Animated.View entering={FadeInDown.duration(380).delay(600)} style={[s.wCTA, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable onPress={saving ? undefined : finish} style={{ borderRadius: 16, overflow: 'hidden' }}>
                <LinearGradient colors={['#10B981','#3B82F6']} start={{x:0,y:0}} end={{x:1,y:0}} style={s.ctaGrad}>
                  {saving ? <ActivityIndicator size="small" color="#FFF" /> : (
                    <>
                      <MaterialIcons name="rocket-launch" size={20} color="#FFF" />
                      <Text style={s.ctaTxt}>ابدأ الاستكشاف</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </SafeAreaView>
        </View>
      </Animated.View>

      {/* Page dots */}
      <View style={[s.dots, { bottom: insets.bottom + 22 }]}>
        {[0,1,2].map(i => (
          <View key={i} style={[s.dot, { backgroundColor: i===page ? '#FFF' : 'rgba(255,255,255,0.28)', width: i===page ? 22 : 6 }]} />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#090E1A', overflow: 'hidden' },
  pagesWrap: { flexDirection: 'row', width: W * 3, flex: 1 },
  page:      { width: W, flex: 1 },

  skipBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', padding: 16, paddingBottom: 8 },
  skipTxt:  { fontSize: 12, fontFamily: C5, color: 'rgba(255,255,255,0.5)' },

  // Welcome
  wBody:     { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  logoWrap:  { alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  logoGrad:  { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  ring1:     { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 1.5, borderColor: '#3B82F638' },
  ring2:     { position: 'absolute', width: 156, height: 156, borderRadius: 78, borderWidth: 1,   borderColor: '#8B5CF620' },
  wTitle:    { fontSize: 30, fontFamily: C7, color: '#FFF', textAlign: 'center', lineHeight: 44, marginBottom: 10 },
  wSub:      { fontSize: 14, fontFamily: C4, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 26, paddingHorizontal: 8 },
  featGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  featCard:  { width: (W - 52) / 2, padding: 14, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)', gap: 6 },
  featIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featLabel: { fontSize: 13, fontFamily: C7, color: '#FFF' },
  featDesc:  { fontSize: 11, fontFamily: C4, color: 'rgba(255,255,255,0.5)' },

  wCTA:     { paddingHorizontal: 20, paddingTop: 12 },
  ctaGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15 },
  ctaTxt:   { fontSize: 16, fontFamily: C7, color: '#FFF' },

  // Interests
  intHdr:   { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  backBtn:  { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  intTitle: { fontSize: 19, fontFamily: C7, color: '#FFF' },
  intSub:   { fontSize: 11, fontFamily: C5, marginTop: 2 },
  badge:    { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeTxt: { fontSize: 12, fontFamily: C7, color: '#FFF' },
  searchBox:{ flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  searchIn: { flex: 1, fontSize: 14, fontFamily: C4, color: '#FFF' },
  chips:    { paddingHorizontal: 16, paddingBottom: 20, gap: 8 },
  popRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  popLbl:   { fontSize: 11, fontFamily: C6, color: '#F97316' },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  chipIcon: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  chipLbl:  { flex: 1, fontSize: 14, fontFamily: C6 },
  hotBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 9999, backgroundColor: '#F9731618' },

  // Confirm
  successWrap: { alignItems: 'center', marginTop: 16, marginBottom: 22 },
  successGrad: { width: 92, height: 92, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  conTitle:    { fontSize: 26, fontFamily: C7, color: '#FFF', textAlign: 'center', marginBottom: 8 },
  conSub:      { fontSize: 13, fontFamily: C4, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  sumCard:     { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 14 },
  sumHdr:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sumHdrTxt:   { fontSize: 14, fontFamily: C7, color: '#FFF' },
  sumChips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  sumChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9999, borderWidth: 1 },
  sumChipTxt:  { fontSize: 11, fontFamily: C6 },
  benCard:     { backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#10B98125', marginBottom: 14, gap: 10 },
  benRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benIcon:     { width: 28, height: 28, borderRadius: 8, backgroundColor: '#10B98118', alignItems: 'center', justifyContent: 'center' },
  benTxt:      { fontSize: 13, fontFamily: C5, color: 'rgba(255,255,255,0.8)', flex: 1 },
  privRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center' },
  privTxt:     { fontSize: 11, fontFamily: C4, color: 'rgba(255,255,255,0.3)' },

  // Dots
  dots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot:  { height: 6, borderRadius: 3 },
});
