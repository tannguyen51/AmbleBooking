import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { adminTheme } from "../../constants/adminTheme";
import AdminButton from "../../components/admin/AdminButton";
import { useRouter, type Href } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import AmbleLogo from "../../components/AmbleLogo";

const GRAD: [string, string] = [adminTheme.colors.primary, adminTheme.colors.accent];
const SURFACE = adminTheme.colors.surface;
const BG = adminTheme.colors.background;
const TEXT = adminTheme.colors.onSurface;
const TEXT_SEC = adminTheme.colors.onSurfaceVariant;
const TEXT_MUTED = adminTheme.colors.muted;
const BORDER = adminTheme.colors.outlineVariant;

export default function AdminLoginScreen() {
  const router = useRouter();
  const { login, logout } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập email và mật khẩu");
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      const currentUser = useAuthStore.getState().user;

      if (!currentUser || currentUser.role !== "admin") {
        await logout();
        Alert.alert("Không đủ quyền", "Tài khoản này không phải admin.");
        return;
      }

      router.replace("/admin/dashboard" as Href);
    } catch (error: any) {
      Alert.alert("Đăng nhập thất bại", error.message);
    } finally {
      setIsLoading(false);
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
          <LinearGradient
            colors={GRAD}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace("/welcome")}
            >
              <Ionicons name="arrow-back" size={22} color={adminTheme.colors.onPrimary} />
            </TouchableOpacity>

          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />

          <AmbleLogo size="md" textColor={adminTheme.colors.onPrimary} />
          <Text style={styles.title}>Admin Console</Text>
          <Text style={styles.subtitle}>Đăng nhập để quản trị hệ thống</Text>
        </LinearGradient>

        <View style={styles.formCard}>
          <Text style={styles.welcomeTitle}>Chào mừng trở lại!</Text>
          <Text style={styles.welcomeSubtitle}>
            Đăng nhập vào tài khoản quản trị
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={TEXT_MUTED}
              />
              <TextInput
                style={styles.input}
                placeholder="admin@amble.com"
                placeholderTextColor={TEXT_MUTED}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={TEXT_MUTED}
              />
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu"
                placeholderTextColor={TEXT_MUTED}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
                <Ionicons
                  name={showPass ? "eye" : "eye-off"}
                  size={20}
                  color={TEXT_MUTED}
                />
              </TouchableOpacity>
            </View>
          </View>

          <AdminButton
            title={isLoading ? "Đang xử lý..." : "Đăng nhập"}
            onPress={handleLogin}
            style={[isLoading && styles.loginBtnDisabled, { marginTop: 12 }]}
          />
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
  scroll: { flexGrow: 1 },
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
    backgroundColor: "rgba(255,255,255,0.12)",
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
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: adminTheme.colors.onPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
  },
  formCard: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    borderWidth: 1,
    borderColor: BORDER,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: TEXT_SEC,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnGradient: {
    alignItems: "center",
    paddingVertical: 14,
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
