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
import { LinearGradient } from "expo-linear-gradient";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import { useTranslation } from "../../i18n/useTranslation";

interface PartnerItem {
  _id: string;
  restaurantId?: string;
  ownerName: string;
  email: string;
  phone: string;
  restaurantName: string;
  subscriptionPackage: string;
  subscriptionStatus: "pending" | "paid_pending" | "active" | "expired" | "cancelled";
  subscriptionExpiry?: string | null;
  isActive: boolean;
  isFeatured?: boolean;
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

type FilterTab = "all" | "pending" | "active";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "active", label: "Đang chạy" },
];

export default function AdminPartnersScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [status, setStatus] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectVisible, setRejectVisible] = useState(false);
  const [approveVisible, setApproveVisible] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerItem | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  const loadPartners = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getPartners({
        status: status === "all" ? undefined : status,
        search: search || undefined,
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
  }, [status, search]);

  const handleApprove = async (partner: PartnerItem) => {
    try {
      await adminAPI.approvePartner(partner._id, { note: decisionNote.trim() });
      await loadPartners();
      setApproveVisible(false);
      setDecisionNote("");
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.response?.data?.message || "Lỗi");
    }
  };

  const handleReject = async (partner: PartnerItem) => {
    if (!decisionNote.trim()) {
      Alert.alert(t("common.error"), "Vui lòng nhập lý do từ chối");
      return;
    }
    try {
      await adminAPI.rejectPartner(partner._id, decisionNote.trim());
      await loadPartners();
      setRejectVisible(false);
      setDecisionNote("");
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.response?.data?.message || "Lỗi");
    }
  };

  const openApprove = (partner: PartnerItem) => { setSelectedPartner(partner); setDecisionNote(""); setApproveVisible(true); };
  const openReject = (partner: PartnerItem) => { setSelectedPartner(partner); setDecisionNote(""); setRejectVisible(true); };

  const toggleActive = async (partner: PartnerItem) => {
    try {
      await adminAPI.setPartnerActive(partner._id, !partner.isActive);
      await loadPartners();
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.response?.data?.message || "Lỗi");
    }
  };

  const toggleFeatured = async (partner: PartnerItem) => {
    const rid = partner.restaurantId;
    if (!rid) { Alert.alert("Lỗi", "Nhà hàng chưa có dữ liệu"); return; }
    try {
      await adminAPI.setRestaurantFeatured(rid, !partner.isFeatured);
      await loadPartners();
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.response?.data?.message || "Lỗi");
    }
  };

  const toggleRestaurantActive = async (partner: PartnerItem) => {
    const rid = partner.restaurantId;
    if (!rid) { Alert.alert("Lỗi", "Nhà hàng chưa có dữ liệu"); return; }
    try {
      await adminAPI.setRestaurantActive(rid, !partner.isActive);
      await loadPartners();
    } catch (error: any) {
      Alert.alert(t("common.error"), error?.response?.data?.message || "Lỗi");
    }
  };

  return (
    <View style={s.root}>
      {/* Header — giống dashboard */}
      <LinearGradient colors={["#FF8B25", "#FFD109"]} style={s.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={s.headerTitle}>{t("admin.partners.title")}</Text>
        </View>
      </LinearGradient>

      {/* Search bar — bo góc tròn */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={s.searchInput}
          placeholder={t("admin.partners.searchPlaceholder")}
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter tabs — giống history.tsx */}
      <View style={s.filterRow}>
        {FILTER_TABS.map((tab) => {
          const active = status === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.filterTab, active && s.filterTabActive]}
              onPress={() => setStatus(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.filterTabText, active && s.filterTabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="small" color="#FF8F1F" />
          <Text style={s.loadingText}>{t("common.loading")}</Text>
        </View>
      ) : (
        <FlatList
          data={partners}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => {
            const countdown = item.subscriptionPackage === "premium" ? getExpiryCountdown(item.subscriptionExpiry) : null;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push(`/admin/partners/${item._id}` as any)}
                style={s.card}
              >
                <View style={s.cardHeaderRow}>
                  <View style={s.restImgWrap}>
                    {item.restaurantImage ? (
                      <Image source={{ uri: item.restaurantImage }} style={s.restImg} />
                    ) : (
                      <View style={s.restImgPlaceholder}>
                        <Text style={s.restImgLetter}>{(item.restaurantName || "N")[0]}</Text>
                      </View>
                    )}
                    {item.subscriptionPackage === "premium" && (
                      <View style={s.crownBadgeSmall}>
                        <Ionicons name="diamond" size={10} color="#fff" />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{item.ownerName}</Text>
                    <Text style={s.meta}>{item.restaurantName}</Text>
                    <Text style={s.meta}>{item.email}</Text>
                  </View>
                </View>

                {item.subscriptionStatus === "cancelled" && item.rejectionReason ? (
                  <Text style={s.metaDanger}>{item.rejectionReason}</Text>
                ) : null}

                <View style={s.badgeRow}>
                  <Badge
                    label={item.subscriptionStatus === "paid_pending" ? "Đã thanh toán" : toLabelCase(item.subscriptionStatus)}
                    tone={
                      item.subscriptionStatus === "pending" ? "warning"
                      : item.subscriptionStatus === "paid_pending" ? "info"
                      : item.subscriptionStatus === "active" ? "success"
                      : item.subscriptionStatus === "expired" ? "danger"
                      : "default"
                    }
                  />
                  <Badge label={toLabelCase(item.subscriptionPackage)} tone="info" />
                  {countdown ? <Badge label={countdown.label} tone={countdown.tone} /> : null}
                  <Badge
                    label={item.isActive ? t("admin.partners.active") : t("admin.partners.locked")}
                    tone={item.isActive ? "success" : "danger"}
                  />
                </View>

                <View style={s.actionsRow}>
                  {item.subscriptionStatus === "pending" || item.subscriptionStatus === "paid_pending" ? (
                    <>
                      <TouchableOpacity style={[s.actionBtn, s.actionPrimary]} onPress={() => openApprove(item)}>
                        <Text style={s.actionTextPrimary}>{t("admin.partners.approve")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.actionBtn, s.actionGhost]} onPress={() => openReject(item)}>
                        <Text style={s.actionText}>{t("admin.partners.reject")}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={[s.actionBtn, s.actionGhost]} onPress={() => toggleActive(item)}>
                        <Text style={s.actionText}>
                          {item.isActive ? "Khóa" : "Mở khóa"}
                        </Text>
                      </TouchableOpacity>
                      {item.restaurantId && (
                        <>
                          <TouchableOpacity style={[s.actionBtn, s.actionGhost]} onPress={() => toggleRestaurantActive(item)}>
                            <Text style={s.actionText}>
                              {item.isActive ? "Ẩn" : "Hiện"}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[s.actionBtn, s.cardFeatureBtn]} onPress={() => toggleFeatured(item)}>
                            <Text style={s.cardFeatureText}>
                              {item.isFeatured ? "Bỏ nổi bật" : "Nổi bật"}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Approve Modal */}
      <Modal transparent visible={approveVisible} animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t("admin.partners.approveModalTitle")}</Text>
            <Text style={s.modalSubtitle}>{selectedPartner?.restaurantName || ""}</Text>
            <TextInput
              style={s.modalInput}
              placeholder={t("admin.partners.notePlaceholder")}
              placeholderTextColor="#94A3B8"
              value={decisionNote}
              onChangeText={setDecisionNote}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, s.modalGhost]} onPress={() => setApproveVisible(false)}>
                <Text style={s.modalGhostText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, s.modalPrimary]} onPress={() => selectedPartner ? handleApprove(selectedPartner) : null}>
                <Text style={s.modalPrimaryText}>{t("admin.partners.approve")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal transparent visible={rejectVisible} animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t("admin.partners.rejectModalTitle")}</Text>
            <Text style={s.modalSubtitle}>{selectedPartner?.restaurantName || ""}</Text>
            <TextInput
              style={s.modalInput}
              placeholder={t("admin.partners.reasonPlaceholder")}
              placeholderTextColor="#94A3B8"
              value={decisionNote}
              onChangeText={setDecisionNote}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, s.modalGhost]} onPress={() => setRejectVisible(false)}>
                <Text style={s.modalGhostText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, s.modalDanger]} onPress={() => selectedPartner ? handleReject(selectedPartner) : null}>
                <Text style={s.modalDangerText}>{t("admin.partners.reject")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AdminBottomNav />
    </View>
  );
}

function Badge({ label, tone = "default" }: { label: string; tone?: "default" | "info" | "warning" | "success" | "danger"; }) {
  const toneStyle =
    tone === "info" ? s.badgeInfo
    : tone === "warning" ? s.badgeWarning
    : tone === "success" ? s.badgeSuccess
    : tone === "danger" ? s.badgeDanger
    : s.badgeDefault;
  return (
    <View style={[s.badge, toneStyle]}>
      <Text style={s.badgeText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF8F2" },

  // Header — giống dashboard
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  headerTitle: { fontSize: 26, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#FFFFFF" },

  // Search — bo góc tròn
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 15,
    height: 44,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Montserrat_400Regular", color: "#202020", padding: 0, marginLeft: 8 },

  // Filter tabs — giống history.tsx
  filterRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  filterTabActive: { borderColor: "#FF8F1F" },
  filterTabText: { fontSize: 14, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#1E1E1E" },
  filterTabTextActive: { color: "#FF8F1F", fontFamily: "Montserrat_700Bold", fontWeight: "700" },

  // Loading
  center: { marginTop: 40, alignItems: "center", gap: 8 },
  loadingText: { fontSize: 12, color: "#9CA3AF" },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 80, gap: 10 },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  restImgWrap: { position: "relative", width: 48, height: 48 },
  restImg: { width: 48, height: 48, borderRadius: 10, backgroundColor: "#F3F4F6" },
  restImgPlaceholder: { width: 48, height: 48, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  restImgLetter: { fontSize: 18, fontWeight: "800", color: "#9CA3AF" },
  crownBadgeSmall: {
    position: "absolute", top: -3, right: -3,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center",
  },
  name: { fontSize: 15, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#1A1A1A" },
  meta: { fontSize: 12, color: "#6B7280", marginTop: 2, fontFamily: "Montserrat_400Regular" },
  metaDanger: { fontSize: 12, color: "#EF4444", marginTop: 4, fontFamily: "Montserrat_500Medium" },

  // Badges
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeInfo: { backgroundColor: "#EFF6FF" },
  badgeWarning: { backgroundColor: "#FEF3C7" },
  badgeSuccess: { backgroundColor: "#DCFCE7" },
  badgeDanger: { backgroundColor: "#FEE2E2" },
  badgeDefault: { backgroundColor: "#F3F4F6" },
  badgeText: { fontSize: 11, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#1A1A1A" },

  // Actions
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  actionPrimary: { backgroundColor: "#FF8F1F" },
  actionGhost: { backgroundColor: "#F5F5F5" },
  actionText: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "600", color: "#1A1A1A" },
  actionTextPrimary: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "600", color: "#fff" },

  // Feature button
  cardFeatureBtn: { backgroundColor: "#FFF3E0" },
  cardFeatureText: { fontSize: 12, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#FF8F1F" },

  // Modals
  modalBackdrop: { flex: 1, backgroundColor: "rgba(26, 26, 26, 0.6)", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 18, padding: 18 },
  modalTitle: { fontSize: 16, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#1A1A1A" },
  modalSubtitle: { fontSize: 12, color: "#6B7280", marginBottom: 12, fontFamily: "Montserrat_400Regular" },
  modalInput: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13,
    color: "#1A1A1A", backgroundColor: "#F9FAFB", marginBottom: 12,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  modalGhost: { backgroundColor: "#F3F4F6" },
  modalPrimary: { backgroundColor: "#FF8F1F" },
  modalDanger: { backgroundColor: "#EF4444" },
  modalGhostText: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "600", color: "#1A1A1A" },
  modalPrimaryText: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "600", color: "#fff" },
  modalDangerText: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "600", color: "#EF4444" },
});
