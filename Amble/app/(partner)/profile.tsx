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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";
import { PartnerBottomNav } from "../../components/partner/PartnerBottomNav";
import { partnerDashboardAPI } from "../../services/api";
import { hasPartnerPermission } from "../../constants/partnerPermissions";

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

export default function PartnerProfileScreen() {
  const router = useRouter();
  const { logout, partner } = usePartnerAuthStore();
  const canManageStaff = hasPartnerPermission(partner?.role, "staff:view");

  const [pendingCount, setPendingCount] = useState(0);
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
    Alert.alert(
      "Gói đăng ký",
      `Gói hiện tại: ${partner?.subscriptionPackage || "basic"}`,
    );
  };

  const openTerms = () => {
    router.push("/partner-terms");
  };

  const openSupport = () => {
    Alert.alert("Hỗ trợ", "Hotline: 1900 6868\nEmail: partner@amble.vn");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
      >
        <Text style={styles.title}>Hồ sơ nhà hàng</Text>
        {canManageStaff && (
          <TouchableOpacity
            style={styles.teamEntryBtn}
            onPress={() => router.push("/partner-team")}
          >
            <Ionicons name="people-outline" size={16} color="#FF6B35" />
            <Text style={styles.teamEntryText}>Quản lý nhân sự nhà hàng</Text>
            <Ionicons name="chevron-forward-outline" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ảnh bìa nhà hàng</Text>
          <Image
            source={{ uri: coverImage || FALLBACK_COVER }}
            style={styles.coverImage}
          />
          <View style={styles.coverActions}>
            <TouchableOpacity style={styles.coverBtn} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={16} color="#374151" />
              <Text style={styles.coverBtnText}>Chụp ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.coverBtn} onPress={pickFromLibrary}>
              <Ionicons name="images-outline" size={16} color="#374151" />
              <Text style={styles.coverBtnText}>Thư viện</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

          <Text style={styles.inputLabel}>Tên nhà hàng</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập tên nhà hàng"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.inputLabel}>Địa chỉ</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập địa chỉ"
            placeholderTextColor="#9CA3AF"
            value={address}
            onChangeText={setAddress}
          />

          <Text style={styles.inputLabel}>Thành phố</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập thành phố"
            placeholderTextColor="#9CA3AF"
            value={city}
            onChangeText={setCity}
          />

          <Text style={styles.inputLabel}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập số điện thoại"
            placeholderTextColor="#9CA3AF"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.inputLabel}>Mô tả nhà hàng</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Mô tả tổng quan"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.inputLabel}>Lời giới thiệu</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Thông điệp muốn gửi đến khách hàng"
            placeholderTextColor="#9CA3AF"
            value={introduction}
            onChangeText={setIntroduction}
            multiline
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Loại ẩm thực</Text>
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
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="Hoặc nhập loại ẩm thực khác"
            placeholderTextColor="#9CA3AF"
            value={cuisine}
            onChangeText={setCuisine}
          />

          <View style={styles.parkingRow}>
            <Text style={styles.parkingLabel}>Có bãi đậu xe</Text>
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
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Giờ mở cửa</Text>

          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <Text style={styles.inputLabel}>Giờ mở cửa</Text>
              <TextInput
                style={styles.input}
                placeholder="08:00"
                placeholderTextColor="#9CA3AF"
                value={openTime}
                onChangeText={setOpenTime}
              />
            </View>
            <View style={styles.timeCol}>
              <Text style={styles.inputLabel}>Giờ đóng cửa</Text>
              <TextInput
                style={styles.input}
                placeholder="22:00"
                placeholderTextColor="#9CA3AF"
                value={closeTime}
                onChangeText={setCloseTime}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Ngày mở cửa</Text>
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
                    {day.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mạng xã hội</Text>

          <Text style={styles.inputLabel}>Facebook</Text>
          <TextInput
            style={styles.input}
            placeholder="facebook.com/restaurant"
            placeholderTextColor="#9CA3AF"
            value={facebook}
            onChangeText={setFacebook}
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Instagram</Text>
          <TextInput
            style={styles.input}
            placeholder="instagram.com/restaurant"
            placeholderTextColor="#9CA3AF"
            value={instagram}
            onChangeText={setInstagram}
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>TikTok</Text>
          <TextInput
            style={styles.input}
            placeholder="tiktok.com/@restaurant"
            placeholderTextColor="#9CA3AF"
            value={tiktok}
            onChangeText={setTiktok}
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Website</Text>
          <TextInput
            style={styles.input}
            placeholder="https://restaurant.com"
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
                <Text style={styles.saveBtnText}>Lưu hồ sơ nhà hàng</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dịch vụ & Chính sách</Text>

          <TouchableOpacity style={styles.menuItem} onPress={openVoucher}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="ticket-outline" size={18} color="#374151" />
              <Text style={styles.menuItemText}>Voucher</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={openSubscription}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="diamond-outline" size={18} color="#374151" />
              <Text style={styles.menuItemText}>Gói đăng ký</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={openTerms}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={18} color="#374151" />
              <Text style={styles.menuItemText}>Điều khoản</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={openSupport}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-buoy-outline" size={18} color="#374151" />
              <Text style={styles.menuItemText}>Hỗ trợ</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={16} color="#EF4444" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.loadingText}>Đang đồng bộ dữ liệu...</Text>
          </View>
        )}
      </ScrollView>
      <PartnerBottomNav pendingCount={pendingCount} />
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
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
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
});
