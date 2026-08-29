const sharedTypography = {
  heroValue: { fontSize: 48, fontWeight: '700' as const, fontFamily: 'Cairo_700Bold' },
  title: { fontSize: 28, fontWeight: '700' as const, fontFamily: 'Cairo_700Bold' },
  subtitle: { fontSize: 20, fontWeight: '600' as const, fontFamily: 'Cairo_600SemiBold' },
  sectionHeader: { fontSize: 18, fontWeight: '700' as const, fontFamily: 'Cairo_700Bold' },
  cardTitle: { fontSize: 16, fontWeight: '600' as const, fontFamily: 'Cairo_600SemiBold' },
  cardValue: { fontSize: 24, fontWeight: '700' as const, fontFamily: 'Cairo_700Bold' },
  body: { fontSize: 15, fontWeight: '400' as const, fontFamily: 'Cairo_400Regular' },
  caption: { fontSize: 13, fontWeight: '400' as const, fontFamily: 'Cairo_400Regular' },
  small: { fontSize: 11, fontWeight: '500' as const, fontFamily: 'Cairo_500Medium' },
  badge: { fontSize: 12, fontWeight: '600' as const, fontFamily: 'Cairo_600SemiBold' },
  button: { fontSize: 16, fontWeight: '600' as const, fontFamily: 'Cairo_600SemiBold' },
  metric: { fontSize: 32, fontWeight: '700' as const, fontFamily: 'Cairo_700Bold' },
};

const sharedValues = {
  fontFamily: 'Cairo_400Regular',
  fontFamilyMedium: 'Cairo_500Medium',
  fontFamilySemiBold: 'Cairo_600SemiBold',
  fontFamilyBold: 'Cairo_700Bold',
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  borderRadius: { small: 8, medium: 12, large: 16, xl: 20, full: 9999 },
  // ── Golden Egyptian palette for category chips ────────────────────────
  categoryColors: {
    'كتابة بالذكاء': '#C8860A',   // gold
    'أدوات الصور':   '#B5451B',   // copper-red
    'أدوات البيانات':'#A0741A',   // dark gold
    'أدوات المطورين':'#8B6914',   // olive gold
    'أدوات مالية':   '#C47C0C',   // amber gold
    'الإنتاجية':     '#9B6508',   // muted gold
    'التصميم':       '#B85C12',   // bronze
    'التسويق':       '#A8720E',   // warm gold
  } as Record<string, string>,
};

// ─── Dark Theme: Luxury Egyptian Gold (inspired by KEMET aesthetic) ──────────
export const darkTheme = {
  ...sharedValues,
  mode: 'dark' as const,

  // ── Brand / Primary: Rich Egyptian Gold ──────────────────────────────
  primary:      '#C8860A',   // warm gold — main CTA, active states, links
  primaryLight: '#F0A820',   // bright gold — hover / highlight
  primaryDark:  '#9B6508',   // deep gold — pressed / shadows

  // ── Accent: Amber Gold ───────────────────────────────────────────────
  accent:      '#E8A020',
  accentLight: '#F5C842',
  accentDark:  '#B8750A',

  // ── Backgrounds ──────────────────────────────────────────────────────
  background:          '#0D0500',   // near-black warm brown — main bg
  backgroundSecondary: '#1A0A00',   // slightly lighter brown

  // ── Surfaces / Cards ─────────────────────────────────────────────────
  surface:      '#261200',   // dark chocolate — cards, sheets
  surfaceLight: '#3A1C00',   // raised surface — modals, popovers

  // ── Typography ───────────────────────────────────────────────────────
  textPrimary:   '#F5EDD6',   // warm cream white
  textSecondary: '#C4A96D',   // muted gold text
  textMuted:     '#8B6A3E',   // very muted warm brown

  // ── Semantic ─────────────────────────────────────────────────────────
  success: '#4ADE80',
  error:   '#F87171',
  warning: '#FBBF24',

  // ── Interactive states ────────────────────────────────────────────────
  star:     '#F5C842',   // bright gold stars
  upvote:   '#E8A020',   // amber upvote
  trending: '#C8860A',   // gold trending badge

  // ── Borders / Separators ─────────────────────────────────────────────
  border:      '#3A1C00',   // dark warm border
  borderLight: '#5C3200',   // slightly lighter divider

  // ── Navigation ───────────────────────────────────────────────────────
  tabBarBg: '#0A0300',   // deepest dark for tab bar

  typography: sharedTypography,
  shadows: {
    card: {
      shadowColor: '#C8860A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 5,
    },
    elevated: {
      shadowColor: '#C8860A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 16,
      elevation: 10,
    },
  },
};

// ─── Light Theme: Warm Parchment Gold ────────────────────────────────────────
export const lightTheme = {
  ...sharedValues,
  mode: 'light' as const,

  // ── Brand / Primary ──────────────────────────────────────────────────
  primary:      '#9B6508',   // deep gold — readable on light
  primaryLight: '#C8860A',   // warm gold
  primaryDark:  '#7A4E06',   // darker gold

  // ── Accent ───────────────────────────────────────────────────────────
  accent:      '#B8750A',
  accentLight: '#E8A020',
  accentDark:  '#8B5A04',

  // ── Backgrounds ──────────────────────────────────────────────────────
  background:          '#FDF6EC',   // warm parchment
  backgroundSecondary: '#F5E8D0',   // slightly deeper parchment

  // ── Surfaces / Cards ─────────────────────────────────────────────────
  surface:      '#FFFAF2',   // near-white warm
  surfaceLight: '#FFF8ED',

  // ── Typography ───────────────────────────────────────────────────────
  textPrimary:   '#2C1A00',   // very dark brown
  textSecondary: '#6B4A1A',   // medium warm brown
  textMuted:     '#A07840',   // muted warm brown

  // ── Semantic ─────────────────────────────────────────────────────────
  success: '#16A34A',
  error:   '#DC2626',
  warning: '#D97706',

  // ── Interactive states ────────────────────────────────────────────────
  star:     '#F59E0B',
  upvote:   '#C8860A',
  trending: '#B5451B',

  // ── Borders / Separators ─────────────────────────────────────────────
  border:      '#E8D5B0',   // warm golden border
  borderLight: '#F0E4C4',

  // ── Navigation ───────────────────────────────────────────────────────
  tabBarBg: '#FFFAF2',

  typography: sharedTypography,
  shadows: {
    card: {
      shadowColor: '#9B6508',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 2,
    },
    elevated: {
      shadowColor: '#9B6508',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 4,
    },
  },
};

export type AppTheme = typeof darkTheme;

// Default export for backward compatibility during migration
export const theme = darkTheme;
