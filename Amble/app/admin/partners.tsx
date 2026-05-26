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
} from "react-native";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import { AdminHeader } from "../../components/admin/AdminHeader";
import AdminCard from "../../components/admin/AdminCard";
import { adminTheme } from "../../constants/adminTheme";

interface PartnerItem {
  _id: string;
  ownerName: string;
  email: string;
  phone: string;
  restaurantName: string;
  subscriptionPackage: string;
  subscriptionStatus: "pending" | "active" | "expired" | "cancelled";
  isActive: boolean;
  rejectionReason?: string;
  approvalNote?: string;
}

const toLabelCase = (value: string) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const ACTIVE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Hoạt động" },
  { value: "locked", label: "Đã khóa" },
] as const;

const STATUS_OPTIONS = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "active", label: "Đang chạy" },
  { value: "expired", label: "Hết hạn" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "all", label: "Tất cả" },
] as const;

export default function AdminPartnersScreen() {
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
      Alert.alert("Lỗi", error?.response?.data?.message || "Không cập nhật");
    }
  };

  const handleReject = async (partner: PartnerItem) => {
    if (!decisionNote.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do từ chối");
      return;
    }
    try {
      await adminAPI.rejectPartner(partner._id, decisionNote.trim());
      await loadPartners();
      setRejectVisible(false);
      setDecisionNote("");
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không cập nhật");
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
      Alert.alert("Lỗi", error?.response?.data?.message || "Không cập nhật");
    }
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="Đối tác" subtitle="Kiểm duyệt và quản lý" showBack={false} />

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm đối tác"
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
        <Text style={styles.filterLabel}>Trạng thái hoạt động</Text>
        <View style={styles.chipRow}>
          {ACTIVE_OPTIONS.map((item) => {
            const active = activeFilter === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveFilter(item.value)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Tình trạng đối tác</Text>
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((item) => {
            const active = status === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setStatus(item.value)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={adminTheme.colors.onSurface} />
          <Text style={styles.loadingText}>Đang tải danh sách...</Text>
        </View>
      ) : (
        <FlatList
          data={partners}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <AdminCard style={styles.card}>
              <Text style={styles.name}>{item.ownerName}</Text>
              <Text style={styles.meta}>{item.restaurantName}</Text>
              <Text style={styles.meta}>{item.email}</Text>
              {item.subscriptionStatus === "cancelled" && item.rejectionReason ? (
                <Text style={styles.metaDanger}>{item.rejectionReason}</Text>
              ) : null}

              <View style={styles.badgeRow}>
                <Badge
                  label={toLabelCase(item.subscriptionStatus)}
                  tone={
                    item.subscriptionStatus === "pending"
                      ? "warning"
                      : item.subscriptionStatus === "active"
                        ? "success"
                        : item.subscriptionStatus === "expired"
                          ? "danger"
                          : "default"
                  }
                />
                <Badge label={toLabelCase(item.subscriptionPackage)} tone="info" />
                <Badge
                  label={item.isActive ? "Active" : "Locked"}
                  tone={item.isActive ? "success" : "danger"}
                />
              </View>

              <View style={styles.actionsRow}>
                {item.subscriptionStatus === "pending" ? (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionPrimary]}
                      onPress={() => openApprove(item)}
                    >
                      <Text style={styles.actionTextPrimary}>Duyệt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionGhost]}
                      onPress={() => openReject(item)}
                    >
                      <Text style={styles.actionText}>Từ chối</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionGhost]}
                    onPress={() => toggleActive(item)}
                  >
                    <Text style={styles.actionText}>
                      {item.isActive ? "Khóa" : "Mở khóa"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </AdminCard>
          )}
        />
      )}

      <Modal transparent visible={approveVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Duyệt đối tác</Text>
            <Text style={styles.modalSubtitle}>
              {selectedPartner?.restaurantName || ""}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ghi chú (tùy chọn)"
              placeholderTextColor="#94A3B8"
              value={decisionNote}
              onChangeText={setDecisionNote}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalGhost]}
                onPress={() => setApproveVisible(false)}
              >
                <Text style={styles.modalGhostText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalPrimary]}
                onPress={() =>
                  selectedPartner ? handleApprove(selectedPartner) : null
                }
              >
                <Text style={styles.modalPrimaryText}>Duyệt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={rejectVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Từ chối đối tác</Text>
            <Text style={styles.modalSubtitle}>
              {selectedPartner?.restaurantName || ""}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Lý do từ chối"
              placeholderTextColor="#94A3B8"
              value={decisionNote}
              onChangeText={setDecisionNote}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalGhost]}
                onPress={() => setRejectVisible(false)}
              >
                <Text style={styles.modalGhostText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalDanger]}
                onPress={() =>
                  selectedPartner ? handleReject(selectedPartner) : null
                }
              >
                <Text style={styles.modalDangerText}>Từ chối</Text>
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    backgroundColor: adminTheme.colors.surface,
  },
  chipActive: {
    backgroundColor: adminTheme.colors.onSurface,
    borderColor: adminTheme.colors.onSurface,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: adminTheme.colors.onSurface,
  },
  chipTextActive: {
    color: adminTheme.colors.onPrimary,
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
