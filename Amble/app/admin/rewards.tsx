import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminTheme } from "../../constants/adminTheme";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import { AdminHeader } from "../../components/admin/AdminHeader";
import AdminCard from "../../components/admin/AdminCard";

interface RewardUser {
  _id: string;
  fullName: string;
  email: string;
  rewardPoints?: number;
}

export default function AdminRewardsScreen() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<RewardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RewardUser | null>(null);
  const [form, setForm] = useState({
    points: "",
    title: "",
    type: "earn" as "earn" | "redeem",
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers({ search });
      setUsers(res.data?.users || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openAdjust = (user: RewardUser) => {
    setSelectedUser(user);
    setForm({ points: "", title: "", type: "earn" });
    setModalVisible(true);
  };

  const submitAdjust = async () => {
    if (!selectedUser) return;
    const points = Number(form.points);
    if (!Number.isFinite(points)) {
      Alert.alert("Lỗi", "Điểm phải là số");
      return;
    }
    if (!form.title.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do");
      return;
    }

    try {
      await adminAPI.adjustUserRewards(selectedUser._id, {
        points,
        title: form.title.trim(),
        type: form.type,
      });
      setModalVisible(false);
      await loadUsers();
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không cập nhật");
    }
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="Điểm Thưởng" subtitle="Điều chỉnh điểm tích lũy" />

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={adminTheme.colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm user"
          placeholderTextColor={adminTheme.colors.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadUsers}
        />
        <TouchableOpacity style={styles.refreshBtn} onPress={loadUsers}>
          <Ionicons name="refresh" size={16} color={adminTheme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={adminTheme.colors.onSurface} />
          <Text style={styles.loadingText}>Đang tải danh sách...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <AdminCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.fullName}</Text>
                <Text style={styles.points}>{item.rewardPoints ?? 0} pts</Text>
              </View>
              <Text style={styles.meta}>{item.email}</Text>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => openAdjust(item)}
              >
                <Text style={styles.actionText}>Điều chỉnh điểm</Text>
              </TouchableOpacity>
            </AdminCard>
          )}
        />
      )}

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Điều chỉnh điểm</Text>
            <Text style={styles.modalSubtitle}>
              {selectedUser?.fullName || ""}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Số điểm (+/-)"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={form.points}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, points: value }))
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Lý do"
              placeholderTextColor="#94A3B8"
              value={form.title}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, title: value }))
              }
            />
            <View style={styles.typeRow}>
              {(["earn", "redeem"] as const).map((type) => {
                const typeLabel = type === "earn" ? "Cộng Điểm" : "Dùng Điểm";
                const isActive = form.type === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeBtn, isActive && styles.typeBtnActive]}
                    onPress={() =>
                      setForm((prev) => ({ ...prev, type: type as any }))
                    }
                  >
                    <Text
                      style={[
                        styles.typeText,
                        isActive && styles.typeTextActive,
                      ]}
                    >
                      {typeLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalGhost]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalGhostText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalPrimary]}
                onPress={submitAdjust}
              >
                <Text style={styles.modalPrimaryText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AdminBottomNav />
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
    paddingVertical: 10,
    borderRadius: 14,
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
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: adminTheme.colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
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
    paddingVertical: 16,
    gap: 12,
  },
  card: {
    backgroundColor: adminTheme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  points: {
    fontSize: 12,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  meta: {
    fontSize: 12,
    color: adminTheme.colors.muted,
  },
  actionBtn: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: adminTheme.colors.primary,
    alignItems: "center",
  },
  actionText: {
    fontSize: 11,
    fontWeight: "700",
    color: adminTheme.colors.onPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
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
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    backgroundColor: adminTheme.colors.background,
  },
  typeBtnActive: {
    backgroundColor: adminTheme.colors.onSurface,
    borderColor: adminTheme.colors.onSurface,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "600",
    color: adminTheme.colors.onSurface,
  },
  typeTextActive: {
    color: adminTheme.colors.onPrimary,
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
});
