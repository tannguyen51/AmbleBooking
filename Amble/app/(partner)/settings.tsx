import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Image,
  Linking,
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
import { partnerDashboardAPI, paymentAPI, uploadAPI } from "../../services/api";
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
}> = [
  {
    key: "pro",
    title: "Gói cơ bản (Pro)",
    subtitle: "Dành cho nhà hàng mới bắt đầu nhận đặt bàn",
    monthlyFee: "Miễn phí tháng",
    setupFee: "Phí khởi tạo 799k/tháng",
    tone: "base",
  },
  {
    key: "premium",
    title: "Gói thông dụng (Premium)",
    subtitle: "Tăng độ phủ và được ưu tiên hiển thị trên trang chủ",
    monthlyFee: "699k/tháng",
    setupFee: "Phí khởi tạo 599k/tháng",
    tone: "premium",
  },
];

const PLAN_BENEFITS = [
  { feature: "Quản lý đặt bàn trực tuyến", core: "Có", premium: "Có" },
  { feature: "Quản lý thông tin khách đặt bàn", core: "Có", premium: "Có" },
  { feature: "Theo dõi lịch đặt bàn và tình trạng bàn trống", core: "Có", premium: "Có" },
  { feature: "Dashboard vận hành", core: "Cơ bản", premium: "Nâng cao" },
  { feature: "Hiển thị trong danh sách nhà hàng trên Amble", core: "Có", premium: "Có" },
  { feature: "Ưu tiên hiển thị trong khung đề xuất", core: "—", premium: "Có" },
  { feature: "Đưa nhà hàng lên mục xu hướng / nổi bật", core: "—", premium: "Có" },
];

const PRIMARY = "#FF6B35";

export default function PartnerProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { logout, partner } = usePartnerAuthStore();
  const canManageStaff = hasPartnerPermission(partner?.role, "staff:view");

  const [pendingCount, setPendingCount] = useState(0);
  const [showAccountCenter, setShowAccountCenter] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAccountCenterMenu, setShowAccountCenterMenu] = useState(false);

  // Subscription upgrade
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("pro");
  const [isUpgradePaying, setIsUpgradePaying] = useState(false);
  const [upgradeCheckoutUrl, setUpgradeCheckoutUrl] = useState<string | null>(null);
  const [upgradePaymentStatus, setUpgradePaymentStatus] = useState<"idle" | "paying" | "checking" | "success" | "failed">("idle");
  const upgradeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      // Upload ảnh nếu là local URI
      let finalCover = coverImage;
      if (coverImage && (coverImage.startsWith("file://") || coverImage.startsWith("content://"))) {
        try {
          const base64 = await fetch(coverImage).then(r => r.blob()).then(b => new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(b);
          }));
          const uploadRes = await uploadAPI.uploadImage(base64, "restaurants");
          if (uploadRes.data?.url) finalCover = uploadRes.data.url;
        } catch {}
      }
      if (finalCover && finalCover.startsWith("/uploads/")) {
        finalCover = (process.env.EXPO_PUBLIC_API_URL || "https://amblebooking-production.up.railway.app") + finalCover;
      }

      const sortedDays = DAY_OPTIONS.map((d) => d.key).filter((d) =>
        openDays.includes(d),
      );

      await partnerDashboardAPI.updateRestaurantProfile({
        coverImage: finalCover,
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

  const currentPlan: SubscriptionPlan =
    partner?.subscriptionPackage === "premium" ? "premium" : "pro";

  const openSubscription = () => {
    setSelectedPlan(currentPlan);
    setUpgradePaymentStatus("idle");
    setUpgradeCheckoutUrl(null);
    setShowSubscriptionModal(true);
  };

  const handleUpgrade = async () => {
    if (selectedPlan === currentPlan) return;
    if (!partner?._id) return;

    try {
      setIsUpgradePaying(true);
      setUpgradePaymentStatus("paying");

      const baseUrl = process.env.EXPO_PUBLIC_API_URL || "https://amblebooking-production.up.railway.app";
      const returnUrl = `${baseUrl}/api/payment/partner/payos-return`;
      const cancelUrl = `${baseUrl}/api/payment/partner/payos-cancel`;

      const res = await paymentAPI.createPartnerUpgradePayosPayment({
        partnerId: partner._id,
        fromPackage: currentPlan,
        toPackage: "premium",
        returnUrl,
        cancelUrl,
      });

      const checkoutUrl = res.data?.checkoutUrl;
      if (checkoutUrl) {
        setUpgradeCheckoutUrl(checkoutUrl);
        Linking.openURL(checkoutUrl).catch(() => {});
      }
    } catch (error: any) {
      setUpgradePaymentStatus("failed");
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể tạo thanh toán nâng cấp.");
    } finally {
      setIsUpgradePaying(false);
    }
  };

  const checkUpgradePayment = useCallback(async () => {
    if (!partner?._id) return;
    try {
      const res = await paymentAPI.checkPartnerPaymentStatus(partner._id);
      const subStatus = res.data?.subscriptionStatus;
      const pkg = res.data?.subscriptionPackage;
      // After upgrade, status stays "active" and package becomes "premium"
      if (pkg === "premium" || res.data?.paymentType === "upgrade") {
        setUpgradePaymentStatus("success");
        if (upgradeTimerRef.current) clearInterval(upgradeTimerRef.current);
        await usePartnerAuthStore.getState().loadPartner();
        setTimeout(() => {
          setShowSubscriptionModal(false);
          Alert.alert("Thành công", "Nhà hàng đã được nâng cấp lên gói Premium trong 1 tháng.");
        }, 500);
      }
    } catch {}
  }, [partner?._id]);

  // Poll khi user quay lại từ PayOS
  useEffect(() => {
    if (upgradePaymentStatus !== "paying") return;

    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        setUpgradePaymentStatus("checking");
        checkUpgradePayment();
      }
    };

    const sub = AppState.addEventListener("change", onAppStateChange);
    upgradeTimerRef.current = setInterval(checkUpgradePayment, 5000);

    return () => {
      sub.remove();
      if (upgradeTimerRef.current) clearInterval(upgradeTimerRef.current);
    };
  }, [upgradePaymentStatus, checkUpgradePayment]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (upgradeTimerRef.current) clearInterval(upgradeTimerRef.current);
    };
  }, []);
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

          <TouchableOpacity style={styles.menuItem} onPress={openSubscription}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="diamond-outline" size={18} color="#374151" />
              <Text style={styles.menuItemText}>{t("partner.profile.subscription")}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: currentPlan === "premium" ? "#B45309" : "#059669" }}>
                {currentPlan === "premium" ? "Premium" : "Pro"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
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

              {canManageStaff && (
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  setShowAccountCenterMenu(false);
                  router.push('/partner-team');
                }}
              >
                <Ionicons name='people-outline' size={18} color='#FF6B35' />
                <Text style={styles.modalBtnText}>{t("partner.profile.staffManagement")}</Text>
              </TouchableOpacity>
              )}
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

            {canManageStaff && (
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  setShowAccountCenterMenu(false);
                  router.push('/partner-team');
                }}
              >
                <Ionicons name="people-outline" size={18} color="#FF6B35" />
                <Text style={styles.modalBtnText}>{t("partner.profile.staffManagement")}</Text>
              </TouchableOpacity>
            )}

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

      {/* ── Subscription Upgrade Modal ── */}
      <Modal
        visible={showSubscriptionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowSubscriptionModal(false);
          setUpgradePaymentStatus("idle");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gói thành viên</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSubscriptionModal(false);
                  setUpgradePaymentStatus("idle");
                }}
              >
                <Ionicons name="close-outline" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: "90%" }} showsVerticalScrollIndicator={false}>
              {/* Plan cards */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                {SUBSCRIPTION_PLANS.map((plan) => {
                  const active = selectedPlan === plan.key;
                  const isCurrent = currentPlan === plan.key;
                  const premium = plan.tone === "premium";

                  return (
                    <TouchableOpacity
                      key={plan.key}
                      style={[
                        subStyles.planCard,
                        active && subStyles.planCardActive,
                        premium && active && subStyles.planCardPremium,
                      ]}
                      onPress={() => setSelectedPlan(plan.key)}
                      activeOpacity={0.8}
                    >
                      <View style={subStyles.planHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={subStyles.planTitle}>{plan.title}</Text>
                          <Text style={subStyles.planSubtitle}>{plan.subtitle}</Text>
                        </View>
                        <View
                          style={[
                            subStyles.planRadio,
                            active && subStyles.planRadioActive,
                            premium && active && subStyles.planRadioPremium,
                          ]}
                        >
                          {active && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                      </View>

                      <View style={subStyles.planPriceRow}>
                        <Text style={[subStyles.planPrice, premium && subStyles.planPricePremium]}>
                          {plan.monthlyFee}
                        </Text>
                        {isCurrent && <Text style={subStyles.currentPlanPill}>Đang dùng</Text>}
                      </View>
                      <Text style={subStyles.planSetup}>{plan.setupFee}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Feature table */}
              <View style={subStyles.featureTable}>
                <View style={[subStyles.featureRow, subStyles.featureHeaderRow]}>
                  <Text style={[subStyles.featureCell, subStyles.featureCellName, subStyles.featureHeaderText]}>
                    Tính năng
                  </Text>
                  <Text style={[subStyles.featureCell, subStyles.featurePlanCell, subStyles.featureHeaderText]}>
                    Pro
                  </Text>
                  <Text style={[subStyles.featureCell, subStyles.featurePlanCell, subStyles.featureHeaderText]}>
                    Premium
                  </Text>
                </View>
                {PLAN_BENEFITS.map((benefit) => (
                  <View key={benefit.feature} style={subStyles.featureRow}>
                    <Text style={[subStyles.featureCell, subStyles.featureCellName]}>
                      {benefit.feature}
                    </Text>
                    <Text style={[subStyles.featureCell, subStyles.featurePlanCell]}>
                      {benefit.core}
                    </Text>
                    <Text style={[subStyles.featureCell, subStyles.featurePlanCell, subStyles.featurePremiumValue]}>
                      {benefit.premium}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Pay button */}
            {upgradePaymentStatus === "success" ? (
              <View style={subStyles.successBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                <Text style={subStyles.successText}>Nâng cấp thành công!</Text>
              </View>
            ) : upgradePaymentStatus === "paying" || upgradePaymentStatus === "checking" ? (
              <View style={subStyles.checkingBanner}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={subStyles.checkingText}>
                  {upgradePaymentStatus === "checking" ? "Đang kiểm tra thanh toán..." : "Đang chờ thanh toán qua PayOS..."}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  subStyles.payBtn,
                  (selectedPlan === currentPlan || isUpgradePaying) && subStyles.payBtnDisabled,
                ]}
                onPress={handleUpgrade}
                disabled={isUpgradePaying || selectedPlan === currentPlan}
              >
                {isUpgradePaying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="card-outline" size={17} color="#fff" />
                    <Text style={subStyles.payBtnText}>
                      {selectedPlan === currentPlan
                        ? "Đang sử dụng gói này"
                        : "Thanh toán 699k/tháng"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
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

// ── Subscription modal styles ──
const subStyles = StyleSheet.create({
  planCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#F9FAFB",
    gap: 10,
  },
  planCardActive: {
    borderColor: PRIMARY,
    backgroundColor: "#FFF7ED",
  },
  planCardPremium: {
    borderColor: "#FBBF24",
    backgroundColor: "#FFFBEB",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  planTitle: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  planSubtitle: { fontSize: 11, color: "#6B7280", marginTop: 2, lineHeight: 16 },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  planRadioActive: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY,
  },
  planRadioPremium: {
    borderColor: "#FBBF24",
    backgroundColor: "#F59E0B",
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planPrice: { fontSize: 18, fontWeight: "900", color: "#1A1A1A" },
  planPricePremium: { color: "#B45309" },
  currentPlanPill: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  planSetup: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },
  featureTable: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  featureHeaderRow: {
    backgroundColor: "#F9FAFB",
  },
  featureCell: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
    textAlign: "center",
  },
  featureCellName: {
    flex: 2,
    textAlign: "left",
  },
  featurePlanCell: {
    flex: 1,
  },
  featureHeaderText: {
    fontWeight: "800",
    color: "#111827",
    fontSize: 11,
  },
  featurePremiumValue: {
    color: "#B45309",
    fontWeight: "800",
  },
  payBtn: {
    marginTop: 8,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  payBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  payBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  successBanner: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  successText: { fontSize: 14, fontWeight: "700", color: "#16A34A" },
  checkingBanner: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  checkingText: { fontSize: 13, fontWeight: "600", color: PRIMARY },
});
