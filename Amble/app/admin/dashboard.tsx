import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AdminAIChat from "../../components/admin/AdminAIChat";
import { useRouter } from "expo-router";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import { useAuthStore } from "../../store/authStore";
import { adminTheme } from "../../constants/adminTheme";
import { useTranslation } from "../../i18n/useTranslation";

const BG = adminTheme.colors.background;

type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  partnersPending: number;
  partnersActive: number;
  restaurantsActive: number;
  bookingsToday: number;
};

const EMPTY_STATS: DashboardStats = {
  totalUsers: 0,
  activeUsers: 0,
  partnersPending: 0,
  partnersActive: 0,
  restaurantsActive: 0,
  bookingsToday: 0,
};

export default function AdminDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { logout } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const ACTIONS = [
    { label: t("admin.dashboard.partners"), icon: "business", path: "/admin/partners" },
    { label: t("admin.dashboard.restaurants"), icon: "restaurant", path: "/admin/restaurants" },
    { label: "Phân tích", icon: "stats-chart", path: "/admin/analytics" },
    { label: t("admin.dashboard.orders"), icon: "calendar", path: "/admin/bookings" },
  ];

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getDashboard();
      setStats(res.data?.stats || EMPTY_STATS);
    } catch {
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={[adminTheme.colors.primary, adminTheme.colors.primaryContainer]}
          style={styles.hero}
        >
          <Text style={styles.heroTitle}>{t("admin.dashboard.title")}</Text>
          <Text style={styles.heroSubtitle}>
            {t("admin.dashboard.subtitle")}
          </Text>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={adminTheme.colors.onSurface} />
            <Text style={styles.loadingText}>{t("common.loading")}</Text>
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard label={t("admin.dashboard.statsUsers")} value={stats.totalUsers} />
            <StatCard label={t("admin.dashboard.statsActiveUsers")} value={stats.activeUsers} />
            <StatCard label={t("admin.dashboard.statsPendingPartners")} value={stats.partnersPending} />
            <StatCard label={t("admin.dashboard.statsActivePartners")} value={stats.partnersActive} />
            <StatCard label={t("admin.dashboard.statsRestaurants")} value={stats.restaurantsActive} />
            <StatCard label={t("admin.dashboard.statsOrders")} value={stats.bookingsToday} />
          </View>
        )}

        <Text style={styles.sectionTitle}>{t("admin.dashboard.quickActions")}</Text>
        <View style={styles.actionsGrid}>
          {ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              onPress={() => router.push(action.path as any)}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons
                  name={action.icon as any}
                  size={18}
                  color={adminTheme.colors.primary}
                />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out" size={16} color={adminTheme.colors.primary} />
          <Text style={styles.logoutText}>{t("admin.dashboard.logout")}</Text>
        </TouchableOpacity>
      </ScrollView>
      <AdminAIChat />
      <AdminBottomNav />
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    paddingBottom: 24,
  },
  hero: {
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 6,
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 14,
    fontWeight: "500",
  },
  loadingWrap: {
    marginTop: 20,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: adminTheme.colors.muted,
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    marginTop: -32,
    gap: 10,
  },
  statCard: {
    width: "47%",
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.lg,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: adminTheme.colors.outlineVariant,
    ...adminTheme.shadow.card,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    color: adminTheme.colors.muted,
    marginTop: 6,
    fontWeight: "500",
  },
  sectionTitle: {
    marginTop: 28,
    marginBottom: 14,
    paddingHorizontal: 20,
    fontSize: 14,
    fontWeight: "600",
    color: adminTheme.colors.onSurface,
    letterSpacing: 0.3,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
  },
  actionCard: {
    width: "47%",
    backgroundColor: adminTheme.colors.surface,
    borderRadius: adminTheme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: adminTheme.colors.outlineVariant,
    ...adminTheme.shadow.card,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: adminTheme.radius.md,
    backgroundColor: adminTheme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: adminTheme.colors.onSurface,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 28,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: adminTheme.radius.md,
    backgroundColor: adminTheme.colors.surfaceLow,
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "600",
    color: adminTheme.colors.muted,
  },
});
