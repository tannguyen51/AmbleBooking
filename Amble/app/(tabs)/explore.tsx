import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuthStore } from "../../store/authStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { restaurantAPI } from "../../services/api";
import { useTranslation } from "../../i18n/useTranslation";

// ─── Design tokens ────────────────────────────────────────
const PRIMARY = "#FF6B35";
const GRAD: [string, string] = ["#FF6B35", "#FFD700"];
const BG = "#FAFAFA";
const SURFACE = "#FFFFFF";
const TEXT = "#1A1A1A";
const TEXT_SEC = "#6B7280";
const TEXT_MUTED = "#9CA3AF";
const BORDER = "#F3F4F6";

const PRICE_COLOR: Record<string, string> = {
  $: "#22C55E",
  $$: "#FF6B35",
  $$$: "#9333EA",
};

// ─── Filter options ───────────────────────────────────────
const PRICE_OPTIONS = ["$", "$$", "$$$"];
const SORT_OPTIONS = [
  { key: "rating", labelKey: "home.sortRating" },
  { key: "reviews", labelKey: "home.sortReviews" },
  { key: "name", labelKey: "home.sortName" },
] as const;
const QUICK_TAGS = ["Món Việt", "Đồ Âu", "Rooftop", "Nhật Bản", "Lẩu nướng"];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  local: ["local", "gan day", "gần đây", "near"],
  date: ["date", "hen ho", "hẹn hò", "romantic", "couple"],
  family: ["family", "gia dinh", "gia đình"],
  business: ["business", "cong viec", "công việc", "meeting"],
  group: ["group", "nhom ban", "nhóm bạn", "friends"],
  celebration: ["celebration", "sinh nhat", "sinh nhật", "birthday"],
};

interface Restaurant {
  _id: string;
  name: string;
  cuisine: string;
  location: string;
  city: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  images: string[];
  tags: string[];
  categories: string[];
  openTime: string;
  closeTime: string;
  hasParking: boolean;
  isFeatured: boolean;
}

const FALLBACK =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// ═══════════════════════════════════════════════
//  CARD
// ═══════════════════════════════════════════════
const RestaurantCard = ({
  item,
  favoriteIds,
  onToggleFav,
}: {
  item: Restaurant;
  favoriteIds: string[];
  onToggleFav: (restaurant: Restaurant) => void;
}) => {
  const isFav = favoriteIds.includes(item._id);
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => router.push(`/restaurant/${item._id}`)}
    >
      <View style={styles.imageWrap}>
        {item.images?.[0] ? (
          <Image
            source={{ uri: item.images[0] }}
            style={styles.image}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="restaurant-outline" size={36} color="#D1D5DB" />
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.6)"]}
          style={StyleSheet.absoluteFillObject}
        />

        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => onToggleFav(item)}
        >
          <Ionicons
            name={isFav ? "heart" : "heart-outline"}
            size={20}
            color={isFav ? "#EF4444" : "#374151"}
          />
        </TouchableOpacity>

        <View style={styles.overlay}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.subRow}>
            <Text style={styles.cuisine}>{item.cuisine}</Text>
            <Text style={styles.dot}>•</Text>
            <Text
              style={[
                styles.price,
                { color: PRICE_COLOR[item.priceRange] || PRIMARY },
              ]}
            >
              {item.priceRange}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.info}>
        <View style={styles.row}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.review}>({item.reviewCount})</Text>
          </View>
          <View style={styles.cityRow}>
            <Ionicons name="location-outline" size={12} color={TEXT_MUTED} />
            <Text style={styles.city}>{item.city}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="location-sharp" size={12} color={TEXT_SEC} />
          <Text style={styles.location} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={12} color={TEXT_MUTED} />
          <Text style={styles.time}>
            {item.openTime} - {item.closeTime}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════
//  EXPLORE SCREEN
// ═══════════════════════════════════════════════
export default function ExploreScreen() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    preset?: string;
    presetLabel?: string;
  }>();
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavoriteWithServer = useFavoritesStore(
    (state) => state.toggleFavoriteWithServer,
  );
  const syncFavoritesFromServer = useFavoritesStore(
    (state) => state.syncFavoritesFromServer,
  );
  const favoriteIds = favorites.map((item) => item._id);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  // Search & filter state
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activePrice, setActivePrice] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch ────────────────────────────────────
  const fetchRestaurants = useCallback(async () => {
    try {
      const res = await restaurantAPI.getAll();
      setRestaurants(res.data.restaurants || []);
    } catch (err) {
      if (__DEV__) console.log(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchRestaurants();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    syncFavoritesFromServer();
  }, [isAuthenticated, syncFavoritesFromServer]);

  useEffect(() => {
    const preset = Array.isArray(params.preset)
      ? params.preset[0]
      : params.preset;
    if (!preset) return;

    // Apply only category-based preset filter; avoid setting search text,
    // otherwise both conditions are combined and can hide valid results.
    setQuery("");
    setActivePrice(null);
    setActiveSort(null);
    setShowFilters(false);

    if (preset === "local") {
      setActiveTag(null);
      setActiveSort("reviews");
      return;
    }

    setActiveTag(preset);
  }, [params.preset]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRestaurants();
  };

  // ── Toggle favourite ─────────────────────────
  const toggleFav = (restaurant: Restaurant) => {
    toggleFavoriteWithServer(restaurant).catch(() => {});
  };

  // ── Derived: filter + sort ───────────────────
  const filtered = (() => {
    let list = [...restaurants];

    // 1. Search theo tên
    if (query.trim()) {
      const q = normalizeText(query);
      list = list.filter(
        (r) =>
          normalizeText(r.name || "").includes(q) ||
          normalizeText(r.cuisine || "").includes(q) ||
          normalizeText(r.city || "").includes(q),
      );
    }

    // 2. Filter theo tag (cuisine hoặc tags[])
    if (activeTag) {
      const tag = normalizeText(activeTag);
      const keywords = CATEGORY_KEYWORDS[tag] || [tag];
      list = list.filter((r) => {
        const cuisine = normalizeText(r.cuisine || "");
        const categories = (r.categories || []).map((c) => normalizeText(c));
        const tags = (r.tags || []).map((t) => normalizeText(t));
        return keywords.some((k) => {
          const key = normalizeText(k);
          return (
            cuisine.includes(key) ||
            categories.some((c) => c.includes(key)) ||
            tags.some((t) => t.includes(key))
          );
        });
      });
    }

    // 3. Filter theo price range
    if (activePrice) {
      list = list.filter((r) => r.priceRange === activePrice);
    }

    // 4. Sort
    if (activeSort === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (activeSort === "reviews") {
      list.sort((a, b) => b.reviewCount - a.reviewCount);
    } else if (activeSort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  })();

  const hasActiveFilter = !!activeTag || !!activePrice || !!activeSort;

  const clearFilters = () => {
    setQuery("");
    setActiveTag(null);
    setActivePrice(null);
    setActiveSort(null);
  };

  // ── Render ───────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* ── HEADER ─────────────────────────────── */}
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <Text style={styles.title}>{t("explore.title")}</Text>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={TEXT_MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("explore.searchPlaceholder")}
            placeholderTextColor={TEXT_MUTED}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close" size={18} color={TEXT_MUTED} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Result count ────────────────────────── */}
      <View style={styles.resultRow}>
        <Text style={styles.resultText}>{t("explore.resultCount", { count: filtered.length })}</Text>
        {hasActiveFilter && (
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearInline}>{t("explore.clearFilter")} ✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── LIST ────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PRIMARY]}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>{t("explore.emptyTitle")}</Text>
              <Text style={styles.emptyText}>{t("explore.emptyText")}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <RestaurantCard
            item={item}
            favoriteIds={favoriteIds}
            onToggleFav={toggleFav}
          />
        )}
      />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  title: { fontSize: 22, fontWeight: "800", color: TEXT, marginBottom: 12 },

  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Quick tags
  tagsRow: { gap: 8, paddingRight: 4 },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: SURFACE,
  },
  tagChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  tagText: { fontSize: 12, fontWeight: "600", color: TEXT_SEC },
  tagTextActive: { color: "#fff" },

  // Filter panel
  filterPanel: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_MUTED,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: SURFACE,
  },
  filterChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  filterChipText: { fontSize: 13, color: TEXT_SEC, fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },
  clearBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  clearBtnText: { fontSize: 13, color: "#EF4444", fontWeight: "700" },
  favoritePageBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    marginBottom: 12,
  },
  favoritePageBtnText: { fontSize: 13, color: "#fff", fontWeight: "700" },

  // Result row
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultText: { fontSize: 13, color: TEXT_MUTED },
  clearInline: { fontSize: 13, color: PRIMARY, fontWeight: "700" },

  // List
  list: { padding: 16 },

  // Card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  imageWrap: { height: 190 },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  favBtn: {
    position: "absolute",
    right: 10,
    top: 10,
    backgroundColor: "#fff",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: { position: "absolute", bottom: 12, left: 12 },
  name: { color: "#fff", fontSize: 16, fontWeight: "700" },
  subRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cuisine: { color: "#fff", fontSize: 12 },
  dot: { color: "#fff" },
  price: { fontSize: 12, fontWeight: "700" },
  info: { padding: 12 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  rating: { fontWeight: "700", fontSize: 13 },
  review: { fontSize: 12, color: TEXT_MUTED },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  city: { fontSize: 12, color: TEXT_MUTED },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  location: { fontSize: 12, color: TEXT_SEC },
  time: { fontSize: 12, color: TEXT_MUTED },

  // Empty
  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: TEXT, marginTop: 14 },
  emptyText: { fontSize: 13, color: TEXT_MUTED, marginTop: 6 },
});
