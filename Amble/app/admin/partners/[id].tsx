import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { adminAPI } from "../../../services/api";
import { AdminHeader } from "../../../components/admin/AdminHeader";
import AdminCard from "../../../components/admin/AdminCard";
import { adminTheme } from "../../../constants/adminTheme";

const getExpiryCountdown = (expiry: string | null | undefined): string | null => {
  if (!expiry) return null;
  const now = Date.now();
  const end = new Date(expiry).getTime();
  const diff = end - now;
  if (diff <= 0) return "Đã hết hạn";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `Còn ${days} ngày`;
  if (hours > 0) return `Còn ${hours} giờ`;
  return "Sắp hết hạn";
};

type PartnerDetail = {
  _id: string;
  ownerName: string;
  email: string;
  phone: string;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantCity?: string;
  cuisine?: string;
  subscriptionPackage: string;
  subscriptionStatus: string;
  subscriptionExpiry?: string | null;
  isActive: boolean;
  role: string;
  approvalNote?: string;
  rejectionReason?: string;
  createdAt?: string;
};

type RestaurantDetail = {
  _id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  cuisine: string;
  description: string;
  introduction: string;
  priceMin: number;
  priceMax: number;
  openTime: string;
  closeTime: string;
  openDays: string[];
  hasParking: boolean;
  rating: number;
  reviewCount: number;
};

export default function AdminPartnerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canApprove = useMemo(
    () => partner?.subscriptionStatus === "pending" || partner?.subscriptionStatus === "paid_pending",
    [partner?.subscriptionStatus],
  );

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminAPI.getPartnerById(id);
      setPartner(res.data?.partner || null);
      setRestaurant(res.data?.restaurant || null);
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không tải được đối tác");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleApprove = async () => {
    if (!partner) return;
    try {
      setSubmitting(true);
      await adminAPI.approvePartner(partner._id, { note: decisionNote.trim() });
      await loadDetail();
      Alert.alert("Thành công", "Đã duyệt đối tác.");
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không duyệt được");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!partner) return;
    if (!decisionNote.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập lý do từ chối.");
      return;
    }
    try {
      setSubmitting(true);
      await adminAPI.rejectPartner(partner._id, decisionNote.trim());
      await loadDetail();
      Alert.alert("Đã từ chối", "Đã cập nhật trạng thái đối tác.");
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không từ chối được");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="Chi tiết đối tác" subtitle="Xem hồ sơ đăng ký" />
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={adminTheme.colors.onSurface} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      ) : !partner ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Không tìm thấy đối tác.</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <AdminCard style={styles.card}>
            <Text style={styles.sectionTitle}>Thông tin đối tác</Text>
            <InfoRow label="Chủ nhà hàng" value={partner.ownerName} />
            <InfoRow label="Email" value={partner.email} />
            <InfoRow label="SĐT" value={partner.phone} />
            <InfoRow label="Nhà hàng" value={partner.restaurantName} />
            <InfoRow label="Địa chỉ" value={partner.restaurantAddress || "-"} />
            <InfoRow label="Thành phố" value={partner.restaurantCity || "-"} />
            <InfoRow label="Ẩm thực" value={partner.cuisine || "-"} />
            <InfoRow
              label="Trạng thái"
              value={`${partner.subscriptionStatus} • ${partner.isActive ? "Active" : "Locked"}`}
            />
            <InfoRow label="Gói" value={partner.subscriptionPackage} />
            {partner.subscriptionPackage === "premium" && getExpiryCountdown(partner.subscriptionExpiry) ? (
              <InfoRow
                label="Hạn Premium"
                value={getExpiryCountdown(partner.subscriptionExpiry)!}
              />
            ) : null}
            <InfoRow label="Vai trò" value={partner.role} />
            {partner.approvalNote ? (
              <InfoRow label="Ghi chú duyệt" value={partner.approvalNote} />
            ) : null}
            {partner.rejectionReason ? (
              <InfoRow label="Lý do từ chối" value={partner.rejectionReason} />
            ) : null}
          </AdminCard>

          <AdminCard style={styles.card}>
            <Text style={styles.sectionTitle}>Hồ sơ nhà hàng</Text>
            {restaurant ? (
              <>
                <InfoRow label="Tên" value={restaurant.name} />
                <InfoRow label="Địa chỉ" value={restaurant.address || "-"} />
                <InfoRow label="Thành phố" value={restaurant.city || "-"} />
                <InfoRow label="SĐT" value={restaurant.phone || "-"} />
                <InfoRow label="Ẩm thực" value={restaurant.cuisine || "-"} />
                <InfoRow
                  label="Giá"
                  value={`${restaurant.priceMin || 0} - ${restaurant.priceMax || 0}`}
                />
                <InfoRow
                  label="Giờ mở cửa"
                  value={`${restaurant.openTime || "-"} - ${restaurant.closeTime || "-"}`}
                />
                <InfoRow
                  label="Ngày mở cửa"
                  value={restaurant.openDays?.length ? restaurant.openDays.join(", ") : "-"}
                />
                <InfoRow
                  label="Bãi xe"
                  value={restaurant.hasParking ? "Có" : "Không"}
                />
                <InfoRow
                  label="Đánh giá"
                  value={`${restaurant.rating?.toFixed(1) || "0.0"} (${restaurant.reviewCount || 0})`}
                />
                <InfoRow label="Mô tả" value={restaurant.description || "-"} />
                <InfoRow label="Giới thiệu" value={restaurant.introduction || "-"} />
              </>
            ) : (
              <Text style={styles.emptyText}>Chưa có hồ sơ nhà hàng.</Text>
            )}
          </AdminCard>

          {canApprove ? (
            <AdminCard style={styles.card}>
              <Text style={styles.sectionTitle}>Duyệt / Từ chối</Text>
              <TextInput
                style={styles.input}
                placeholder="Ghi chú hoặc lý do từ chối"
                placeholderTextColor={adminTheme.colors.muted}
                value={decisionNote}
                onChangeText={setDecisionNote}
                multiline
              />
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={handleReject}
                  disabled={submitting}
                >
                  <Text style={styles.rejectText}>Từ chối</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={handleApprove}
                  disabled={submitting}
                >
                  <Text style={styles.approveText}>Duyệt</Text>
                </TouchableOpacity>
              </View>
            </AdminCard>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: adminTheme.colors.background,
  },
  scroll: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
    marginBottom: 6,
  },
  infoRow: {
    borderBottomWidth: 1,
    borderBottomColor: adminTheme.colors.surfaceVariant,
    paddingBottom: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: adminTheme.colors.muted,
  },
  infoValue: {
    marginTop: 4,
    fontSize: 14,
    color: adminTheme.colors.onSurface,
    fontWeight: "600",
  },
  loadingWrap: {
    paddingTop: 40,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: adminTheme.colors.muted,
    fontSize: 12,
  },
  emptyWrap: {
    paddingTop: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: adminTheme.colors.muted,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: adminTheme.colors.surfaceVariant,
    borderRadius: 10,
  },
  backBtnText: {
    fontWeight: "600",
    color: adminTheme.colors.onSurface,
  },
  input: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingTop: 10,
    color: adminTheme.colors.onSurface,
    backgroundColor: adminTheme.colors.surface,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  rejectBtn: {
    backgroundColor: "#FEE2E2",
  },
  approveBtn: {
    backgroundColor: "#DCFCE7",
  },
  rejectText: {
    color: "#B91C1C",
    fontWeight: "700",
  },
  approveText: {
    color: "#166534",
    fontWeight: "700",
  },
});
