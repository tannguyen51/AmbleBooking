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
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { authAPI } from "@/services/api";

const PRIMARY = "#FF6B35";
const GRAD: [string, string] = ["#FF6B35", "#FFD700"];
const BG = "#FAFAFA";
const TEXT = "#1A1A1A";
const TEXT_MUTED = "#9CA3AF";
const BORDER = "#E5E7EB";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập email");
      return;
    }
    setLoading(true);
    try {
      await authAPI.requestPasswordReset({
        email: email.trim().toLowerCase(),
      });
      Alert.alert(
        "Thành công",
        "Nếu email tồn tại, hệ thống đã gửi link đặt lại mật khẩu.",
      );
      router.push({
        pathname: "/(auth)/reset-password",
        params: { email: email.trim().toLowerCase() },
      });
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Không gửi được email đặt lại";
      Alert.alert("Lỗi", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quên mật khẩu</Text>
          <Text style={styles.headerSubtitle}>
            Nhập email để nhận link đặt lại mật khẩu
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email đã đăng ký</Text>
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

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.75 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={GRAD}
              style={styles.submitBtnInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Gửi link đặt lại</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1 },
  header: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 20,
    backgroundColor: PRIMARY,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#fff" },
  headerSubtitle: { marginTop: 6, fontSize: 13, color: "#FFE7D6" },
  formCard: {
    marginTop: -24,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  label: { fontSize: 13, fontWeight: "700", color: TEXT, marginBottom: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 14, color: TEXT },
  submitBtn: { borderRadius: 12, overflow: "hidden", marginTop: 16 },
  submitBtnInner: { alignItems: "center", paddingVertical: 12 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
