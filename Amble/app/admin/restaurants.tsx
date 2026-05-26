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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminTheme } from "../../constants/adminTheme";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import { AdminHeader } from "../../components/admin/AdminHeader";
import AdminCard from "../../components/admin/AdminCard";
import { AdminSegmented } from "../../components/admin/AdminSegmented";

interface RestaurantItem {
  _id: string;
  name: string;
  city?: string;
  cuisine?: string;
  images?: string[];
  isActive: boolean;
  isFeatured: boolean;
}

const STATUS_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Đang ẩn" },
] as const;

const FEATURE_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "featured", label: "Nổi bật" },
  { value: "normal", label: "Thường" },
] as const;

export default function AdminRestaurantsScreen() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [featuredFilter, setFeaturedFilter] = useState<
    "all" | "featured" | "normal"
  >("all");
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const limit = 20;

  const loadRestaurants = async (reset = false) => {
    setLoading(true);
    try {
      const nextPage = reset ? 1 : page + 1;
      const res = await adminAPI.getRestaurants({
        search: search || undefined,
        city: city || undefined,
        cuisine: cuisine || undefined,
        isActive:
          activeFilter === "all" ? undefined : activeFilter === "active",
        isFeatured:
          featuredFilter === "all"
            ? undefined
            : featuredFilter === "featured",
        page: nextPage,
        limit,
      } as any);
      const list = res.data?.restaurants || [];
      const total = Number(res.data?.total || 0);
      const mergedBase = reset ? list : [...restaurants, ...list];
      const merged = mergedBase.filter(
        (item: RestaurantItem, index: number, arr: RestaurantItem[]) =>
          arr.findIndex((x: RestaurantItem) => x._id === item._id) === index,
      );
      setRestaurants(merged);
      setPage(nextPage);
      setHasMore(merged.length < total);
    } catch {
      if (reset) setRestaurants([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRestaurants(true);
  }, [activeFilter, featuredFilter]);

  const toggleFeatured = async (item: RestaurantItem) => {
    try {
      await adminAPI.setRestaurantFeatured(item._id, !item.isFeatured);
      await loadRestaurants(true);
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không cập nhật");
    }
  };

  const toggleActive = async (item: RestaurantItem) => {
    try {
      await adminAPI.setRestaurantActive(item._id, !item.isActive);
      await loadRestaurants(true);
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không cập nhật");
    }
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="Nhà hàng" subtitle="Kiểm duyệt nội dung" showBack={false} />

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={adminTheme.colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm nhà hàng"
          placeholderTextColor={adminTheme.colors.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => loadRestaurants(true)}
        />
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => loadRestaurants(true)}
        >
          <Ionicons name="refresh" size={16} color={adminTheme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <TextInput
          style={styles.filterInput}
          placeholder="Thành Phố"
          placeholderTextColor="#94A3B8"
          value={city}
          onChangeText={setCity}
          onSubmitEditing={() => loadRestaurants(true)}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Loại Ẩm Thực"
          placeholderTextColor="#94A3B8"
          value={cuisine}
          onChangeText={setCuisine}
          onSubmitEditing={() => loadRestaurants(true)}
        />
      </View>

      <View style={styles.filterGroupWrap}>
        <Text style={styles.filterGroupTitle}>Trạng thái</Text>
        <AdminSegmented
          options={STATUS_FILTERS}
          value={activeFilter}
          onChange={setActiveFilter}
        />
      </View>

      <View style={styles.filterGroupWrap}>
        <Text style={styles.filterGroupTitle}>Hiển thị</Text>
        <AdminSegmented
          options={FEATURE_FILTERS}
          value={featuredFilter}
          onChange={setFeaturedFilter}
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={adminTheme.colors.onSurface} />
          <Text style={styles.loadingText}>Đang tải danh sách...</Text>
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => loadRestaurants(false)}
                disabled={loading}
              >
                <Text style={styles.loadMoreText}>Tải thêm</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <AdminCard style={styles.card}>
              {item.images?.[0] ? (
                <Image source={{ uri: item.images[0] }} style={styles.coverImage} />
              ) : null}
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.city || "-"} • {item.cuisine || "-"}
              </Text>

              <View style={styles.badgeRow}>
                <Badge
                  label={item.isActive ? "Active" : "Inactive"}
                  tone={item.isActive ? "success" : "danger"}
                />
                {item.isFeatured ? <Badge label="Featured" tone="info" /> : null}
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionGhost]}
                  onPress={() => toggleActive(item)}
                >
                  <Text style={styles.actionText}>
                    {item.isActive ? "Ẩn" : "Hiện"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionPrimary]}
                  onPress={() => toggleFeatured(item)}
                >
                  <Text style={styles.actionTextPrimary}>
                    {item.isFeatured ? "Bỏ nổi bật" : "Gắn nổi bật"}
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

function Badge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "info" | "success" | "danger";
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === "info" && styles.badgeInfo,
        tone === "success" && styles.badgeSuccess,
        tone === "danger" && styles.badgeDanger,
      ]}
    >
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
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: adminTheme.colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: adminTheme.colors.onSurface,
    backgroundColor: adminTheme.colors.surface,
  },
  filterGroupWrap: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  filterGroupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: adminTheme.colors.muted,
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
  coverImage: {
    width: "100%",
    height: 132,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: adminTheme.colors.surfaceVariant,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  meta: {
    fontSize: 12,
    color: adminTheme.colors.muted,
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
    backgroundColor: "#DBEAFE",
  },
  badgeSuccess: {
    backgroundColor: "#DCFCE7",
  },
  badgeDanger: {
    backgroundColor: "#FEE2E2",
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
});
