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
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
} from "../../constants/theme";
import { useAuthStore } from "../../store/authStore";
import { Ionicons } from "@expo/vector-icons";
import AmbleLogo from "../../components/AmbleLogo";
// ─── Design tokens ───
const PRIMARY = "#FF6B35";
const GRAD: [string, string] = ["#FF6B35", "#FFD700"];
const SURFACE = "#FFFFFF";
const BG = "#FAFAFA";
const TEXT = "#1A1A1A";
const TEXT_SEC = "#6B7280";
const TEXT_MUTED = "#9CA3AF";
const BORDER = "#E5E7EB";
const ERROR = "#EF4444";
const SUCCESS = "#22C55E";

export default function RegisterScreen() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    if (!form.fullName.trim()) return "Vui lòng nhập họ tên";
    if (!form.email.trim()) return "Vui lòng nhập email";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Email không hợp lệ";
    if (!form.password) return "Vui lòng nhập mật khẩu";
    if (form.password.length < 6) return "Mật khẩu tối thiểu 6 ký tự";
    if (form.password !== form.confirmPassword)
      return "Mật khẩu xác nhận không khớp";
    if (!agreedTerms) return "Vui lòng đồng ý với điều khoản";
    return null;
  };

  const getRegisterErrorMessage = (err: any) => {
    if (!err) return "Đăng ký thất bại. Vui lòng thử lại.";

    const apiData = err?.response?.data;

    if (typeof apiData?.message === "string" && apiData.message.trim()) {
      return apiData.message;
    }

    if (Array.isArray(apiData?.errors) && apiData.errors.length > 0) {
      const firstError = apiData.errors[0];
      if (typeof firstError === "string" && firstError.trim()) return firstError;
      if (typeof firstError?.message === "string" && firstError.message.trim()) {
        return firstError.message;
      }
    }

    if (typeof apiData?.error === "string" && apiData.error.trim()) {
      return apiData.error;
    }

    if (typeof err?.message === "string" && err.message.trim()) {
      return err.message;
    }

    return "Đăng ký thất bại. Vui lòng thử lại.";
  };

  const handleRegister = async () => {
    const error = validate();
    if (error) {
      Alert.alert("Lỗi", error);
      return;
    }
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
      });
    } catch (err: any) {
      Alert.alert("Đăng ký thất bại", getRegisterErrorMessage(err));
    }
  };

  const passwordMatch =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;
  const passwordNoMatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

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
          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          <AmbleLogo
            size="md"
            showText={false}
            containerStyle={styles.registerLogo}
          />
          <Text style={styles.headerTitle}>Tạo tài khoản</Text>
          <Text style={styles.headerSubtitle}>
            Bắt đầu hành trình đi bộ của bạn ngay hôm nay
          </Text>
        </LinearGradient>

        {/* ─── Form Card ─── */}
        <View style={styles.formCard}>
          {/* Step hint */}
          <View style={styles.stepHint}>
            <Text style={styles.stepHintText}>
              Chỉ mất 1 phút để hoàn tất đăng ký
            </Text>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Họ và tên <Text style={{ color: PRIMARY }}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Nguyễn Văn A"
                placeholderTextColor={TEXT_MUTED}
                value={form.fullName}
                onChangeText={(v) => update("fullName", v)}
                autoComplete="name"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email <Text style={{ color: PRIMARY }}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={TEXT_MUTED}
                value={form.email}
                onChangeText={(v) => update("email", v)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Số điện thoại{" "}
              <Text style={{ color: TEXT_MUTED, fontWeight: "400" }}>
                (tuỳ chọn)
              </Text>
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="0901 234 567"
                placeholderTextColor={TEXT_MUTED}
                value={form.phone}
                onChangeText={(v) => update("phone", v)}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Mật khẩu <Text style={{ color: PRIMARY }}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Tối thiểu 6 ký tự"
                placeholderTextColor={TEXT_MUTED}
                value={form.password}
                onChangeText={(v) => update("password", v)}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity
                onPress={() => setShowPass(!showPass)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPass ? "eye" : "eye-off"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
            {/* Password strength bar */}
            {form.password.length > 0 && (
              <View style={styles.strengthRow}>
                {[1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          form.password.length >= i * 3
                            ? i === 1
                              ? ERROR
                              : i === 2
                                ? "#F59E0B"
                                : SUCCESS
                            : BORDER,
                      },
                    ]}
                  />
                ))}
                <Text style={styles.strengthLabel}>
                  {form.password.length < 3
                    ? "Yếu"
                    : form.password.length < 6
                      ? "Trung bình"
                      : "Mạnh"}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Xác nhận mật khẩu <Text style={{ color: PRIMARY }}>*</Text>
            </Text>
            <View
              style={[
                styles.inputWrapper,
                passwordMatch && styles.inputSuccess,
                passwordNoMatch && styles.inputError,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor={TEXT_MUTED}
                value={form.confirmPassword}
                onChangeText={(v) => update("confirmPassword", v)}
                secureTextEntry={!showPass}
              />
              {passwordMatch && <Text style={{ fontSize: 18 }}>✅</Text>}
              {passwordNoMatch && <Text style={{ fontSize: 18 }}>❌</Text>}
            </View>
            {passwordNoMatch && (
              <Text style={styles.errorText}>Mật khẩu không khớp</Text>
            )}
          </View>

          {/* Terms checkbox */}
          <TouchableOpacity
            style={[styles.termsRow, agreedTerms && styles.termsRowActive]}
            onPress={() => setAgreedTerms(!agreedTerms)}
            activeOpacity={0.8}
          >
            <View
              style={[styles.checkbox, agreedTerms && styles.checkboxActive]}
            >
              {agreedTerms && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </View>
            <Text style={styles.termsText}>
              Tôi đồng ý với{" "}
              <Text style={styles.termsLink}>Điều khoản sử dụng</Text> và{" "}
              <Text style={styles.termsLink}>Chính sách bảo mật</Text> của Amble
            </Text>
          </TouchableOpacity>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerBtn, isLoading && { opacity: 0.75 }]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={GRAD}
              style={styles.registerBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerBtnText}>Tạo tài khoản</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Login link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Đã có tài khoản? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1 },

  // ── Header ──
  header: {
    paddingTop: 64,
    paddingBottom: 56,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: "hidden",
  },
  decCircle1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  decCircle2: {
    position: "absolute",
    bottom: -40,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  backIcon: { fontSize: 20, color: "#fff", fontWeight: "600" },
  registerLogo: {
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
  },

  // ── Form card ──
  formCard: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    flex: 1,
  },

  // Step hint banner
  stepHint: {
    backgroundColor: "#FFF8F5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  stepHintText: { fontSize: 13, fontWeight: "600", color: PRIMARY },

  // ── Inputs ──
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "700", color: TEXT, marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BG,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 54,
  },
  inputSuccess: { borderColor: SUCCESS, backgroundColor: "#F0FDF4" },
  inputError: { borderColor: ERROR, backgroundColor: "#FFF1F2" },
  inputIcon: { fontSize: 18, marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: TEXT },
  eyeBtn: { padding: 4 },
  errorText: { fontSize: 12, color: ERROR, marginTop: 5, fontWeight: "500" },

  // Password strength
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: { fontSize: 11, color: TEXT_MUTED, marginLeft: 4, width: 60 },

  // Terms
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    marginBottom: 20,
    backgroundColor: BG,
  },
  termsRowActive: { borderColor: PRIMARY, backgroundColor: "#FFF8F5" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  termsText: { flex: 1, fontSize: 13, color: TEXT_SEC, lineHeight: 19 },
  termsLink: { color: PRIMARY, fontWeight: "700" },

  // ── Register button ──
  registerBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 22,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  registerBtnGradient: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  registerBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // ── Login link ──
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: { fontSize: 14, color: TEXT_SEC },
  loginLink: { fontSize: 14, color: PRIMARY, fontWeight: "700" },
});
