import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import MunchMapLogo from "../../components/AmbleLogo";
import { useTranslation } from "../../i18n/useTranslation";

export default function AdminLoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { login } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t("common.error"), "Vui lòng nhập email và mật khẩu.");
      return;
    }
    try {
      setIsLoading(true);
      await login(email.trim().toLowerCase(), password);
      router.replace("/admin/dashboard");
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message || "Đăng nhập thất bại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={["#FFD109", "#FF8B25"]} style={s.bg} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <View style={s.glowOrange} />
      <View style={s.glowWhite} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.logoArea}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.push("/welcome")}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <MunchMapLogo size="lg" textColor="#FFFFFF" />
          </View>

          <View style={s.card}>
            <Text style={s.welcomeTitle}>Chào mừng trở lại!</Text>
            <Text style={s.welcomeSub}>Đăng nhập quản trị viên</Text>

            <Text style={s.label}>Email</Text>
            <TextInput style={s.input} placeholder="admin@amble.vn" placeholderTextColor="#ABABAB" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

            <Text style={s.label}>Mật khẩu</Text>
            <View style={{ position: "relative" }}>
              <TextInput style={s.input} placeholder="Nhập mật khẩu" placeholderTextColor="#ABABAB" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              <TouchableOpacity style={{ position: "absolute", right: 12, top: 10 }} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye" : "eye-off"} size={20} color="#ABABAB" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.loginBtn} onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.loginText}>Đăng nhập</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={s.forgotBtn} onPress={() => router.push("/admin/forgot-password" as any)}>
              <Text style={s.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFD109" },
  bg: { ...StyleSheet.absoluteFillObject },
  glowOrange: { position: "absolute", width: 500, height: 500, borderRadius: 250, backgroundColor: "#FF8B25", opacity: 0.3, top: -100, left: -80 },
  glowWhite: { position: "absolute", width: 400, height: 400, borderRadius: 200, backgroundColor: "#FFFFFF", opacity: 0.2, bottom: "40%", right: -100 },
  logoArea: { alignItems: "center", paddingTop: 80, paddingBottom: 12 },
  backBtn: { position: "absolute", top: 60, left: 20, width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  card: { flex: 1, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 28, paddingBottom: 40, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 8 },
  welcomeTitle: { fontSize: 26, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#000", marginBottom: 4 },
  welcomeSub: { fontSize: 16, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#898484", marginBottom: 24 },
  label: { fontSize: 16, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#000", marginBottom: 6 },
  input: { backgroundColor: "#FFFFFF", borderRadius: 10, height: 40, paddingHorizontal: 14, fontSize: 16, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#000", borderWidth: 1, borderColor: "#E8E8E8", marginBottom: 16 },
  loginBtn: { backgroundColor: "#FF8F1F", borderRadius: 10, height: 58, alignItems: "center", justifyContent: "center", marginTop: 8 },
  loginText: { fontSize: 20, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#FFFFFF" },
  forgotBtn: { alignItems: "center", marginTop: 12 },
  forgotText: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "#FF8F1F" },
});
