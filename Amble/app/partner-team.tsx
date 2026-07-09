import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PartnerBottomNav } from "../components/partner/PartnerBottomNav";
import { usePartnerAuthStore } from "../store/partnerAuthStore";
import { partnerDashboardAPI, partnerStaffAPI } from "../services/api";

type StaffRole = "manager" | "staff";

type StaffMember = {
  _id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  createdAt?: string;
};

export default function TeamManagementScreen() {
  const router = useRouter();
  const { partner, isAuthenticated } = usePartnerAuthStore();
  const currentRole = partner?.role;
  const canView = currentRole === "owner";
  const canCreate = currentRole === "owner";
  const canUpdate = currentRole === "owner";

  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");


  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    try {
      const [overviewRes, membersRes] = await Promise.all([
        partnerDashboardAPI.getOverview(),
        canView ? partnerStaffAPI.getMembers() : Promise.resolve({ data: {} }),
      ]);

      setPendingCount(overviewRes.data?.overview?.pendingOrders || 0);
      if (canView) {
        setMembers((membersRes as any).data?.staff || []);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Không thể tải danh sách nhân sự";
      Alert.alert("Lỗi", message);
    } finally {
      setIsLoading(false);
    }
  }, [canView, isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (isAuthenticated && !canView) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, canView, router]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!canCreate) {
      Alert.alert("Không có quyền", "Bạn không có quyền tạo nhân sự.");
      return;
    }
    if (!fullName.trim() || !email.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập họ tên và email.");
      return;
    }
    try {
      setIsCreating(true);
      const res = await partnerStaffAPI.createMember({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
      });

      const created = res?.data?.staff;
      const delivery = res?.data?.delivery;
      if (created?._id) {
        setMembers((prev) => [created, ...prev]);
      }
      setFullName("");
      setEmail("");
      setRole("staff");

      Alert.alert(
        "Tạo tài khoản thành công",
        delivery?.message ||
          "Hệ thống đã tạo tài khoản và gửi thông tin đăng nhập cho nhân sự.",
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Không thể tạo tài khoản nhân sự";
      Alert.alert("Tạo thất bại", message);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleMemberStatus = async (item: StaffMember) => {
    if (!canUpdate) {
      Alert.alert("Không có quyền", "Bạn không có quyền cập nhật nhân sự.");
      return;
    }
    try {
      await partnerStaffAPI.updateMember(item._id, { isActive: !item.isActive });
      setMembers((prev) =>
        prev.map((m) =>
          m._id === item._id ? { ...m, isActive: !item.isActive } : m,
        ),
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Không thể cập nhật trạng thái";
      Alert.alert("Lỗi", message);
    }
  };

  const deleteMember = async (item: StaffMember) => {
    if (!canUpdate) {
      Alert.alert("Không có quyền", "Bạn không có quyền xóa nhân sự.");
      return;
    }
    Alert.alert("Xóa nhân viên", `Xóa ${item.ownerName || item.email}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await partnerStaffAPI.deleteStaff(item._id);
            Alert.alert("Đã xóa", `Đã xóa ${item.ownerName || item.email}`);
            loadStaff();
          } catch (error: any) {
            Alert.alert("Lỗi", error?.response?.data?.message || "Không thể xóa nhân viên");
          }
        },
      },
    ]);
  };


  if (!isAuthenticated || !canView) {
    return null;
  }

  return (
    <>
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Quản lý nhân sự nhà hàng</Text>
        <Text style={styles.subtitle}>
          Tạo tài khoản Manager/Staff và gửi thông tin đăng nhập tự động.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tạo tài khoản mới</Text>

          <TextInput
            style={styles.input}
            placeholder="Họ và tên"
            value={fullName}
            onChangeText={setFullName}
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            style={styles.input}
            placeholder="Email đăng nhập"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor="#9CA3AF"
          />
          <View style={styles.segmentRow}>
            {(["manager", "staff"] as StaffRole[]).map((itemRole) => {
              const active = role === itemRole;
              return (
                <TouchableOpacity
                  key={itemRole}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  onPress={() => setRole(itemRole)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      active && styles.segmentTextActive,
                    ]}
                  >
                    {itemRole === "manager" ? "Quản lý" : "Nhân viên"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.createBtn, isCreating && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={16} color="#fff" />
                <Text style={styles.createBtnText}>Tạo tài khoản nhân sự</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.listTitle}>Danh sách quản lý & nhân viên</Text>
        <FlatList
          data={members}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            isLoading ? null : (
              <Text style={styles.emptyText}>Chưa có tài khoản nhân sự nào.</Text>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.memberCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{item.fullName}</Text>
                <Text style={styles.memberMeta}>{item.email}</Text>
                <Text style={styles.memberMeta}>
                  Vai trò: {item.role === "manager" ? "Quản lý" : "Nhân viên"}
                </Text>
              </View>

              <View style={styles.memberActions}>
                <TouchableOpacity
                  style={[styles.smallBtn, styles.deleteBtn]}
                  onPress={() => deleteMember(item)}
                >
                  <Text style={styles.deleteBtnText}>Xóa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.smallBtn,
                    item.isActive ? styles.disableBtn : styles.enableBtn,
                  ]}
                  onPress={() => toggleMemberStatus(item)}
                >
                  <Text style={styles.smallBtnText}>
                    {item.isActive ? "Khóa" : "Mở"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      <PartnerBottomNav pendingCount={pendingCount} />
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  container: { flex: 1, padding: 16, paddingBottom: 0 },
  title: { fontSize: 22, fontWeight: "900", color: "#111827" },
  subtitle: { marginTop: 4, marginBottom: 12, color: "#6B7280", fontSize: 13 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: "#111827", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
    fontSize: 13,
    marginBottom: 8,
  },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  segmentBtnActive: { backgroundColor: "#FFF3ED", borderColor: "#FF6B35" },
  segmentText: { fontSize: 12, color: "#6B7280", fontWeight: "700" },
  segmentTextActive: { color: "#FF6B35" },
  createBtn: {
    marginTop: 2,
    borderRadius: 10,
    backgroundColor: "#FF6B35",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  createBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  listTitle: { fontSize: 14, fontWeight: "800", color: "#111827", marginBottom: 8 },
  memberCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    gap: 10,
  },
  memberName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  memberMeta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  memberActions: { justifyContent: "space-between" },
  smallBtn: {
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  smallBtnText: { fontSize: 11, color: "#374151", fontWeight: "700" },
  disableBtn: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  enableBtn: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  deleteBtn: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  deleteBtnText: { fontSize: 11, color: "#DC2626", fontWeight: "700" },
  emptyText: { color: "#9CA3AF", textAlign: "center", marginTop: 12, marginBottom: 20 },
});
