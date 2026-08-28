/**
 * services/onboardingService.ts
 * Manages first-launch onboarding state & AI interest profile via AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  DONE:    '@mg_onboarding_v1',
  IDS:     '@mg_interests_v1',
  PROFILE: '@mg_ai_profile_v1',
} as const;

export interface InterestCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  toolCategories: string[];
  tags: string[];
  popular?: boolean;
}

export interface AIInterestProfile {
  selectedIds: string[];
  categoryWeights: Record<string, number>;
  tagWeights: Record<string, number>;
  updatedAt: string;
}

export const INTEREST_CATEGORIES: InterestCategory[] = [
  { id: 'writing',   label: 'كتابة المحتوى',      icon: 'edit',            color: '#8B5CF6', toolCategories: ['كتابة بالذكاء'],              tags: ['كتابة','محتوى','GPT','مدونة'],    popular: true  },
  { id: 'ai',        label: 'الذكاء الاصطناعي',   icon: 'psychology',      color: '#3B82F6', toolCategories: ['كتابة بالذكاء','أدوات البيانات'], tags: ['AI','نماذج','معالجة لغوية'],  popular: true  },
  { id: 'design',    label: 'التصميم',             icon: 'palette',         color: '#EC4899', toolCategories: ['التصميم','أدوات الصور'],       tags: ['تصميم','رسوميات','UI'],          popular: true  },
  { id: 'coding',    label: 'البرمجة',             icon: 'code',            color: '#22C55E', toolCategories: ['أدوات المطورين'],              tags: ['برمجة','كود','API'],             popular: true  },
  { id: 'marketing', label: 'التسويق',             icon: 'campaign',        color: '#F97316', toolCategories: ['التسويق'],                    tags: ['تسويق','SEO','حملات'],           popular: true  },
  { id: 'images',    label: 'الصور والفيديو',      icon: 'image',           color: '#D946EF', toolCategories: ['أدوات الصور'],                tags: ['صور','توليد','فيديو','فن AI']               },
  { id: 'data',      label: 'تحليل البيانات',      icon: 'analytics',       color: '#2563EB', toolCategories: ['أدوات البيانات'],              tags: ['بيانات','تحليلات','تعلم آلي']              },
  { id: 'finance',   label: 'الأعمال والمالية',    icon: 'account-balance', color: '#F59E0B', toolCategories: ['أدوات مالية'],                tags: ['مالية','ميزانية','استثمار']               },
  { id: 'product',   label: 'الإنتاجية',           icon: 'task-alt',        color: '#06B6D4', toolCategories: ['الإنتاجية'],                  tags: ['مهام','اجتماعات','وقت']                   },
  { id: 'trans',     label: 'الترجمة',             icon: 'translate',       color: '#6366F1', toolCategories: ['كتابة بالذكاء'],              tags: ['ترجمة','لغات']                            },
  { id: 'edu',       label: 'التعليم',             icon: 'school',          color: '#10B981', toolCategories: ['الإنتاجية'],                  tags: ['تعليم','دراسة']                           },
  { id: 'security',  label: 'الأمن السيبراني',     icon: 'security',        color: '#64748B', toolCategories: ['أدوات المطورين'],              tags: ['أمن','حماية']                             },
  { id: 'audio',     label: 'الصوت',               icon: 'audiotrack',      color: '#14B8A6', toolCategories: ['أدوات الصور'],                tags: ['صوت','موسيقى']                            },
  { id: 'ecommerce', label: 'التجارة الإلكترونية', icon: 'shopping-cart',   color: '#EF4444', toolCategories: ['التسويق','أدوات مالية'],      tags: ['تجارة','منتجات']                          },
];

// ─── In-memory cache (avoids repeated AsyncStorage reads) ───────────────────
let _profileCache: AIInterestProfile | null | undefined = undefined;
let _onboardingCache: boolean | undefined = undefined;

export function invalidateOnboardingCache(): void {
  _profileCache = undefined;
  _onboardingCache = undefined;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function isOnboardingComplete(): Promise<boolean> {
  if (_onboardingCache !== undefined) return _onboardingCache;
  try {
    _onboardingCache = (await AsyncStorage.getItem(KEYS.DONE)) === 'true';
    return _onboardingCache;
  } catch { return false; }
}

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEYS.DONE, 'true');
  _onboardingCache = true;
}

export async function saveUserInterests(ids: string[]): Promise<void> {
  const profile = buildProfile(ids);
  await AsyncStorage.setItem(KEYS.IDS, JSON.stringify(ids));
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  _profileCache = profile; // update cache immediately
}

export async function getUserInterestIds(): Promise<string[]> {
  try { const r = await AsyncStorage.getItem(KEYS.IDS); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

export async function getAIProfile(): Promise<AIInterestProfile | null> {
  if (_profileCache !== undefined) return _profileCache;
  try {
    const r = await AsyncStorage.getItem(KEYS.PROFILE);
    _profileCache = r ? JSON.parse(r) : null;
    return _profileCache;
  } catch { return null; }
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
  invalidateOnboardingCache();
}

function buildProfile(ids: string[]): AIInterestProfile {
  const cw: Record<string, number> = {};
  const tw: Record<string, number> = {};
  ids.forEach(id => {
    const cat = INTEREST_CATEGORIES.find(c => c.id === id);
    if (!cat) return;
    cat.toolCategories.forEach(tc => { cw[tc] = (cw[tc] || 0) + 2; });
    cat.tags.forEach(tag => { tw[tag] = (tw[tag] || 0) + 1; });
  });
  return { selectedIds: ids, categoryWeights: cw, tagWeights: tw, updatedAt: new Date().toISOString() };
}
