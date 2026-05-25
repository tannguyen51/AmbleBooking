import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const TERMS = [
  "Đối tác cam kết thông tin nhà hàng, thực đơn, giá và thời gian hoạt động là chính xác.",
  "Đối tác chịu trách nhiệm tiếp nhận, xác nhận hoặc từ chối đơn trong thời gian hợp lý.",
  "Đối tác không được tự ý sử dụng dữ liệu khách hàng ngoài mục đích phục vụ đặt bàn.",
  "Đối tác cần đảm bảo chất lượng dịch vụ tại nhà hàng đúng như mô tả trên hệ thống.",
  "Amble có quyền tạm ngưng tài khoản nếu phát hiện hành vi gian lận hoặc vi phạm điều khoản.",
  "Mọi tranh chấp phát sinh sẽ ưu tiên thương lượng, sau đó xử lý theo quy định pháp luật hiện hành.",
];

export default function PartnerTermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/profile")}
        >
          <Ionicons name="arrow-back" size={18} color="#111827" />
          <Text style={styles.backText}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Điều khoản đối tác</Text>
        <View style={{ width: 72 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Vui lòng đọc kỹ trước khi sử dụng hệ thống quản lý nhà hàng trên Amble.
        </Text>
        {TERMS.map((item, index) => (
          <View key={index} style={styles.termItem}>
            <Text style={styles.termIndex}>{index + 1}.</Text>
            <Text style={styles.termText}>{item}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerBackBtn}
          onPress={() => router.replace("/profile")}
        >
          <Ionicons name="arrow-back-outline" size={18} color="#fff" />
          <Text style={styles.footerBackText}>Quay lại hồ sơ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 72,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    flexDirection: "row",
    gap: 4,
  },
  backText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  content: { padding: 16, gap: 10, paddingBottom: 26 },
  intro: { fontSize: 13, color: "#6B7280", marginBottom: 6 },
  termItem: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
  },
  termIndex: { fontSize: 13, fontWeight: "800", color: "#FF6B35" },
  termText: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 20 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: "#F8F9FA",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerBackBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  footerBackText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
