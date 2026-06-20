import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import MunchMapLogo from "../components/AmbleLogo";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Background — cam trên, vàng dưới */}
      <LinearGradient
        colors={["#FF8B25", "#FFD109", "#FFD109"]}
        locations={[0, 0.3, 1]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Logo area — top 45% */}
      <View style={styles.logoArea}>
        <MunchMapLogo size="xl" textColor="#FFFFFF" />
        <Text style={styles.slogan}>ĐI ĂN TIỆN HƠN{"\n"}ĐẶT BÀN XỊN HƠN</Text>
      </View>

      {/* White card — bottom 55% */}
      <View style={styles.card}>
        {/* Customer */}
        <TouchableOpacity style={styles.roleCard} onPress={() => router.push("/(auth)/login")} activeOpacity={0.85}>
          <View style={styles.roleIcon}>
            <Ionicons name="person" size={20} color="#FFF" />
          </View>
          <Text style={styles.roleLabel}>Khách hàng</Text>
        </TouchableOpacity>

        {/* Partner */}
        <TouchableOpacity style={styles.roleCard} onPress={() => router.push("/(partner-auth)/partner-login")} activeOpacity={0.85}>
          <View style={styles.roleIcon}>
            <Ionicons name="restaurant" size={20} color="#FFF" />
          </View>
          <Text style={styles.roleLabel}>Nhà hàng</Text>
        </TouchableOpacity>

        {/* Admin */}
        <TouchableOpacity style={styles.roleCard} onPress={() => router.push("/admin/login")} activeOpacity={0.85}>
          <View style={styles.roleIcon}>
            <Ionicons name="shield-checkmark" size={20} color="#FFF" />
          </View>
          <Text style={styles.roleLabel}>Admin</Text>
        </TouchableOpacity>

        {/* Divider — Figma: "Hoặc" #ABABAB */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Hoặc</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Register — Figma: 370×58, #FF8F1F, r=10 */}
        <TouchableOpacity style={styles.registerBtn} onPress={() => router.push("/(auth)/register")} activeOpacity={0.85}>
          <Text style={styles.registerText}>Đăng ký tài khoản mới</Text>
        </TouchableOpacity>

        {/* Language — Figma: white pill 171×40, r=10 */}
        <TouchableOpacity style={styles.langBtn} onPress={() => router.push("/language")} activeOpacity={0.85}>
          <Ionicons name="language-outline" size={20} color="#FF8F1F" />
          <Text style={styles.langText}>Đổi ngôn ngữ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFD109" },
  glowOrange: {
    position: "absolute", width: 500, height: 500, borderRadius: 250,
    backgroundColor: "#FF8B25", opacity: 0.3, top: -100, left: -80,
  },
  glowWhite: {
    position: "absolute", width: 400, height: 400, borderRadius: 200,
    backgroundColor: "#FFFFFF", opacity: 0.2, bottom: "35%", right: -100,
  },
  logoArea: { flex: 0.35, justifyContent: "flex-start", paddingTop: 60, paddingLeft: 24, paddingBottom: 16 },
  slogan: {
    fontSize: 20, fontWeight: "900", fontFamily: "Montserrat_700Bold",
    color: "#FFFFFF", textAlign: "left", marginTop: 8,
    textShadowColor: "rgba(0,0,0,0.1)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  card: {
    flex: 0.65, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 48, paddingBottom: 40, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  roleCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderRadius: 15, padding: 14, marginBottom: 12, width: "100%",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3, gap: 14,
  },
  roleIcon: {
    width: 42, height: 42, borderRadius: 10, backgroundColor: "#FF8F1F",
    alignItems: "center", justifyContent: "center",
  },
  roleLabel: { fontSize: 16, fontWeight: "500", fontFamily: "Montserrat_500Medium", color: "#000" },
  dividerRow: { flexDirection: "row", alignItems: "center", width: "100%", marginVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E8E8E8" },
  dividerText: { fontSize: 16, fontWeight: "500", fontFamily: "Montserrat_500Medium", color: "#ABABAB", marginHorizontal: 12 },
  registerBtn: {
    backgroundColor: "#FF8F1F", borderRadius: 10, height: 58, width: "100%",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  registerText: { fontSize: 20, fontWeight: "400", fontFamily: "Montserrat_400Regular", color: "#FFFFFF" },
  langBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFFFF", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24, gap: 8,
  },
  langText: { fontSize: 16, fontWeight: "500", fontFamily: "Montserrat_500Medium", color: "#000" },
});
