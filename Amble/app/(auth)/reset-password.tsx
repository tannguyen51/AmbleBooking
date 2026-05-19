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
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { authAPI } from "@/services/api";

const PRIMARY = "#FF6B35";
const GRAD: [string, string] = ["#FF6B35", "#FFD700"];
const BG = "#FAFAFA";
const TEXT = "#1A1A1A";
const TEXT_MUTED = "#9CA3AF";
const BORDER = "#E5E7EB";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [form, setForm] = useState({
    token: token || "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);

  const update = (key: "token" | "password" | "confirm", value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleReset = async () => {
    if (!form.token.trim()) {
      Alert.alert("Loi", "Vui long nhap ma dat lai");
      return;
    }
    if (form.password.length < 6) {
      Alert.alert("Loi", "Mat khau toi thieu 6 ky tu");
      return;
    }
    if (form.password !== form.confirm) {
      Alert.alert("Loi", "Mat khau xac nhan khong khop");
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({
        token: form.token.trim(),
        newPassword: form.password,
      });
      Alert.alert("Thanh cong", "Dat lai mat khau thanh cong");
      router.replace("/(auth)/login");
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Khong dat lai duoc mat khau";
      Alert.alert("Loi", message);
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
          <Text style={styles.headerTitle}>Dat lai mat khau</Text>
          <Text style={styles.headerSubtitle}>
            Nhap ma tu email va mat khau moi
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Ma dat lai</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="key-outline" size={18} color={TEXT_MUTED} />
            <TextInput
              style={styles.input}
              placeholder="Nhap ma"
              placeholderTextColor={TEXT_MUTED}
              value={form.token}
              onChangeText={(v) => update("token", v)}
              autoCapitalize="none"
            />
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Mat khau moi</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={TEXT_MUTED} />
            <TextInput
              style={styles.input}
              placeholder="Toi thieu 6 ky tu"
              placeholderTextColor={TEXT_MUTED}
              value={form.password}
              onChangeText={(v) => update("password", v)}
              secureTextEntry
            />
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Xac nhan</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={TEXT_MUTED} />
            <TextInput
              style={styles.input}
              placeholder="Nhap lai mat khau"
              placeholderTextColor={TEXT_MUTED}
              value={form.confirm}
              onChangeText={(v) => update("confirm", v)}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.75 }]}
            onPress={handleReset}
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
                <Text style={styles.submitText}>Cap nhat mat khau</Text>
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
