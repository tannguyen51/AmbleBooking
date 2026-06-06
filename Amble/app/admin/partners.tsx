import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import { AdminHeader } from "../../components/admin/AdminHeader";
import AdminCard from "../../components/admin/AdminCard";
import { AdminSegmented } from "../../components/admin/AdminSegmented";
import { adminTheme } from "../../constants/adminTheme";
import { useTranslation } from "../../i18n/useTranslation";

interface PartnerItem {
  _id: string;
  ownerName: string;
  email: string;
  phone: string;
  restaurantName: string;
  subscriptionPackage: string;
  subscriptionStatus: "pending" | "paid_pending" | "active" | "expired" | "cancelled";
  subscriptionExpiry?: string | null;
  isActive: boolean;
  rejectionReason?: string;
  approvalNote?: string;
  restaurantImage?: string;
}

const toLabelCase = (value: string) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getExpiryCountdown = (expiry: string | null | undefined): { label: string; tone: "info" | "warning" | "danger" } | null => {
  if (!expiry) return null;
  const now = Date.now();
  const end = new Date(expiry).getTime();
  const diff = end - now;
  if (diff <= 0) return { label: "Đã hết hạn", tone: "danger" };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return { label: `Còn ${days} ngày`, tone: days <= 3 ? "warning" : "info" };
  if (hours > 0) return { label: `Còn ${hours} giờ`, tone: "warning" };
  return { label: "Sắp hết hạn", tone: "danger" };
};

export default function AdminPartnersScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const ACTIVE_OPTIONS = [
    { value: "all", label: t("admin.partners.all") },
    { value: "active", label: t("admin.partners.active") },
    { value: "locked", label: t("admin.partners.locked") },
  ] as const;

  const STATUS_OPTIONS = [
    { value: "pending", label: t("admin.partners.pending") },
    { value: "paid_pending", label: "Đã TT" },
    { value: "active", label: t("admin.partners.running") },
    { value: "expired", label: t("admin.partners.expired") },
    { value: "cancelled", label: t("admin.partners.cancelled") },
    { value: "all", label: t("admin.partners.all") },
  ] as const;
  const [status, setStatus] = useState<
    PartnerItem["subscriptionStatus"] | "all"
  >("pending");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "locked"
  >("all");
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectVisible, setRejectVisible] = useState(false);
  const [approveVisible, setApproveVisible] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerItem | null>(
    null,
  );
  const [decisionNote, setDecisionNote] = useState("");

  const loadPartners = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getPartners({
        status: status === "all" ? undefined : status,
        search: search || undefined,
        isActive:
          activeFilter === "all"
            ? undefined
            : activeFilter === "active",
      });
      setPartners(res.data?.partners || []);
    } catch {
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, [status, activeFilter]);

  const handleApprove = async (partner: PartnerItem) => {
    try {
      await adminAPI.approvePartner(partner._id, { note: decisionNote.trim() });
      await loadPartners();
      setApproveVisible(false);
      setDecisionNote("");
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.response?.data?.message || t("admin.partners.defaultError"));
    }
  };

  const handleReject = async (partner: PartnerItem) => {
    if (!decisionNote.trim()) {
      Alert.alert(t("common.error"), t("admin.partners.rejectReasonRequired"));
      return;
    }
    try {
      await adminAPI.rejectPartner(partner._id, decisionNote.trim());
      await loadPartners();
      setRejectVisible(false);
      setDecisionNote("");
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.response?.data?.message || t("admin.partners.defaultError"));
    }
  };

  const openApprove = (partner: PartnerItem) => {
    setSelectedPartner(partner);
    setDecisionNote("");
    setApproveVisible(true);
  };

  const openReject = (partner: PartnerItem) => {
    setSelectedPartner(partner);
    setDecisionNote("");
    setRejectVisible(true);
  };

  const toggleActive = async (partner: PartnerItem) => {
    try {
      await adminAPI.setPartnerActive(partner._id, !partner.isActive);
      await loadPartners();
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.response?.data?.message || t("admin.partners.defaultError"));
    }
  };

  return (
    <View style={styles.container}>
      <AdminHeader title={t("admin.partners.title")} subtitle={t("admin.partners.subtitle")} showBack={false} />

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={t("admin.partners.searchPlaceholder")}
          placeholderTextColor={adminTheme.colors.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadPartners}
        />
        <TouchableOpacity style={styles.refreshBtn} onPress={loadPartners}>
          <Text style={styles.refreshText}>Go</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>{t("admin.partners.statusTitle")}</Text>
        <AdminSegmented
          options={ACTIVE_OPTIONS}
          value={activeFilter}
          onChange={setActiveFilter}
          compact
        />
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>{t("admin.partners.verificationTitle")}</Text>
        <AdminSegmented
          options={STATUS_OPTIONS}
          value={status}
          onChange={(v) => setStatus(v as any)}
          compact
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={adminTheme.colors.onSurface} />
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      ) : (
        <FlatList
          data={partners}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const countdown = item.subscriptionPackage === "premium" ? getExpiryCountdown(item.subscriptionExpiry) : null;
            return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push(`/admin/partners/${item._id}` as any)}
            >
              <AdminCard style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.restImgWrap}>
                    {item.restaurantImage ? (
                      <Image source={{ uri: item.restaurantImage }} style={styles.restImg} />
                    ) : (
                      <View style={styles.restImgPlaceholder}>
                        <Text style={styles.restImgLetter}>{(item.restaurantName || "N")[0]}</Text>
                      </View>
                    )}
                    {item.subscriptionPackage === "premium" && (
                      <View style={styles.crownBadgeSmall}>
                        <Ionicons name="diamond" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.ownerName}</Text>
                    <Text style={styles.meta}>{item.restaurantName}</Text>
                    <Text style={styles.meta}>{item.email}</Text>
                  </View>
                </View>
                {item.subscriptionStatus === "cancelled" && item.rejectionReason ? (
                  <Text style={styles.metaDanger}>{item.rejectionReason}</Text>
                ) : null}

                <View style={styles.badgeRow}>
                  <Badge
                    label={item.subscriptionStatus === "paid_pending" ? "Đã thanh toán" : toLabelCase(item.subscriptionStatus)}
                    tone={
                      item.subscriptionStatus === "pending"
                        ? "warning"
                        : item.subscriptionStatus === "paid_pending"
                          ? "info"
                          : item.subscriptionStatus === "active"
                            ? "success"
                            : item.subscriptionStatus === "expired"
                              ? "danger"
                              : "default"
                    }
                  />
                  <Badge label={toLabelCase(item.subscriptionPackage)} tone="info" />
                  {countdown ? (
                    <Badge label={countdown.label} tone={countdown.tone} />
                  ) : null}
                  <Badge
                    label={item.isActive ? t("admin.partners.active") : t("admin.partners.locked")}
                    tone={item.isActive ? "success" : "danger"}
                  />
                </View>

                <View style={styles.actionsRow}>
                  {item.subscriptionStatus === "pending" || item.subscriptionStatus === "paid_pending" ? (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionPrimary]}
                        onPress={() => openApprove(item)}
                      >
                        <Text style={styles.actionTextPrimary}>{t("admin.partners.approve")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionGhost]}
                        onPress={() => openReject(item)}
                      >
                        <Text style={styles.actionText}>{t("admin.partners.reject")}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionGhost]}
                      onPress={() => toggleActive(item)}
                    >
                      <Text style={styles.actionText}>
                        {item.isActive ? t("admin.partners.lockAction") : t("admin.partners.unlockAction")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </AdminCard>
            </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal transparent visible={approveVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("admin.partners.approveModalTitle")}</Text>
            <Text style={styles.modalSubtitle}>
              {selectedPartner?.restaurantName || ""}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("admin.partners.notePlaceholder")}
              placeholderTextColor="#94A3B8"
              value={decisionNote}
              onChangeText={setDecisionNote}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalGhost]}
                onPress={() => setApproveVisible(false)}
              >
                <Text style={styles.modalGhostText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalPrimary]}
                onPress={() =>
                  selectedPartner ? handleApprove(selectedPartner) : null
                }
              >
                <Text style={styles.modalPrimaryText}>{t("admin.partners.approve")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={rejectVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("admin.partners.rejectModalTitle")}</Text>
            <Text style={styles.modalSubtitle}>
              {selectedPartner?.restaurantName || ""}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("admin.partners.reasonPlaceholder")}
              placeholderTextColor="#94A3B8"
              value={decisionNote}
              onChangeText={setDecisionNote}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalGhost]}
                onPress={() => setRejectVisible(false)}
              >
                <Text style={styles.modalGhostText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalDanger]}
                onPress={() =>
                  selectedPartner ? handleReject(selectedPartner) : null
                }
              >
                <Text style={styles.modalDangerText}>{t("admin.partners.reject")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AdminBottomNav />
    </View>
  );
}

function Badge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "info" | "warning" | "success" | "danger";
}) {
  const toneStyle =
    tone === "info"
      ? styles.badgeInfo
      : tone === "warning"
        ? styles.badgeWarning
        : tone === "success"
          ? styles.badgeSuccess
          : tone === "danger"
            ? styles.badgeDanger
            : styles.badgeDefault;

  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: adminTheme.colors.background,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    backgroundColor: adminTheme.colors.surface,
  },
  searchInput: {
    flex: 1,
    color: adminTheme.colors.onSurface,
    fontSize: 13,
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: adminTheme.colors.surfaceVariant,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  filterGroup: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  filterLabel: {
    fontSize: 12,
    color: adminTheme.colors.muted,
    fontWeight: "700",
    marginBottom: 8,
  },
  loadingWrap: {
    marginTop: 30,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: adminTheme.colors.muted,
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  card: {
    backgroundColor: adminTheme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
  },
  cardHeaderRow: {
    flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10,
  },
  restImgWrap: {
    position: "relative",
    width: 48,
    height: 48,
  },
  restImg: {
    width: 48, height: 48, borderRadius: 10, backgroundColor: adminTheme.colors.surfaceVariant,
  },
  restImgPlaceholder: {
    width: 48, height: 48, borderRadius: 10, backgroundColor: adminTheme.colors.surfaceVariant,
    alignItems: "center", justifyContent: "center",
  },
  restImgLetter: {
    fontSize: 18, fontWeight: "800", color: adminTheme.colors.muted,
  },
  crownBadgeSmall: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  meta: {
    fontSize: 12,
    color: adminTheme.colors.muted,
    marginTop: 2,
  },
  metaDanger: {
    fontSize: 12,
    color: adminTheme.colors.danger,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: adminTheme.colors.surfaceVariant,
  },
  badgeInfo: {
    backgroundColor: adminTheme.colors.surfaceContainer,
  },
  badgeWarning: {
    backgroundColor: "#FEF3C7",
  },
  badgeSuccess: {
    backgroundColor: "#DCFCE7",
  },
  badgeDanger: {
    backgroundColor: "#FEE2E2",
  },
  badgeDefault: {
    backgroundColor: adminTheme.colors.surfaceVariant,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  actionPrimary: {
    backgroundColor: adminTheme.colors.primary,
  },
  actionGhost: {
    backgroundColor: adminTheme.colors.surfaceLow,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: adminTheme.colors.onSurface,
  },
  actionTextPrimary: {
    fontSize: 12,
    fontWeight: "600",
    color: adminTheme.colors.onPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(26, 26, 26, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: adminTheme.colors.surface,
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  modalSubtitle: {
    fontSize: 12,
    color: adminTheme.colors.muted,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: adminTheme.colors.onSurface,
    backgroundColor: adminTheme.colors.background,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  modalGhost: {
    backgroundColor: adminTheme.colors.surfaceVariant,
  },
  modalPrimary: {
    backgroundColor: adminTheme.colors.primary,
  },
  modalDanger: {
    backgroundColor: adminTheme.colors.danger,
  },
  modalGhostText: {
    fontSize: 12,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  modalPrimaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: adminTheme.colors.onPrimary,
  },
  modalDangerText: {
    fontSize: 12,
    fontWeight: "700",
    color: adminTheme.colors.danger,
  },
});
