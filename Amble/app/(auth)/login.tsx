import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Image, AppState, AppStateStatus,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../../store/authStore";
import { Ionicons } from "@expo/vector-icons";
import MunchMapLogo from "../../components/AmbleLogo";
import { API_BASE_URL } from "../../services/api";
import { useTranslation } from "../../i18n/useTranslation";

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
      try { isHandlingRef.current = true; await loginWithToken(token); }
      catch (err: any) { Alert.alert(t("auth.login.googleFail"), err.message); }
      finally { isHandlingRef.current = false; }
    } else if (typeof error === "string") {
      Alert.alert(t("auth.login.googleFail"), error);
    }
  }, [loginWithToken, t]);

  useEffect(() => {
    Linking.getInitialURL().then((url) => { if (url && !initialUrlProcessed) { initialUrlProcessed = true; handleDeepLink(url); } });
    const linkSub = Linking.addEventListener("url", (event) => handleDeepLink(event.url));
    const appStateSub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        Linking.getInitialURL().then((url) => {
          if (url) handleDeepLink(url);
          else Clipboard.getStringAsync().then((text) => {
            if (text && text.startsWith("eyJ")) { Clipboard.setStringAsync(""); handleDeepLink(`munchmap://auth/google?token=${text}`); }
          }).catch(() => {});
        });
      }
      appStateRef.current = nextState;
    });
    return () => { linkSub.remove(); appStateSub.remove(); };
  }, [handleDeepLink]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { Alert.alert(t("common.error"), t("auth.login.emptyFields")); return; }
    try { await login(email.trim().toLowerCase(), password); }
    catch (error: any) { Alert.alert(t("auth.login.failed"), error.message); }
  };

  const handleGoogleLogin = async () => {
    if (isHandlingRef.current) return;
    isHandlingRef.current = true;
    try {
      const redirectUri = Linking.createURL("auth/google");
      const authUrl = `${API_BASE_URL}/auth/google?redirect=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type === "success" && result.url) {
        const parsed = Linking.parse(result.url);
        const token = parsed.queryParams?.token;
        if (typeof token === "string") { await loginWithToken(token); router.replace("/(tabs)"); }
        else { const error = parsed.queryParams?.error; if (error) Alert.alert("Lỗi đăng nhập", String(error)); }
      }
    } catch (err: any) { Alert.alert("Lỗi", err?.message || "Không thể mở đăng nhập Google"); }
    finally { isHandlingRef.current = false; }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={{ flex: 1 }}>
      {/* Background — Figma: #FFD109 with orange/white glows */}
      <LinearGradient colors={["#FFD109", "#FF8B25"]} style={s.bg} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <View style={s.glowOrange} />
      <View style={s.glowWhite} />

      {/* Logo area */}
      <View style={s.logoArea}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.push("/welcome")}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <MunchMapLogo size="lg" textColor="#FFFFFF" />
      </View>

      {/* White card — Figma: 403×728, r=15, shadow */}
      <View style={s.card}>
        <Text style={s.welcomeTitle}>Chào mừng trở lại!</Text>
        <Text style={s.welcomeSub}>Đăng nhập khách hàng</Text>

        {/* Email */}
        <Text style={s.label}>Email</Text>
        <TextInput style={s.input} placeholder="account@gmail.com" placeholderTextColor="#ABABAB" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        {/* Password */}
        <Text style={s.label}>Mật khẩu</Text>
        <View style={{ position: "relative" }}>
          <TextInput style={s.input} placeholder="Nhập mật khẩu" placeholderTextColor="#ABABAB" value={password} onChangeText={setPassword} secureTextEntry={!showPass} />
          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(!showPass)}>
            <Ionicons name={showPass ? "eye" : "eye-off"} size={20} color="#ABABAB" />
          </TouchableOpacity>
        </View>

        {/* Login button — Figma: 370×58, #FF8F1F, r=10 */}
        <TouchableOpacity style={s.loginBtn} onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.loginText}>Đăng nhập</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.forgotBtn} onPress={() => router.push("/(auth)/forgot-password")}>
          <Text style={s.forgotText}>Quên mật khẩu?</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>Hoặc</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Google — Figma: 370×58, white, r=10 */}
        <TouchableOpacity style={s.googleBtn} onPress={handleGoogleLogin} disabled={isLoading} activeOpacity={0.85}>
          <Image source={{ uri: "https://developers.google.com/identity/images/g-logo.png" }} style={s.googleLogo} />
          <Text style={s.googleText}>Đăng nhập với Google</Text>
        </TouchableOpacity>

        {/* Register */}
        <TouchableOpacity style={s.registerBtn} onPress={() => router.push("/(auth)/register")} activeOpacity={0.85}>
          <Text style={s.registerText}>Đăng ký ngay</Text>
        </TouchableOpacity>
      </View>
    </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFD109" },
  bg: { ...StyleSheet.absoluteFillObject },
  glowOrange: { position: "absolute", width: 500, height: 500, borderRadius: 250, backgroundColor: "#FF8B25", opacity: 0.3, top: -100, left: -80 },
  glowWhite: { position: "absolute", width: 400, height: 400, borderRadius: 200, backgroundColor: "#FFFFFF", opacity: 0.2, bottom: "40%", right: -100 },
  logoArea: { alignItems: "center", paddingTop: 80, paddingBottom: 12 },
  backBtn: { position: "absolute", top: 60, left: 20, width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  card: {
    flex: 1, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 28, paddingBottom: 40,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  welcomeTitle: { fontSize: 26, fontWeight: "700", fontFamily: "Montserrat_700Bold", color: "#000", marginBottom: 4 },
  welcomeSub: { fontSize: 16, fontWeight: "500", fontFamily: "Montserrat_500Medium", color: "#898484", marginBottom: 24 },
  label: { fontSize: 16, fontWeight: "500", fontFamily: "Montserrat_500Medium", color: "#000", marginBottom: 6 },
  input: {
    backgroundColor: "#FFFFFF", borderRadius: 10, height: 40, paddingHorizontal: 14,
    fontSize: 16, fontFamily: "Montserrat_500Medium", color: "#000",
    borderWidth: 1, borderColor: "#E8E8E8", marginBottom: 16,
  },
  eyeBtn: { position: "absolute", right: 12, top: 10 },
  loginBtn: { backgroundColor: "#FF8F1F", borderRadius: 10, height: 58, alignItems: "center", justifyContent: "center", marginTop: 8 },
  loginText: { fontSize: 20, fontWeight: "600", fontFamily: "Montserrat_500Medium", color: "#FFFFFF" },
  forgotBtn: { alignItems: "center", marginTop: 12 },
  forgotText: { fontSize: 12, fontWeight: "500", fontFamily: "Montserrat_500Medium", color: "#FF8F1F" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E8E8E8" },
  dividerText: { fontSize: 16, fontWeight: "500", fontFamily: "Montserrat_500Medium", color: "#ABABAB", marginHorizontal: 12 },
  googleBtn: {
    flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 10, height: 58,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E8E8E8", marginBottom: 12, gap: 10,
  },
  googleLogo: { width: 22, height: 22 },
  googleText: { fontSize: 18, fontWeight: "500", fontFamily: "Montserrat_500Medium", color: "#FF8F1F" },
  registerBtn: {
    backgroundColor: "#FFFFFF", borderRadius: 10, height: 58,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E8E8E8",
  },
  registerText: { fontSize: 18, fontWeight: "700", fontFamily: "Montserrat_700Bold", color: "#FF8F1F" },
});
