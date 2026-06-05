import React, { useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";
import { PartnerBottomNav } from "../../components/partner/PartnerBottomNav";
import { partnerDashboardAPI } from "../../services/api";
import { hasPartnerPermission } from "../../constants/partnerPermissions";
import { useTranslation } from "../../i18n/useTranslation";

type OpenDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const DAY_OPTIONS: Array<{ key: OpenDay; label: string }> = [
  { key: "mon", label: "T2" },
  { key: "tue", label: "T3" },
  { key: "wed", label: "T4" },
  { key: "thu", label: "T5" },
  { key: "fri", label: "T6" },
  { key: "sat", label: "T7" },
  { key: "sun", label: "CN" },
];

const CUISINE_OPTIONS = [
  "Việt Nam",
  "Nhật Bản",
  "Hàn Quốc",
  "Âu",
  "Fusion",
  "BBQ",
  "Hải sản",
  "Cafe",
];

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800";

type SubscriptionPlan = "pro" | "premium";

const SUBSCRIPTION_PLANS: Array<{
  key: SubscriptionPlan;
  title: string;
  subtitle: string;
  monthlyFee: string;
  setupFee: string;
  tone: "base" | "premium";
  perks: string[];
}> = [
  {
    key: "pro",
    title: "Gói cơ bản (Pro)",
    subtitle: "Dành cho nhà hàng mới bắt đầu nhận đặt bàn",
    monthlyFee: "Miễn phí tháng",
    setupFee: "Phí khởi tạo 799k/tháng",
    tone: "base",
    perks: ["Quản lý hồ sơ nhà hàng", "Nhận và xử lý đặt bàn", "Quản lý bàn cơ bản"],
  },
  {
    key: "premium",
    title: "Gói thông dụng (Premium)",
    subtitle: "Tăng độ phủ và được ưu tiên hiển thị trên trang chủ",
    monthlyFee: "699k/tháng",
    setupFee: "Phí khởi tạo 599k/tháng",
    tone: "premium",
    perks: ["Ưu tiên hiển thị trên trang chủ", "Nhãn Premium nổi bật", "Phù hợp nhà hàng muốn tăng khách"],
  },
];

export default function PartnerProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { logout, partner, loadPartner } = usePartnerAuthStore();
  const canManageStaff = hasPartnerPermission(partner?.role, "staff:view");

  const [pendingCount, setPendingCount] = useState(0);
  const [showAccountCenter, setShowAccountCenter] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAccountCenterMenu, setShowAccountCenterMenu] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(
    partner?.subscriptionPackage === "premium" ? "premium" : "pro",
  );

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [coverImage, setCoverImage] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [hasParking, setHasParking] = useState(false);
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("22:00");

  const [openDays, setOpenDays] = useState<OpenDay[]>([]);
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [website, setWebsite] = useState("");

  const getCuisineDisplay = (cuisineValue: string): string => {
    const cuisineMap: Record<string, string> = {
      "Việt Nam": t("partner.profile.cuisineVietnamese"),
      "Nhật Bản": t("partner.profile.cuisineJapanese"),
      "Hàn Quốc": t("partner.profile.cuisineKorean"),
      "Âu": t("partner.profile.cuisineWestern"),
      "Fusion": t("partner.profile.cuisineFusion"),
      "BBQ": t("partner.profile.cuisineBBQ"),
      "Hải sản": t("partner.profile.cuisineSeafood"),
      "Cafe": t("partner.profile.cuisineCafe"),
    };
    return cuisineMap[cuisineValue] || cuisineValue;
  };

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const [overviewRes, profileRes] = await Promise.all([
          partnerDashboardAPI.getOverview(),
          partnerDashboardAPI.getRestaurantProfile(),
        ]);

        setPendingCount(overviewRes.data?.overview?.pendingOrders || 0);

        const profile = profileRes.data?.restaurant || {};
        setCoverImage(profile.coverImage || "");
        setName(profile.name || "");
        setAddress(profile.address || "");
        setCity(profile.city || "");
        setPhone(profile.phone || "");
        setDescription(profile.description || "");
        setIntroduction(profile.introduction || "");
        setCuisine(profile.cuisine || "");
        setHasParking(!!profile.hasParking);
        setOpenTime(profile.openTime || "08:00");
        setCloseTime(profile.closeTime || "22:00");

        setOpenDays((profile.openDays || []) as OpenDay[]);
        setFacebook(profile.facebook || "");
        setInstagram(profile.instagram || "");
        setTiktok(profile.tiktok || "");
        setWebsite(profile.website || "");
      } catch {
        setPendingCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, []);

  const toggleOpenDay = (day: OpenDay) => {
    setOpenDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("common.notification"), "Vui lòng cấp quyền thư viện ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setCoverImage(result.assets[0]?.uri || "");
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("common.notification"), "Vui lòng cấp quyền camera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setCoverImage(result.assets[0]?.uri || "");
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert(t("common.notification"), t("partner.profile.nameRequired"));
      return;
    }

    try {
      setIsSaving(true);
      const sortedDays = DAY_OPTIONS.map((d) => d.key).filter((d) =>
        openDays.includes(d),
      );

      await partnerDashboardAPI.updateRestaurantProfile({
        coverImage,
        name,
        address,
        city,
        phone,
        description,
        introduction,
        cuisine,
        hasParking,
        openTime,
        closeTime,
        openDays: sortedDays,
        facebook,
        instagram,
        tiktok,
        website,
      });

      Alert.alert(t("common.success"), t("partner.profile.updateSuccess"));
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Không thể cập nhật hồ sơ nhà hàng";
      Alert.alert(t("common.error"), message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert(t("common.notification"), "Vui lòng điền đầy đủ thông tin.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t("common.error"), "Mật khẩu mới không khớp.");
      return;
    }

    try {
      setIsSaving(true);
      // TODO: Gọi API đổi mật khẩu
      Alert.alert(t("common.success"), t("partner.profile.changePasswordSuccess"));
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowChangePassword(false);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Không thể đổi mật khẩu";
      Alert.alert(t("common.error"), message);
    } finally {
      setIsSaving(false);
    }
  };

  const currentPlan =
    partner?.subscriptionPackage === "premium" ? "premium" : "pro";

  const openSubscription = () => {
    setSelectedPlan(currentPlan);
    setShowSubscriptionModal(true);
  };

  const handlePaySubscription = () => {
    const plan = SUBSCRIPTION_PLANS.find((item) => item.key === selectedPlan);
    if (!plan) return;

    if (selectedPlan === currentPlan) {
      Alert.alert(t("common.notification"), "Nhà hàng đang sử dụng gói này.");
      return;
    }

    Alert.alert(
      "Thanh toán gói",
      `Xác nhận thanh toán ${plan.monthlyFee} để nâng cấp lên ${plan.title}?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: "Thanh toán",
          onPress: async () => {
            try {
              setIsSaving(true);
              await partnerDashboardAPI.upgradeSubscription({
                package: selectedPlan,
                paymentMethod: "in_app",
              });
              await loadPartner();
              setShowSubscriptionModal(false);
              Alert.alert(
                t("common.success"),
                "Thanh toán thành công. Nhà hàng đã được ưu tiên hiển thị trên trang chủ.",
              );
            } catch (error: any) {
              const message =
                error?.response?.data?.message || "Không thể nâng cấp gói.";
              Alert.alert(t("common.error"), message);
            } finally {
              setIsSaving(false);
            }
          },
        },
      ],
    );
  };
  const openVoucher = () => {
    Alert.alert(t("partner.profile.voucher"), t("partner.profile.voucherComingSoon"));
  };
  const openTerms = () => {
    router.push("/partner-terms");
  };
  const openSupport = () => {
    Alert.alert(t("partner.profile.support"), t("partner.profile.supportInfo"));
  };

  const handleLogout = () => {
    Alert.alert(t("partner.profile.logout"), t("partner.profile.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("partner.profile.logout"),
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/welcome");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
      >
        <Text style={styles.title}>{t("partner.profile.title")}</Text>

        <TouchableOpacity style={[styles.card, styles.accountCenterCard]} onPress={() => setShowAccountCenterMenu(!showAccountCenterMenu)}>
          <View style={[styles.menuItem, styles.accountCenterMenuItem]}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="settings-outline" size={18} color="#374151" />
              <Text style={[styles.menuItemText, styles.accountCenterMenuText]}>{t("partner.profile.accountCenter")}</Text>
            </View>
            <Ionicons name={showAccountCenterMenu ? "chevron-up" : "chevron-down"} size={16} color="#9CA3AF" />
          </View>
        </TouchableOpacity>



        {canManageStaff && (
          <>
            <TouchableOpacity
              style={styles.teamEntryBtn}
              onPress={() => router.push("/partner-team")}
            >
              <Ionicons name="people-outline" size={16} color="#FF6B35" />
              <Text style={styles.teamEntryText}>{t("partner.profile.staffManagement")}</Text>
              <Ionicons name="chevron-forward-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>


          </>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("partner.profile.coverImage")}</Text>
          <Image
            source={{ uri: coverImage || FALLBACK_COVER }}
            style={styles.coverImage}
          />
          <View style={styles.coverActions}>
            <TouchableOpacity style={styles.coverBtn} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={16} color="#374151" />
              <Text style={styles.coverBtnText}>{t("partner.tables.camera")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.coverBtn} onPress={pickFromLibrary}>
              <Ionicons name="images-outline" size={16} color="#374151" />
              <Text style={styles.coverBtnText}>{t("partner.tables.library")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("partner.profile.services")}</Text>

          <View
            style={[
              styles.subscriptionSummary,
              currentPlan === "premium" && styles.subscriptionSummaryPremium,
            ]}
          >
            <View style={styles.subscriptionSummaryLeft}>
              <View
                style={[
                  styles.subscriptionIcon,
                  currentPlan === "premium" && styles.subscriptionIconPremium,
                ]}
              >
                <Ionicons
                  name={currentPlan === "premium" ? "sparkles-outline" : "diamond-outline"}
                  size={18}
                  color={currentPlan === "premium" ? "#7C3AED" : "#FF6B35"}
                />
              </View>
              <View style={styles.subscriptionSummaryText}>
                <Text style={styles.subscriptionSummaryTitle}>
                  {currentPlan === "premium"
                    ? "Gói thông dụng (Premium)"
                    : "Gói cơ bản (Pro)"}
                </Text>
                <Text style={styles.subscriptionSummarySub}>
                  {currentPlan === "premium"
                    ? "Đang được ưu tiên hiển thị trên trang chủ"
                    : "Miễn phí tháng, có thể nâng cấp bất cứ lúc nào"}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.subscriptionBadge,
                currentPlan === "premium" && styles.subscriptionBadgePremium,
              ]}
            >
              {currentPlan === "premium" ? "Premium" : "Pro"}
            </Text>
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={openSubscription}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="diamond-outline" size={18} color="#374151" />
              <Text style={styles.menuItemText}>Chọn gói & thanh toán</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={openVoucher}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="ticket-outline" size={18} color="#374151" />
              <Text style={styles.menuItemText}>{t("partner.profile.voucher")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={openTerms}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-outline" size={18} color="#374151" />
              <Text style={styles.menuItemText}>{t("partner.profile.terms")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={openSupport}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-buoy-outline" size={18} color="#374151" />
              <Text style={styles.menuItemText}>{t("partner.profile.support")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={16} color="#EF4444" />
          <Text style={styles.logoutText}>{t("partner.profile.logout")}</Text>
        </TouchableOpacity>

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.loadingText}>{t("partner.profile.syncing")}</Text>
          </View>
        )}
      </ScrollView>
      <PartnerBottomNav pendingCount={pendingCount} />

      <Modal
        visible={showAccountCenter}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAccountCenter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("partner.profile.accountCenter")}</Text>
              <TouchableOpacity onPress={() => setShowAccountCenter(false)}>
                <Ionicons name="close-outline" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setShowAccountCenter(false);
              }}
            >
              <Ionicons name="document-outline" size={18} color="#FF6B35" />
              <Text style={styles.modalBtnText}>{t("partner.profile.title")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setShowAccountCenter(false);
                Alert.alert(t("partner.profile.changePasswordTitle"), t("partner.profile.changePasswordComingSoon"));
              }}
            >
              <Ionicons name="lock-closed-outline" size={18} color="#FF6B35" />
              <Text style={styles.modalBtnText}>{t("partner.profile.changePasswordTitle")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowAccountCenter(false)}
            >
              <Text style={styles.modalCloseBtnText}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditProfile}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
            <View style={styles.modalHeader2}>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
              </TouchableOpacity>
              <Text style={styles.modalTitle2}>{t("partner.profile.title")}</Text>
              <View style={{ width: 24 }} />
            </View>

            <Image
              source={{ uri: coverImage || FALLBACK_COVER }}
              style={styles.coverImage}
            />
            <View style={styles.coverActions}>
              <TouchableOpacity style={styles.coverBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={16} color="#374151" />
                <Text style={styles.coverBtnText}>{t("partner.tables.camera")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.coverBtn} onPress={pickFromLibrary}>
                <Ionicons name="images-outline" size={16} color="#374151" />
                <Text style={styles.coverBtnText}>{t("partner.tables.library")}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t("partner.profile.nameLabel")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("partner.profile.namePlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>{t("partner.profile.addressLabel")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("partner.profile.addressPlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={address}
              onChangeText={setAddress}
            />

            <Text style={styles.inputLabel}>{t("partner.profile.cityLabel")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("partner.profile.cityPlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={city}
              onChangeText={setCity}
            />

            <Text style={styles.inputLabel}>{t("partner.profile.phoneLabel")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("partner.profile.phonePlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.inputLabel}>{t("partner.profile.descriptionLabel")}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t("partner.profile.descriptionPlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Text style={styles.inputLabel}>{t("partner.profile.introLabel")}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t("partner.profile.introPlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={introduction}
              onChangeText={setIntroduction}
              multiline
            />

            <Text style={styles.sectionTitle}>{t("partner.profile.cuisine")}</Text>
            <View style={styles.cuisineWrap}>
              {CUISINE_OPTIONS.map((item) => {
                const active = cuisine === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.cuisineChip,
                      active && styles.cuisineChipActive,
                    ]}
                    onPress={() => setCuisine(item)}
                  >
                    <Text
                      style={[
                        styles.cuisineChipText,
                        active && styles.cuisineChipTextActive,
                      ]}
                    >
                      {getCuisineDisplay(item)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>{t("partner.profile.parking")}</Text>
            <View style={styles.parkingRow}>
              <Text style={styles.parkingLabel}>{t("partner.profile.parking")}</Text>
              <TouchableOpacity
                style={[
                  styles.parkingToggleTrack,
                  hasParking
                    ? styles.parkingToggleTrackOn
                    : styles.parkingToggleTrackOff,
                ]}
                onPress={() => setHasParking((v) => !v)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.parkingToggleThumb,
                    hasParking
                      ? styles.parkingToggleThumbOn
                      : styles.parkingToggleThumbOff,
                  ]}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>{t("partner.profile.openTime")}</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeCol}>
                <Text style={styles.inputLabel}>{t("partner.profile.openTime")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="08:00"
                  placeholderTextColor="#9CA3AF"
                  value={openTime}
                  onChangeText={setOpenTime}
                />
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.inputLabel}>{t("partner.profile.closeTime")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="22:00"
                  placeholderTextColor="#9CA3AF"
                  value={closeTime}
                  onChangeText={setCloseTime}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>{t("partner.profile.openDays")}</Text>
            <View style={styles.daysRow}>
              {DAY_OPTIONS.map((day) => {
                const active = openDays.includes(day.key);
                return (
                  <TouchableOpacity
                    key={day.key}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                    onPress={() => toggleOpenDay(day.key)}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        active && styles.dayChipTextActive,
                      ]}
                    >
                      {t(`partner.dashboard.${day.key}` as any)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>{t("partner.profile.social")}</Text>

            <Text style={styles.inputLabel}>Facebook</Text>
            <TextInput
              style={styles.input}
              placeholder={t("partner.profile.facebookPlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={facebook}
              onChangeText={setFacebook}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Instagram</Text>
            <TextInput
              style={styles.input}
              placeholder={t("partner.profile.instagramPlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={instagram}
              onChangeText={setInstagram}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>TikTok</Text>
            <TextInput
              style={styles.input}
              placeholder={t("partner.profile.tiktokPlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={tiktok}
              onChangeText={setTiktok}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Website</Text>
            <TextInput
              style={styles.input}
              placeholder={t("partner.profile.websitePlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={website}
              onChangeText={setWebsite}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>{t("partner.profile.saveButton")}</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={showAccountCenterMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAccountCenterMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.accountCenterModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("partner.profile.accountCenter")}</Text>
              <TouchableOpacity onPress={() => setShowAccountCenterMenu(false)}>
                <Ionicons name="close-outline" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setShowAccountCenterMenu(false);
                setShowEditProfile(true);
              }}
            >
              <Ionicons name="document-outline" size={18} color="#FF6B35" />
              <Text style={styles.modalBtnText}>{t("partner.profile.title")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setShowAccountCenterMenu(false);
                setShowChangePassword(true);
              }}
            >
              <Ionicons name="lock-closed-outline" size={18} color="#FF6B35" />
              <Text style={styles.modalBtnText}>{t("partner.profile.changePasswordTitle")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowAccountCenterMenu(false)}
            >
              <Text style={styles.modalCloseBtnText}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showChangePassword}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("partner.profile.changePasswordTitle")}</Text>
              <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                <Ionicons name="close-outline" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t("partner.profile.currentPassword")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("partner.profile.currentPassword")}
              placeholderTextColor="#9CA3AF"
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
            />

            <Text style={styles.inputLabel}>{t("partner.profile.newPassword")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("partner.profile.newPassword")}
              placeholderTextColor="#9CA3AF"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <Text style={styles.inputLabel}>{t("partner.profile.confirmPassword")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("partner.profile.confirmPassword")}
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleChangePassword}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-outline" size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>{t("partner.profile.changePasswordTitle")}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowChangePassword(false)}
            >
              <Text style={styles.modalCloseBtnText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSubscriptionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSubscriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.subscriptionModal]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Gói đối tác</Text>
                <Text style={styles.subscriptionModalSub}>
                  Tháng đầu miễn phí khởi tạo cho cả 2 gói
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSubscriptionModal(false)}>
                <Ionicons name="close-outline" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <View style={styles.planGrid}>
              {SUBSCRIPTION_PLANS.map((plan) => {
                const active = selectedPlan === plan.key;
                const isCurrent = currentPlan === plan.key;
                const premium = plan.tone === "premium";

                return (
                  <TouchableOpacity
                    key={plan.key}
                    activeOpacity={0.9}
                    style={[
                      styles.planCard,
                      active && styles.planCardActive,
                      premium && styles.planCardPremium,
                      active && premium && styles.planCardPremiumActive,
                    ]}
                    onPress={() => setSelectedPlan(plan.key)}
                  >
                    <View style={styles.planTopRow}>
                      <View style={styles.planTitleWrap}>
                        <Text style={styles.planTitle}>{plan.title}</Text>
                        <Text style={styles.planSubtitle}>{plan.subtitle}</Text>
                      </View>
                      <View
                        style={[
                          styles.planRadio,
                          active && styles.planRadioActive,
                          premium && active && styles.planRadioPremium,
                        ]}
                      >
                        {active && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    </View>

                    <View style={styles.planPriceRow}>
                      <Text
                        style={[
                          styles.planPrice,
                          premium && styles.planPricePremium,
                        ]}
                      >
                        {plan.monthlyFee}
                      </Text>
                      {isCurrent && <Text style={styles.currentPlanPill}>Đang dùng</Text>}
                    </View>
                    <Text style={styles.planSetup}>{plan.setupFee}</Text>

                    <View style={styles.planPerks}>
                      {plan.perks.map((perk) => (
                        <View key={perk} style={styles.planPerkRow}>
                          <Ionicons
                            name="checkmark-circle"
                            size={15}
                            color={premium ? "#7C3AED" : "#FF6B35"}
                          />
                          <Text style={styles.planPerkText}>{perk}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.payBtn,
                selectedPlan === currentPlan && styles.payBtnDisabled,
              ]}
              onPress={handlePaySubscription}
              disabled={isSaving || selectedPlan === currentPlan}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={17} color="#fff" />
                  <Text style={styles.payBtnText}>
                    {selectedPlan === currentPlan
                      ? "Đang sử dụng gói này"
                      : selectedPlan === "premium"
                        ? "Thanh toán 699k/tháng"
                        : "Chọn gói cơ bản"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 24, gap: 12 },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    padding: 14,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  teamEntryBtn: {
    marginTop: 4,
    marginBottom: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamEntryText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#C2410C",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  coverImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  coverActions: {
    flexDirection: "row",
    gap: 8,
  },
  coverBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  coverBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
    fontSize: 13,
  },
  textArea: {
    minHeight: 86,
    textAlignVertical: "top",
  },
  cuisineWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cuisineChip: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
  },
  cuisineChipActive: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF3ED",
  },
  cuisineChipText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  cuisineChipTextActive: { color: "#FF6B35" },
  parkingRow: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  parkingLabel: { fontSize: 14, color: "#374151", fontWeight: "800" },
  parkingToggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 999,
    paddingHorizontal: 3,
    justifyContent: "center",
  },
  parkingToggleTrackOn: {
    backgroundColor: "#FF6B35",
  },
  parkingToggleTrackOff: {
    backgroundColor: "#E5E7EB",
  },
  parkingToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  parkingToggleThumbOn: {
    alignSelf: "flex-end",
  },
  parkingToggleThumbOff: {
    alignSelf: "flex-start",
  },
  timeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: -2,
    marginBottom: 6,
  },
  timeCol: { flex: 1 },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    minWidth: 44,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  dayChipActive: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF3ED",
  },
  dayChipText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  dayChipTextActive: { color: "#FF6B35" },
  saveBtn: {
    marginTop: 12,
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  saveBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  menuItem: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuItemText: { fontSize: 13, fontWeight: "700", color: "#111827" },
  logoutBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  logoutText: { fontSize: 13, fontWeight: "700", color: "#EF4444" },
  loadingRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: { fontSize: 12, color: "#9CA3AF" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  modalBtn: { borderWidth: 1, borderColor: "#FED7AA", borderRadius: 12, backgroundColor: "#FFF7ED", paddingHorizontal: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  modalBtnText: { fontSize: 14, fontWeight: "700", color: "#C2410C" },
  modalCloseBtn: { marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB", paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  modalCloseBtnText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  modalHeader2: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#EEF0F3" },
  modalTitle2: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  saveText: { fontSize: 14, fontWeight: "700", color: "#FF6B35" },
  infoSection: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#EEF0F3" },
  infoLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280", marginBottom: 6 },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#111827", lineHeight: 20 },
  editBtn: { marginTop: 16, backgroundColor: "#FF6B35", borderRadius: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  editBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  accountCenterCard: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginHorizontal: 0,
    marginVertical: 8,
    borderWidth: 1
  },
  accountCenterMenuItem: { paddingVertical: 16, paddingHorizontal: 12, borderWidth: 0 },
  accountCenterMenuText: { fontSize: 14, fontWeight: "800" },
  subscriptionSummary: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  subscriptionSummaryPremium: {
    borderColor: "#DDD6FE",
    backgroundColor: "#F5F3FF",
  },
  subscriptionSummaryLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  subscriptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  subscriptionIconPremium: {
    backgroundColor: "#EDE9FE",
  },
  subscriptionSummaryText: { flex: 1 },
  subscriptionSummaryTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  subscriptionSummarySub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    lineHeight: 16,
  },
  subscriptionBadge: {
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FFEDD5",
    color: "#C2410C",
    fontSize: 11,
    fontWeight: "900",
  },
  subscriptionBadgePremium: {
    backgroundColor: "#EDE9FE",
    color: "#6D28D9",
  },
  subscriptionModal: {
    maxHeight: "88%",
  },
  subscriptionModalSub: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  planGrid: {
    gap: 12,
  },
  planCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 10,
  },
  planCardActive: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF7ED",
  },
  planCardPremium: {
    borderColor: "#DDD6FE",
  },
  planCardPremiumActive: {
    borderColor: "#8B5CF6",
    backgroundColor: "#F5F3FF",
  },
  planTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  planTitleWrap: { flex: 1 },
  planTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },
  planSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    lineHeight: 17,
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioActive: {
    borderColor: "#FF6B35",
    backgroundColor: "#FF6B35",
  },
  planRadioPremium: {
    borderColor: "#8B5CF6",
    backgroundColor: "#8B5CF6",
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "900",
    color: "#C2410C",
  },
  planPricePremium: {
    color: "#6D28D9",
  },
  currentPlanPill: {
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: "#DCFCE7",
    color: "#15803D",
    fontSize: 10,
    fontWeight: "900",
  },
  planSetup: {
    marginTop: -6,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },
  planPerks: {
    gap: 7,
  },
  planPerkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  planPerkText: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
    lineHeight: 17,
  },
  payBtn: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  payBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  payBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  dropdownContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F3",
    gap: 10
  },
  dropdownItemText: { fontSize: 13, fontWeight: "700", color: "#111827" },
  accountCenterModalContent: { paddingHorizontal: 16, paddingVertical: 20, gap: 12 }
});
