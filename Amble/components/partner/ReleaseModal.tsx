import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { partnerDashboardAPI } from "../../services/api";

const PRIMARY = "#FF6B35";

const RELEASE_REASONS = [
  { key: "no_show", label: "Khách không đến (No-show)", icon: "close-circle-outline", color: "#EF4444" },
  { key: "late", label: "Khách đến muộn", icon: "time-outline", color: "#F59E0B" },
  { key: "customer_cancel", label: "Khách yêu cầu hủy", icon: "hand-left-outline", color: "#3B82F6" },
  { key: "emergency_clean", label: "Bàn cần dọn khẩn cấp", icon: "alert-circle-outline", color: "#8B5CF6" },
  { key: "other", label: "Khác", icon: "ellipsis-horizontal-circle-outline", color: "#6B7280" },
];

interface ReleaseModalProps {
  visible: boolean;
  booking: {
    id: string;
    bookingNumber: string;
    tableNumber: string;
    userName: string;
    date: string;
    time: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReleaseModal({ visible, booking, onClose, onSuccess }: ReleaseModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset state khi mở/đóng modal
  React.useEffect(() => {
    if (!visible) {
      setSelectedReason("");
      setNote("");
    }
  }, [visible]);

  // Tính số phút đã muộn (nếu có)
  const getLateMinutes = () => {
    if (!booking?.time) return null;
    const [h, m] = booking.time.split(":").map(Number);
    const bookingMin = h * 60 + m;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const diff = nowMin - bookingMin;
    return diff > 0 ? diff : null;
  };

  const handleRelease = async () => {
    if (!selectedReason) {
      Alert.alert("Thông báo", "Vui lòng chọn lý do release.");
      return;
    }
    if (!booking) return;

    setLoading(true);
    try {
      await partnerDashboardAPI.releaseBooking(booking.id, {
        reason: selectedReason,
        note: note || undefined,
      });
      Alert.alert("Thành công", "Đã giải phóng bàn thành công.");
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không thể release bàn.");
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return null;

  const lateMin = getLateMinutes();
  const todayStr = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header đỏ */}
            <View style={s.header}>
              <Ionicons name="warning-outline" size={24} color="#EF4444" />
              <Text style={s.title}>Giải phóng bàn</Text>
            </View>

            {/* Thông tin booking */}
            <View style={s.infoBox}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Bàn:</Text>
                <Text style={s.infoValue}>{booking.tableNumber}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Khách:</Text>
                <Text style={s.infoValue}>{booking.userName}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Giờ đặt:</Text>
                <Text style={s.infoValue}>{booking.date} {booking.time}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Hiện tại:</Text>
                <Text style={s.infoValue}>{todayStr}</Text>
              </View>
              {lateMin !== null && (
                <View style={[s.infoRow, { backgroundColor: "#FEF2F2", borderRadius: 8, padding: 8, marginTop: 4 }]}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={{ fontSize: 13, color: "#EF4444", fontWeight: "700", marginLeft: 6 }}>
                    Đã muộn {Math.floor(lateMin / 60)}h{lateMin % 60}ph
                  </Text>
                </View>
              )}
            </View>

            {/* Chọn lý do (bắt buộc) */}
            <Text style={s.sectionLabel}>Chọn lý do release</Text>
            {RELEASE_REASONS.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[s.reasonItem, selectedReason === r.key && { borderColor: r.color, backgroundColor: r.color + "15" }]}
                onPress={() => setSelectedReason(r.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={r.icon as any} size={20} color={selectedReason === r.key ? r.color : "#9CA3AF"} />
                <Text style={[s.reasonLabel, selectedReason === r.key && { color: r.color, fontWeight: "800" }]}>
                  {r.label}
                </Text>
                <View style={[s.radio, selectedReason === r.key && { borderColor: r.color }]}>
                  {selectedReason === r.key && <View style={[s.radioDot, { backgroundColor: r.color }]} />}
                </View>
              </TouchableOpacity>
            ))}

            {/* Ghi chú (tùy chọn) */}
            <Text style={[s.sectionLabel, { marginTop: 12 }]}>Ghi chú (tùy chọn)</Text>
            <TextInput
              style={s.noteInput}
              placeholder="Nhập ghi chú..."
              placeholderTextColor="#9CA3AF"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Actions */}
            <View style={s.actionRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={s.cancelBtnTxt}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.releaseBtn, !selectedReason && { opacity: 0.5 }]}
                onPress={handleRelease}
                disabled={loading || !selectedReason}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={s.releaseBtnTxt}>Xác nhận Release</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#EF4444",
  },
  infoBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    width: 70,
  },
  infoValue: {
    fontSize: 13,
    color: "#1A1A1A",
    fontWeight: "700",
    flex: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 6,
    backgroundColor: "#FAFAFA",
  },
  reasonLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  noteInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    fontSize: 14,
    color: "#1A1A1A",
    minHeight: 70,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  cancelBtnTxt: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B7280",
  },
  releaseBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  releaseBtnTxt: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
});
