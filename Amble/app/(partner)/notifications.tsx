import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PartnerBottomNav } from "../../components/partner/PartnerBottomNav";
import { partnerDashboardAPI } from "../../services/api";
import { useTranslation } from "../../i18n/useTranslation";

interface PartnerNotification {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  createdAt: string;
  status: string;
}

type NotificationTone = {
  iconColor: string;
  iconBg: string;
  titleColor: string;
};

const DEFAULT_TONE: NotificationTone = {
  iconColor: "#FF6B35",
  iconBg: "#FFF3ED",
  titleColor: "#1A1A1A",
};

const CONFIRMED_TONE: NotificationTone = {
  iconColor: "#16A34A",
  iconBg: "#DCFCE7",
  titleColor: "#166534",
};

const CANCELLED_TONE: NotificationTone = {
  iconColor: "#DC2626",
  iconBg: "#FEE2E2",
  titleColor: "#991B1B",
};

function getNotificationTone(item: PartnerNotification): NotificationTone {
  const title = (item.title || "").toLowerCase();

  if (item.status === "confirmed" || title.includes("xác nhận")) {
    return CONFIRMED_TONE;
  }

  if (item.status === "cancelled" || title.includes("hủy")) {
    return CANCELLED_TONE;
  }

  return DEFAULT_TONE;
}

export default function PartnerNotificationsScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<PartnerNotification[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await partnerDashboardAPI.getNotifications();
        setItems(res.data?.notifications || []);
        setPendingCount(res.data?.pendingCount || 0);
      } catch (error: any) {
        const message =
          error?.response?.data?.message || "Không tải được thông báo";
        Alert.alert(t("common.error"), message);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t("partner.notifications.title")}</Text>
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.helperText}>{t("common.loading")}</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyTitle}>{t("partner.notifications.emptyTitle")}</Text>
            <Text style={styles.helperText}>
              {t("partner.notifications.emptySubtitle")}
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const tone = getNotificationTone(item);

            return (
              <View key={item.id} style={styles.card}>
                <View
                  style={[styles.iconBox, { backgroundColor: tone.iconBg }]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={18}
                    color={tone.iconColor}
                  />
                </View>
                <View style={styles.textWrap}>
                  <Text style={[styles.cardTitle, { color: tone.titleColor }]}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      <PartnerBottomNav pendingCount={pendingCount} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: "900", color: "#1A1A1A", marginBottom: 8 },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  helperText: { fontSize: 12, color: "#9CA3AF" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    padding: 14,
    flexDirection: "row",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF3ED",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1 },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 3,
  },
  cardSubtitle: { fontSize: 12, color: "#6B7280", lineHeight: 18 },
});
