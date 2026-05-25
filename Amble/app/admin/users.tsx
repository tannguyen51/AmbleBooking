import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminTheme } from "../../constants/adminTheme";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import { AdminHeader } from "../../components/admin/AdminHeader";
import AdminCard from "../../components/admin/AdminCard";
import { AdminSegmented } from "../../components/admin/AdminSegmented";

interface AdminUser {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: "customer" | "admin";
  isActive: boolean;
}

const ROLE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "customer", label: "Khách" },
  { value: "admin", label: "Admin" },
] as const;

const ACTIVE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Hoạt động" },
  { value: "locked", label: "Đã khóa" },
] as const;

export default function AdminUsersScreen() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "customer" | "admin">(
    "all",
  );
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "locked"
  >("all");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const limit = 20;

  const loadUsers = async (reset = false) => {
    setLoading(true);
    try {
      const nextPage = reset ? 1 : page;
      const res = await adminAPI.getUsers({
        search,
        role: roleFilter === "all" ? undefined : roleFilter,
        isActive:
          activeFilter === "all"
            ? undefined
            : activeFilter === "active",
        page: nextPage,
        limit,
      });
      const list = res.data?.users || [];
      const total = Number(res.data?.total || 0);
      const merged = reset ? list : [...users, ...list];

      setUsers(merged);
      setPage(nextPage);
      setHasMore(merged.length < total);
    } catch {
      if (reset) setUsers([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(true);
  }, [roleFilter, activeFilter]);

  const toggleActive = async (user: AdminUser) => {
    try {
      await adminAPI.setUserActive(user._id, !user.isActive);
      await loadUsers();
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không cập nhật");
    }
  };

  const toggleRole = async (user: AdminUser) => {
    const nextRole = user.role === "admin" ? "customer" : "admin";
    try {
      await adminAPI.setUserRole(user._id, nextRole);
      await loadUsers();
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không cập nhật");
    }
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="Users" subtitle="Quản lý tài khoản khách hàng" showBack={false} />

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={adminTheme.colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên, email, sđt"
          placeholderTextColor={adminTheme.colors.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => loadUsers(true)}
        />
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => loadUsers(true)}
        >
          <Ionicons name="refresh" size={16} color={adminTheme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Vai trò</Text>
        <AdminSegmented
          options={ROLE_OPTIONS}
          value={roleFilter}
          onChange={setRoleFilter}
        />
      </View>

      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Trạng thái</Text>
        <AdminSegmented
          options={ACTIVE_OPTIONS}
          value={activeFilter}
          onChange={setActiveFilter}
        />
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
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => loadUsers(false)}
                disabled={loading}
              >
                <Text style={styles.loadMoreText}>Tải thêm</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <AdminCard style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.fullName}</Text>
                <StatusPill
                  label={item.isActive ? "Hoạt Động" : "Bị Khóa"}
                  tone={item.isActive ? "success" : "danger"}
                />
              </View>
              <Text style={styles.meta}>{item.email}</Text>
              {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}

              <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionGhost]}
                        onPress={() => toggleActive(item)}
                      >
                        <Text style={styles.actionText}>
                          {item.isActive ? "Khóa" : "Mở khóa"}
                        </Text>
                      </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionPrimary]}
                  onPress={() => toggleRole(item)}
                >
                  <Text style={styles.actionTextPrimary}>
                    {item.role === "admin" ? "Bỏ Admin" : "Set Admin"}
                  </Text>
                </TouchableOpacity>
              </View>
            </AdminCard>
          )}
        />
      )}

      <AdminBottomNav />
    </View>
  );
}

function StatusPill({ label, tone }: { label: string; tone: "success" | "danger" }) {
  return (
    <View
      style={[
        styles.pill,
        tone === "success" ? styles.pillSuccess : styles.pillDanger,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          tone === "success" ? styles.pillTextSuccess : styles.pillTextDanger,
        ]}
      >
        {label}
      </Text>
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
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: adminTheme.colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
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
  loadMoreBtn: {
    marginTop: 4,
    marginBottom: 16,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: adminTheme.colors.surfaceVariant,
  },
  loadMoreText: {
    fontSize: 11,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
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
    marginBottom: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  meta: {
    fontSize: 12,
    color: adminTheme.colors.muted,
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
  actionGhost: {
    backgroundColor: adminTheme.colors.surfaceLow,
  },
  actionPrimary: {
    backgroundColor: adminTheme.colors.primary,
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
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pillSuccess: {
    backgroundColor: adminTheme.colors.success,
  },
  pillDanger: {
    backgroundColor: adminTheme.colors.danger,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  pillTextSuccess: {
    color: "#FFFFFF",
  },
  pillTextDanger: {
    color: "#FFFFFF",
  },
});
