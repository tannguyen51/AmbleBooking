import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  TextInput,
  StatusBar,
  Modal,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { restaurantAPI } from "../../services/api";
import { Ionicons } from "@expo/vector-icons";
import MunchMapLogo from "../../components/AmbleLogo";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "../../i18n/useTranslation";

type IconName = keyof typeof Ionicons.glyphMap;

// ─── Design tokens ────────────────────────────────────────
const PRIMARY = "#FF6B35";
const GRAD: [string, string] = ["#FF6B35", "#FFD700"];
const LOGO_TEXT = "#FF8C42";
const BG = "#FAFAFA";
const SURFACE = "#FFFFFF";
const TEXT = "#1A1A1A";
const TEXT_SEC = "#6B7280";
const TEXT_MUTED = "#9CA3AF";

const PRICE_COLOR: Record<string, string> = {
  $: "#22C55E",
  $$: "#FF6B35",
  $$$: "#9333EA",
};

// ─── Types ────────────────────────────────────────────────
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
  subscriptionPackage: "basic" | "pro" | "premium";
}

interface Category {
  icon: IconName;
  label: string;
  key: string;
}

type FilterState = {
  locationMode: "nearby" | "district" | "place" | null;
  district: string;
  place: string;
  distance: string | null;
  date: string;
  time: string;
  people: number;
  availableNow: boolean;
  priceRanges: string[];
  purposes: string[];
  ratings: number[];
  quickTags: string[];
  sort: string | null;
};

const CATEGORY_PRESET_LABEL: Record<string, string> = {
  local: "Gần đây",
  date: "Hẹn hò",
  family: "Gia đình",
  business: "Công việc",
  group: "Nhóm bạn",
  celebration: "Sinh nhật",
};

// ─── Constants ────────────────────────────────────────────
const CATEGORIES: Category[] = [
  { icon: "home", label: "Gần đây", key: "local" },
  { icon: "heart", label: "Hẹn hò", key: "date" },
  { icon: "people", label: "Gia đình", key: "family" },
  { icon: "briefcase", label: "Công việc", key: "business" },
  { icon: "people-circle", label: "Nhóm bạn", key: "group" },
  { icon: "gift", label: "Sinh nhật", key: "celebration" },
];

const QUICK_TAGS = ["Món Việt", "Đồ Âu", "Rooftop", "Nhật Bản", "Lẩu nướng"];

const PRICE_OPTIONS = [
  "Dưới 100k/người",
  "100k – 300k/người",
  "300k – 500k/người",
  "Trên 500k/người",
];

const PRICE_MAP: Record<string, string[]> = {
  "Dưới 100k/người": ["$"],
  "100k – 300k/người": ["$$"],
  "300k – 500k/người": ["$$$"],
  "Trên 500k/người": ["$$$"],
};

const DISTANCE_OPTIONS = ["Dưới 1km", "Dưới 3km", "Dưới 5km"];

const PURPOSE_OPTIONS = [
  "Hẹn hò",
  "Sinh nhật",
  "Đi gia đình",
  "Họp mặt bạn bè",
  "Làm việc / học bài",
  "Business Meeting",
  "Chill / Sống ảo",
  "Fine Dining",
];

const RATING_OPTIONS = [5, 4, 3, 2, 1];

const SORT_OPTIONS = [
  { key: "rating", label: "Đánh giá cao nhất" },
  { key: "reviews", label: "Nhiều đánh giá nhất" },
  { key: "name", label: "Tên A-Z" },
];

const FALLBACK =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80";

// ═══════════════════════════════════════════════════════════
//  RestaurantCardFull
// ═══════════════════════════════════════════════════════════
const RestaurantCardFull = React.memo(
  ({
    item,
    favoriteIds,
    onToggleFav,
    badgeFeaturedText = "Yêu thích",
    badgeTrendingText = "Xu hướng",
    parkingText = "Có bãi đậu xe",
    reviewFormat,
  }: {
    item: Restaurant;
    favoriteIds: string[];
    onToggleFav: (restaurant: Restaurant) => void;
    badgeFeaturedText?: string;
    badgeTrendingText?: string;
    parkingText?: string;
    reviewFormat?: (count: number) => string;
  }) => {
    const isFav = favoriteIds.includes(item._id);
    const router = useRouter();

    return (
      <TouchableOpacity
        style={cardFull.card}
        activeOpacity={0.88}
        onPress={() => router.push(`/restaurant/${item._id}`)}
      >
        <View style={cardFull.imageWrap}>
          <Image
            source={{ uri: item.images?.[0] || FALLBACK }}
            style={cardFull.image}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.62)"]}
            style={StyleSheet.absoluteFillObject}
          />

          {item.isFeatured && (
            <LinearGradient
              colors={GRAD}
              style={cardFull.badgeFeatured}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={cardFull.badgeText}>{badgeFeaturedText}</Text>
            </LinearGradient>
          )}
          {!item.isFeatured && item.subscriptionPackage === "premium" && (
            <LinearGradient
              colors={["#9333EA", "#6366F1"]}
              style={cardFull.badgeFeatured}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={cardFull.badgeText}>{badgeTrendingText}</Text>
            </LinearGradient>
          )}

          <TouchableOpacity
            style={cardFull.favBtn}
            onPress={() => onToggleFav(item)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={20}
              color={isFav ? "red" : "gray"}
            />
          </TouchableOpacity>

          <View style={cardFull.overlayBottom}>
            <Text style={cardFull.name} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={cardFull.subRow}>
              <Text style={cardFull.cuisine}>{item.cuisine}</Text>
              <Text style={cardFull.dot}>•</Text>
              <Text
                style={[
                  cardFull.price,
                  { color: PRICE_COLOR[item.priceRange] ?? PRIMARY },
                ]}
              >
                {item.priceRange}
              </Text>
            </View>
          </View>
        </View>

        <View style={cardFull.info}>
          <View style={cardFull.infoRow}>
            <View style={cardFull.ratingRow}>
              <Text style={{ fontSize: 13 }}>⭐</Text>
              <Text style={cardFull.ratingNum}>{item.rating.toFixed(1)}</Text>
              <Text style={cardFull.ratingCount}>
                ({reviewFormat ? reviewFormat(item.reviewCount) : `${item.reviewCount} đánh giá`})
              </Text>
            </View>
            <View style={cardFull.cityRow}>
              <Text style={cardFull.cityText}>{item.city}</Text>
            </View>
          </View>

          <View style={cardFull.metaRow}>
            <Text style={cardFull.metaLocation} numberOfLines={1}>
              {item.location || item.city}
            </Text>
            {item.hasParking && (
              <Text style={cardFull.parking}>{parkingText}</Text>
            )}
            <Text style={cardFull.hours}>
              {item.openTime}–{item.closeTime}
            </Text>
          </View>

          {item.tags?.length > 0 && (
            <View style={cardFull.tagsRow}>
              {item.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={cardFull.tag}>
                  <Text style={cardFull.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  },
);
//  RestaurantCardCompact
const RestaurantCardCompact = React.memo(
  ({
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
        style={cardCompact.card}
        activeOpacity={0.88}
        onPress={() => router.push(`/restaurant/${item._id}`)}
      >
        <View style={cardCompact.imageWrap}>
          <Image
            source={{ uri: item.images?.[0] || FALLBACK }}
            style={cardCompact.image}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.5)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={cardCompact.cuisineBadge}>
            <Text style={cardCompact.cuisineText} numberOfLines={1}>
              {item.cuisine}
            </Text>
          </View>
          <TouchableOpacity
            style={cardCompact.favBtn}
            onPress={() => onToggleFav(item)}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={16}
              color={isFav ? "red" : "gray"}
            />
          </TouchableOpacity>
        </View>

        <View style={cardCompact.info}>
          <Text style={cardCompact.name} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={cardCompact.ratingRow}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={cardCompact.rating}>{item.rating.toFixed(1)}</Text>
            <Text style={cardCompact.reviews}>({item.reviewCount})</Text>
          </View>
          <Text style={cardCompact.city} numberOfLines={1}>
            {item.city}
          </Text>
        </View>
      </TouchableOpacity>
    );
  },
);

// ═══════════════════════════════════════════════════════════
//  Section wrapper
// ═══════════════════════════════════════════════════════════
const Section = ({
  title,
  onViewAll,
  viewAllLabel,
  children,
}: {
  title: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
  children: React.ReactNode;
}) => (
  <View style={sec.wrap}>
    <View style={sec.header}>
      <Text style={sec.title}>{title}</Text>
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
          <Text style={sec.link}>{viewAllLabel || "Xem tất cả"}</Text>
        </TouchableOpacity>
      )}
    </View>
    {children}
  </View>
);

// ═══════════════════════════════════════════════════════════
//  Skeleton
// ═══════════════════════════════════════════════════════════
const SkeletonCard = () => (
  <View style={skeleton.card}>
    <View style={skeleton.image} />
    <View style={skeleton.body}>
      <View style={skeleton.line1} />
      <View style={skeleton.line2} />
      <View style={skeleton.line3} />
    </View>
  </View>
);
// ═══════════════════════════════════════════════════════════
//  HOME SCREEN
// ═══════════════════════════════════════════════════════════
export default function HomeScreen() {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const catLabelMap: Record<string, string> = {
    local: t("home.categoryNearby"),
    date: t("home.categoryDate"),
    family: t("home.categoryFamily"),
    business: t("home.categoryBusiness"),
    group: t("home.categoryGroup"),
    celebration: t("home.categoryBirthday"),
  };

  const priceLabelMap: Record<string, string> = {
    "Dưới 100k/người": t("home.priceUnder100k"),
    "100k – 300k/người": t("home.price100to300k"),
    "300k – 500k/người": t("home.price300to500k"),
    "Trên 500k/người": t("home.priceOver500k"),
  };

  const purposeLabelMap: Record<string, string> = {
    "Hẹn hò": t("home.purposeDate"),
    "Sinh nhật": t("home.purposeBirthday"),
    "Đi gia đình": t("home.purposeFamily"),
    "Họp mặt bạn bè": t("home.purposeFriends"),
    "Làm việc / học bài": t("home.purposeWork"),
    "Business Meeting": t("home.purposeBusiness"),
    "Chill / Sống ảo": t("home.purposeChill"),
    "Fine Dining": t("home.purposeFineDining"),
  };

  const distanceLabelMap: Record<string, string> = {
    "Dưới 1km": t("home.distUnder1km"),
    "Dưới 3km": t("home.distUnder3km"),
    "Dưới 5km": t("home.distUnder5km"),
  };

  const sortLabelMap: Record<string, string> = {
    rating: t("home.sortRating"),
    reviews: t("home.sortReviews"),
    name: t("home.sortName"),
  };

  const cardTranslations = {
    badgeFeaturedText: t("home.badgeFeatured"),
    badgeTrendingText: t("home.badgeTrending"),
    parkingText: t("home.parking"),
    reviewFormat: (count: number) => `${count} ${t("home.reviews")}`,
  };

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavoriteWithServer = useFavoritesStore(
    (state) => state.toggleFavoriteWithServer,
  );
  const syncFavoritesFromServer = useFavoritesStore(
    (state) => state.syncFavoritesFromServer,
  );
  const favoriteIds = favorites.map((item) => item._id);

  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [featured, setFeatured] = useState<Restaurant[]>([]);
  const [forDate, setForDate] = useState<Restaurant[]>([]);
  const [budgetList, setBudgetList] = useState<Restaurant[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & filter
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const initialFilters: FilterState = useMemo(
    () => ({
      locationMode: null,
      district: "",
      place: "",
      distance: null,
      date: "",
      time: "",
      people: 2,
      availableNow: false,
      priceRanges: [],
      purposes: [],
      ratings: [],
      quickTags: [],
      sort: null,
    }),
    [],
  );

  const [draftFilters, setDraftFilters] = useState<FilterState>(initialFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(initialFilters);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateValue, setDateValue] = useState<Date>(new Date());
  const [timeValue, setTimeValue] = useState<Date>(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d;
  });
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [tempTime, setTempTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d;
  });
  const applyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [featRes, allRes, dateRes, budgetRes] = await Promise.all([
        restaurantAPI.getFeatured(),
        restaurantAPI.getAll(),
        restaurantAPI.getAll({ category: "date" }),
        restaurantAPI.getAll({ priceRange: "$" } as any),
      ]);
      setFeatured(featRes.data.restaurants ?? []);
      setAllRestaurants(allRes.data.restaurants ?? []);
      setForDate(dateRes.data.restaurants ?? []);
      setBudgetList(budgetRes.data.restaurants ?? []);
    } catch (err) {
      if (__DEV__) console.warn("[HomeScreen] fetchData error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!user?._id) return;
    syncFavoritesFromServer();
  }, [user?._id, syncFavoritesFromServer]);

  const onRefresh = () => {
    setRefreshing(true);
    setSearch("");
    setActiveCategory(null);
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
    fetchData();
  };

  // ── Toggle favourite ───────────────────────────────────────
  const toggleFav = useCallback(
    (restaurant: Restaurant) => {
      toggleFavoriteWithServer(restaurant).catch(() => {});
    },
    [toggleFavoriteWithServer],
  );

  // ── Derived: filter + sort allRestaurants ──────────────────
  const allList = (() => {
    let list = [...allRestaurants];

    // 1. Search: tên / cuisine / city
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisine?.toLowerCase().includes(q) ||
          r.city?.toLowerCase().includes(q),
      );
    }

    // 2. Category
    if (activeCategory) {
      list = list.filter(
        (r) =>
          r.categories?.includes(activeCategory) ||
          r.tags?.includes(activeCategory),
      );
    }

    // 3. Quick tags
    if (appliedFilters.quickTags.length > 0) {
      list = list.filter((r) =>
        appliedFilters.quickTags.some((tag) => {
          const t = tag.toLowerCase();
          return (
            r.cuisine?.toLowerCase().includes(t) ||
            r.tags?.some((x) => x.toLowerCase().includes(t))
          );
        }),
      );
    }

    // 4. Price
    if (appliedFilters.priceRanges.length > 0) {
      const priceSet = new Set(
        appliedFilters.priceRanges.flatMap((p) => PRICE_MAP[p] ?? []),
      );
      list = list.filter((r) => priceSet.has(r.priceRange));
    }

    // 5. Purpose
    if (appliedFilters.purposes.length > 0) {
      list = list.filter((r) =>
        appliedFilters.purposes.some((p) => {
          const key = p.toLowerCase();
          return (
            r.tags?.some((t) => t.toLowerCase().includes(key)) ||
            r.categories?.some((c) => c.toLowerCase().includes(key))
          );
        }),
      );
    }

    // 6. Rating
    if (appliedFilters.ratings.length > 0) {
      list = list.filter((r) =>
        appliedFilters.ratings.some((rating) => r.rating >= rating),
      );
    }

    // 7. Sort
    if (appliedFilters.sort === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (appliedFilters.sort === "reviews") {
      list.sort((a, b) => b.reviewCount - a.reviewCount);
    } else if (appliedFilters.sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  })();

  const formatDateInput = useCallback((value: Date) => {
    return value.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);

  const formatTimeInput = useCallback((value: Date) => {
    const hh = String(value.getHours()).padStart(2, "0");
    const mm = String(value.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, []);

  const commitDate = useCallback(
    (value: Date) => {
      setDateValue(value);
      setDraftFilters((prev) => ({
        ...prev,
        date: formatDateInput(value),
      }));
    },
    [formatDateInput],
  );

  const commitTime = useCallback(
    (value: Date) => {
      setTimeValue(value);
      setDraftFilters((prev) => ({
        ...prev,
        time: formatTimeInput(value),
      }));
    },
    [formatTimeInput],
  );

  useEffect(() => {
    if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    applyTimerRef.current = setTimeout(() => {
      setAppliedFilters(draftFilters);
    }, 120);
    return () => {
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    };
  }, [draftFilters]);

  const filterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.locationMode === "nearby") count += 1;
    if (
      appliedFilters.locationMode === "district" &&
      appliedFilters.district.trim()
    )
      count += 1;
    if (appliedFilters.locationMode === "place" && appliedFilters.place.trim())
      count += 1;
    if (appliedFilters.distance) count += 1;
    if (appliedFilters.date.trim()) count += 1;
    if (appliedFilters.time.trim()) count += 1;
    if (appliedFilters.people !== 2) count += 1;
    if (appliedFilters.availableNow) count += 1;
    count += appliedFilters.priceRanges.length;
    count += appliedFilters.purposes.length;
    count += appliedFilters.ratings.length;
    count += appliedFilters.quickTags.length;
    if (appliedFilters.sort) count += 1;
    return count;
  }, [appliedFilters]);

  const hasActiveFilter = !!search.trim() || filterCount > 0;

  const clearFilters = () => {
    setSearch("");
    setActiveCategory(null);
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  const toggleInList = useCallback((list: string[], value: string) => {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }, []);

  const toggleRating = useCallback((list: number[], value: number) => {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }, []);

  const summaryChips = useMemo(() => {
    const chips: string[] = [];
    if (appliedFilters.locationMode === "nearby") chips.push(t("home.filterNearby"));
    if (
      appliedFilters.locationMode === "district" &&
      appliedFilters.district.trim()
    ) {
      chips.push(`${t("home.filterDistrict")} ${appliedFilters.district.trim()}`);
    }
    if (
      appliedFilters.locationMode === "place" &&
      appliedFilters.place.trim()
    ) {
      chips.push(`${t("home.filterPlace")} ${appliedFilters.place.trim()}`);
    }
    if (appliedFilters.distance) chips.push(distanceLabelMap[appliedFilters.distance] || appliedFilters.distance);
    if (appliedFilters.date.trim()) chips.push(`${t("home.filterDate")} ${appliedFilters.date}`);
    if (appliedFilters.time.trim()) chips.push(`${t("home.filterTime")} ${appliedFilters.time}`);
    if (appliedFilters.people !== 2)
      chips.push(`${appliedFilters.people} ${t("home.peopleUnit")}`);
    if (appliedFilters.availableNow) chips.push(t("home.peopleNow"));
    chips.push(...appliedFilters.priceRanges.map((p) => priceLabelMap[p] || p));
    chips.push(...appliedFilters.purposes.map((p) => purposeLabelMap[p] || p));
    chips.push(...appliedFilters.quickTags);
    chips.push(...appliedFilters.ratings.map((r) => `${r} sao+`));
    const sortLabelKey = SORT_OPTIONS.find(
      (s) => s.key === appliedFilters.sort,
    )?.key;
    if (sortLabelKey) chips.push(sortLabelMap[sortLabelKey]);
    return chips;
  }, [appliedFilters]);

  const favRestaurants = allRestaurants.filter((r) =>
    favoriteIds.includes(r._id),
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "home.greetingMorning";
    if (h < 18) return "home.greetingAfternoon";
    return "home.greetingEvening";
  };

  const activeCat = CATEGORIES.find((c) => c.key === activeCategory);
  const allSectionTitle = activeCat ? (catLabelMap[activeCat.key] || activeCat.label) : t("home.sectionAll");

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["left", "right"]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFF8F5"
          translucent={false}
        />
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
            <View style={styles.headerTop}>
              <MunchMapLogo size="md" textColor={LOGO_TEXT} />
            </View>
            <View
              style={[skel.line, { width: 180, height: 28, marginBottom: 8 }]}
            />
            <View
              style={[skel.line, { width: 120, height: 16, marginBottom: 18 }]}
            />
            <View
              style={[
                skel.line,
                { height: 50, borderRadius: 16, marginBottom: 12 },
              ]}
            />
          </View>
          <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
            {[1, 2, 3].map((k) => (
              <SkeletonCard key={k} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Main render ────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFF8F5"
        translucent={false}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        {/* ════ HEADER ════ */}
        <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
          {/* Logo + icon buttons */}
          <View style={styles.headerTop}>
            <MunchMapLogo size="md" textColor={LOGO_TEXT} />

            <View style={styles.headerBtns}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => router.push("/favorites")}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 18 }}>❤️</Text>
                {favoriteIds.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeNum}>{favoriteIds.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 18 }}>🔔</Text>
                <View style={styles.notifDot} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Greeting */}
          <View style={styles.greetingWrap}>
            <Text style={styles.greetingName}>
              {user
                ? `${t("home.greetingPrefix")}${t(greeting())}, ${user.fullName?.split(" ").pop()}!`
                : t("home.greetingFallback")}
            </Text>
            <Text style={styles.greetingSub}>{t("home.greetingSubtitle")}</Text>
          </View>

          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder={t("home.searchPlaceholder")}
              placeholderTextColor={TEXT_MUTED}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close" size={18} color={TEXT_MUTED} />
              </TouchableOpacity>
            )}
            {/* Filter button */}
            <TouchableOpacity
              onPress={() => setShowFilters((v) => !v)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={hasActiveFilter ? GRAD : ["#E5E7EB", "#E5E7EB"]}
                style={styles.micBtn}
              >
                <Ionicons
                  name="options-outline"
                  size={16}
                  color={hasActiveFilter ? "#fff" : TEXT_SEC}
                />
                {filterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{filterCount}</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Quick Tags — bấm được, highlight khi active */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickTagsRow}
          >
            {QUICK_TAGS.map((tag) => {
              const active = draftFilters.quickTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.quickTag, active && styles.quickTagActive]}
                  onPress={() => {
                    const next = toggleInList(draftFilters.quickTags, tag);
                    setDraftFilters((prev) => ({ ...prev, quickTags: next }));
                  }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.quickTagText,
                      active && styles.quickTagTextActive,
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Filter panel */}
          {showFilters && (
            <View style={styles.filterSheet}>
              <View style={styles.filterSheetHeader}>
                <View>
                  <Text style={styles.filterTitle}>{t("home.filterTitle")}</Text>
                  <Text style={styles.filterSub}>
                    {filterCount > 0
                      ? `${filterCount} ${t("home.filterCount")}`
                      : t("home.filterSubtitle")}
                  </Text>
                </View>
              </View>

              <Text style={styles.filterLabel}>{t("home.filterLocation")}</Text>
              <View style={styles.filterRow}>
                {[
                  { key: "nearby", label: t("home.filterNearby") },
                  { key: "district", label: t("home.filterDistrict") },
                  { key: "place", label: t("home.filterPlace") },
                ].map((item) => {
                  const active = draftFilters.locationMode === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.filterChip,
                        active && styles.filterChipActive,
                      ]}
                      onPress={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          locationMode: active ? null : (item.key as any),
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {draftFilters.locationMode === "district" && (
                <View style={styles.inlineInputRow}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={TEXT_MUTED}
                  />
                  <TextInput
                    style={styles.inlineInput}
                    placeholder={t("home.filterDistrictPlaceholder")}
                    placeholderTextColor={TEXT_MUTED}
                    value={draftFilters.district}
                    onChangeText={(value) =>
                      setDraftFilters((prev) => ({ ...prev, district: value }))
                    }
                  />
                </View>
              )}

              {draftFilters.locationMode === "place" && (
                <View style={styles.inlineInputRow}>
                  <Ionicons name="pin-outline" size={16} color={TEXT_MUTED} />
                  <TextInput
                    style={styles.inlineInput}
                    placeholder={t("home.filterPlacePlaceholder")}
                    placeholderTextColor={TEXT_MUTED}
                    value={draftFilters.place}
                    onChangeText={(value) =>
                      setDraftFilters((prev) => ({ ...prev, place: value }))
                    }
                  />
                </View>
              )}

              <Text style={styles.filterLabel}>{t("home.filterDistance")}</Text>
              <View style={styles.filterRow}>
                {DISTANCE_OPTIONS.map((d) => {
                  const active = draftFilters.distance === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.filterChip,
                        active && styles.filterChipActive,
                      ]}
                      onPress={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          distance: active ? null : d,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {distanceLabelMap[d] || d}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterLabel}>{t("home.filterDateTime")}</Text>
              <View style={styles.reservationRow}>
                <TouchableOpacity
                  style={styles.reservationInputWrap}
                  onPress={() => {
                    setTempDate(dateValue);
                    setShowDatePicker(true);
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={TEXT_MUTED}
                  />
                  <Text
                    style={[
                      styles.reservationValue,
                      !draftFilters.date && styles.reservationPlaceholder,
                    ]}
                  >
                    {draftFilters.date || t("home.filterDate")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.reservationInputWrap}
                  onPress={() => {
                    setTempTime(timeValue);
                    setShowTimePicker(true);
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="time-outline" size={16} color={TEXT_MUTED} />
                  <Text
                    style={[
                      styles.reservationValue,
                      !draftFilters.time && styles.reservationPlaceholder,
                    ]}
                  >
                    {draftFilters.time || t("home.filterTime")}
                  </Text>
                </TouchableOpacity>
                <View style={styles.peopleControl}>
                  <TouchableOpacity
                    style={styles.peopleBtn}
                    onPress={() =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        people: Math.max(1, prev.people - 1),
                      }))
                    }
                  >
                    <Text style={styles.peopleBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.peopleCount}>{draftFilters.people}</Text>
                  <TouchableOpacity
                    style={styles.peopleBtn}
                    onPress={() =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        people: Math.min(12, prev.people + 1),
                      }))
                    }
                  >
                    <Text style={styles.peopleBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.toggleRow,
                  draftFilters.availableNow && styles.toggleRowActive,
                ]}
                onPress={() =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    availableNow: !prev.availableNow,
                  }))
                }
              >
                <Ionicons
                  name={draftFilters.availableNow ? "checkmark-circle" : "time"}
                  size={18}
                  color={draftFilters.availableNow ? "#fff" : TEXT_SEC}
                />
                <Text
                  style={[
                    styles.toggleText,
                    draftFilters.availableNow && styles.toggleTextActive,
                  ]}
                >
                  {t("home.filterAvailable")}
                </Text>
              </TouchableOpacity>

              <Text style={styles.filterLabel}>{t("home.filterPrice")}</Text>
              <View style={styles.filterRow}>
                {PRICE_OPTIONS.map((p) => {
                  const active = draftFilters.priceRanges.includes(p);
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.filterChip,
                        active && styles.filterChipActive,
                      ]}
                      onPress={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          priceRanges: toggleInList(prev.priceRanges, p),
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {priceLabelMap[p] || p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterLabel}>{t("home.filterPurpose")}</Text>
              <View style={styles.filterRow}>
                {PURPOSE_OPTIONS.map((p) => {
                  const active = draftFilters.purposes.includes(p);
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.filterChip,
                        active && styles.filterChipActive,
                      ]}
                      onPress={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          purposes: toggleInList(prev.purposes, p),
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {purposeLabelMap[p] || p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterLabel}>{t("home.filterRating")}</Text>
              <View style={styles.filterRow}>
                {RATING_OPTIONS.map((r) => {
                  const active = draftFilters.ratings.includes(r);
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.filterChip,
                        active && styles.filterChipActive,
                      ]}
                      onPress={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          ratings: toggleRating(prev.ratings, r),
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {r} sao
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterLabel}>{t("home.filterSort")}</Text>
              <View style={styles.filterRow}>
                {SORT_OPTIONS.map((s) => {
                  const active = draftFilters.sort === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      style={[
                        styles.filterChip,
                        active && styles.filterChipActive,
                      ]}
                      onPress={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          sort: active ? null : s.key,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                        ]}
                      >
                        {sortLabelMap[s.key] || s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {showDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (event.type === "set" && selectedDate) {
                commitDate(selectedDate);
              }
            }}
            locale="vi"
          />
        )}

        {showTimePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={tempTime}
            mode="time"
            display="default"
            onChange={(event, selectedDate) => {
              setShowTimePicker(false);
              if (event.type === "set" && selectedDate) {
                commitTime(selectedDate);
              }
            }}
            locale="vi"
          />
        )}

        {showDatePicker && Platform.OS === "ios" && (
          <Modal transparent animationType="fade">
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerCard}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerBtn}>CANCEL</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>Chọn ngày</Text>
                  <TouchableOpacity
                    onPress={() => {
                      commitDate(tempDate);
                      setShowDatePicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerBtnOk}>OK</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="inline"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) setTempDate(selectedDate);
                  }}
                  locale="vi"
                />
              </View>
            </View>
          </Modal>
        )}

        {showTimePicker && Platform.OS === "ios" && (
          <Modal transparent animationType="fade">
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerCard}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerBtn}>CANCEL</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>Chọn giờ</Text>
                  <TouchableOpacity
                    onPress={() => {
                      commitTime(tempTime);
                      setShowTimePicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerBtnOk}>OK</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) setTempTime(selectedDate);
                  }}
                  locale="vi"
                />
              </View>
            </View>
          </Modal>
        )}

        {/* ════ CATEGORIES ════ */}
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((cat) => {
            return (
              <TouchableOpacity
                key={cat.key}
                style={styles.catItem}
                onPress={() =>
                  router.push({
                    pathname: "/explore",
                    params: {
                      preset: cat.key,
                      presetLabel: catLabelMap[cat.key] || cat.label,
                    },
                  })
                }
                activeOpacity={0.75}
              >
                <View style={[styles.catIcon, styles.catIconInactive]}>
                  <Ionicons name={cat.icon} size={22} color="#555" />
                </View>
                <Text style={styles.catLabel}>{catLabelMap[cat.key] || cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {filterCount > 0 && (
          <View style={styles.filterSummary}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>{t("home.filtering")}</Text>
              <Text style={styles.summaryCount}>{filterCount} {t("home.filterCount")}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.summaryRow}
            >
              {summaryChips.map((chip, idx) => (
                <View key={`${chip}-${idx}`} style={styles.summaryChip}>
                  <Text style={styles.summaryChipText}>{chip}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Khi đang search/filter: ẩn section featured/date/budget, chỉ show kết quả */}
        {hasActiveFilter ? (
          <Section title={`${t("home.sectionSearchResults")} (${allList.length})`}>
            {allList.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 48 }}>🍽️</Text>
                <Text style={styles.emptyTitle}>{t("home.emptyTitle")}</Text>
                <Text style={styles.emptyText}>
                  {t("home.emptyText")}
                </Text>
                <TouchableOpacity
                  style={styles.clearBtn2}
                  onPress={clearFilters}
                >
                  <Text style={styles.clearBtnText}>{t("home.clearFilter")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.px20}>
                {allList.map((r) => (
                  <RestaurantCardFull
                    key={r._id}
                    item={r}
                    favoriteIds={favoriteIds}
                    onToggleFav={toggleFav}
                    {...cardTranslations}
                  />
                ))}
              </View>
            )}
          </Section>
        ) : (
          <>
            {/* ════ FEATURED ════ */}
            {featured.length > 0 && (
              <Section title={t("home.sectionFeatured")} onViewAll={() => {}} viewAllLabel={t("common.viewAll")}>
                <View style={styles.px20}>
                  {featured.slice(0, 3).map((r) => (
                    <RestaurantCardFull
                      key={r._id}
                      item={r}
                      favoriteIds={favoriteIds}
                      onToggleFav={toggleFav}
                      {...cardTranslations}
                    />
                  ))}
                </View>
              </Section>
            )}

            {/* ════ HẸN HÒ ════ */}
            {forDate.length > 0 && (
              <Section title={t("home.sectionDate")} onViewAll={() => {}} viewAllLabel={t("common.viewAll")}>
                <FlatList
                  data={forDate}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={styles.hList}
                  renderItem={({ item }) => (
                    <RestaurantCardCompact
                      item={item}
                      favoriteIds={favoriteIds}
                      onToggleFav={toggleFav}
                    />
                  )}
                />
              </Section>
            )}

            {/* ════ TẤT CẢ ════ */}
            <Section title={allSectionTitle}>
              {allList.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={{ fontSize: 48 }}>🍽️</Text>
                  <Text style={styles.emptyTitle}>{t("home.emptyTitle")}</Text>
                  <Text style={styles.emptyText}>Kéo xuống để tải lại</Text>
                </View>
              ) : (
                <View style={styles.px20}>
                  {allList.map((r) => (
                    <RestaurantCardFull
                      key={r._id}
                      item={r}
                      favoriteIds={favoriteIds}
                      onToggleFav={toggleFav}
                      {...cardTranslations}
                    />
                  ))}
                </View>
              )}
            </Section>

            {/* ════ QUÁN NGON GIÁ TỐT ════ */}
            {budgetList.length > 0 && (
              <Section title={t("home.sectionBudget")} onViewAll={() => {}} viewAllLabel={t("common.viewAll")}>
                <FlatList
                  data={budgetList}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={styles.hList}
                  renderItem={({ item }) => (
                    <RestaurantCardCompact
                      item={item}
                      favoriteIds={favoriteIds}
                      onToggleFav={toggleFav}
                    />
                  )}
                />
              </Section>
            )}

            {/* ════ YÊU THÍCH ════ */}
            {favRestaurants.length > 0 && (
              <Section title={t("home.sectionFavorites")}>
                <FlatList
                  data={favRestaurants}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={styles.hList}
                  renderItem={({ item }) => (
                    <RestaurantCardCompact
                      item={item}
                      favoriteIds={favoriteIds}
                      onToggleFav={toggleFav}
                    />
                  )}
                />
              </Section>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

//  STYLES

const cardFull = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  imageWrap: { height: 192, position: "relative" },
  image: { width: "100%", height: "100%" },
  badgeFeatured: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 10, color: "#fff", fontWeight: "700" },
  favBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  overlayBottom: { position: "absolute", bottom: 12, left: 12, right: 52 },
  name: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 3,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cuisine: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  dot: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  price: { fontSize: 12, fontWeight: "800" },
  info: { padding: 12 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingNum: { fontSize: 13, fontWeight: "800", color: TEXT },
  ratingCount: { fontSize: 12, color: TEXT_MUTED },
  cityRow: { flexDirection: "row", alignItems: "center" },
  cityText: { fontSize: 12, color: TEXT_MUTED },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  metaLocation: { fontSize: 11, color: TEXT_SEC, flex: 1 },
  parking: { fontSize: 11, color: "#22C55E", fontWeight: "700" },
  hours: { fontSize: 11, color: TEXT_MUTED },
  tagsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag: {
    backgroundColor: "#FFF3ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: { fontSize: 10, color: PRIMARY, fontWeight: "700" },
});

const cardCompact = StyleSheet.create({
  card: {
    width: 176,
    backgroundColor: SURFACE,
    borderRadius: 18,
    overflow: "hidden",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageWrap: { height: 112, position: "relative" },
  image: { width: "100%", height: "100%" },
  cuisineBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(254,158,28,0.92)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    maxWidth: 130,
  },
  cuisineText: { fontSize: 9, fontWeight: "700", color: "#fff" },
  favBtn: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { padding: 9 },
  name: { fontSize: 13, fontWeight: "700", color: TEXT, marginBottom: 3 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 3,
  },
  rating: { fontSize: 11, fontWeight: "700", color: TEXT },
  reviews: { fontSize: 10, color: TEXT_MUTED },
  city: { fontSize: 10, color: TEXT_MUTED },
});

const sec = StyleSheet.create({
  wrap: { marginBottom: 10 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: "900", color: TEXT },
  link: { fontSize: 13, fontWeight: "700", color: PRIMARY },
});

const skel = StyleSheet.create({
  line: { backgroundColor: "#F0F0F0", borderRadius: 8 },
});

const skeleton = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 14,
  },
  image: { height: 192, backgroundColor: "#F0F0F0" },
  body: { padding: 12 },
  line1: {
    height: 16,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    marginBottom: 8,
    width: "70%",
  },
  line2: {
    height: 12,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    marginBottom: 8,
    width: "50%",
  },
  line3: {
    height: 12,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    width: "40%",
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },

  header: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#FFF8F5",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 4,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 4,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  headerBtns: { flexDirection: "row", gap: 8 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeNum: { fontSize: 9, fontWeight: "800", color: "#fff" },
  notifDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },

  greetingWrap: { marginBottom: 18 },
  greetingName: {
    fontSize: 22,
    fontWeight: "900",
    color: TEXT,
    letterSpacing: -0.3,
  },
  greetingSub: { fontSize: 14, color: TEXT_SEC, marginTop: 3 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    height: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT, paddingVertical: 0 },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Quick tags
  quickTagsRow: { gap: 8, paddingRight: 4 },
  quickTag: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: SURFACE,
  },
  quickTagActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  quickTagText: { fontSize: 12, fontWeight: "600", color: TEXT_SEC },
  quickTagTextActive: { color: "#fff" },

  // Filter sheet
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: { fontSize: 9, color: "#fff", fontWeight: "800" },
  filterSheet: {
    marginTop: 12,
    padding: 14,
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  filterSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  filterTitle: { fontSize: 16, fontWeight: "800", color: TEXT },
  filterSub: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  filterGhostBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  filterGhostText: { fontSize: 11, fontWeight: "700", color: TEXT_SEC },
  filterLabel: {
    fontSize: 11,
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
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterChipText: { fontSize: 12, color: TEXT_SEC, fontWeight: "600" },
  filterChipTextActive: { color: "#fff" },
  inlineInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
    marginBottom: 14,
  },
  inlineInput: { flex: 1, fontSize: 13, color: TEXT, paddingVertical: 0 },
  reservationRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  reservationInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
  },
  reservationInput: { flex: 1, fontSize: 13, color: TEXT, paddingVertical: 0 },
  reservationValue: { flex: 1, fontSize: 13, color: TEXT, fontWeight: "600" },
  reservationPlaceholder: { color: TEXT_MUTED, fontWeight: "500" },
  peopleControl: {
    width: 92,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 42,
    backgroundColor: "#FFF",
  },
  peopleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  peopleBtnText: { fontSize: 14, fontWeight: "700", color: TEXT },
  peopleCount: { fontSize: 13, fontWeight: "700", color: TEXT },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFF",
    marginBottom: 14,
  },
  toggleRowActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  toggleText: { fontSize: 12, fontWeight: "600", color: TEXT_SEC },
  toggleTextActive: { color: "#fff" },
  pickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  pickerCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 14,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  pickerTitle: { fontSize: 14, fontWeight: "800", color: TEXT },
  pickerBtn: { fontSize: 12, fontWeight: "700", color: TEXT_SEC },
  pickerBtnOk: { fontSize: 12, fontWeight: "800", color: PRIMARY },
  filterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  resetBtnText: { fontSize: 13, fontWeight: "700", color: TEXT_SEC },
  applyBtn: { flex: 1 },
  applyBtnGradient: {
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  applyBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  clearBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  clearBtn2: {
    marginTop: 14,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  clearBtnText: { fontSize: 13, color: "#EF4444", fontWeight: "700" },

  filterSummary: {
    marginHorizontal: 14,
    marginBottom: 8,
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryTitle: { fontSize: 13, fontWeight: "800", color: TEXT },
  summaryCount: { fontSize: 12, color: TEXT_MUTED, fontWeight: "600" },
  summaryRow: { gap: 8, paddingRight: 6 },
  summaryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFE1D4",
    backgroundColor: "#FFF3ED",
  },
  summaryChipText: { fontSize: 12, fontWeight: "700", color: PRIMARY },

  // Categories
  categoriesGrid: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 2,
  },
  catItem: { flex: 1, alignItems: "center", gap: 5 },
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  catIconInactive: { backgroundColor: "#FFF3ED" },
  catLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: TEXT_SEC,
    textAlign: "center",
    lineHeight: 12,
  },
  catLabelActive: { color: PRIMARY, fontWeight: "800" },

  hList: { paddingHorizontal: 20, paddingRight: 20 },
  px20: { paddingHorizontal: 20 },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    marginTop: 14,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
  },
});
