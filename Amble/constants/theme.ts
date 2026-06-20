// MunchMap Design Tokens — from Figma
export const Colors = {
  primary: '#FF8F1F',
  primaryLight: '#FFD109',
  primaryDark: '#E5770A',
  secondary: '#6F55FF',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#1C1917',
  textSecondary: '#666660',
  textMuted: '#999990',
  border: '#E8E5E0',
  error: '#FF0059',
  success: '#16A34A',
  warning: '#F59E0B',
  gradientOrange: ['#FFD109', '#FF8B25'] as [string, string],
  gradientPurple: ['#7C3AED', '#6F55FF'] as [string, string],
};

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
};

export const BorderRadius = {
  sm: 8, md: 10, lg: 15, xl: 20, full: 999,
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  label: { fontSize: 14, fontWeight: '600' as const },
};
