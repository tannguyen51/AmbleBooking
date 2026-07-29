import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { bookingAPI, paymentAPI } from "@/services/api";
import { useTranslation, type TranslationKey } from "../../i18n/useTranslation";
import { useAuthStore } from "@/store/authStore";

const PRIMARY = "#FF6B35";

//type PaymentId = "momo" | "zalopay" | "bank" | "credit";
type PaymentId = "bank" | "payos";
const PAYMENT_METHODS: {
  id: PaymentId;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  //{ id: "momo", name: "MoMo", icon: "wallet-outline" },
  //{ id: "zalopay", name: "ZaloPay", icon: "phone-portrait-outline" },
  { id: "payos", name: "PayOS", icon: "card-outline" },
  { id: "bank", name: "Chuyển khoản", icon: "business-outline" },
  //{ id: "credit", name: "Thẻ tín dụng", icon: "card-outline" },
];

interface VoucherItem {
  code: string;
  discount: number;
  minBill: number;
  isPercent: boolean;
}

const TABLE_TYPE_LABELS: Record<string, TranslationKey> = {
  vip: "booking.select.typeVIP",
  view: "booking.select.typeView",
  regular: "booking.select.typeRegular",
  standard: "booking.select.typeRegular",
};

export default function ConfirmBookingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const {
    restaurantId,
    restaurantName,
    tableId,
    tableName,
    tableType,
    tableImage,
    deposit,
    date,
    time,
    partySize,
  } = useLocalSearchParams<{
    restaurantId: string;
    restaurantName: string;
    tableId: string;
    tableName: string;
    tableType?: string;
    tableImage?: string;
    deposit: string;
    date?: string;
    time?: string;
    partySize?: string;
  }>();

  const depositAmt = parseInt(deposit || "0");

  const [loading, setLoading] = useState(false);
  const [voucherLoading, setVoucherLoading] = useState(true);
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentId>("payos");
  const [showPayments, setShowPayments] = useState(false);
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherItem | null>(
    null,
  );
  const [voucherError, setVoucherError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const loadVouchers = async () => {
      try {
        const res = await bookingAPI.getVouchers(restaurantId);
        setVouchers(res.data?.vouchers || []);
      } catch {
        setVouchers([]);
      } finally {
        setVoucherLoading(false);
      }
    };
    loadVouchers();
  }, []);

  const discount = appliedVoucher
    ? appliedVoucher.isPercent
      ? (depositAmt * appliedVoucher.discount) / 100
      : appliedVoucher.discount
    : 0;
  const total = Math.max(0, depositAmt - discount);

  const applyVoucher = () => {
    const found = vouchers.find(
      (v) => v.code.toUpperCase() === voucherInput.toUpperCase(),
    );
    if (found) {
      if (depositAmt >= found.minBill) {
        setAppliedVoucher(found);
        setVoucherError("");
      } else
        setVoucherError(
          `Hóa đơn tối thiểu: ${found.minBill.toLocaleString("vi-VN")}đ`,
        );
    } else setVoucherError(t("booking.confirm.invalidVoucher"));
  };

  const bookingData = {
    date: date || "",
    time: time || "19:00",
    partySize: partySize || "2",
  };
  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  const handleConfirm = async () => {
    if (!user?._id) {
      Alert.alert(t("common.error"), t("booking.confirm.loginRequired"));
      return;
    }
    setLoading(true);
    try {
      const tablesRes = await bookingAPI.getTables(restaurantId as string);
      const latestTable = (tablesRes.data?.tables || []).find(
        (t: any) => t._id === tableId,
      );

      if (!latestTable || !latestTable.isAvailable) {
        Alert.alert(
          t("booking.confirm.tableTakenTitle"),
          "Bàn này vừa được người khác giữ chỗ. Vui lòng chọn bàn khác.",
        );
        router.replace({
          pathname: "/booking/select-table" as any,
          params: {
            restaurantId,
            restaurantName,
          },
        });
        return;
      }

      if (__DEV__) console.log('[DEBUG] Booking data:', {
        userId: user._id,
        restaurantId,
        tableId,
        partySize,
        date,
        time,
      });
      const res = await bookingAPI.create({
        userId: user._id,
        restaurantId: restaurantId as string,
        tableId: tableId as string,
        date: bookingData.date,
        time: bookingData.time,
        partySize: parseInt(bookingData.partySize),
        purpose: "casual",
        specialRequests: note,
        paymentMethod: selectedPayment,
        voucherCode: appliedVoucher?.code,
        voucherDiscount: discount,
      });
      const booking = res.data.booking;
      if (selectedPayment === "payos") {
        try {
          const baseUrl = (process.env.EXPO_PUBLIC_API_URL || "https://amblebooking-production.up.railway.app/api").replace(/\/api$/, "");
          const returnUrl = `${baseUrl}/api/payment/payos-return?bookingId=${booking._id}`;
          const cancelUrl = `${baseUrl}/api/payment/payos-cancel-page?bookingId=${booking._id}`;
          const payosRes = await paymentAPI.createPayosPayment({
            bookingId: booking._id,
            returnUrl,
            cancelUrl,
          });
          const checkoutUrl = payosRes.data.checkoutUrl;

          if (checkoutUrl) {
            await Linking.openURL(checkoutUrl);
          }

          // Mở màn hình chờ thanh toán
          router.replace({
            pathname: "/booking/payos-payment" as any,
            params: {
              bookingId: booking._id,
              bookingNumber: booking.bookingNumber,
              restaurantId,
              restaurantName,
              restaurantImage: tableImage,
              tableName,
              date,
              time,
              partySize,
              deposit,
            },
          });
          return;
        } catch (payosErr: any) {
          if (__DEV__) console.error('[DEBUG] PayOS error:', payosErr);
          Alert.alert(
            t("common.error"),
            payosErr?.response?.data?.message || "Lỗi tạo link thanh toán PayOS. Vui lòng thử lại.",
          );
          setLoading(false);
          return;
        }
      }

      if (selectedPayment === "bank") {
        router.push({
          pathname: "/booking/payment" as any,
          params: {
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
            restaurantId,
            restaurantName,
            restaurantImage: tableImage,
            tableName,
            date: bookingData.date,
            time: bookingData.time,
            partySize: bookingData.partySize,
            deposit: total.toString(),
          },
        });
        return;
      }

      router.push({
        pathname: "/booking/success" as any,
        params: {
          restaurantId,
          restaurantName,
          restaurantImage: tableImage,
          tableName,
          date: bookingData.date,
          time: bookingData.time,
          partySize: bookingData.partySize,
          deposit: total.toString(),
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
        },
      });
    } catch (err: any) {
      if (__DEV__) console.error('[DEBUG] Booking error:', err);
      if (__DEV__) console.error('[DEBUG] Error details:', err.response?.data);
      Alert.alert(
        t("common.error"),
        err.response?.data?.message || "Đặt bàn thất bại. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedPM = PAYMENT_METHODS.find((p) => p.id === selectedPayment);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("booking.confirm.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Nhà hàng */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("booking.confirm.restaurant")}</Text>
          <View style={s.card}>
            <Image
              source={{
                uri:
                  tableImage ||
                  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
              }}
              style={s.restaurantImage}
            />
            <View style={s.restaurantInfo}>
              <Text style={s.restaurantName}>{restaurantName}</Text>
              <Text style={s.restaurantAddress}>TP. Hồ Chí Minh</Text>
            </View>
          </View>
        </View>

        {/* Bàn */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("booking.confirm.selectedTable")}</Text>
          <View style={s.card}>
            <Image
              source={{
                uri:
                  tableImage ||
                  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",
              }}
              style={s.tableImage}
            />
            <View style={s.tableInfo}>
              <Text style={s.tableName}>{tableName}</Text>
              <Text style={s.tableFeatures}>
                {t(TABLE_TYPE_LABELS[tableType || ""] || "booking.select.typeRegular")}
              </Text>
            </View>
          </View>
        </View>

        {/* Chi tiết */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("booking.confirm.details")}</Text>
          <View style={s.detailsCard}>
            <View style={s.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={s.detailLabel}>{t("booking.confirm.date")}</Text>
              <Text style={s.detailValue}>{formatDate(bookingData.date)}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.detailRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={s.detailLabel}>{t("booking.confirm.time")}</Text>
              <Text style={s.detailValue}>{bookingData.time}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.detailRow}>
              <Ionicons name="people-outline" size={20} color="#666" />
              <Text style={s.detailLabel}>{t("booking.confirm.guests")}</Text>
              <Text style={s.detailValue}>{bookingData.partySize} {t("booking.select.unitGuest")}</Text>
            </View>
          </View>
        </View>

        {/* Ghi chú */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("booking.confirm.notes")}</Text>
          <TextInput
            style={s.noteInput}
            placeholder={t("booking.confirm.notesPlaceholder")}
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Voucher */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("booking.confirm.voucher")}</Text>
          <View style={s.voucherRow}>
            <TextInput
              style={s.voucherInput}
              placeholder={t("booking.confirm.voucherPlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={voucherInput}
              onChangeText={(v) => {
                setVoucherInput(v);
                setVoucherError("");
              }}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={s.applyWrap}
              onPress={applyVoucher}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#FF6B35", "#FFD700"]}
                style={s.applyBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={s.applyBtnTxt}>{t("booking.confirm.apply")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {!!voucherError && <Text style={s.voucherErr}>{voucherError}</Text>}
          {appliedVoucher && (
            <View style={s.appliedRow}>
              <Text style={s.appliedTxt}>
                ✓ {appliedVoucher.code} đã áp dụng!
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setAppliedVoucher(null);
                  setVoucherInput("");
                }}
              >
                <Text style={{ fontSize: 11, color: "#EF4444" }}>{t("booking.confirm.remove")}</Text>
              </TouchableOpacity>
            </View>
          )}
          {voucherLoading && (
            <Text style={s.voucherHint}>Đang tải voucher...</Text>
          )}
          {!voucherLoading && vouchers.length === 0 && (
            <Text style={s.voucherHint}>Hiện chưa có voucher khả dụng.</Text>
          )}
        </View>

        {/* Phương thức thanh toán */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("booking.confirm.paymentMethod")}</Text>
          <TouchableOpacity
            style={s.pmSelector}
            onPress={() => setShowPayments((v) => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name={selectedPM?.icon} size={22} color="#1A1A1A" />
            <Text style={s.pmSelectorName}>{selectedPM?.name}</Text>
            <Ionicons
              name={showPayments ? "chevron-up" : "chevron-down"}
              size={16}
              color="#9CA3AF"
            />
          </TouchableOpacity>
          {showPayments && (
            <View style={s.pmList}>
              {PAYMENT_METHODS.map((pm, i) => (
                <TouchableOpacity
                  key={pm.id}
                  style={[
                    s.pmOption,
                    selectedPayment === pm.id && s.pmOptionActive,
                    i < PAYMENT_METHODS.length - 1 && s.pmOptionBorder,
                  ]}
                  onPress={() => {
                    setSelectedPayment(pm.id);
                    setShowPayments(false);
                  }}
                >
                  <Ionicons name={pm.icon} size={20} color="#1A1A1A" />
                  <Text style={s.pmOptionName}>{pm.name}</Text>
                  {selectedPayment === pm.id && (
                    <View style={s.pmCheck}>
                      <Text style={{ color: "#fff", fontSize: 11 }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Tổng tiền */}
        <View style={s.section}>
          <View style={s.priceCard}>
            <View style={s.priceRow}>
              <Text style={s.priceLabel}>{t("booking.confirm.depositLabel")}</Text>
              <Text style={s.priceValue}>
                {depositAmt.toLocaleString("vi-VN")}đ
              </Text>
            </View>
            {discount > 0 && (
              <View style={s.priceRow}>
                <Text style={[s.priceLabel, { color: "#22C55E" }]}>
                  {t("booking.confirm.discount")}
                </Text>
                <Text style={[s.priceValue, { color: "#22C55E" }]}>
                  -{discount.toLocaleString("vi-VN")}đ
                </Text>
              </View>
            )}
            <View style={[s.priceRow, s.totalRow]}>
              <Text style={s.totalLabel}>{t("booking.confirm.total")}</Text>
              <Text style={s.totalValue}>{total.toLocaleString("vi-VN")}đ</Text>
            </View>
          </View>
        </View>

        <View style={s.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={PRIMARY}
            style={{ marginTop: 1 }}
          />
          <Text style={s.infoTxt}>
            {t("booking.confirm.policy")}
          </Text>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.bottomBar}>
        <TouchableOpacity
          style={s.confirmBtn}
          onPress={handleConfirm}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={loading ? ["#E5E7EB", "#E5E7EB"] : ["#FF6B35", "#FFD700"]}
            style={s.confirmBtnInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#999" />
                <Text style={[s.confirmBtnText, { color: "#999" }]}>
                  {t("booking.confirm.processing")}
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color="#fff"
                />
                <Text style={s.confirmBtnText}>{t("booking.confirm.submitButton")}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 35,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
    marginBottom: 10,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
  },
  restaurantImage: { width: 80, height: 80 },
  restaurantInfo: { flex: 1, padding: 12, justifyContent: "center" },
  restaurantName: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  restaurantAddress: { fontSize: 13, color: "#666" },
  tableImage: { width: 100, height: 100 },
  tableInfo: { flex: 1, padding: 12 },
  tableName: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  tableFeatures: { fontSize: 12, color: "#666" },
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  detailLabel: { flex: 1, fontSize: 14, color: "#666" },
  detailValue: { fontSize: 14, fontWeight: "600", color: "#000" },
  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 4 },
  noteInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 14,
    fontSize: 14,
    color: "#1A1A1A",
    minHeight: 80,
  },
  voucherRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  voucherInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#1A1A1A",
  },
  applyWrap: { borderRadius: 12, overflow: "hidden" },
  applyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnTxt: { fontSize: 13, fontWeight: "700", color: "#fff" },
  voucherErr: { fontSize: 12, color: "#EF4444", marginBottom: 6 },
  appliedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: "#86EFAC",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  appliedTxt: { fontSize: 12, color: "#22C55E", fontWeight: "700" },
  quickRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 2 },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF6B35",
    borderStyle: "dashed",
  },
  quickChipTxt: { fontSize: 11, color: "#FF6B35", fontWeight: "700" },
  voucherHint: { fontSize: 11, color: "#9CA3AF", marginTop: 6 },
  pmSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pmSelectorName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  pmList: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginTop: 6,
    overflow: "hidden",
  },
  pmOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  pmOptionActive: { backgroundColor: "#FFF3ED" },
  pmOptionBorder: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  pmOptionName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#374151" },
  pmCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  priceCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  priceLabel: { fontSize: 14, color: "#6B7280" },
  priceValue: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  totalValue: { fontSize: 20, fontWeight: "900", color: "#FF6B35" },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FFF3ED",
    borderRadius: 12,
    padding: 12,
  },
  infoTxt: { flex: 1, fontSize: 12, color: "#FF6B35", lineHeight: 18 },
  bottomBar: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  confirmBtn: { borderRadius: 12, overflow: "hidden" },
  confirmBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
