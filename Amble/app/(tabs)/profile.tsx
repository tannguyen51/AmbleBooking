import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { userAPI, bookingAPI } from "../../services/api";
import { useTranslation } from "../../i18n/useTranslation";

const PRIMARY = "#FF8F1F";
const GRAD: [string, string] = ["#FFD109", "#FF8F1F"];
const BG = "#FFFFFF";
const TEXT = "#1A1A1A";
const TEXT_SEC = "#6B7280";
const MUTED = "#9CA3AF";
const BORDER = "#F3F4F6";

type FavoriteRestaurant = {
  _id: string;
  name: string;
  location?: string;
  rating?: number;
  images?: string[];
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80";

// ─── Stat Card (inside header gradient) ──────────────────────────────────────
function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <View style={st.card}>
      <View style={st.iconCircle}>
        <Ionicons name={icon as any} size={18} color="#FF8F1F" />
      </View>
      <Text style={st.value}>{value}</Text>
      <Text style={st.label}>{label}</Text>
    </View>
  );
}
function StatDivider() {
  return <View style={st.divider} />;
}
const st = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF3ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  divider: { width: 1, backgroundColor: "#E8E8E8", alignSelf: "stretch", marginVertical: 4 },
  value: { fontSize: 22, fontWeight: "900", color: "#1A1A1A" },
  label: { fontSize: 11, color: "#6B7280", marginTop: 2 },
});

// ─── Menu Item (standalone card, like src) ───────────────────────────────────
function MenuItem({
  icon,
  label,
  sublabel,
  onPress,
  danger,
  badge,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  danger?: boolean;
  badge?: string;
}) {
  return (
    <TouchableOpacity
      style={[mi.wrap, danger && mi.wrapDanger]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[mi.iconBox, danger && mi.iconBoxDanger]}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[mi.label, danger && { color: "#EF4444" }]}>{label}</Text>
        {sublabel ? <Text style={mi.sub}>{sublabel}</Text> : null}
      </View>
      {badge ? (
        <View style={mi.badgeWrap}>
          <Text style={mi.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={MUTED} />
    </TouchableOpacity>
  );
}
const mi = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  wrapDanger: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF3ED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconBoxDanger: { backgroundColor: "#FFE4E6" },
  label: { fontSize: 15, fontWeight: "600", color: TEXT },
  sub: { fontSize: 12, color: MUTED, marginTop: 2 },
  badgeWrap: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginRight: 6,
  },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },
});

// ─── Input Field ──────────────────────────────────────────────────────────────
function Field({ label, ...props }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={fo.label}>{label}</Text>
      <TextInput style={fo.input} placeholderTextColor={MUTED} {...props} />
    </View>
  );
}
const fo = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "600", color: TEXT_SEC, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: TEXT,
    backgroundColor: "#F9FAFB",
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, updateUser, logout } = useAuthStore();

  const [editVisible, setEditVisible] = useState(false);
  const [pwVisible, setPwVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [bookingCount, setBookingCount] = useState(0);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [rewardTier, setRewardTier] = useState("Bronze");
  const [rewardNextTier, setRewardNextTier] = useState("Silver");
  const [rewardNeeded, setRewardNeeded] = useState(10000);
  const [rewardProgress, setRewardProgress] = useState(0);
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<
    FavoriteRestaurant[]
  >([]);

  const [editForm, setEditForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    location: user?.location || "",
  });

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!user?._id) return;
    bookingAPI
      .getUserBookings(user._id)
      .then((res: any) => {
        const done = (res.data?.bookings || []).filter((b: any) =>
          ["pending", "confirmed", "occupied", "completed"].includes(b.status),
        ).length;
        setBookingCount(done);
      })
      .catch(() => {});

    userAPI
      .getFavoriteRestaurants()
      .then((res: any) => {
        const favorites = Array.isArray(res.data?.favorites)
          ? res.data.favorites
          : [];
        setFavoriteRestaurants(favorites);
      })
      .catch(() => {
        setFavoriteRestaurants([]);
      });

    userAPI
      .getRewards()
      .then((res: any) => {
        const data = res.data || {};
        setRewardPoints(Number(data.points ?? 0));
        setRewardTier(
          String(data.currentTier?.label || data.currentTier?.id || "Bronze"),
        );
        setRewardNextTier(String(data.nextTier?.label || "MAX"));
        setRewardNeeded(Number(data.neededToNextTier ?? 0));
        setRewardProgress(
          Math.max(0, Math.min(100, Number(data.progress ?? 0))),
        );
      })
      .catch(() => {});
  }, [user?._id]);

  const handleSaveProfile = async () => {
    if (!editForm.fullName.trim()) {
      Alert.alert(t("common.error"), t("profile.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      await updateUser(editForm);
      setEditVisible(false);
      Alert.alert(t("common.success"), t("profile.updateSuccess"));
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      Alert.alert(t("common.error"), t("profile.fillRequired"));
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      Alert.alert(t("common.error"), t("profile.passwordMismatch"));
      return;
    }
    setSaving(true);
    try {
      await userAPI.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwVisible(false);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      Alert.alert(t("common.success"), t("profile.passwordChangeSuccess"));
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message);
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.fullName?.charAt(0)?.toUpperCase() || "U";

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };
  const favoritePreview = favoriteRestaurants.slice(0, 2);
  const formattedPoints = rewardPoints.toLocaleString("vi-VN");
  const remainingToNextTier = Math.max(0, rewardNeeded).toLocaleString("vi-VN");
  const reviewsCount = Math.min(5, Math.max(0, bookingCount));

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <View style={s.blobTopRight} />
        <View style={s.blobBottomLeft} />

        <View style={s.avatarRow}>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: 96, height: 96, borderRadius: 22 }} />
              ) : (
                <Text style={s.avatarText}>{initials}</Text>
              )}
            </View>
            <TouchableOpacity style={s.cameraBtn} onPress={pickAvatar}>
              <Ionicons name="camera-outline" size={14} color="#FF8F1F" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>
                {user?.fullName || t("profile.userFallback")}
              </Text>
              <TouchableOpacity onPress={() => setEditVisible(true)}>
                <Ionicons
                  name="create-outline"
                  size={16}
                  color="#FF8F1F"
                />
              </TouchableOpacity>
            </View>
            <Text style={s.sub2}>{user?.email || "user@munchmap.app"}</Text>
            <View style={s.rankBadge}>
              <Text style={s.rankEmoji}>{
                rewardTier.toLowerCase() === "platinum" ? "🏆" :
                rewardTier.toLowerCase() === "gold" ? "🥇" :
                rewardTier.toLowerCase() === "silver" ? "🥈" :
                "🥉"
              }</Text>
              <Text style={s.rankText}>{rewardTier}</Text>
            </View>
          </View>
        </View>

        <View style={s.statsRow}>
          <StatCard icon="calendar-outline" label={t("profile.statsBookings")} value={bookingCount} />
          <StatDivider />
          <StatCard icon="heart-outline" label={t("profile.statsFavorites")} value={favoriteRestaurants.length} />
          <StatDivider />
          <StatCard icon="star-outline" label={t("profile.statsReviews")} value={reviewsCount} />
        </View>
      </View>

      <View style={s.body}>
        <View style={s.rewardsCard}>
          <View style={s.rowBetween}>
            <View style={s.sectionHeadLeft}>
              <Ionicons name="ribbon-outline" size={17} color={PRIMARY} />
              <Text style={s.rewardsTitle}>{t("profile.rewardsPoints")}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/rewards" as any)}>
              <Text style={s.moreText}>{t("profile.rewardsDetail")}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.rewardsMain}>
            <View>
              <Text style={s.pointsValue}>{formattedPoints}</Text>
              <Text style={s.pointsSub}>{t("profile.rewardsPointsEarned")}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.rowBetween}>
                <Text style={s.tierLeft}>{
                  rewardTier.toLowerCase() === "platinum" ? "🏆" :
                  rewardTier.toLowerCase() === "gold" ? "🥇" :
                  rewardTier.toLowerCase() === "silver" ? "🥈" :
                  "🥉"
                } {rewardTier}</Text>
                <Text style={s.tierRight}>{rewardNextTier}</Text>
              </View>
              <View style={s.progressTrack}>
                <View
                  style={[s.progressFill, { width: `${rewardProgress}%` }]}
                />
              </View>
              <Text style={s.progressText}>
                còn {remainingToNextTier}đ → {rewardNextTier}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.rowBetweenSection}>
          <View style={s.sectionHeadLeft}>
            <Text style={s.favoriteTitle}>{t("profile.favoritesTitle")}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/favorites" as any)}>
            <Text style={s.moreText}>{t("common.viewAll")}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.favoritesGrid}>
          {favoritePreview.map((item: FavoriteRestaurant) => (
            <TouchableOpacity
              key={item._id}
              style={s.favoriteCard}
              activeOpacity={0.88}
            >
              <Image
                source={{ uri: item.images?.[0] || FALLBACK_IMAGE }}
                style={s.favoriteImage}
              />
              <View style={s.favoriteBody}>
                <Text style={s.favoriteName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={s.favoriteMeta} numberOfLines={1}>
                  {Number(item.rating || 0).toFixed(1)} ⭐ •{" "}
                  {item.location || "--"}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          {favoritePreview.length === 0 && (
            <View style={s.emptyFavCard}>
              <Text style={s.emptyFavText}>{t("profile.favoritesEmpty")}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={s.rewardMenu}
          onPress={() => router.push("/rewards" as any)}
          activeOpacity={0.8}
        >
          <View style={s.menuLeft}>
            <View style={s.menuIcon}>
              <Text style={{ fontSize: 16 }}>🏆</Text>
            </View>
            <Text style={s.menuLabel}>{t("profile.menuRewards")}</Text>
          </View>
          <View style={s.menuRight}>
            <View style={s.newBadge}>
              <Text style={s.newBadgeText}>{t("profile.menuNew")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </View>
        </TouchableOpacity>

        <View style={{ marginTop: 12, marginBottom: 100, gap: 8 }}>
          <MenuItem
            icon="📋"
            label={t("profile.menuHistory")}
            onPress={() => router.push("/history" as any)}
          />
          <MenuItem
            icon="🔒"
            label={t("profile.menuChangePassword")}
            onPress={() => setPwVisible(true)}
          />
          <MenuItem
            icon="🚪"
            label={t("profile.menuLogout")}
            onPress={() => setLogoutVisible(true)}
            danger
          />
        </View>
      </View>

      {/* ══ EDIT PROFILE MODAL ══════════════════════ */}
      <Modal visible={editVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={mo.overlay}
        >
          <View style={mo.sheet}>
            <View style={mo.handle} />
            <Text style={mo.title}>{t("profile.editTitle")}</Text>
            <Field
              label={t("profile.nameLabel")}
              placeholder={t("profile.namePlaceholder")}
              value={editForm.fullName}
              onChangeText={(v: string) =>
                setEditForm({ ...editForm, fullName: v })
              }
            />
            <Field
              label={t("profile.phoneLabel")}
              placeholder={t("profile.phonePlaceholder")}
              value={editForm.phone}
              onChangeText={(v: string) =>
                setEditForm({ ...editForm, phone: v })
              }
              keyboardType="phone-pad"
            />
            <Field
              label={t("profile.addressLabel")}
              placeholder={t("profile.addressPlaceholder")}
              value={editForm.location}
              onChangeText={(v: string) =>
                setEditForm({ ...editForm, location: v })
              }
            />
            <View style={mo.row}>
              <TouchableOpacity
                style={mo.cancelBtn}
                onPress={() => setEditVisible(false)}
              >
                <Text style={mo.cancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={mo.saveBtn}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={mo.saveText}>{t("common.save")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══ CHANGE PASSWORD MODAL ═══════════════════ */}
      <Modal visible={pwVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={mo.overlay}
        >
          <View style={mo.sheet}>
            <View style={mo.handle} />
            <Text style={mo.title}>{t("profile.menuChangePassword")}</Text>
            <Field
              label={t("profile.currentPasswordLabel")}
              placeholder={t("profile.currentPasswordPlaceholder")}
              value={pwForm.currentPassword}
              onChangeText={(v: string) =>
                setPwForm({ ...pwForm, currentPassword: v })
              }
              secureTextEntry
            />
            <Field
              label={t("profile.newPasswordLabel")}
              placeholder={t("profile.newPasswordPlaceholder")}
              value={pwForm.newPassword}
              onChangeText={(v: string) =>
                setPwForm({ ...pwForm, newPassword: v })
              }
              secureTextEntry
            />
            <Field
              label={t("profile.confirmNewPasswordLabel")}
              placeholder={t("profile.confirmNewPasswordPlaceholder")}
              value={pwForm.confirmPassword}
              onChangeText={(v: string) =>
                setPwForm({ ...pwForm, confirmPassword: v })
              }
              secureTextEntry
            />
            <View style={mo.row}>
              <TouchableOpacity
                style={mo.cancelBtn}
                onPress={() => setPwVisible(false)}
              >
                <Text style={mo.cancelText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={mo.saveBtn}
                onPress={handleChangePassword}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={mo.saveText}>{t("common.save")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══ LOGOUT CONFIRM MODAL — same as src ═══════ */}
      <Modal visible={logoutVisible} animationType="fade" transparent>
        <View style={lo.overlay}>
          <View style={lo.card}>
            <Text style={{ fontSize: 52, textAlign: "center" }}>👋</Text>
            <Text style={lo.title}>{t("profile.logoutTitle")}</Text>
            <Text style={lo.sub}>{t("profile.logoutConfirm")}</Text>
            <View style={lo.row}>
              <TouchableOpacity
                style={lo.stayBtn}
                onPress={() => setLogoutVisible(false)}
              >
                <Text style={lo.stayText}>{t("profile.logoutStay")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={lo.leaveBtn}
                onPress={() => {
                  setLogoutVisible(false);
                  logout();
                }}
              >
                <Text style={lo.leaveText}>{t("profile.logoutConfirmButton")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: "#ff9c3a",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  blobTopRight: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -66,
    right: -50,
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  blobBottomLeft: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: -150,
    left: -100,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 20,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 22,
    backgroundColor: "#FFF5EA",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  avatarText: { fontSize: 30, fontWeight: "900", color: "#3F3F46" },
  cameraBtn: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 18, fontWeight: "900", color: "#1A1A1A" },
  sub: { fontSize: 13, color: "#6B7280", marginTop: 3 },
  sub2: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  rankBadge: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#FFF3ED",
    paddingHorizontal: 12,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rankEmoji: { fontSize: 12 },
  rankText: { fontSize: 13, fontWeight: "800", color: "#1A1A1A" },
  statsRow: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, paddingVertical: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  body: { paddingHorizontal: 16, paddingTop: 16 },

  rewardsCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeadLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  rewardsTitle: { fontSize: 18, fontWeight: "900", color: "#222" },
  moreText: { fontSize: 14, color: PRIMARY, fontWeight: "800" },
  rewardsMain: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pointsValue: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "900",
    color: PRIMARY,
  },
  pointsSub: { fontSize: 13, color: TEXT_SEC, marginTop: 2 },
  tierLeft: { fontSize: 13, color: "#6B7280", fontWeight: "700" },
  tierRight: { fontSize: 13, color: "#9CA3AF", fontWeight: "700" },
  progressTrack: {
    marginTop: 8,
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#FACC15",
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },

  rowBetweenSection: {
    marginTop: 18,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  favoriteTitle: { fontSize: 20, fontWeight: "900", color: "#111827" },
  favoritesGrid: { flexDirection: "row", gap: 12 },
  favoriteCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
  },
  favoriteImage: { width: "100%", height: 94 },
  favoriteBody: { padding: 10 },
  favoriteName: { fontSize: 15, fontWeight: "800", color: "#111827" },
  favoriteMeta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  emptyFavCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyFavText: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },

  rewardMenu: {
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontSize: 16, fontWeight: "800", color: "#1F2937" },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  newBadge: {
    borderRadius: 999,
    backgroundColor: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newBadgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});

const mo = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "900", color: TEXT, marginBottom: 20 },
  row: { flexDirection: "row", gap: 10, marginTop: 6 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "600", color: TEXT_SEC },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: "center",
  },
  saveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});

const lo = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 28,
    width: "100%",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: TEXT,
    textAlign: "center",
    marginTop: 12,
  },
  sub: {
    fontSize: 14,
    color: TEXT_SEC,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 28,
  },
  row: { flexDirection: "row", gap: 12 },
  stayBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: "center",
  },
  stayText: { fontSize: 14, fontWeight: "700", color: "#374151" },
  leaveBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  leaveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});