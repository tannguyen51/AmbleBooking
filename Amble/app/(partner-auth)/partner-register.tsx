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
    subscriptionPackage: "pro" as "basic" | "pro" | "premium",
  });

  const [showPassword, setShowPassword] = useState(false);

  const update = (key: string, value: string) =>
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
