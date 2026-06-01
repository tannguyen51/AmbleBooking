import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useFavoritesStore } from "../store/favoritesStore";
import { useTranslation } from "../i18n/useTranslation";

const PRIMARY = "#FF6B35";
const BG = "#FAFAFA";
const SURFACE = "#FFFFFF";
const TEXT = "#1A1A1A";
const TEXT_MUTED = "#9CA3AF";
const FALLBACK =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80";

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavoriteWithServer = useFavoritesStore(
    (state) => state.toggleFavoriteWithServer,
  );
  const syncFavoritesFromServer = useFavoritesStore(
    (state) => state.syncFavoritesFromServer,
  );

  React.useEffect(() => {
    syncFavoritesFromServer();
  }, [syncFavoritesFromServer]);

  return (
    <SafeAreaView style={s.container} edges={["left", "right"]}>
      <View style={[s.header, { paddingTop: 12 + insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={s.title}>{t("favorites.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {favorites.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={{ fontSize: 54 }}>💛</Text>
          <Text style={s.emptyTitle}>{t("favorites.emptyTitle")}</Text>
          <Text style={s.emptyText}>
            {t("favorites.emptySubtitle")}
          </Text>
          <TouchableOpacity
            style={s.exploreBtn}
            onPress={() => router.push("/(tabs)/explore")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#FF6B35", "#FFD700"]}
              style={s.exploreBtnInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={s.exploreBtnText}>{t("favorites.goExplore")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.9}
              onPress={() => router.push(`/restaurant/${item._id}` as any)}
            >
              <Image
                source={{ uri: item.images?.[0] || FALLBACK }}
                style={s.image}
                resizeMode="cover"
              />

              <View style={s.cardBody}>
                <View style={s.cardTop}>
                  <Text style={s.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <TouchableOpacity
                    style={s.heartBtn}
                    onPress={() =>
                      toggleFavoriteWithServer(item).catch(() => {})
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons name="heart" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <Text style={s.meta} numberOfLines={1}>
                  {item.cuisine || t("favorites.cuisineFallback")}
                  {item.priceRange ? ` • ${item.priceRange}` : ""}
                </Text>
                <Text style={s.location} numberOfLines={1}>
                  {item.location || item.city || t("favorites.addressFallback")}
                </Text>

                <View style={s.bottomRow}>
                  <View style={s.ratingRow}>
                    <Ionicons name="star" size={13} color="#F59E0B" />
                    <Text style={s.rating}>
                      {(item.rating ?? 0).toFixed(1)}
                    </Text>
                    <Text style={s.review}>({item.reviewCount ?? 0})</Text>
                  </View>
                  <Text style={s.hours}>
                    {item.openTime && item.closeTime
                      ? `${item.openTime} - ${item.closeTime}`
                      : t("favorites.hoursFallback")}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "800", color: TEXT },

  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  image: { width: "100%", height: 160 },
  cardBody: { padding: 12 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  name: { flex: 1, fontSize: 17, fontWeight: "800", color: TEXT },
  heartBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  meta: { fontSize: 13, color: "#6B7280", marginBottom: 2 },
  location: { fontSize: 13, color: TEXT_MUTED, marginBottom: 10 },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  rating: { fontSize: 13, fontWeight: "700", color: TEXT },
  review: { fontSize: 12, color: TEXT_MUTED },
  hours: { fontSize: 12, color: TEXT_MUTED },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: TEXT_MUTED,
    textAlign: "center",
  },
  exploreBtn: {
    marginTop: 20,
    borderRadius: 14,
    overflow: "hidden",
  },
  exploreBtnInner: {
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  exploreBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
