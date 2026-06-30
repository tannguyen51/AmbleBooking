import React, { useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";
import { PartnerBottomNav } from "../../components/partner/PartnerBottomNav";
import { LinearGradient } from "expo-linear-gradient";
import { partnerAuthAPI, partnerDashboardAPI, paymentAPI } from "../../services/api";

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


type SubscriptionPlan = "pro" | "premium";

const SUBSCRIPTION_PLANS: Array<{
  key: SubscriptionPlan;
  title: string;
  subtitle: string;
  monthlyFee: string;
  setupFee: string;
  tone: "base" | "premium";
}> = [
  { key: "pro", title: "Gói cơ bản (Pro)", subtitle: "Dành cho nhà hàng mới bắt đầu nhận đặt bàn", monthlyFee: "Miễn phí tháng", setupFee: "Phí khởi tạo 799k/tháng", tone: "base" },
  { key: "premium", title: "Gói thông dụng (Premium)", subtitle: "Tăng độ phủ và được ưu tiên hiển thị trên trang chủ", monthlyFee: "699k/tháng", setupFee: "Phí khởi tạo 599k/tháng", tone: "premium" },
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

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800";

export default function PartnerProfileScreen() {
  const router = useRouter();
  const { logout, partner } = usePartnerAuthStore();
  const canManageStaff = partner?.role === "owner";

  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(true);
  const [showProfileDetails, setShowProfileDetails] = useState(false);

  const [coverImage, setCoverImage] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [hasParking, setHasParking] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("22:00");

  const [openDays, setOpenDays] = useState<OpenDay[]>([]);
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [website, setWebsite] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pwVisible, setPwVisible] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("pro");
  const currentPlan = partner?.subscriptionPackage === "premium" ? "premium" : "pro";

  const getExpiryText = (expiry: string | null | undefined): string | null => {
    if (!expiry) return null;
    const now = Date.now();
    const end = new Date(expiry).getTime();
    const diff = end - now;
    if (diff <= 0) return "Đã hết hạn";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return "Còn " + days + " ngày";
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (hours > 0) return "Còn " + hours + " giờ";
    return "Sắp hết hạn";
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
        setPriceMin(
          profile.priceMin !== undefined && profile.priceMin !== null
            ? String(profile.priceMin)
            : "",
        );
        setPriceMax(
          profile.priceMax !== undefined && profile.priceMax !== null
            ? String(profile.priceMax)
            : "",
        );
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
      Alert.alert("Quyền truy cập", "Vui lòng cấp quyền thư viện ảnh.");
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
      Alert.alert("Quyền truy cập", "Vui lòng cấp quyền camera.");
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
      Alert.alert("Thiếu thông tin", "Tên nhà hàng là bắt buộc.");
      return;
    }

    const parsedMin = priceMin.trim() ? Number(priceMin) : 0;
    const parsedMax = priceMax.trim() ? Number(priceMax) : 0;

    if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax)) {
      Alert.alert("Lỗi", "Giá tối thiểu và tối đa phải là số.");
      return;
    }

    if (parsedMin > parsedMax) {
      Alert.alert("Lỗi", "Giá tối thiểu phải nhỏ hơn hoặc bằng giá tối đa.");
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
        priceMin: parsedMin,
        priceMax: parsedMax,
        openTime,
        closeTime,
        openDays: sortedDays,
        facebook,
        instagram,
        tiktok,
        website,
      });

      Alert.alert("Thành công", "Đã cập nhật hồ sơ nhà hàng.");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Không thể cập nhật hồ sơ nhà hàng";
      Alert.alert("Lỗi", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn muốn đăng xuất tài khoản đối tác?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/welcome");
        },
      },
    ]);
  };

  const openVoucher = () => {
    Alert.alert(
      "Voucher nhà hàng",
      "Tính năng quản lý voucher sẽ được bật trong bản cập nhật tiếp theo.",
    );
  };

  const openSubscription = () => {
    setSelectedPlan(partner?.subscriptionPackage === "premium" ? "premium" : "pro");
    setShowSubscriptionModal(true);
  };

  const openTerms = () => {
    router.push("/partner-terms");
  };

  const openSupport = () => {
    Alert.alert("Hỗ trợ", "Email: munchmap.vn@gmail.com");
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đủ mật khẩu hiện tại và mới.");
      return;
    }

    if (newPassword.trim().length < 6) {
      Alert.alert("Mật khẩu yếu", "Mật khẩu mới cần ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Mật khẩu không khớp", "Xác nhận mật khẩu chưa chính xác.");
      return;
    }

    try {
      setIsChangingPassword(true);
      await partnerAuthAPI.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      Alert.alert("Thành công", "Đổi mật khẩu thành công.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Không thể đổi mật khẩu.";
      Alert.alert("Lỗi", message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={["#FFFFFF", "rgba(255,255,255,0)"]}
        locations={[0.3, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%" }}
        pointerEvents="none"
      />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
      >
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#202020" }} numberOfLines={1}>{partner?.restaurantName || "Nhà hàng của bạn"}</Text>
        </View>

        {/* Cover image */}
        <View style={styles.card}>
          <Image source={{ uri: coverImage || FALLBACK_COVER }} style={styles.coverImage} />
        </View>

                {/* Current subscription */}
        <View style={[styles.card, { paddingVertical: 10, backgroundColor: "#F5F3FF" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: currentPlan === "premium" ? "#F3E8FF" : "#FFF3ED", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={currentPlan === "premium" ? "sparkles-outline" : "diamond-outline"} size={18} color={currentPlan === "premium" ? "#7C3AED" : "#FF8F1F"} />
              </View>
              <View>
                <Text style={{ fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#898887" }}>Gói đang sử dụng</Text>
                <Text style={{ fontSize: 15, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#202020", marginTop: 2 }}>
                  {currentPlan === "premium" ? "Gói Premium" : "Gói Pro"}
                </Text>
              </View>
            </View>
            {currentPlan === "premium" && getExpiryText(partner?.subscriptionExpiry) ? (
              <View style={{ backgroundColor: "#FFF3ED", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#FF8F1F" }}>{getExpiryText(partner?.subscriptionExpiry)}</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: "#E8F5E9", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#16A34A" }}>Miễn phí</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#898887", marginTop: 6 }}>
            {currentPlan === "premium" ? "Ưu tiên hiển thị, đề xuất và nổi bật trên trang chủ" : "Quản lý đặt bàn cơ bản, miễn phí tháng đầu"}
          </Text>
        </View>

{/* Menu grid */}
        <View style={[styles.card, { marginTop: 30 }]}>
          <Text style={styles.sectionTitle}>Dịch vụ & Tiện ích</Text>
          <View style={styles.menuGrid}>
            {[
              { icon: "person-outline", label: "Hồ sơ", onPress: () => setShowProfileDetails(true) },
              { icon: "people-outline", label: "Nhân viên", onPress: () => router.push("/partner-team") },
              { icon: "diamond-outline", label: "Gói thanh toán", onPress: openSubscription },
              { icon: "pricetag-outline", label: "Voucher", onPress: openVoucher },
              { icon: "shield-outline", label: "Điều khoản", onPress: openTerms },
              { icon: "help-outline", label: "Hỗ trợ", onPress: openSupport },
              { icon: "exit-outline", label: "Đăng xuất", onPress: handleLogout },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={[styles.gridItem, i === 6 && { width: "100%", justifyContent: "center" }]} onPress={item.onPress}>
                <View style={[styles.gridIcon, i === 6 && { backgroundColor: "transparent" }]}>
                  <Ionicons name={item.icon as any} size={i === 6 ? 22 : 20} color={i === 6 ? "#FF8F1F" : "#FFF"} />
                </View>
                <Text style={[styles.gridLabel, i === 6 && { color: "#FF8F1F", fontFamily: "Montserrat_700Bold", fontWeight: "700" }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#FF8F1F" />
            <Text style={styles.loadingText}>Đang đồng bộ dữ liệu...</Text>
          </View>
        )}
      </ScrollView>
      
      {/* Edit Profile Modal */}
      <Modal visible={showProfileDetails} transparent animationType="slide" onRequestClose={() => setShowProfileDetails(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <TouchableOpacity onPress={() => setShowProfileDetails(false)}>
                <Ionicons name="close" size={24} color="#202020" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#202020" }}>Chỉnh sửa hồ sơ</Text>
              <View style={{ width: 24 }} />
            </View>

            <Image source={{ uri: coverImage || FALLBACK_COVER }} style={{ width: "100%", height: 180, borderRadius: 12, backgroundColor: "#F3F4F6", marginBottom: 12 }} />
            
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              <TouchableOpacity onPress={takePhoto} style={{ flex: 1, backgroundColor: "#FF8F1F", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}>
                <Text style={{ color: "#FFF", fontFamily: "Montserrat_500Medium", fontWeight: "500", fontSize: 13 }}>Chụp ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickFromLibrary} style={{ flex: 1, backgroundColor: "#F3F4F6", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}>
                <Text style={{ color: "#202020", fontFamily: "Montserrat_500Medium", fontWeight: "500", fontSize: 13 }}>Thư viện</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#6B7280", marginBottom: 6 }}>Tên nhà hàng</Text>
            <TextInput style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 14, color: "#202020", marginBottom: 12 }} value={name} onChangeText={setName} placeholder="Nhập tên nhà hàng" placeholderTextColor="#9CA3AF" />

            <Text style={{ fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#6B7280", marginBottom: 6 }}>Địa chỉ</Text>
            <TextInput style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 14, color: "#202020", marginBottom: 12 }} value={address} onChangeText={setAddress} placeholder="Nhập địa chỉ" placeholderTextColor="#9CA3AF" />

            <Text style={{ fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#6B7280", marginBottom: 6 }}>Số điện thoại</Text>
            <TextInput style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 14, color: "#202020", marginBottom: 12 }} value={phone} onChangeText={setPhone} placeholder="Nhập số điện thoại" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />

            <Text style={{ fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#6B7280", marginBottom: 6 }}>Mô tả</Text>
            <TextInput style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 14, color: "#202020", marginBottom: 16, minHeight: 80, textAlignVertical: "top" }} value={description} onChangeText={setDescription} placeholder="Mô tả nhà hàng" placeholderTextColor="#9CA3AF" multiline />
            <Text style={{ fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#6B7280", marginBottom: 6 }}>Giới thiệu</Text>
            <TextInput style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 14, color: "#202020", marginBottom: 16, minHeight: 60, textAlignVertical: "top" }} value={introduction} onChangeText={setIntroduction} placeholder="Lời giới thiệu" placeholderTextColor="#9CA3AF" multiline />

            <Text style={{ fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#6B7280", marginBottom: 6 }}>Loại ẩm thực</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {CUISINE_OPTIONS.map((item) => {
                const active = cuisine === item;
                return (
                  <TouchableOpacity key={item} onPress={() => setCuisine(item)} style={{ borderRadius: 20, borderWidth: 1, borderColor: active ? "#FF8F1F" : "#E5E7EB", paddingHorizontal: 12, paddingVertical: 6, backgroundColor: active ? "#FFF3ED" : "#FFFFFF" }}>
                    <Text style={{ fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: active ? "#FF8F1F" : "#6B7280" }}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#6B7280", marginBottom: 6 }}>Giờ mở cửa</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>Mở cửa</Text>
                <TextInput style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 10, fontSize: 14, color: "#202020" }} value={openTime} onChangeText={setOpenTime} placeholder="08:00" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>Đóng cửa</Text>
                <TextInput style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 10, fontSize: 14, color: "#202020" }} value={closeTime} onChangeText={setCloseTime} placeholder="22:00" placeholderTextColor="#9CA3AF" />
              </View>
            </View>

            <Text style={{ fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#6B7280", marginBottom: 6 }}>Ngày mở cửa</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {DAY_OPTIONS.map((day) => {
                const active = openDays.includes(day.key);
                return (
                  <TouchableOpacity key={day.key} onPress={() => toggleOpenDay(day.key)} style={{ width: 40, height: 36, borderRadius: 18, borderWidth: 1, borderColor: active ? "#FF8F1F" : "#E5E7EB", alignItems: "center", justifyContent: "center", backgroundColor: active ? "#FF8F1F" : "#FFFFFF" }}>
                    <Text style={{ fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: active ? "#FFFFFF" : "#6B7280" }}>{day.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#6B7280", marginBottom: 6 }}>Mạng xã hội</Text>
            <TextInput style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 14, color: "#202020", marginBottom: 10 }} value={facebook} onChangeText={setFacebook} placeholder="Facebook URL" placeholderTextColor="#9CA3AF" autoCapitalize="none" />
            <TextInput style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 14, color: "#202020", marginBottom: 10 }} value={instagram} onChangeText={setInstagram} placeholder="Instagram URL" placeholderTextColor="#9CA3AF" autoCapitalize="none" />
            <TextInput style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 14, color: "#202020", marginBottom: 12 }} value={website} onChangeText={setWebsite} placeholder="Website URL" placeholderTextColor="#9CA3AF" autoCapitalize="none" />


            <TouchableOpacity onPress={async () => { await handleSaveProfile(); setShowProfileDetails(false); }} style={{ backgroundColor: "#FF8F1F", borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#FFF", fontSize: 15, fontFamily: "Montserrat_500Medium", fontWeight: "500" }}>Lưu thay đổi</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <PartnerBottomNav pendingCount={pendingCount} />
    

      {/* Subscription Modal */}
      <Modal visible={showSubscriptionModal} transparent animationType="slide" onRequestClose={() => setShowSubscriptionModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "85%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#1A1A1A" }}>Gói đối tác</Text>
              <TouchableOpacity onPress={() => setShowSubscriptionModal(false)}>
                <Ionicons name="close-outline" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10 }}>
                {SUBSCRIPTION_PLANS.map((plan) => {
                  const active = selectedPlan === plan.key;
                  const isCurrent = (partner?.subscriptionPackage || "pro") === plan.key;
                  return (
                    <TouchableOpacity key={plan.key} activeOpacity={0.9}
                      style={{
                        borderWidth: 2,
                        borderColor: active ? (plan.tone === "premium" ? "#7C3AED" : "#FF8F1F") : "#E8E8E8",
                        borderRadius: 15, padding: 16,
                        backgroundColor: active ? (plan.tone === "premium" ? "#F3E8FF" : "#FFF7ED") : "#FFFFFF"
                      }}
                      onPress={() => setSelectedPlan(plan.key)}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#202020" }}>{plan.title}</Text>
                          <Text style={{ fontSize: 12, color: "#898887", marginTop: 4 }}>{plan.subtitle}</Text>
                        </View>
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: active ? (plan.tone === "premium" ? "#7C3AED" : "#FF8F1F") : "#D1D5DB", alignItems: "center", justifyContent: "center" }}>
                          {active && <Ionicons name="checkmark" size={14} color="#FF8F1F" />}
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                        <Text style={{ fontSize: 18, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#202020" }}>{plan.monthlyFee}</Text>
                        {isCurrent && <Text style={{ fontSize: 11, color: "#FF8F1F", backgroundColor: "#FFF7ED", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden" }}>Đang dùng</Text>}
                      </View>
                      <Text style={{ fontSize: 12, color: "#898887", marginTop: 2 }}>{plan.setupFee}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Feature comparison table */}
              <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
                <Text style={{ fontSize: 16, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#202020", marginBottom: 12 }}>So sánh gói</Text>
                <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F3F4F6", paddingBottom: 8, marginBottom: 8 }}>
                  <Text style={{ flex: 1, fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#202020" }}>Tính năng</Text>
                  <Text style={{ width: 70, fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#898887", textAlign: "center" }}>Pro</Text>
                  <Text style={{ width: 70, fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#FF8F1F", textAlign: "center" }}>Premium</Text>
                </View>
                {PLAN_BENEFITS.map((b, i) => (
                  <View key={i} style={{ flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F9FAFB" }}>
                    <Text style={{ flex: 1, fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#202020" }}>{b.feature}</Text>
                    <Text style={{ width: 70, fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#898887", textAlign: "center" }}>{b.core}</Text>
                    <Text style={{ width: 70, fontSize: 12, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#FF8F1F", textAlign: "center" }}>{b.premium}</Text>
                  </View>
                ))}
              </View>
              
              <View style={{ marginTop: 16 }}>

                <TouchableOpacity style={{ backgroundColor: "#FF8F1F", borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center" }} onPress={() => { setShowSubscriptionModal(false); router.push("/(partner-auth)/partner-payment"); }}>
                  <Text style={{ fontSize: 15, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#FFFFFF" }}>Nâng cấp ngay</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flex: 1 },
  contentInner: { padding: 16, paddingTop: 80, paddingBottom: 24, gap: 12 },
  title: { fontSize: 20, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#202020", marginBottom: 2 },
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
    fontFamily: "Montserrat_700Bold", fontWeight: "700",
    color: "#C2410C",
  },
  toggleCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold", fontWeight: "700",
    color: "#111827",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_700Bold", fontWeight: "700",
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
    fontFamily: "Montserrat_700Bold", fontWeight: "700",
    color: "#374151",
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Montserrat_700Bold", fontWeight: "700",
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
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    color: "#111827",
    fontSize: 13,
  },
  passwordToggle: {
    paddingLeft: 6,
    paddingVertical: 6,
  },
  textArea: {
    minHeight: 86,
    textAlignVertical: "top",
  },
  priceRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  priceCol: {
    flex: 1,
  },
  cuisineWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cuisineChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  cuisineChipActive: {
    borderColor: "#FF8F1F",
    backgroundColor: "#FFF3ED",
  },
  cuisineChipText: { fontSize: 12, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#6B7280" },
  cuisineChipTextActive: { color: "#FF8F1F" },
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
  parkingLabel: { fontSize: 14, color: "#374151", fontFamily: "Montserrat_700Bold", fontWeight: "700" },
  parkingToggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 999,
    paddingHorizontal: 3,
    justifyContent: "center",
  },
  parkingToggleTrackOn: {
    backgroundColor: "#ff8b25",
  },
  parkingToggleTrackOff: {
    backgroundColor: "#D1D5DB",
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
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  dayChipActive: {
    borderColor: "#FF8F1F",
    backgroundColor: "#FFF3ED",
  },
  dayChipText: { fontSize: 12, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#6B7280" },
  dayChipTextActive: { color: "#FF8F1F" },
  saveBtn: {
    marginTop: 12,
    backgroundColor: "#FF8F1F",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  saveBtnText: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#fff" },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridItem: { width: "48%", flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 15, padding: 12, marginBottom: 10, alignItems: "center", gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 },
  gridIcon: { width: 40, height: 39, borderRadius: 10, backgroundColor: "#FF8F1F", alignItems: "center", justifyContent: "center" },
  gridLabel: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#202020" },
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
  menuItemText: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#111827" },
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
  logoutText: { fontSize: 13, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#EF4444" },
  loadingRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: { fontSize: 12, color: "#9CA3AF" },
});

const fo = StyleSheet.create({
  label: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#6B7280", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
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
  title: { fontSize: 18, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#111827", marginBottom: 20 },
  row: { flexDirection: "row", gap: 10, marginTop: 6 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelText: { fontSize: 14, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#6B7280" },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FF8F1F",
    alignItems: "center",
  },
  saveText: { fontSize: 14, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#fff" },
});
