export const adminTheme = {
  colors: {
    background: "#F9F8F6",       // ấm nhẹ, không trắng tinh
    surface: "#FFFFFF",
    surfaceLow: "#F4F2EF",       // tint ấm đồng bộ
    surfaceContainer: "#EEECE8",
    surfaceVariant: "#E8E5E0",
    outline: "#A09B94",          // gray ấm
    outlineVariant: "#E2DED8",
    onSurface: "#1C1917",        // gần đen, không #000
    onSurfaceVariant: "#6B6560",
    primary: "#E5642A",          // cam đậm hơn, tinh tế hơn
    primaryContainer: "#FF8C42",
    onPrimary: "#FFFFFF",
    onPrimaryContainer: "#FFFFFF",
    secondary: "#6B6560",
    secondaryContainer: "#EBE6E0",
    onSecondaryContainer: "#1C1917",
    accent: "#FF7B3D",
    success: "#16A34A",          // xanh đậm hơn
    danger: "#DC2626",
    onDanger: "#FFFFFF",
    warning: "#D97706",          // vàng đậm
    muted: "#A09B94",
    subtleText: "#A09B94",
    inputBg: "#F4F2EF",
  },
  radius: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
  },
  shadow: {
    card: {
      shadowColor: "#3D3228",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    lift: {
      shadowColor: "#3D3228",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
  },
  glassCard: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(200,190,180,0.3)",
  },
};
