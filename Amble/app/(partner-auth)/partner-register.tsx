import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
} from "../../constants/theme";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";
import { useTranslation } from "../../i18n/useTranslation";

const PARTNER_GRAD: [string, string] = ["#FF6B35", "#FFD700"];

type Step = "account" | "restaurant" | "package";
type PartnerPackage = "pro" | "premium";

const PACKAGE_OPTIONS: Array<{
  key: PartnerPackage;
  title: string;
  label: string;
  setupFee: string;
  monthlyFee: string;
  description: string;
  tone: "base" | "premium";
}> = [
  {
    key: "pro",
    title: "Gói cơ bản",
    label: "Pro",
    setupFee: "799k/tháng",
    monthlyFee: "Miễn phí tháng",
    description: "Phù hợp nhà hàng mới bắt đầu nhận đặt bàn trên Amble.",
    tone: "base",
  },
  {
    key: "premium",
    title: "Gói thông dụng",
    label: "Premium",
    setupFee: "599k/tháng",
    monthlyFee: "699k/tháng",
    description: "Được ưu tiên hiển thị trên trang chủ để tăng lượt tiếp cận.",
    tone: "premium",
  },
];

const PLAN_BENEFITS = [
  { feature: "Quản lý đặt bàn trực tuyến", core: "Có", premium: "Có" },
  { feature: "Quản lý thông tin khách đặt bàn", core: "Có", premium: "Có" },
  {
    feature: "Theo dõi lịch đặt bàn và tình trạng bàn trống",
    core: "Có",
    premium: "Có",
  },
  { feature: "Dashboard vận hành", core: "Cơ bản", premium: "Nâng cao" },
  {
    feature: "Hiển thị trong danh sách nhà hàng trên Amble",
    core: "Có",
    premium: "Có",
  },
  { feature: "Ưu tiên hiển thị trong khung đề xuất", core: "—", premium: "Có" },
  {
    feature: "Đưa nhà hàng lên mục xu hướng / nổi bật",
    core: "—",
    premium: "Có",
  },
  {
    feature: "Tăng khả năng tiếp cận khách hàng mới trên app",
    core: "—",
    premium: "Có",
  },
  { feature: "Phân tích lưu lượng khách", core: "—", premium: "Có" },
  {
    feature: "Phân tích hiệu suất bàn và khu vực",
    core: "—",
    premium: "Có",
  },
  { feature: "Phân tích hành vi khách hàng", core: "—", premium: "Có" },
  {
    feature: "Theo dõi tỷ lệ khách hàng quay lại",
    core: "—",
    premium: "Có",
  },
  {
    feature: "Xuất báo cáo và thống kê nâng cao",
    core: "—",
    premium: "Có",
  },
];

export default function PartnerRegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { register, isLoading } = usePartnerAuthStore();
  const [step, setStep] = useState<Step>("account");

  const [form, setForm] = useState({
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    restaurantName: "",
    restaurantAddress: "",
    restaurantCity: "",
    cuisine: "",
    subscriptionPackage: "pro" as PartnerPackage,
  });

  const [showPassword, setShowPassword] = useState(false);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleNext = () => {
    if (step === "account") {
      if (
        !form.ownerName.trim() ||
        !form.email.trim() ||
        !form.phone.trim() ||
        !form.password
      ) {
        Alert.alert(t("common.error"), t("partnerAuth.register.missingStep1"));
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
        Alert.alert(t("common.error"), t("partnerAuth.register.invalidEmail"));
        return;
      }
      if (form.password.length < 6) {
        Alert.alert(t("common.error"), t("partnerAuth.register.weakPassword"));
        return;
      }
      if (form.password !== form.confirmPassword) {
        Alert.alert(t("common.error"), t("partnerAuth.register.passwordMismatch"));
        return;
      }
      setStep("restaurant");
      return;
    }

    if (step === "restaurant") {
      if (!form.restaurantName.trim() || !form.restaurantCity.trim()) {
        Alert.alert(t("common.error"), t("partnerAuth.register.missingRestaurantInfo"));
        return;
      }
      setStep("package");
    }
  };

  const handleBack = () => {
    if (step === "restaurant") setStep("account");
    else if (step === "package") setStep("restaurant");
    else router.back();
  };

  const handleRegister = async () => {
    if (!form.ownerName.trim() || !form.email.trim() || !form.phone.trim()) {
      Alert.alert(t("common.error"), t("partnerAuth.register.missingStep1"));
      return;
    }
    if (!form.restaurantName.trim()) {
      Alert.alert(t("common.error"), t("partnerAuth.register.missingName"));
      return;
    }

    try {
      await register({
        ownerName: form.ownerName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        restaurantName: form.restaurantName,
        restaurantAddress: form.restaurantAddress,
        restaurantCity: form.restaurantCity,
        cuisine: form.cuisine,
        subscriptionPackage: form.subscriptionPackage,
      });
      router.replace("/dashboard");
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* HEADER */}
        <LinearGradient colors={PARTNER_GRAD} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t("partnerAuth.register.title")}</Text>
          <Text style={styles.headerSubtitle}>
            {t("partnerAuth.register.subtitle")}
          </Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          {step === "account" && (
            <>
              <Text style={styles.sectionTitle}>{t("partnerAuth.register.step1Title")}</Text>

              <Field
                label={t("partnerAuth.register.fullNameLabel")}
                icon="person-outline"
                value={form.ownerName}
                onChangeText={(v) => update("ownerName", v)}
                placeholder={t("partnerAuth.register.fullNamePlaceholder")}
              />

              <Field
                label={t("partnerAuth.register.emailLabel")}
                icon="mail-outline"
                value={form.email}
                onChangeText={(v) => update("email", v)}
                placeholder={t("partnerAuth.register.emailPlaceholder")}
              />

              <Field
                label={t("partnerAuth.register.phoneLabel")}
                icon="call-outline"
                value={form.phone}
                onChangeText={(v) => update("phone", v)}
                placeholder={t("partnerAuth.register.phonePlaceholder")}
              />

              {/* PASSWORD */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("partnerAuth.register.passwordLabel")}</Text>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={Colors.textMuted}
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    placeholder={t("partnerAuth.register.passwordPlaceholder")}
                    value={form.password}
                    onChangeText={(v) => update("password", v)}
                  />

                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye" : "eye-off"}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("partnerAuth.register.confirmPasswordLabel")}</Text>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={Colors.textMuted}
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    secureTextEntry={!showPassword}
                    placeholder={t("partnerAuth.register.confirmPasswordPlaceholder")}
                    value={form.confirmPassword}
                    onChangeText={(v) => update("confirmPassword", v)}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <LinearGradient
                  colors={PARTNER_GRAD}
                  style={styles.btnGradient}
                >
                  <Text style={styles.btnText}>{t("partnerAuth.register.nextButton")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {step === "restaurant" && (
            <>
              <Text style={styles.sectionTitle}>{t("partnerAuth.register.step2Title")}</Text>

              <Field
                label={t("partnerAuth.register.restaurantNameLabel")}
                icon="storefront-outline"
                value={form.restaurantName}
                onChangeText={(v) => update("restaurantName", v)}
                placeholder={t("partnerAuth.register.restaurantNamePlaceholder")}
              />

              <Field
                label={t("partnerAuth.register.addressLabel")}
                icon="location-outline"
                value={form.restaurantAddress}
                onChangeText={(v) => update("restaurantAddress", v)}
                placeholder={t("partnerAuth.register.addressPlaceholder")}
              />

              <Field
                label={t("partnerAuth.register.cityLabel")}
                icon="business-outline"
                value={form.restaurantCity}
                onChangeText={(v) => update("restaurantCity", v)}
                placeholder={t("partnerAuth.register.cityPlaceholder")}
              />

              <Field
                label={t("partnerAuth.register.cuisineLabel")}
                icon="restaurant-outline"
                value={form.cuisine}
                onChangeText={(v) => update("cuisine", v)}
                placeholder={t("partnerAuth.register.cuisinePlaceholder")}
              />

              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <LinearGradient
                  colors={PARTNER_GRAD}
                  style={styles.btnGradient}
                >
                  <Text style={styles.btnText}>{t("partnerAuth.register.nextButton")}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {step === "package" && (
            <>
              <Text style={styles.sectionTitle}>{t("partnerAuth.register.step3Title")}</Text>
              <View style={styles.packageNotice}>
                <Ionicons name="gift-outline" size={18} color="#C2410C" />
                <Text style={styles.packageNoticeText}>
                  Tháng đầu free phí khởi tạo cho cả 2 gói. Tháng sau áp dụng phí khởi tạo bình thường.
                </Text>
              </View>

              <View style={styles.packageList}>
                {PACKAGE_OPTIONS.map((option) => {
                  const active = form.subscriptionPackage === option.key;
                  const premium = option.tone === "premium";

                  return (
                    <TouchableOpacity
                      key={option.key}
                      activeOpacity={0.9}
                      style={[
                        styles.packageCard,
                        active && styles.packageCardActive,
                        premium && styles.packageCardPremium,
                        active && premium && styles.packageCardPremiumActive,
                      ]}
                      onPress={() => update("subscriptionPackage", option.key)}
                    >
                      <View style={styles.packageTopRow}>
                        <View style={styles.packageTitleWrap}>
                          <View style={styles.packageNameRow}>
                            <Text style={styles.packageTitle}>{option.title}</Text>
                            <Text
                              style={[
                                styles.packageLabel,
                                premium && styles.packageLabelPremium,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </View>
                          <Text style={styles.packageDesc}>{option.description}</Text>
                        </View>
                        <View
                          style={[
                            styles.packageRadio,
                            active && styles.packageRadioActive,
                            premium && active && styles.packageRadioPremium,
                          ]}
                        >
                          {active && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                      </View>

                      <View style={styles.packageFeeGrid}>
                        <View style={styles.packageFeeBox}>
                          <Text style={styles.packageFeeLabel}>Phí khởi tạo</Text>
                          <Text
                            style={[
                              styles.packageFeeValue,
                              premium && styles.packageFeeValuePremium,
                            ]}
                          >
                            {option.setupFee}
                          </Text>
                        </View>
                        <View style={styles.packageFeeBox}>
                          <Text style={styles.packageFeeLabel}>Phí tháng</Text>
                          <Text
                            style={[
                              styles.packageFeeValue,
                              premium && styles.packageFeeValuePremium,
                            ]}
                          >
                            {option.monthlyFee}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.featureTable}>
                <View style={[styles.featureRow, styles.featureHeaderRow]}>
                  <Text style={[styles.featureCell, styles.featureCellName, styles.featureHeaderText]}>
                    Tính năng
                  </Text>
                  <Text style={[styles.featureCell, styles.featurePlanCell, styles.featureHeaderText]}>
                    Pro Plan
                  </Text>
                  <Text style={[styles.featureCell, styles.featurePlanCell, styles.featureHeaderText]}>
                    Premium Plan
                  </Text>
                </View>
                {PLAN_BENEFITS.map((benefit) => (
                  <View key={benefit.feature} style={styles.featureRow}>
                    <Text style={[styles.featureCell, styles.featureCellName]}>
                      {benefit.feature}
                    </Text>
                    <Text style={[styles.featureCell, styles.featurePlanCell]}>
                      {benefit.core}
                    </Text>
                    <Text style={[styles.featureCell, styles.featurePlanCell, styles.featurePremiumValue]}>
                      {benefit.premium}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.nextBtn}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={PARTNER_GRAD}
                  style={styles.btnGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>{t("partnerAuth.register.registerButton")}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>{t("partnerAuth.register.hasAccount")}</Text>

            <Link href="/(partner-auth)/partner-login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>{t("partnerAuth.register.loginLink")}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
}: {
  label: string;
  icon: any;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputWrapper}>
        <Ionicons
          name={icon}
          size={18}
          color={Colors.textMuted}
          style={styles.inputIcon}
        />

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },

  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.9)",
  },

  backBtn: {
    marginBottom: 10,
  },

  formContainer: {
    padding: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  packageNotice: {
    marginTop: -8,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  packageNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    color: "#9A3412",
  },
  packageList: {
    gap: 12,
  },
  packageCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#fff",
    padding: 14,
    gap: 12,
  },
  packageCardActive: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF7ED",
  },
  packageCardPremium: {
    borderColor: "#DDD6FE",
  },
  packageCardPremiumActive: {
    borderColor: "#8B5CF6",
    backgroundColor: "#F5F3FF",
  },
  packageTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  packageTitleWrap: {
    flex: 1,
  },
  packageNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 5,
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },
  packageLabel: {
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#FFEDD5",
    color: "#C2410C",
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "900",
  },
  packageLabelPremium: {
    backgroundColor: "#EDE9FE",
    color: "#6D28D9",
  },
  packageDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  packageRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  packageRadioActive: {
    borderColor: "#FF6B35",
    backgroundColor: "#FF6B35",
  },
  packageRadioPremium: {
    borderColor: "#8B5CF6",
    backgroundColor: "#8B5CF6",
  },
  packageFeeGrid: {
    flexDirection: "row",
    gap: 10,
  },
  packageFeeBox: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 10,
  },
  packageFeeLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "800",
    marginBottom: 4,
  },
  packageFeeValue: {
    fontSize: 14,
    color: "#C2410C",
    fontWeight: "900",
  },
  packageFeeValuePremium: {
    color: "#6D28D9",
  },
  featureTable: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  featureRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  featureHeaderRow: {
    borderTopWidth: 0,
    backgroundColor: "#F9FAFB",
  },
  featureCell: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 11,
    lineHeight: 16,
    color: "#374151",
    fontWeight: "600",
  },
  featureCellName: {
    flex: 1.55,
  },
  featurePlanCell: {
    flex: 0.78,
    textAlign: "center",
  },
  featureHeaderText: {
    color: "#111827",
    fontWeight: "900",
  },
  featurePremiumValue: {
    color: "#6D28D9",
    fontWeight: "800",
  },

  inputGroup: {
    marginBottom: 16,
  },

  label: {
    marginBottom: 6,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },

  inputIcon: {
    marginRight: 8,
  },

  input: {
    flex: 1,
  },

  nextBtn: {
    marginTop: 20,
    borderRadius: 8,
    overflow: "hidden",
  },

  btnGradient: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
  },

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },

  loginText: {
    color: Colors.textSecondary,
  },

  loginLink: {
    color: "#FF6B35",
    fontWeight: "700",
  },
});
