/**
 * smartFeedService.ts — مستر جيشو
 * Advanced AI-powered multi-signal content ranking & smart feed builder
 */
import { Tool } from './mockData';
import { Post } from './postsService';
import { AIInterestProfile } from './onboardingService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToolFeedItem {
  type: 'tool';
  data: Tool;
  score: number;
  reason: string;
  reasonIcon: string;
  reasonColor: string;
}

export interface PostFeedItem {
  type: 'post';
  data: Post;
  score: number;
  reason: string;
  reasonIcon: string;
  reasonColor: string;
}

export type FeedItem = ToolFeedItem | PostFeedItem;

export interface UserPrefs {
  categories: Map<string, number>;
  tags: Map<string, number>;
  hasInteractions: boolean;
  topCategories: string[];
  interactionCount: number;
}

// ─── Build User Preference Profile ───────────────────────────────────────────

export function buildUserPrefs(
  tools: Tool[],
  savedIds: string[],
  votedIds: string[]
): UserPrefs {
  const interactedIds = [...new Set([...savedIds, ...votedIds])];
  const interactedTools = interactedIds
    .map(id => tools.find(t => t.id === id))
    .filter(Boolean) as Tool[];

  const categories = new Map<string, number>();
  const tags = new Map<string, number>();

  interactedTools.forEach(t => {
    // Saves have higher weight than votes (intentional action)
    const weight = savedIds.includes(t.id) && votedIds.includes(t.id) ? 4
      : savedIds.includes(t.id) ? 3
      : 1;
    categories.set(t.category, (categories.get(t.category) || 0) + weight);
    t.tags.forEach(tag => tags.set(tag, (tags.get(tag) || 0) + weight));
  });

  // Top 3 most-engaged categories for diversity signal
  const topCategories = [...categories.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  return {
    categories,
    tags,
    hasInteractions: interactedTools.length > 0,
    topCategories,
    interactionCount: interactedTools.length,
  };
}

// ─── Score a Single Tool ──────────────────────────────────────────────────────

function scoreTool(
  t: Tool,
  prefs: UserPrefs,
  savedIds: string[],
  now: number,
  dayMs: number
): { score: number; reason: string; reasonIcon: string; reasonColor: string } {
  const ageDays = (now - new Date(t.createdAt).getTime()) / dayMs;

  // ── Quality signals ──────────────────────────────────────────────────────
  // Logarithmic vote score to prevent massive vote-count domination
  const voteScore = Math.log1p(Math.min(t.votes, 2000)) * 9;
  // Rating score: exponential to reward high ratings more
  const ratingScore = Math.pow(Math.max(0, t.rating) / 5, 2) * 40;
  // Rating count: rewards tools with many reviews
  const reviewScore = Math.log1p(t.ratingCount) * 5;

  // ── Recency signal (exponential decay, half-life ≈ 20 days) ─────────────
  const recency = Math.exp(-ageDays / 28) * 36;

  // ── Personalization signals ───────────────────────────────────────────────
  const catScore = (prefs.categories.get(t.category) || 0) * 22;
  const tagScore = t.tags.reduce((sum, tag) => sum + (prefs.tags.get(tag) || 0) * 8, 0);

  // ── Editorial signals ─────────────────────────────────────────────────────
  const editorialBonus =
    (t.trending ? 38 : 0) +
    (t.editorPick ? 30 : 0) +
    (t.isNew ? 24 : 0) +
    (t.featured ? 18 : 0);

  // ── Discovery penalty: push already-saved tools down ─────────────────────
  const savedPenalty = savedIds.includes(t.id) ? -160 : 0;

  const score = voteScore + ratingScore + reviewScore + recency + catScore + tagScore + editorialBonus + savedPenalty;

  // ── Reason selection (priority order) ────────────────────────────────────
  let reason = 'مقترح لك';
  let reasonIcon = 'auto-awesome';
  let reasonColor = '#A78BFA';

  if (catScore > 30) {
    reason = 'بناءً على اهتماماتك';
    reasonIcon = 'favorite';
    reasonColor = '#EC4899';
  } else if (tagScore > 18) {
    reason = 'يطابق اهتماماتك';
    reasonIcon = 'local-offer';
    reasonColor = '#8B5CF6';
  } else if (t.editorPick) {
    reason = 'اختيار المحررين';
    reasonIcon = 'verified';
    reasonColor = '#3B82F6';
  } else if (t.trending) {
    reason = 'الأكثر رواجاً';
    reasonIcon = 'local-fire-department';
    reasonColor = '#F97316';
  } else if (t.isNew && ageDays < 14) {
    reason = 'جديد هذا الأسبوع';
    reasonIcon = 'fiber-new';
    reasonColor = '#10B981';
  } else if (t.featured) {
    reason = 'مميز بواسطة المنصة';
    reasonIcon = 'stars';
    reasonColor = '#F59E0B';
  } else if (t.rating >= 4.7) {
    reason = 'تقييم استثنائي';
    reasonIcon = 'star';
    reasonColor = '#FBBF24';
  } else if (t.votes > 800) {
    reason = 'شائع جداً';
    reasonIcon = 'trending-up';
    reasonColor = '#06B6D4';
  }

  return { score, reason, reasonIcon, reasonColor };
}

// ─── Score All Tools ──────────────────────────────────────────────────────────

function scoreTools(
  tools: Tool[],
  prefs: UserPrefs,
  savedIds: string[]
): ToolFeedItem[] {
  const now = Date.now();
  const dayMs = 86_400_000;

  return tools.map(t => {
    const { score, reason, reasonIcon, reasonColor } = scoreTool(t, prefs, savedIds, now, dayMs);
    return { type: 'tool' as const, data: t, score, reason, reasonIcon, reasonColor };
  });
}

// ─── Score All Posts ──────────────────────────────────────────────────────────

function scorePosts(posts: Post[], prefs: UserPrefs): PostFeedItem[] {
  const now = Date.now();
  const dayMs = 86_400_000;

  return posts.map(p => {
    const ageDays = (now - new Date(p.date).getTime()) / dayMs;

    // ── Engagement signals ─────────────────────────────────────────────────
    const viewScore = Math.log1p(p.views) * 4;
    const likeScore = Math.log1p(p.likes) * 7;
    const shareScore = Math.log1p(p.shares) * 10;

    // ── Recency (stronger boost: half-life ≈ 18 days) ─────────────────────
    const recency = Math.exp(-ageDays / 18) * 55;

    // ── Personalization ────────────────────────────────────────────────────
    const catScore = (prefs.categories.get(p.category) || 0) * 14;
    const tagScore = p.tags.reduce((sum, tag) => sum + (prefs.tags.get(tag) || 0) * 5, 0);

    // ── Read-time preference (sweet spot: 4–8 min) ─────────────────────────
    const readTimeScore = p.readTime >= 4 && p.readTime <= 8 ? 12
      : p.readTime < 4 ? 8
      : 4;

    const featuredBonus = p.featured ? 50 : 0;

    const score = viewScore + likeScore + shareScore + recency + catScore + tagScore + readTimeScore + featuredBonus;

    // ── Reason selection ───────────────────────────────────────────────────
    let reason = 'مقال مختار';
    let reasonIcon = 'article';
    let reasonColor = '#64748B';

    if (p.featured) {
      reason = 'مقال مميز';
      reasonIcon = 'star';
      reasonColor = '#F59E0B';
    } else if (catScore > 14) {
      reason = 'يناسب اهتماماتك';
      reasonIcon = 'favorite';
      reasonColor = '#EC4899';
    } else if (ageDays < 3) {
      reason = 'نُشر مؤخراً';
      reasonIcon = 'schedule';
      reasonColor = '#10B981';
    } else if (p.shares > 1500) {
      reason = 'الأكثر مشاركةً';
      reasonIcon = 'share';
      reasonColor = '#3B82F6';
    } else if (p.views > 5000) {
      reason = 'الأكثر قراءةً';
      reasonIcon = 'visibility';
      reasonColor = '#06B6D4';
    } else if (p.likes > 1000) {
      reason = 'مقال محبوب';
      reasonIcon = 'favorite-border';
      reasonColor = '#EC4899';
    }

    return { type: 'post' as const, data: p, score, reason, reasonIcon, reasonColor };
  });
}

// ─── Ensure Category Diversity (prevent 3+ same category in a row) ───────────

function ensureDiversity(items: ToolFeedItem[]): ToolFeedItem[] {
  const result: ToolFeedItem[] = [];
  const deferred: ToolFeedItem[] = [];
  let lastTwo: string[] = [];

  for (const item of items) {
    const cat = item.data.category;
    if (lastTwo.filter(c => c === cat).length >= 2) {
      deferred.push(item);
    } else {
      result.push(item);
      lastTwo = [...lastTwo.slice(-1), cat];
    }
  }

  // Re-insert deferred items at the end
  return [...result, ...deferred];
}

// ─── Build Mixed Smart Feed ───────────────────────────────────────────────────

export function buildSmartFeed(
  tools: Tool[],
  posts: Post[],
  prefs: UserPrefs,
  savedIds: string[]
): FeedItem[] {
  // Score & sort tools, apply diversity
  const rawScoredTools = scoreTools(tools, prefs, savedIds)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);
  const diverseTools = ensureDiversity(rawScoredTools);

  // Score & sort posts — ensure featured posts surface early
  const scoredPosts = scorePosts(posts, prefs).sort((a, b) => b.score - a.score);
  const featuredFirst = [
    ...scoredPosts.filter(p => p.data.featured),
    ...scoredPosts.filter(p => !p.data.featured),
  ].slice(0, 8);

  // Smart interleave: 2 tools → 1 post → repeat
  const merged: FeedItem[] = [];
  let ti = 0;
  let pi = 0;

  while (ti < diverseTools.length || pi < featuredFirst.length) {
    if (ti < diverseTools.length) merged.push(diverseTools[ti++]);
    if (ti < diverseTools.length) merged.push(diverseTools[ti++]);
    if (pi < featuredFirst.length) merged.push(featuredFirst[pi++]);
  }

  return merged;
}

// ─── Apply Onboarding AI Profile to boost personalised categories & tags ────────

export function applyAIProfile(
  prefs: UserPrefs,
  profile: AIInterestProfile | null
): UserPrefs {
  if (!profile || profile.selectedIds.length === 0) return prefs;

  const categories = new Map(prefs.categories);
  const tags       = new Map(prefs.tags);

  // Each onboarding category contributes a strong boost (weight * 14)
  Object.entries(profile.categoryWeights).forEach(([cat, w]) => {
    categories.set(cat, (categories.get(cat) || 0) + w * 14);
  });

  // Each onboarding tag contributes a moderate boost (weight * 9)
  Object.entries(profile.tagWeights).forEach(([tag, w]) => {
    tags.set(tag, (tags.get(tag) || 0) + w * 9);
  });

  const topCategories = [...categories.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  return {
    ...prefs,
    categories,
    tags,
    topCategories,
    // Onboarding counts as having personalisation data
    hasInteractions: prefs.hasInteractions || profile.selectedIds.length > 0,
  };
}

// ─── Build "Explore More" Data ────────────────────────────────────────────────

export function buildExploreMore(
  tools: Tool[],
  posts: Post[]
): { newTools: Tool[]; latestPosts: Post[] } {
  const newTools = [...tools]
    .filter(t => t.isNew || t.trending)
    .sort((a, b) => {
      // New first, then trending, then by votes
      if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
      if (a.trending !== b.trending) return a.trending ? -1 : 1;
      return b.votes - a.votes;
    })
    .slice(0, 10);

  const latestPosts = [...posts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  return { newTools, latestPosts };
}
