import React, { useCallback, useEffect, useRef, useState } from "react";
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
  AppState,
  AppStateStatus,
} from "react-native";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../../store/authStore";
import { Ionicons } from "@expo/vector-icons";
import MunchMapLogo from "../../components/AmbleLogo";
import { API_BASE_URL } from "../../services/api";
import { useTranslation } from "../../i18n/useTranslation";

// ─── Design tokens ───
const PRIMARY = "#FF6B35";
const GRAD: [string, string] = ["#FF6B35", "#FFD700"];
const SURFACE = "#FFFFFF";
const BG = "#FAFAFA";
const TEXT = "#1A1A1A";
const TEXT_SEC = "#6B7280";
const TEXT_MUTED = "#9CA3AF";
const BORDER = "#E5E7EB";

let initialUrlProcessed = false;

export default function LoginScreen() {

  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const { login, loginWithToken, isLoading } = useAuthStore();
  const isHandlingRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const handleDeepLink = useCallback(async (url: string) => {
    if (isHandlingRef.current) return;
    const parsed = Linking.parse(url);
    const token = parsed.queryParams?.token;
    const error = parsed.queryParams?.error;

    if (typeof token === "string") {
      try {
        isHandlingRef.current = true;
        await loginWithToken(token);
      } catch (err: any) {
        Alert.alert(t("auth.login.googleFail"), err.message);
      } finally {
        isHandlingRef.current = false;
      }
    } else if (typeof error === "string") {
      Alert.alert(t("auth.login.googleFail"), error);
    }
  }, [loginWithToken, t]);

  useEffect(() => {
    // Xử lý deep link khi app bắt đầu (cold start)
    Linking.getInitialURL().then((url) => {
      if (url && !initialUrlProcessed) {
        initialUrlProcessed = true;
        handleDeepLink(url);
      }
    });

    // Xử lý deep link khi app đang chạy
    const linkSub = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });

    // Fallback: khi app quay lại foreground
    const appStateSub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        // 1. Thử deep link
        Linking.getInitialURL().then((url) => {
          if (url) {
            handleDeepLink(url);
          } else {
            // 2. Fallback: kiểm tra clipboard cho JWT token
            Clipboard.getStringAsync().then((text) => {
              if (text && text.startsWith("eyJ")) {
                Clipboard.setStringAsync(""); // Xóa token khỏi clipboard
                handleDeepLink(`munchmap://auth/google?token=${text}`);
              }
            }).catch(() => {});
          }
        });
      }
      appStateRef.current = nextState;
    });

    return () => {
      linkSub.remove();
      appStateSub.remove();
    };
  }, [handleDeepLink]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t("common.error"), t("auth.login.emptyFields"));
      return;
    }

    try {
      await login(email.trim().toLowerCase(), password);
    } catch (error: any) {
      Alert.alert(t("auth.login.failed"), error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const redirectUri = Linking.createURL("auth/google");
      const authUrl = `${API_BASE_URL}/auth/google?redirect=${encodeURIComponent(redirectUri)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === "success" && result.url) {
        const parsed = Linking.parse(result.url);
        const token = parsed.queryParams?.token;
        if (typeof token === "string") {
          await loginWithToken(token);
        } else {
          const error = parsed.queryParams?.error;
          if (error) Alert.alert("Lỗi đăng nhập", String(error));
        }
      }
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Không thể mở đăng nhập Google");
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
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Gradient Header ─── */}
        <LinearGradient
          colors={GRAD}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/welcome")}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />

          <MunchMapLogo
            size="lg"
            textColor="#FFFFFF"
            containerStyle={styles.appLogo}
          />
          <Text style={styles.tagline}>{t("auth.login.tagline")}</Text>
        </LinearGradient>

        {/* ─── Form Card ─── */}
        <View style={styles.formCard}>
          <Text style={styles.welcomeTitle}>{t("auth.login.title")}</Text>
          <Text style={styles.welcomeSubtitle}>
                        {t("auth.login.subtitle")}
          </Text>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("auth.login.emailLabel")}</Text>

            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={TEXT_MUTED} />

              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={TEXT_MUTED}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("auth.login.passwordLabel")}</Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={TEXT_MUTED}
              />

              <TextInput
                style={styles.input}
                placeholder={t("auth.login.passwordPlaceholder")}
                placeholderTextColor={TEXT_MUTED}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />

              <TouchableOpacity
                onPress={() => setShowPass(!showPass)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPass ? "eye" : "eye-off"}
                  size={20}
                  color={TEXT_MUTED}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotWrap}
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text style={styles.forgotText}>{t("auth.login.forgotPassword")}</Text>
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && { opacity: 0.75 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient
              colors={GRAD}
              style={styles.loginBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>{t("auth.login.loginButton")}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Register */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>{t("auth.login.noAccount")}</Text>

            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.registerLink}>{t("auth.login.registerNow")}</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Google Login */}
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={isLoading}
            style={[styles.googleBtn, isLoading && { opacity: 0.75 }]}
          >
            <View style={styles.googleBtnInner}>
              <Ionicons name="logo-google" size={18} color="#DB4437" />
              <Text style={styles.googleBtnText}>{t("auth.login.googleSignIn")}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  scroll: {
    flexGrow: 1,
  },

  header: {
    paddingTop: 84,
    paddingBottom: 60,
    alignItems: "center",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: "hidden",
  },

  backBtn: {
    position: "absolute",
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  decCircle1: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  decCircle2: {
    position: "absolute",
    bottom: -30,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  appLogo: {
    marginBottom: 14,
  },

  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
  },

  formCard: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    flex: 1,
  },

  welcomeTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: TEXT,
  },

  welcomeSubtitle: {
    fontSize: 14,
    color: TEXT_SEC,
    marginBottom: 28,
  },

  inputGroup: {
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 8,
  },

  forgotWrap: {
    alignSelf: "flex-end",
    marginTop: 8,
  },

  forgotText: {
    color: PRIMARY,
    fontWeight: "600",
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BG,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 54,
    gap: 10,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: TEXT,
  },

  eyeBtn: {
    padding: 4,
  },

  loginBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
    marginBottom: 24,
  },

  loginBtnGradient: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },

  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  googleBtn: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFF",
  },

  googleBtnInner: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  googleBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT,
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
  },

  registerText: {
    color: TEXT_SEC,
  },

  registerLink: {
    color: PRIMARY,
    fontWeight: "700",
  },
});
