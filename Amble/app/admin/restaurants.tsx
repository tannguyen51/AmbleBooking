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

interface RestaurantItem {
  _id: string;
  name: string;
  city?: string;
  cuisine?: string;
  isActive: boolean;
  isFeatured: boolean;
}

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
      const nextPage = reset ? 1 : page;
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
      const merged = reset ? list : [...restaurants, ...list];
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
      await loadRestaurants();
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không cập nhật");
    }
  };

  const toggleActive = async (item: RestaurantItem) => {
    try {
      await adminAPI.setRestaurantActive(item._id, !item.isActive);
      await loadRestaurants();
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không cập nhật");
    }
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="Nhà hàng" subtitle="Kiểm duyệt nội dung" />

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
          placeholder="City"
          placeholderTextColor="#94A3B8"
          value={city}
          onChangeText={setCity}
          onSubmitEditing={() => loadRestaurants(true)}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Cuisine"
          placeholderTextColor="#94A3B8"
          value={cuisine}
          onChangeText={setCuisine}
          onSubmitEditing={() => loadRestaurants(true)}
        />
      </View>

      <View style={styles.chipRow}>
        {(["all", "active", "inactive"] as const).map((item) => {
          const isActive = activeFilter === item;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(item)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
        {(["all", "featured", "normal"] as const).map((item) => {
          const isActive = featuredFilter === item;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setFeaturedFilter(item)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
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
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.city || "-"} • {item.cuisine || "-"}
              </Text>

              <View style={styles.badgeRow}>
                <Badge label={item.isActive ? "active" : "inactive"} />
                {item.isFeatured ? <Badge label="featured" tone="info" /> : null}
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

function Badge({ label, tone = "default" }: { label: string; tone?: "default" | "info" }) {
  return (
    <View style={[styles.badge, tone === "info" && styles.badgeInfo]}>
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
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: adminTheme.colors.onSurface,
    backgroundColor: adminTheme.colors.surface,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    backgroundColor: adminTheme.colors.surface,
  },
  filterChipActive: {
    backgroundColor: adminTheme.colors.onSurface,
    borderColor: adminTheme.colors.onSurface,
  },
  filterChipText: {
    fontSize: 11,
    color: adminTheme.colors.onSurface,
    fontWeight: "600",
  },
  filterChipTextActive: {
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
    paddingVertical: 16,
    gap: 12,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: adminTheme.colors.surfaceVariant,
  },
  badgeInfo: {
    backgroundColor: adminTheme.colors.surfaceContainer,
  },
  badgeText: {
    fontSize: 10,
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
