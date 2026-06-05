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
import { Colors, Spacing, BorderRadius, Typography } from "../../constants/theme";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";
import MunchMapLogo from "../../components/AmbleLogo";
import { useTranslation } from "../../i18n/useTranslation";

const PARTNER_PRIMARY = "#FF6B35";
const PARTNER_GRAD: [string, string] = ["#FF6B35", "#FFD700"];

export default function PartnerLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { t } = useTranslation();
  const { login, isLoading } = usePartnerAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t("common.error"), t("partnerAuth.login.emptyFields"));
      return;
    }

    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/dashboard");
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={PARTNER_GRAD}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => router.push("/welcome")}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <MunchMapLogo
            size="lg"
            textColor="#FFFFFF"
            containerStyle={styles.partnerLogo}
          />
        </LinearGradient>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.welcomeTitle}>{t("partnerAuth.login.welcome")}</Text>
          <Text style={styles.welcomeSubtitle}>
            {t("partnerAuth.login.subtitle")}
          </Text>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("partnerAuth.login.emailLabel")}</Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={Colors.textMuted}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder={t("partnerAuth.login.emailPlaceholder")}
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("partnerAuth.login.passwordLabel")}</Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.textMuted}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder={t("partnerAuth.login.passwordPlaceholder")}
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />

              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() => router.push("/(partner-auth)/partner-forgot-password")}
          >
            <Text style={styles.forgotText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={PARTNER_GRAD}
              style={styles.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>{t("partnerAuth.login.loginButton")}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("partnerAuth.login.divider")}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Demo account */}
       

          {/* Packages */}
          {/* <View style={styles.packagesRow}>
            {[
              { label: "Basic", color: "#6B7280", price: "299K" },
              { label: "Pro", color: "#3B82F6", price: "799K" },
              { label: "Premium", color: "#9333EA", price: "1.499K" },
            ].map((pkg) => (
              <View
                key={pkg.label}
                style={[styles.pkgBadge, { borderColor: pkg.color }]}
              >
                <Text style={[styles.pkgLabel, { color: pkg.color }]}>
                  {pkg.label}
                </Text>
                <Text style={[styles.pkgPrice, { color: pkg.color }]}>
                  {pkg.price}/tháng
                </Text>
              </View>
            ))}
          </View> */}

          {/* Register */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>{t("partnerAuth.login.noAccount")}</Text>

            <Link href="/(partner-auth)/partner-register" asChild>
              <TouchableOpacity>
                <Text style={styles.registerLink}>{t("partnerAuth.login.registerNow")}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },

  header: {
    paddingTop: 60,
    paddingBottom: 60,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  headerBackBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  partnerLogo: {
    marginBottom: 0,
  },

  formContainer: {
    flex: 1,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },

  welcomeTitle: { ...Typography.h2, color: Colors.text, marginBottom: 6 },
  welcomeSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },

  inputGroup: { marginBottom: Spacing.md },

  label: { ...Typography.label, color: Colors.text, marginBottom: 6 },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 52,
  },

  inputIcon: { marginRight: Spacing.sm },

  input: { flex: 1, ...Typography.body, color: Colors.text },

  eyeBtn: { padding: 4 },

  loginBtn: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },

  btnDisabled: { opacity: 0.7 },

  btnGradient: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
  },

  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },

  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },

  dividerText: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginHorizontal: Spacing.sm,
  },

  demoBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: PARTNER_PRIMARY,
  },

  demoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  demoTitle: {
    ...Typography.label,
    color: PARTNER_PRIMARY,
    marginLeft: 6,
  },

  demoText: {
    ...Typography.bodySmall,
    color: Colors.text,
    marginTop: 2,
  },

  packagesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
    gap: 8,
  },

  pkgBadge: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    alignItems: "center",
  },

  pkgLabel: { fontSize: 12, fontWeight: "700" },

  pkgPrice: { fontSize: 10, marginTop: 2 },

  forgotRow: {
    alignItems: "flex-end",
    marginBottom: Spacing.md,
    marginTop: -Spacing.sm,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
    color: PARTNER_PRIMARY,
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },

  registerText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  registerLink: {
    ...Typography.body,
    fontWeight: "700",
    color: PARTNER_PRIMARY,
  },
});
