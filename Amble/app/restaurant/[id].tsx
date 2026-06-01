import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Linking,
  Dimensions,
  Share,
  Alert,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { bookingAPI, restaurantAPI } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

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

const { width: SW } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────
interface Restaurant {
  _id: string;
  name: string;
  cuisine: string;
  location: string;
  address: string;
  city: string;
  phone: string;
  description: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  priceMin: number;
  priceMax: number;
  images: string[];
  tags: string[];
  categories: string[];
  openTime: string;
  closeTime: string;
  openDays: string[];
  hasParking: boolean;
  isFeatured: boolean;
  subscriptionPackage: "basic" | "pro" | "premium";
  lat: number;
  lng: number;
  facebook: string;
  instagram: string;
  tiktok: string;
  website: string;
}

interface ReviewItem {
  _id: string;
  rating: number;
  comment: string;
  images?: string[];
  bookingId?: string;
  createdAt?: string;
  userId?: {
    fullName?: string;
    avatar?: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────
const DAY_LABEL: Record<string, string> = {
  mon: "T2",
  tue: "T3",
  wed: "T4",
  thu: "T5",
  fri: "T6",
  sat: "T7",
  sun: "CN",
};

const FALLBACK =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80";
const MAX_REVIEW_IMAGES = 6;

const isOpenNow = (openTime: string, closeTime: string): boolean => {
  try {
    const now = new Date();
    const [oh, om] = openTime.split(":").map(Number);
    const [ch, cm] = closeTime.split(":").map(Number);
    const cur = now.getHours() * 60 + now.getMinutes();
    return cur >= oh * 60 + om && cur <= ch * 60 + cm;
  } catch {
    return false;
  }
};

// ─── Sub-components ───────────────────────────────────────
const InfoRow = ({
  icon,
  label,
  value,
  onPress,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
  valueColor?: string;
}) => (
  <TouchableOpacity
    style={s.infoRow}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={s.infoIconWrap}>
      <Ionicons name={icon} size={18} color={PRIMARY} />
    </View>

    <View style={s.infoContent}>
      <Text style={s.infoLabel}>{label}</Text>

      <Text
        style={[
          s.infoValue,
          onPress ? s.infoLink : undefined,
          valueColor ? { color: valueColor } : undefined,
        ]}
      >
        {value}
      </Text>
    </View>

    {onPress && (
      <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
    )}
  </TouchableOpacity>
);

const SocialBtn = ({
  icon,
  label,
  url,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  url: string;
  color: string;
}) => (
  <TouchableOpacity
    style={[
      s.socialBtn,
      { borderColor: color + "33", backgroundColor: color + "0D" },
    ]}
    onPress={() => {
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;
      Linking.openURL(fullUrl);
    }}
    activeOpacity={0.8}
  >
    <Ionicons name={icon} size={18} color={color} />
    <Text style={[s.socialLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

//  DETAIL SCREEN
export default function DetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFav, setIsFav] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [eligibleBookingId, setEligibleBookingId] = useState<string>("");
  const [canWriteReview, setCanWriteReview] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [draftRating, setDraftRating] = useState(5);
  const [draftComment, setDraftComment] = useState("");
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  // ── Fetch từ BE: GET /api/restaurants/:id ─────────────────
  const fetchDetail = useCallback(async () => {
    if (!id) return;   
    setLoading(true);
    setError("");
    try {
      const res = await restaurantAPI.getById(id as string);
      setRestaurant(res.data.restaurant);
    } catch (err: any) {
      console.error('[RestaurantDetail] Error:', err.response?.data || err.message);
      setError(
        err.response?.data?.message || "Không thể tải thông tin nhà hàng",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchReviews = useCallback(async () => {
    if (!id) return;
    setReviewLoading(true);
    try {
      const res = await restaurantAPI.getReviews(id as string);
      setReviews(res.data?.reviews || []);
    } catch {
      setReviews([]);
    } finally {
      setReviewLoading(false);
    }
  }, [id]);

  const fetchReviewEligibility = useCallback(async () => {
    if (!id || !user?._id || !isAuthenticated) {
      setCanWriteReview(false);
      setEligibleBookingId("");
      return;
    }

    setCheckingEligibility(true);
    try {
      const res = await bookingAPI.getUserBookings(user._id);
      const bookings = res.data?.bookings || [];
      const reviewedBookingIds = new Set(
        reviews.map((r) => String(r.bookingId || "")),
      );

      const eligible = bookings.find((b: any) => {
        const bookingRestaurantId =
          typeof b.restaurantId === "string" ? b.restaurantId : b.restaurantId?._id;
        const bookingStatus = String(b.status || "");

        return (
          String(bookingRestaurantId || "") === String(id) &&
          ["confirmed", "paid", "completed"].includes(bookingStatus) &&
          !reviewedBookingIds.has(String(b._id))
        );
      });

      if (eligible?._id) {
        setCanWriteReview(true);
        setEligibleBookingId(String(eligible._id));
      } else {
        setCanWriteReview(false);
        setEligibleBookingId("");
      }
    } catch {
      setCanWriteReview(false);
      setEligibleBookingId("");
    } finally {
      setCheckingEligibility(false);
    }
  }, [id, isAuthenticated, reviews, user?._id]);

  useEffect(() => {
    fetchDetail();
    fetchReviews();
  }, [fetchDetail, fetchReviews]);

  useEffect(() => {
    fetchReviewEligibility();
  }, [fetchReviewEligibility]);

  const addReviewImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Thông báo", "Vui lòng cấp quyền thư viện ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
      selectionLimit: Math.max(0, MAX_REVIEW_IMAGES - draftImages.length),
    });

    if (result.canceled) return;

    const next = result.assets
      .map((asset) =>
        asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri,
      )
      .filter(Boolean);

    setDraftImages((prev) => [...prev, ...next].slice(0, MAX_REVIEW_IMAGES));
  };

  const removeReviewImage = (uri: string) => {
    setDraftImages((prev) => prev.filter((img) => img !== uri));
  };

  const submitReview = async () => {
    if (!id || !eligibleBookingId) return;

    try {
      setSubmittingReview(true);
      const res = await restaurantAPI.createReview(String(id), {
        rating: draftRating,
        comment: draftComment,
        images: draftImages,
        bookingId: eligibleBookingId,
      });

      setDraftRating(5);
      setDraftComment("");
      setDraftImages([]);
      await fetchDetail();
      await fetchReviews();
      const earned = res.data?.rewardPoints;
      const msg = earned
        ? `Đánh giá của bạn đã được gửi. Bạn nhận được +${earned} điểm thưởng!`
        : "Đánh giá của bạn đã được gửi.";
      Alert.alert("Thành công", msg);
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error?.response?.data?.message || "Không thể gửi đánh giá.",
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const openMap = () => {
    if (!restaurant) return;
    const q = encodeURIComponent(
      restaurant.address || restaurant.location || restaurant.city,
    );
    Linking.openURL(`https://maps.google.com/?q=${q}`);
  };

  const callPhone = () => {
    if (restaurant?.phone) Linking.openURL(`tel:${restaurant.phone}`);
  };

  const handleShare = async () => {
    if (!restaurant) return;

    try {
      await Share.share({
        message:
          `munchmap Restaurant\n\n` +
          `Name: ${restaurant.name}\n` +
          `Address: ${restaurant.address || restaurant.location}\n` +
          `Rating: ${restaurant.rating} (${restaurant.reviewCount} reviews)\n\n` +
          `Discover this restaurant on munchmap!`,
      });
    } catch {
      /* silent */
    }
  };

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingText}>Đang tải nhà hàng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ───────────────────────────────────────────
  if (error || !restaurant) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={s.errorWrap}>
          <Text style={{ fontSize: 52 }}>😕</Text>
          <Text style={s.errorTitle}>Không tìm thấy</Text>
          <Text style={s.errorText}>{error || "Nhà hàng không tồn tại"}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchDetail}>
            <Text style={s.retryText}>Thử lại</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.backLink} onPress={() => router.back()}>
            <Text style={s.backLinkText}>← Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images = restaurant.images?.length > 0 ? restaurant.images : [FALLBACK];
  const open = isOpenNow(restaurant.openTime, restaurant.closeTime);
  const stars = Math.round(restaurant.rating);

  // ── Main render ───────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces
        scrollEventThrottle={16}
      >
        {/* ════════════ HERO IMAGE SLIDER ════════════ */}
        <View style={s.heroWrap}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setActiveImg(Math.round(e.nativeEvent.contentOffset.x / SW))
            }
          >
            {images.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={s.heroImg}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Gradient overlay - KHÔNG chặn touch */}
          <LinearGradient
            colors={["rgba(0,0,0,0.42)", "transparent", "rgba(0,0,0,0.52)"]}
            style={StyleSheet.absoluteFillObject}
            locations={[0, 0.38, 1]}
            pointerEvents="none"
          />

          {/* Image dots - KHÔNG chặn touch */}
          {images.length > 1 && (
            <View style={s.dotRow} pointerEvents="none">
              {images.map((_, i) => (
                <View key={i} style={[s.dot, i === activeImg && s.dotActive]} />
              ))}
            </View>
          )}

          {/* Nút Back/Share/Fav - nằm SAU overlay, NHẬN touch */}
          <SafeAreaView style={s.heroTop} pointerEvents="box-none">
            <TouchableOpacity
              style={s.heroBtn}
              onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}
              activeOpacity={0.85}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={s.heroTopRight}>
              <TouchableOpacity
                style={s.heroBtn}
                onPress={handleShare}
                activeOpacity={0.85}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="share-social-outline" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.heroBtn, isFav && s.heroBtnFav]}
                onPress={() => setIsFav((v) => !v)}
                activeOpacity={0.85}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name={isFav ? "heart" : "heart-outline"}
                  size={22}
                  color={isFav ? "#EF4444" : "#fff"}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Featured badge - không chặn touch */}
          {restaurant.isFeatured && (
            <LinearGradient
              colors={GRAD}
              style={s.heroBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              pointerEvents="none"
            >
              <Text style={s.heroBadgeText}>Được yêu thích</Text>
            </LinearGradient>
          )}

          {/* Image counter - không chặn touch */}
          {images.length > 1 && (
            <View style={s.imgCounter} pointerEvents="none">
              <Text style={s.imgCounterText}>
                {activeImg + 1} / {images.length}
              </Text>
            </View>
          )}
        </View>

        {/* ════════════ MAIN CONTENT ════════════ */}
        <View style={s.content}>
          {/* ── Tên + trạng thái ── */}
          <View style={s.titleSection}>
            <View style={s.titleRow}>
              <Text style={s.nameText} numberOfLines={2}>
                {restaurant.name}
              </Text>
              <View
                style={[s.statusPill, open ? s.statusOpen : s.statusClosed]}
              >
                <View
                  style={[
                    s.statusDot,
                    { backgroundColor: open ? "#22C55E" : "#EF4444" },
                  ]}
                />
                <Text
                  style={[
                    s.statusLabel,
                    { color: open ? "#22C55E" : "#EF4444" },
                  ]}
                >
                  {open ? "Đang mở" : "Đã đóng"}
                </Text>
              </View>
            </View>

            {/* Loại ẩm thực + giá */}
            <View style={s.metaRow}>
              <Text style={s.cuisineLabel}>{restaurant.cuisine}</Text>
              <Text style={s.metaDot}>•</Text>
              <Text
                style={[
                  s.priceLabel,
                  { color: PRICE_COLOR[restaurant.priceRange] || PRIMARY },
                ]}
              >
                {restaurant.priceRange}
              </Text>
              {restaurant.priceMin > 0 && (
                <>
                  <Text style={s.metaDot}>•</Text>
                  <Text style={s.priceRangeText}>
                    {(restaurant.priceMin / 1000).toFixed(0)}k –{" "}
                    {(restaurant.priceMax / 1000).toFixed(0)}k đ
                  </Text>
                </>
              )}
            </View>

            {/* Rating stars */}
            <View style={s.ratingRow}>
              <View style={s.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons
                    key={n}
                    name={n <= stars ? "star" : "star-outline"}
                    size={18}
                    color={
                      restaurant.rating >= 4.5
                        ? "#F59E0B"
                        : restaurant.rating >= 3.5
                          ? "#FB923C"
                          : "#9CA3AF"
                    }
                  />
                ))}
              </View>
              <Text style={s.ratingNum}>{restaurant.rating.toFixed(1)}</Text>
              <Text style={s.ratingCount}>
                ({restaurant.reviewCount} đánh giá)
              </Text>
            </View>
          </View>

          {/* ── Mạng xã hội ── */}
          {(restaurant.facebook ||
            restaurant.instagram ||
            restaurant.tiktok ||
            restaurant.website) && (
              <View style={[s.section, { marginTop: -2 }]}>
                <Text style={s.sectionTitle}>Mạng xã hội</Text>
                <View style={s.socialRow}>
                  {restaurant.facebook && (
                    <SocialBtn
                      icon="logo-facebook"
                      label="Facebook"
                      url={restaurant.facebook}
                      color="#1877F2"
                    />
                  )}
                  {restaurant.instagram && (
                    <SocialBtn
                      icon="logo-instagram"
                      label="Instagram"
                      url={restaurant.instagram}
                      color="#E1306C"
                    />
                  )}
                  {restaurant.tiktok && (
                    <SocialBtn
                      icon="logo-tiktok"
                      label="TikTok"
                      url={restaurant.tiktok}
                      color="#010101"
                    />
                  )}
                  {restaurant.website && (
                    <SocialBtn
                      icon="globe-outline"
                      label="Website"
                      url={restaurant.website}
                      color={PRIMARY}
                    />
                  )}
                </View>
              </View>
            )}

          {/* ── Tags ── */}
          {restaurant.tags?.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.tagsRow}
            >
              {restaurant.tags.map((tag) => (
                <View key={tag} style={s.tagChip}>
                  <Text style={s.tagText}>{tag}</Text>
                </View>
              ))}
            </ScrollView>
          )}


          {/* ── Quick stats strip ── */}
          <View style={s.statsStrip}>
            <View style={s.statItem}>
              <Ionicons name="star" size={18} color="#F59E0B" />
              <Text style={s.statValue}>{restaurant.rating.toFixed(1)}</Text>
              <Text style={s.statLabel}>Đánh giá</Text>
            </View>

            <View style={s.statDivider} />

            <View style={s.statItem}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#6B7280"
              />
              <Text style={s.statValue}>{restaurant.reviewCount}</Text>
              <Text style={s.statLabel}>Lượt bình luận</Text>
            </View>

            <View style={s.statDivider} />

            <View style={s.statItem}>
              <Ionicons name="time-outline" size={18} color="#6B7280" />
              <Text style={s.statValue}>{restaurant.openTime}</Text>
              <Text style={s.statLabel}>Mở cửa</Text>
            </View>

            {restaurant.hasParking && (
              <>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Ionicons name="car-outline" size={18} color="#6B7280" />
                  <Text style={s.statValue}>Có</Text>
                  <Text style={s.statLabel}>Bãi xe</Text>
                </View>
              </>
            )}
          </View>

          {/* ── Mô tả ── */}
          {restaurant.description ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Giới thiệu</Text>
              <Text style={s.descText}>{restaurant.description}</Text>
            </View>
          ) : null}

          {/* ── Đánh giá ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Đánh giá từ khách</Text>
            {checkingEligibility ? (
              <View style={s.reviewLoading}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={s.reviewLoadingText}>Đang kiểm tra quyền đánh giá...</Text>
              </View>
            ) : canWriteReview ? (
              <View style={s.writeReviewCard}>
                <Text style={s.writeReviewTitle}>Viết đánh giá của bạn</Text>
                <View style={s.writeStarsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setDraftRating(n)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={n <= draftRating ? "star" : "star-outline"}
                        size={24}
                        color="#F59E0B"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={s.writeReviewInput}
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  placeholderTextColor="#9CA3AF"
                  value={draftComment}
                  onChangeText={setDraftComment}
                  multiline
                />
                <TouchableOpacity style={s.addReviewImageBtn} onPress={addReviewImages}>
                  <Ionicons name="images-outline" size={16} color="#374151" />
                  <Text style={s.addReviewImageText}>
                    Thêm ảnh ({draftImages.length}/{MAX_REVIEW_IMAGES})
                  </Text>
                </TouchableOpacity>
                {draftImages.length > 0 ? (
                  <View style={s.reviewImageGrid}>
                    {draftImages.map((img) => (
                      <View key={img} style={s.reviewImageWrap}>
                        <Image source={{ uri: img }} style={s.reviewImage} />
                        <TouchableOpacity
                          style={s.removeReviewImageBtn}
                          onPress={() => removeReviewImage(img)}
                        >
                          <Ionicons name="close" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[s.submitReviewBtn, submittingReview && { opacity: 0.7 }]}
                  onPress={submitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.submitReviewBtnText}>Gửi đánh giá</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
            {reviewLoading ? (
              <View style={s.reviewLoading}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={s.reviewLoadingText}>Đang tải đánh giá...</Text>
              </View>
            ) : reviews.length === 0 ? (
              <Text style={s.emptyReviewText}>Chưa có đánh giá nào.</Text>
            ) : (
              <View style={s.reviewList}>
                {reviews.map((review) => (
                  <View key={review._id} style={s.reviewCard}>
                    <View style={s.reviewHeader}>
                      <Text style={s.reviewName}>
                        {review.userId?.fullName || "Khách hàng"}
                      </Text>
                      <View style={s.reviewStars}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Ionicons
                            key={n}
                            name={n <= review.rating ? "star" : "star-outline"}
                            size={14}
                            color="#F59E0B"
                          />
                        ))}
                      </View>
                    </View>
                    {review.comment ? (
                      <Text style={s.reviewComment}>{review.comment}</Text>
                    ) : null}
                    {review.images && review.images.length > 0 ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.reviewImages}
                      >
                        {review.images.map((img, idx) => (
                          <Image
                            key={`${review._id}-${idx}`}
                            source={{ uri: img }}
                            style={s.reviewImage}
                          />
                        ))}
                      </ScrollView>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Thông tin liên hệ ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Thông tin</Text>
            <View style={s.infoCard}>
              <InfoRow
                icon="location-sharp"
                label="Địa chỉ"
                value={
                  restaurant.address || restaurant.location || restaurant.city
                }
                onPress={openMap}
              />
              <View style={s.divider} />
              <InfoRow
                icon="time-outline"
                label="Giờ mở cửa"
                value={`${restaurant.openTime} – ${restaurant.closeTime}`}
                valueColor={open ? "#22C55E" : "#EF4444"}
              />
              {restaurant.phone ? (
                <>
                  <View style={s.divider} />
                  <InfoRow
                    icon="call-outline"
                    label="Điện thoại"
                    value={restaurant.phone}
                    onPress={callPhone}
                  />
                </>
              ) : null}
              {restaurant.city ? (
                <>
                  <View style={s.divider} />
                  <InfoRow
                    icon="business-outline"
                    label="Thành phố"
                    value={restaurant.city}
                  />
                </>
              ) : null}
            </View>
          </View>

          {/* ── Ngày mở cửa ── */}
          {restaurant.openDays?.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Ngày mở cửa</Text>
              <View style={s.daysRow}>
                {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => {
                  const active = restaurant.openDays.includes(d);
                  return (
                    <View
                      key={d}
                      style={[s.dayChip, active ? s.dayOpen : s.dayClosed]}
                    >
                      <Text
                        style={[
                          s.dayText,
                          active ? s.dayTextOpen : s.dayTextClosed,
                        ]}
                      >
                        {DAY_LABEL[d]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Bottom spacer for CTA bar */}
          <View style={{ height: 110 }} />
        </View>
      </ScrollView>

      {/* ════════════ BOTTOM CTA BAR ════════════ */}
      <View style={s.bottomBar}>
        {/* Nút gọi điện */}
        <TouchableOpacity
          style={s.callBtn}
          onPress={callPhone}
          activeOpacity={0.85}
          disabled={!restaurant.phone}
        >
          <Ionicons
            name="call-outline"
            size={22}
            color={restaurant.phone ? PRIMARY : TEXT_MUTED}
          />
        </TouchableOpacity>

        {/* Nút chỉ đường */}
        <TouchableOpacity
          style={s.mapBtn}
          onPress={openMap}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={GRAD}
            style={s.mapBtnInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="navigate-outline" size={20} color="#fff" />
            <Text style={s.mapBtnText}>Chỉ đường</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Nút đặt bàn */}
        <TouchableOpacity
          style={s.bookBtn}
          onPress={() =>
            router.push({
              pathname: "/booking/select-table" as any,
              params: {
                restaurantId: restaurant._id,
                restaurantName: restaurant.name,
              },
            })
          }
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#1A1A1A", "#374151"]}
            style={s.mapBtnInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="calendar-outline" size={20} color="#fff" />
            <Text style={s.mapBtnText}>Đặt bàn</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },

  // ── Loading / Error
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: { fontSize: 14, color: TEXT_MUTED },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
    gap: 10,
  },
  errorTitle: { fontSize: 20, fontWeight: "800", color: TEXT, marginTop: 6 },
  errorText: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: PRIMARY,
    borderRadius: 14,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  backLink: { marginTop: 6, paddingVertical: 8 },
  backLinkText: { fontSize: 14, color: PRIMARY, fontWeight: "600" },

  // ── Hero
  heroWrap: { width: SW, height: 320, position: "relative" },
  heroImg: { width: SW, height: 320 },
  heroTop: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  heroTopRight: { flexDirection: "row", gap: 8 },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBtnFav: { backgroundColor: "rgba(255,255,255,0.92)" },
  dotRow: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: { width: 18, backgroundColor: "#fff" },
  heroBadge: {
    position: "absolute",
    bottom: 42,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeText: { fontSize: 11, color: "#fff", fontWeight: "700" },
  imgCounter: {
    position: "absolute",
    bottom: 14,
    right: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  imgCounterText: { fontSize: 11, color: "#fff", fontWeight: "600" },

  // ── Content area (white sheet)
  content: {
    backgroundColor: BG,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -26,
    paddingTop: 24,
  },

  // ── Title section
  titleSection: { paddingHorizontal: 20, marginBottom: 14 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  nameText: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    color: TEXT,
    marginRight: 10,
    letterSpacing: -0.3,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusOpen: { borderColor: "#22C55E33", backgroundColor: "#F0FDF4" },
  statusClosed: { borderColor: "#EF444433", backgroundColor: "#FEF2F2" },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: "700" },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  cuisineLabel: { fontSize: 14, color: TEXT_SEC },
  metaDot: { color: TEXT_MUTED },
  priceLabel: { fontSize: 14, fontWeight: "800" },
  priceRangeText: { fontSize: 13, color: TEXT_MUTED },

  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  starsRow: { flexDirection: "row", gap: 2 },
  ratingNum: { fontSize: 16, fontWeight: "900", color: TEXT },
  ratingCount: { fontSize: 13, color: TEXT_MUTED },

  // ── Tags
  tagsRow: { gap: 8, paddingHorizontal: 20, paddingBottom: 16 },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#FFF3ED",
    borderRadius: 20,
  },
  tagText: { fontSize: 12, color: PRIMARY, fontWeight: "700" },

  // ── Quick stats strip
  statsStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: SURFACE,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statIcon: { fontSize: 20, marginBottom: 2 },
  statValue: { fontSize: 15, fontWeight: "800", color: TEXT },
  statLabel: { fontSize: 10, color: TEXT_MUTED, textAlign: "center" },
  statDivider: { width: 1, backgroundColor: BORDER, marginVertical: 6 },

  // ── Sections
  section: { paddingHorizontal: 20, marginBottom: 22 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 12,
  },
  descText: { fontSize: 14, color: TEXT_SEC, lineHeight: 23 },
  reviewLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewLoadingText: { fontSize: 12, color: TEXT_MUTED },
  emptyReviewText: { fontSize: 13, color: TEXT_MUTED },
  reviewList: { gap: 12 },
  reviewCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    gap: 8,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewName: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT,
  },
  reviewStars: { flexDirection: "row", gap: 2 },
  reviewComment: { fontSize: 13, color: TEXT_SEC, lineHeight: 20 },
  reviewImages: { gap: 8 },
  reviewImage: {
    width: 92,
    height: 92,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  writeReviewCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  writeReviewTitle: { fontSize: 13, fontWeight: "800", color: TEXT },
  writeStarsRow: { flexDirection: "row", gap: 8 },
  writeReviewInput: {
    minHeight: 84,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: TEXT,
    textAlignVertical: "top",
    fontSize: 13,
  },
  addReviewImageBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F9FAFB",
  },
  addReviewImageText: { fontSize: 12, color: "#374151", fontWeight: "700" },
  reviewImageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reviewImageWrap: { position: "relative" },
  removeReviewImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  submitReviewBtn: {
    marginTop: 2,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    paddingVertical: 11,
    alignItems: "center",
  },
  submitReviewBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  // ── Info card
  infoCard: {
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF3ED",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoValue: { fontSize: 14, color: TEXT, fontWeight: "500" },
  infoLink: { color: PRIMARY },
  divider: { height: 1, backgroundColor: BORDER, marginLeft: 64 },

  // ── Days
  daysRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  dayChip: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dayOpen: { backgroundColor: "#FFF3ED", borderColor: PRIMARY + "55" },
  dayClosed: { backgroundColor: "#F9FAFB", borderColor: BORDER },
  dayText: { fontSize: 12, fontWeight: "800" },
  dayTextOpen: { color: PRIMARY },
  dayTextClosed: { color: TEXT_MUTED },

  // ── Social
  socialRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: SURFACE,
  },
  socialLabel: { fontSize: 13, fontWeight: "700" },

  // ── Bottom CTA bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 30,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 12,
  },
  callBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
  },
  mapBtn: { flex: 1, borderRadius: 14, overflow: "hidden" },
  bookBtn: { flex: 1, borderRadius: 14, overflow: "hidden" },
  mapBtnInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 52,
  },
  mapBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
