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

const PARTNER_GRAD: [string, string] = ["#FF6B35", "#FFD700"];

type Step = "account" | "restaurant" | "package";

export default function PartnerRegisterScreen() {
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
        Alert.alert(
          "Thiếu thông tin",
          "Vui lòng nhập đầy đủ thông tin tài khoản.",
        );
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
        Alert.alert(
          "Email không hợp lệ",
          "Vui lòng nhập email đúng định dạng.",
        );
        return;
      }
      if (form.password.length < 6) {
        Alert.alert("Mật khẩu yếu", "Mật khẩu cần ít nhất 6 ký tự.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        Alert.alert("Mật khẩu không khớp", "Xác nhận mật khẩu chưa chính xác.");
        return;
      }
      setStep("restaurant");
      return;
    }

    if (step === "restaurant") {
      if (!form.restaurantName.trim() || !form.restaurantCity.trim()) {
        Alert.alert(
          "Thiếu thông tin",
          "Vui lòng nhập tên nhà hàng và thành phố.",
        );
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
      Alert.alert(
        "Thiếu thông tin",
        "Vui lòng nhập đầy đủ thông tin bắt buộc.",
      );
      return;
    }
    if (!form.restaurantName.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên nhà hàng.");
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
      Alert.alert("Đăng ký thất bại", err.message);
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

          <Text style={styles.headerTitle}>Đăng ký đối tác</Text>
          <Text style={styles.headerSubtitle}>
            Phát triển nhà hàng cùng munchmap
          </Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          {step === "account" && (
            <>
              <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>

              <Field
                label="Họ và tên"
                icon="person-outline"
                value={form.ownerName}
                onChangeText={(v) => update("ownerName", v)}
                placeholder="Nguyễn Văn A"
              />

              <Field
                label="Email"
                icon="mail-outline"
                value={form.email}
                onChangeText={(v) => update("email", v)}
                placeholder="partner@email.com"
              />

              <Field
                label="Số điện thoại"
                icon="call-outline"
                value={form.phone}
                onChangeText={(v) => update("phone", v)}
                placeholder="0901234567"
              />

              {/* PASSWORD */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mật khẩu</Text>

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
                    placeholder="Nhập mật khẩu"
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
                <Text style={styles.label}>Xác nhận mật khẩu</Text>

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
                    placeholder="Nhập lại mật khẩu"
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
                  <Text style={styles.btnText}>Tiếp theo</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {step === "restaurant" && (
            <>
              <Text style={styles.sectionTitle}>Thông tin nhà hàng</Text>

              <Field
                label="Tên nhà hàng"
                icon="storefront-outline"
                value={form.restaurantName}
                onChangeText={(v) => update("restaurantName", v)}
                placeholder="Nhà hàng ABC"
              />

              <Field
                label="Địa chỉ"
                icon="location-outline"
                value={form.restaurantAddress}
                onChangeText={(v) => update("restaurantAddress", v)}
                placeholder="123 Nguyễn Huệ"
              />

              <Field
                label="Thành phố"
                icon="business-outline"
                value={form.restaurantCity}
                onChangeText={(v) => update("restaurantCity", v)}
                placeholder="Hồ Chí Minh"
              />

              <Field
                label="Ẩm thực"
                icon="restaurant-outline"
                value={form.cuisine}
                onChangeText={(v) => update("cuisine", v)}
                placeholder="Việt Nam"
              />

              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <LinearGradient
                  colors={PARTNER_GRAD}
                  style={styles.btnGradient}
                >
                  <Text style={styles.btnText}>Tiếp theo</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {step === "package" && (
            <>
              <Text style={styles.sectionTitle}>Hoàn tất đăng ký</Text>

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
                    <Text style={styles.btnText}>Đăng ký</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Đã có tài khoản? </Text>

            <Link href="/(partner-auth)/partner-login" asChild>
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
