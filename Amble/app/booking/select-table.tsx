import React, { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import { bookingAPI } from "@/services/api";

const PRIMARY = "#FF6B35";
const { height: SCREEN_H } = Dimensions.get("window");

const TIMES = [
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
];

const TABLE_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    border: string;
  }
> = {
  standard: {
    label: "Bàn Thường",
    icon: "restaurant-outline",
    color: "#22C55E",
    bg: "#F0FDF4",
    border: "#86EFAC",
  },
  view: {
    label: "Bàn View Đẹp",
    icon: "eye-outline",
    color: "#3B82F6",
    bg: "#EFF6FF",
    border: "#93C5FD",
  },
  vip: {
    label: "Bàn VIP",
    icon: "diamond-outline",
    color: "#9333EA",
    bg: "#FAF5FF",
    border: "#C4B5FD",
  },
  regular: {
    label: "Bàn Thường",
    icon: "restaurant-outline",
    color: "#22C55E",
    bg: "#F0FDF4",
    border: "#86EFAC",
  },
};

interface Table {
  _id: string;
  name: string;
  type: "vip" | "view" | "regular" | "standard";
  capacity: { min: number; max: number };
  pricing: { baseDeposit: number };
  images: string[];
  features: string[];
  isActive: boolean;
  isAvailable: boolean;
  description?: string;
}

const formatDateVN = (d: Date) =>
  d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export default function SelectTableScreen() {
  const router = useRouter();
  const { restaurantId, restaurantName } = useLocalSearchParams<{
    restaurantId: string;
    restaurantName: string;
  }>();

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [showDrawer, setShowDrawer] = useState(false);

  // ── Ngày ──────────────────────────────────────────────
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── Giờ ───────────────────────────────────────────────
  const [time, setTime] = useState("19:00");
  const [showTimePicker, setShowTimePicker] = useState(false);

  // ── Drawer animation ───────────────────────────────────
  const drawerAnim = useRef(new Animated.Value(SCREEN_H)).current;

  // ── Fetch tables — chạy lại mỗi khi màn hình được focus ──
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setSelectedTableId(null); // reset selection khi quay lại

      bookingAPI
        .getTables(restaurantId)
        .then((res) => {
          if (active) setTables(res.data.tables);
        })
        .catch((err) => console.error("Error fetching tables:", err))
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      }; // cleanup nếu unmount giữa chừng
    }, [restaurantId]),
  );

  const openDrawer = () => {
    setShowDrawer(true);
    Animated.spring(drawerAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 30,
      stiffness: 400,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: SCREEN_H,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowDrawer(false));
  };

  const handleSelectTable = (table: Table) => {
    if (!table.isActive || !table.isAvailable) return;
    setSelectedTableId(table._id);
    openDrawer();
  };

  const handleContinue = () => {
    const sel = tables.find((t) => t._id === selectedTableId);
    if (!sel) return;
    const dateStr = date.toISOString().split("T")[0];
    closeDrawer();
    setTimeout(() => {
      router.push({
        pathname: "/booking/confirm" as any,
        params: {
          restaurantId,
          restaurantName,
          tableId: sel._id,
          tableName: sel.name,
          tableType: sel.type,
          tableImage: sel.images?.[0] || "",
          deposit: sel.pricing.baseDeposit.toString(),
          date: dateStr,
          time,
          partySize: guests.toString(),
        },
      });
    }, 260);
  };

  const selectedTable = tables.find((t) => t._id === selectedTableId);
  const filtered = selectedType
    ? tables.filter((t) => t.type === selectedType)
    : tables;
  const groups = Object.keys(TABLE_TYPE_CONFIG).reduce<Record<string, Table[]>>(
    (acc, k) => {
      const g = filtered.filter((t) => t.type === k);
      if (g.length) acc[k] = g;
      return acc;
    },
    {},
  );

  if (loading)
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadTxt}>Đang tải bàn...</Text>
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={s.container}>
      {/* ── Header ──────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={s.headerTitle}>Chọn bàn</Text>
          <Text style={s.headerSub}>{restaurantName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Ngày / Giờ / Khách ──────────────────── */}
        <View style={s.dtgRow}>
          {/* Ngày — mở DateTimePicker native */}
          <TouchableOpacity
            style={s.dtgBox}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={16} color={PRIMARY} />
            <Text style={s.dtgLabel}>Ngày</Text>
            <Text style={s.dtgVal}>{formatDateVN(date)}</Text>
          </TouchableOpacity>

          {/* Giờ — mở bottom sheet */}
          <TouchableOpacity
            style={s.dtgBox}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={16} color={PRIMARY} />
            <Text style={s.dtgLabel}>Giờ</Text>
            <Text style={s.dtgVal}>{time}</Text>
          </TouchableOpacity>

          {/* Khách — stepper */}
          <View style={s.dtgBox}>
            <Ionicons name="people-outline" size={16} color={PRIMARY} />
            <Text style={s.dtgLabel}>Khách</Text>
            <View style={s.stepper}>
              <TouchableOpacity
                onPress={() => setGuests((g) => Math.max(1, g - 1))}
                style={s.stepBtn}
              >
                <Text style={s.stepTxt}>−</Text>
              </TouchableOpacity>
              <Text style={s.stepNum}>{guests}</Text>
              <TouchableOpacity
                onPress={() => setGuests((g) => Math.min(20, g + 1))}
                style={[s.stepBtn, s.stepBtnPlus]}
              >
                <Text style={[s.stepTxt, { color: "#fff" }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Native Date Picker (iOS inline / Android dialog) */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              if (Platform.OS === "android") setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
            locale="vi"
          />
        )}
        {/* iOS: nút Xong để đóng */}
        {showDatePicker && Platform.OS === "ios" && (
          <TouchableOpacity
            style={s.iosDoneBtn}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={s.iosDoneTxt}>Xong</Text>
          </TouchableOpacity>
        )}

        {/* ── Legend ──────────────────────────────── */}
        <View style={s.legend}>
          {[
            ["#22C55E", "Còn trống"],
            ["#EF4444", "Đã đặt"],
            [PRIMARY, "Đang chọn"],
          ].map(([c, l]) => (
            <View key={l} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: c }]} />
              <Text style={s.legendTxt}>{l}</Text>
            </View>
          ))}
        </View>

        {/* ── Filter chips ─────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
        >
          <TouchableOpacity
            style={s.chip}
            onPress={() => setSelectedType(null)}
          >
            {!selectedType ? (
              <LinearGradient
                colors={["#FF6B35", "#FFD700"]}
                style={s.chipGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={s.chipTxtActive}>Tất cả ({tables.length})</Text>
              </LinearGradient>
            ) : (
              <Text style={s.chipTxt}>Tất cả ({tables.length})</Text>
            )}
          </TouchableOpacity>
          {Object.entries(TABLE_TYPE_CONFIG).map(([type, cfg]) => {
            const total = tables.filter((t) => t.type === type).length;
            const avail = tables.filter(
              (t) => t.type === type && t.isActive && t.isAvailable,
            ).length;
            if (!total) return null;
            const active = selectedType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  s.chip,
                  active && {
                    backgroundColor: cfg.bg,
                    borderColor: cfg.border,
                  },
                ]}
                onPress={() => setSelectedType(active ? null : type)}
              >
                <View style={s.chipContent}>
                  <Ionicons
                    name={cfg.icon}
                    size={14}
                    color={active ? cfg.color : "#6B7280"}
                    style={{ paddingLeft: 8 }}
                  />

                  <Text style={[s.chipTxt, active && { color: cfg.color }]}>
                    {cfg.label} ({avail}/{total})
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Grid bàn ────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {Object.entries(groups).map(([type, typeTables]) => {
            const cfg = TABLE_TYPE_CONFIG[type];
            return (
              <View key={type} style={{ marginBottom: 24 }}>
                <View style={s.groupHeader}>
                  <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                  <Text style={s.groupTitle}>{cfg.label}</Text>
                  <View style={[s.groupBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.groupBadgeTxt, { color: cfg.color }]}>
                      {typeTables.filter((t) => t.isActive).length} trống
                    </Text>
                  </View>
                </View>
                <View style={s.grid}>
                  {typeTables.map((table) => {
                    const isSel = selectedTableId === table._id;
                    const isBooked = !table.isActive;
                    return (
                      <TouchableOpacity
                        key={table._id}
                        style={[
                          s.cell,
                          {
                            borderColor: isSel
                              ? PRIMARY
                              : isBooked
                                ? "#FCA5A5"
                                : cfg.border,
                            backgroundColor: isSel
                              ? "#FFF3ED"
                              : isBooked
                                ? "#FEF2F2"
                                : cfg.bg,
                          },
                        ]}
                        onPress={() => handleSelectTable(table)}
                        disabled={isBooked}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            s.cellName,
                            {
                              color: isSel
                                ? PRIMARY
                                : isBooked
                                  ? "#EF4444"
                                  : cfg.color,
                            },
                          ]}
                        >
                          {table.name}
                        </Text>
                        <Text
                          style={[
                            s.cellStatus,
                            { color: isBooked ? "#EF4444" : "#9CA3AF" },
                          ]}
                        >
                          {isBooked ? "Đặt" : "Trống"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ══ Time Picker Modal ═══════════════════════════ */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={s.modalWrap}>
          {/* backdrop */}
          <TouchableOpacity
            style={s.backdrop}
            activeOpacity={1}
            onPress={() => setShowTimePicker(false)}
          />
          {/* sheet */}
          <View style={s.timeSheet}>
            <View style={s.handle} />
            <View style={s.timeSheetHeader}>
              <Text style={s.timeSheetTitle}>Chọn giờ</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {TIMES.map((t) => {
                const active = time === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[s.timeItem, active && s.timeItemActive]}
                    onPress={() => {
                      setTime(t);
                      setShowTimePicker(false);
                    }}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[s.timeItemTxt, active && s.timeItemTxtActive]}
                    >
                      {t}
                    </Text>
                    {active && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={PRIMARY}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══ Table Detail Drawer ══════════════════════════ */}
      <Modal
        visible={showDrawer}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <View style={s.modalWrap}>
          <TouchableOpacity
            style={s.backdrop}
            activeOpacity={1}
            onPress={closeDrawer}
          />
          <Animated.View
            style={[s.drawer, { transform: [{ translateY: drawerAnim }] }]}
          >
            <View style={s.handle} />
            {selectedTable &&
              (() => {
                const cfg =
                  TABLE_TYPE_CONFIG[selectedTable.type] ??
                  TABLE_TYPE_CONFIG.regular;
                return (
                  <>
                    <Image
                      source={{
                        uri:
                          selectedTable.images?.[0] ||
                          "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
                      }}
                      style={s.drawerImg}
                      resizeMode="cover"
                    />
                    <View style={s.drawerBody}>
                      <View style={s.drawerTopRow}>
                        <View>
                          <Text style={s.drawerName}>
                            {cfg.icon} {selectedTable.name}
                          </Text>
                          <Text style={[s.drawerType, { color: cfg.color }]}>
                            {cfg.label}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={s.drawerDeposit}>
                            {(selectedTable.pricing.baseDeposit / 1000).toFixed(
                              0,
                            )}
                            .000đ
                          </Text>
                          <Text style={s.drawerDepositLbl}>Tiền cọc</Text>
                        </View>
                      </View>
                      <View style={s.drawerBadges}>
                        <View style={s.badge}>
                          <Text style={s.badgeTxt}>
                            👥 {selectedTable.capacity.min}–
                            {selectedTable.capacity.max} người
                          </Text>
                        </View>
                        <View style={s.badge}>
                          <Text style={s.badgeTxt}>✅ Còn trống</Text>
                        </View>
                      </View>
                      {(selectedTable.description ||
                        selectedTable.features?.length > 0) && (
                        <Text style={s.drawerDesc}>
                          {selectedTable.description ||
                            selectedTable.features.join(" • ")}
                        </Text>
                      )}
                      <TouchableOpacity
                        style={s.contBtn}
                        onPress={handleContinue}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={["#FF6B35", "#FFD700"]}
                          style={s.contBtnInner}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Text style={s.contBtnTxt}>Tiếp tục đặt bàn</Text>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#fff"
                          />
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadTxt: { fontSize: 14, color: "#999" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 35,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSub: { fontSize: 12, color: "#9CA3AF", marginTop: 1 },

  // Date/Time/Guests row
  dtgRow: { flexDirection: "row", gap: 10, padding: 14 },
  dtgBox: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 4,
  },
  dtgLabel: { fontSize: 10, fontWeight: "600", color: "#9CA3AF" },
  dtgVal: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },

  // iOS done button
  iosDoneBtn: {
    alignSelf: "flex-end",
    marginRight: 16,
    marginBottom: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  iosDoneTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Stepper
  stepper: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  stepBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnPlus: { backgroundColor: PRIMARY },
  stepTxt: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  stepNum: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1A1A1A",
    marginHorizontal: 6,
  },

  // Legend
  legend: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendTxt: { fontSize: 11, color: "#6B7280" },

  // Filter chips
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  chipGrad: { paddingHorizontal: 12, paddingVertical: 8 },
  chipTxt: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingLeft: 1,
  },
  chipTxtActive: { fontSize: 12, fontWeight: "700", color: "#fff" },

  // Group
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  groupTitle: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  groupBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  groupBadgeTxt: { fontSize: 11, fontWeight: "700" },

  // Grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cell: {
    width: "18%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  cellName: { fontSize: 9, fontWeight: "800", textAlign: "center" },
  cellStatus: { fontSize: 7, marginTop: 2 },

  // Modal wrapper — flex column, sheet sticks to bottom
  modalWrap: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  // Time sheet
  timeSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: SCREEN_H * 0.55,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  timeSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  timeSheetTitle: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  timeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  timeItemActive: {
    backgroundColor: "#FFF3ED",
    borderRadius: 10,
    marginHorizontal: -8,
    paddingHorizontal: 16,
  },
  timeItemTxt: { fontSize: 15, color: "#374151" },
  timeItemTxtActive: { color: PRIMARY, fontWeight: "700" },

  // Drawer
  drawer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  drawerImg: { width: "100%", height: 200 },
  drawerBody: { padding: 20 },
  drawerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  drawerName: { fontSize: 20, fontWeight: "900", color: "#1A1A1A" },
  drawerType: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  drawerDeposit: { fontSize: 20, fontWeight: "900", color: PRIMARY },
  drawerDepositLbl: { fontSize: 11, color: "#9CA3AF" },
  drawerBadges: { flexDirection: "row", gap: 8, marginBottom: 10 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
  },
  badgeTxt: { fontSize: 12, fontWeight: "700", color: "#22C55E" },
  drawerDesc: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 14,
  },
  contBtn: { borderRadius: 16, overflow: "hidden" },
  contBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  contBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
  chipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
