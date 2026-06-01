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
import { useTranslation } from "../i18n/useTranslation";

const TERMS = [
  "Người dùng và đối tác khi sử dụng nền tảng munchmap đồng ý tuân thủ toàn bộ điều khoản và chính sách được quy định trên hệ thống.",
  "Người dùng có trách nhiệm cung cấp đầy đủ và chính xác thông tin đặt bàn, bao gồm nhưng không giới hạn ở họ tên, số điện thoại, thời gian đặt bàn và số lượng khách.",
  "Đối tác nhà hàng chịu trách nhiệm về tính chính xác của thông tin hiển thị trên hệ thống, bao gồm hình ảnh, thực đơn, giá bán, loại bàn và thời gian hoạt động.",
  "Đối tác có trách nhiệm tiếp nhận và xử lý yêu cầu đặt bàn trong thời gian hợp lý kể từ thời điểm hệ thống ghi nhận booking.",
  "Người dùng có trách nhiệm tuân thủ chính sách đặt cọc, hủy bàn và thời gian giữ bàn được hiển thị trước khi xác nhận booking",
  "Nhà hàng có quyền từ chối phục vụ hoặc hủy booking trong trường hợp người dùng đến trễ vượt quá thời gian giữ bàn được quy định",
  "munchmap có quyền tạm ngưng, giới hạn hoặc chấm dứt quyền truy cập đối với tài khoản có dấu hiệu gian lận, lạm dụng hệ thống hoặc vi phạm điều khoản sử dụng.",
  "Nghiêm cấm các hành vi booking ảo, spam đặt bàn, sử dụng thông tin sai lệch hoặc thực hiện các hoạt động gây ảnh hưởng đến hệ thống và đối tác nhà hàng.",
  "munchmap thu thập và xử lý dữ liệu người dùng nhằm mục đích vận hành hệ thống, hỗ trợ đặt bàn và nâng cao trải nghiệm sử dụng dịch vụ.",
  "Dữ liệu cá nhân của người dùng sẽ không được chia sẻ cho bên thứ ba ngoài phạm vi cần thiết để cung cấp dịch vụ, trừ trường hợp pháp luật có quy định khác.",
  "Người dùng và đối tác không được sử dụng, sao chép hoặc khai thác dữ liệu phát sinh từ hệ thống munchmap cho mục đích thương mại khi chưa có sự cho phép bằng văn bản.",
  "munchmap không chịu trách nhiệm đối với các gián đoạn dịch vụ, thay đổi thông tin hoặc sự cố phát sinh từ phía đối tác nhà hàng ngoài phạm vi kiểm soát của hệ thống."  ,
  "munchmap có quyền cập nhật hoặc điều chỉnh điều khoản sử dụng vào bất kỳ thời điểm nào nhằm phù hợp với hoạt động vận hành của nền tảng.",
  "Việc tiếp tục sử dụng nền tảng sau khi điều khoản được cập nhật đồng nghĩa với việc người dùng và đối tác chấp nhận các thay đổi đó.",
  "Mọi tranh chấp phát sinh liên quan đến việc sử dụng nền tảng sẽ được ưu tiên giải quyết thông qua thương lượng trước khi áp dụng các biện pháp pháp lý."
];

export default function PartnerTermsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/profile")}
        >
          <Ionicons name="arrow-back" size={18} color="#111827" />
          <Text style={styles.backText}>{t("partnerTerms.back")}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t("partnerTerms.title")}</Text>
        <View style={{ width: 72 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          {t("partnerTerms.intro")}
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
          <Text style={styles.footerBackText}>{t("partnerTerms.backToProfile")}</Text>
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
