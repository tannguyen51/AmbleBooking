import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AmbleLogo from "../components/AmbleLogo";
import { useLanguageStore } from "../store/languageStore";

const { width, height } = Dimensions.get("window");

const COPY = {
  vi: {
    changeLanguage: "Đổi ngôn ngữ",
    headline: "Không chỉ ăn uống.\nTrải nghiệm của bạn.",
    tagline: "Ứng dụng đặt bàn hàng đầu Việt Nam",
    rolePrompt: "Bạn muốn đăng nhập với tư cách gì?",
    customerTitle: "Khách Hàng",
    customerSubtitle: "Tìm kiếm & đặt bàn nhà hàng",
    partnerTitle: "Đối Tác Nhà Hàng",
    partnerSubtitle: "Quản lý nhà hàng & đặt bàn",
    adminTitle: "Quản Trị",
    adminSubtitle: "Giám sát hệ thống & đối tác",
    or: "hoặc",
    register: "Đăng Ký cho khách hàng mới",
  },
  en: {
    changeLanguage: "Change language",
    headline: "More than dining.\nYour full experience.",
    tagline: "Vietnam's #1 dining app",
    rolePrompt: "How would you like to sign in?",
    customerTitle: "Customer",
    customerSubtitle: "Find and reserve restaurants",
    partnerTitle: "Restaurant Partner",
    partnerSubtitle: "Manage your venue & bookings",
    adminTitle: "Admin",
    adminSubtitle: "Operate platform & partners",
    or: "or",
    register: "Sign up for free",
  },
} as const;

export default function WelcomeScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const copyLanguage = language === "en" ? "en" : "vi";
  const copy = useMemo(() => COPY[copyLanguage], [copyLanguage]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#ff8b25", "#ffd109", "#ffd8a4"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <View style={styles.hero}>
        <View style={styles.logoRow}>
          <AmbleLogo size="lg" textColor="#FFFFFF" />
        </View>

        <Text style={styles.headline}>{copy.headline}</Text>
        <Text style={styles.tagline}>{copy.tagline}</Text>
      </View>

      <View style={styles.sheet}>
        <Text style={styles.sheetPrompt}>{copy.rolePrompt}</Text>

        <TouchableOpacity
          style={styles.cardCustomer}
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.85}
        >
          <View style={styles.cardIconWrap}>
            <LinearGradient
              colors={["#ff8b25", "#ffd109"]}
              style={styles.cardIconGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person" size={20} color="#ffffff" />
            </LinearGradient>
          </View>

          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{copy.customerTitle}</Text>
            <Text style={styles.cardSubtitle}>{copy.customerSubtitle}</Text>
          </View>

          <Text style={styles.cardArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardPartner}
          onPress={() => router.push("../(partner-auth)/partner-login")}
          activeOpacity={0.85}
        >
          <View style={styles.cardIconWrap}>
            <View style={styles.cardIconDark}>
              <Ionicons name="restaurant" size={20} color="#FF6B35" />
            </View>
          </View>

          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: "#1A1A1A" }]}>
              {copy.partnerTitle}
            </Text>
            <Text style={styles.cardSubtitle}>{copy.partnerSubtitle}</Text>
          </View>

          <Text style={[styles.cardArrow, { color: "#999" }]}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardAdmin}
          onPress={() => router.push("/admin/login")}
          activeOpacity={0.85}
        >
          <View style={styles.cardIconWrap}>
            <LinearGradient
              colors={["#0F172A", "#1E293B"]}
              style={styles.cardIconGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="shield-checkmark" size={20} color="#ffffff" />
            </LinearGradient>
          </View>

          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: "#0F172A" }]}>
              {copy.adminTitle}
            </Text>
            <Text style={styles.cardSubtitle}>{copy.adminSubtitle}</Text>
          </View>

          <Text style={[styles.cardArrow, { color: "#0F172A" }]}>›</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{copy.or}</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => router.push("/(auth)/register")}
          activeOpacity={0.8}
        >
          <Text style={styles.registerBtnText}>{copy.register}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.changeLanguageBtn}
          onPress={() => router.push("/language")}
          activeOpacity={0.85}
        >
          <View style={styles.changeLanguageLeft}>
            <Ionicons name="language-outline" size={17} color="#6B7280" />
            <Text style={styles.changeLanguageText}>{copy.changeLanguage}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ff8b25",
  },

  blob1: {
    position: "absolute",
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    top: -width * 0.2,
    right: -width * 0.2,
  },
  blob2: {
    position: "absolute",
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    top: height * 0.15,
    left: -width * 0.15,
  },

  hero: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 28,
    paddingBottom: 32,
    justifyContent: "flex-start",
  },

  logoRow: {
    marginBottom: 34,
  },
  changeLanguageBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    minHeight: 48,
  },
  changeLanguageLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeLanguageText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  headline: {
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 44,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 20,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.3,
  },

  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetPrompt: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 20,
  },

  cardCustomer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ff8b25",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#FFF8F4",
  },
  cardPartner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#1A1A1A",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#F7F7F7",
  },
  cardAdmin: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#0F172A",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#EEF2FF",
  },

  cardIconWrap: {
    marginRight: 14,
  },
  cardIconGrad: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconDark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },

  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#888",
  },
  cardArrow: {
    fontSize: 22,
    color: "#ff8b25",
    fontWeight: "300",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#EBEBEB",
  },
  dividerText: {
    fontSize: 12,
    color: "#AAA",
    marginHorizontal: 12,
  },

  registerBtn: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  registerBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
});
