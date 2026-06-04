import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useTranslation, type TranslationKey } from "../../i18n/useTranslation";

const PRIMARY = "#FF6B35";
const GRAD: [string, string] = ["#FF6B35", "#FFD700"];
const { width: SCREEN_W } = Dimensions.get("window");

const LUNCH_TIMES = [
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
];

const DINNER_TIMES = [
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
];

// ── Thời lượng mặc định (khớp với backend) ──────────────
const getDefaultDuration = (mealTime: string, partySize: number): number => {
  if (partySize >= 9) return 180;
  if (mealTime === 'lunch') return partySize <= 4 ? 90 : 120;
  return partySize <= 4 ? 120 : 150;
};

const getBufferTime = (mealTime: string, partySize: number): number => {
  if (partySize >= 9) return 30;
  if (mealTime === 'lunch') return partySize <= 4 ? 15 : 20;
  return partySize <= 4 ? 20 : 25;
};

const getMealTime = (time: string): 'lunch' | 'dinner' => {
  const hour = parseInt(time.split(':')[0], 10);
  return hour >= 11 && hour < 15 ? 'lunch' : 'dinner';
};

const calcEndTime = (start: string, dur: number): string => {
  const [h, m] = start.split(':').map(Number);
  const t = h * 60 + m + dur;
  const eh = Math.floor(t / 60) % 24;
  const em = t % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
};

const TABLE_TYPE_CONFIG: Record<
  string,
  {
    label: TranslationKey;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    border: string;
  }
> = {
  standard: {
    label: "booking.select.typeRegular",
    icon: "restaurant-outline",
    color: "#3B82F6", // Xanh dương cho bàn thường
    bg: "#EFF6FF",
    border: "#93C5FD",
  },
  view: {
    label: "booking.select.typeView",
    icon: "eye-outline",
    color: "#F59E0B", // Vàng/cam cho bàn view đẹp
    bg: "#FEF3C7",
    border: "#FCD34D",
  },
  vip: {
    label: "booking.select.typeVIP",
    icon: "diamond-outline",
    color: "#9333EA", // Tím cho bàn VIP
    bg: "#FAF5FF",
    border: "#C4B5FD",
  },
  regular: {
    label: "booking.select.typeRegular",
    icon: "restaurant-outline",
    color: "#3B82F6",
    bg: "#EFF6FF",
    border: "#93C5FD",
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

interface TableGroup {
  id: string;
  name: string;
  type: "vip" | "view" | "regular" | "standard";
  capacity: { min: number; max: number };
  pricing: { baseDeposit: number };
  images: string[];
  features: string[];
  description?: string;
  tables: Table[];
}

const formatDateVN = (d: Date) =>
  d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const getNext7Days = () => {
  const days = [];
  const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const now = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);

    let dayLabel = "";
    if (i === 0) {
      dayLabel = "Hôm nay";
    } else {
      dayLabel = weekdays[d.getDay()];
    }

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dateLabel = `${dd}/${mm}`;

    days.push({
      date: d,
      dayLabel,
      dateLabel,
    });
  }
  return days;
};

const groupTables = (rawTables: Table[]): TableGroup[] => {
  const activeAndAvail = rawTables.filter((t) => t.isActive && t.isAvailable);
  const groupsMap: Record<string, TableGroup> = {};

  activeAndAvail.forEach((table) => {
    // Chuẩn hóa tên bàn bằng cách loại bỏ số/ký tự đơn lẻ ở cuối (ví dụ "Bàn VIP 1" -> "Bàn VIP")
    const normalizedName = table.name.replace(/\s+\d+$|\s+[A-Z]$/i, "").trim();
    // Tạo key duy nhất cho nhóm bàn
    const key = `${table.type}_${normalizedName}_${table.capacity.min}_${table.capacity.max}_${table.pricing.baseDeposit}`;

    if (!groupsMap[key]) {
      groupsMap[key] = {
        id: key,
        name: normalizedName,
        type: table.type,
        capacity: table.capacity,
        pricing: table.pricing,
        images:
          table.images && table.images.length > 0
            ? table.images
            : ["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600"],
        features: table.features || [],
        description: table.description,
        tables: [],
      };
    }
    groupsMap[key].tables.push(table);
  });

  return Object.values(groupsMap);
};

export default function SelectTableScreen() {
  const router = useRouter();
  const { restaurantId, restaurantName, restaurantAddress } = useLocalSearchParams<{
    restaurantId: string;
    restaurantName: string;
    restaurantAddress?: string;
  }>();

  const { t } = useTranslation();

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);

  // Multi-step flow state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedGroup, setSelectedGroup] = useState<TableGroup | null>(null);
  const [timeFilter, setTimeFilter] = useState<"all" | "lunch" | "dinner">("all");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // ── Ngày ──────────────────────────────────────────────
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── Giờ ───────────────────────────────────────────────
  const [time, setTime] = useState("19:00");

  // ── Thời lượng ────────────────────────────────────────
  const [durationAdjustment, setDurationAdjustment] = useState(0);
  const mealTime = getMealTime(time);
  const duration = getDefaultDuration(mealTime, guests);
  const bufferTime = getBufferTime(mealTime, guests);
  const finalDuration = Math.max(60, duration + durationAdjustment);
  const expectedEndTime = calcEndTime(time, finalDuration);

  const TIMES = [...LUNCH_TIMES, ...DINNER_TIMES];

  // ── Effect: reset adjustment khi đổi guests hoặc time ──
  useEffect(() => {
    setDurationAdjustment(0);
  }, [guests, time]);

  // ── Fetch tables — chạy lại mỗi khi màn hình được focus ──
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setSelectedTableId(null);
      setSelectedGroup(null);
      setStep(1);

      bookingAPI
        .getTables(restaurantId)
        .then((res) => {
          if (active) setTables(res.data.tables);
        })
        .catch((err) => {
          if (__DEV__) console.error("Error fetching tables:", err);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [restaurantId]),
  );

  const handleContinue = () => {
    const sel = tables.find((t) => t._id === selectedTableId);
    if (!sel) return;
    const dateStr = date.toISOString().split("T")[0];
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
        mealTime,
        duration: finalDuration.toString(),
        bufferTime: bufferTime.toString(),
        expectedEndTime,
        durationAdjustment: durationAdjustment.toString(),
      },
    });
  };

  const handleScroll = (event: any) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const viewSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(scrollOffset / viewSize);
    setActiveImageIndex(index);
  };

  const getFilteredTimes = () => {
    if (timeFilter === "lunch") {
      return TIMES.filter((t) => {
        const h = parseInt(t.split(":")[0]);
        return h >= 11 && h <= 14;
      });
    }
    if (timeFilter === "dinner") {
      return TIMES.filter((t) => {
        const h = parseInt(t.split(":")[0]);
        return h >= 17 && h <= 21;
      });
    }
    return TIMES;
  };

  const toggleTimeFilter = () => {
    if (timeFilter === "all") setTimeFilter("lunch");
    else if (timeFilter === "lunch") setTimeFilter("dinner");
    else setTimeFilter("all");
  };

  const next7Days = getNext7Days();
  const tableGroups = groupTables(tables);

  if (loading)
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadTxt}>{t("booking.select.loading")}</Text>
        </View>
      </SafeAreaView>
    );

  // ── Render Header ──────────────────────────────────────
  const renderHeader = () => {
    if (step === 1) {
      return (
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={s.headerTextWrapRight}>
            <Text style={s.headerTitleRight} numberOfLines={1}>{restaurantName}</Text>
            <Text style={s.headerSubRight} numberOfLines={1}>
              {restaurantAddress || t("favorites.addressFallback")}
            </Text>
          </View>
        </View>
      );
    }

    if (step === 2) {
      return (
        <View style={s.header}>
          <TouchableOpacity onPress={() => setStep(1)} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={s.headerTextWrapRight}>
            <Text style={s.headerTitleRight}>Loại bàn</Text>
          </View>
        </View>
      );
    }

    // Step 3
    return (
      <View style={s.header}>
        <TouchableOpacity onPress={() => setStep(2)} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={s.headerTextWrapRight}>
          <Text style={s.headerTitleRight}>{selectedGroup?.name || "Chi tiết bàn"}</Text>
        </View>
      </View>
    );
  };

  // ── Step 1: Chọn ngày, khách, giờ ─────────────────────────
  const renderStep1 = () => {
    const isDateInGrid = next7Days.some(
      (item) =>
        date.getDate() === item.date.getDate() &&
        date.getMonth() === item.date.getMonth() &&
        date.getFullYear() === item.date.getFullYear(),
    );

    const guestOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const filteredTimes = getFilteredTimes();

    let timeFilterLabel = "Cả ngày";
    if (timeFilter === "lunch") timeFilterLabel = "Bữa trưa";
    if (timeFilter === "dinner") timeFilterLabel = "Bữa tối";

    return (
      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Section: Chọn ngày */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Chọn ngày</Text>
            <View style={s.dateGrid}>
              {next7Days.map((item, idx) => {
                const isSelected =
                  date.getDate() === item.date.getDate() &&
                  date.getMonth() === item.date.getMonth() &&
                  date.getFullYear() === item.date.getFullYear();
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[s.dateBox, isSelected && s.boxActive]}
                    onPress={() => setDate(item.date)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.dateBoxDay, isSelected && s.textActive]}>{item.dayLabel}</Text>
                    <Text style={[s.dateBoxDate, isSelected && s.textActive]}>{item.dateLabel}</Text>
                  </TouchableOpacity>
                );
              })}
              {/* Ô thứ 8: Mở lịch đặt */}
              <TouchableOpacity
                style={[s.dateBox, !isDateInGrid && s.boxActive]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[s.dateBoxDay, !isDateInGrid && s.textActive, { fontSize: 10 }]}>
                  {!isDateInGrid
                    ? date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
                    : "Mở lịch đặt"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color={!isDateInGrid ? PRIMARY : "#6B7280"}
                  style={{ marginTop: 2 }}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* DateTimePicker Native */}
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
          {showDatePicker && Platform.OS === "ios" && (
            <TouchableOpacity style={s.iosDoneBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={s.iosDoneTxt}>{t("common.confirm")}</Text>
            </TouchableOpacity>
          )}

          {/* Section: Số khách */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Số khách</Text>
            <View style={s.guestGrid}>
              {guestOptions.map((num) => {
                const isSelected = guests === num;
                return (
                  <TouchableOpacity
                    key={num}
                    style={[s.guestBox, isSelected && s.boxActive]}
                    onPress={() => setGuests(num)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.guestTxt, isSelected && s.textActive]}>{num}</Text>
                  </TouchableOpacity>
                );
              })}
              {/* Ô thứ 10: Dấu + */}
              <TouchableOpacity
                style={[s.guestBox, guests >= 10 && s.boxActive]}
                onPress={() => {
                  if (guests < 10) {
                    setGuests(10);
                  } else {
                    setGuests((g) => Math.min(30, g + 1));
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[s.guestTxt, guests >= 10 && s.textActive]}>
                  {guests >= 10 ? `${guests}` : "+"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stepper phụ khi >= 10 khách */}
            {guests >= 10 && (
              <View style={s.extraGuestRow}>
                <Text style={s.extraGuestLabel}>Số lượng khách: </Text>
                <View style={s.extraStepper}>
                  <TouchableOpacity
                    onPress={() => setGuests((g) => Math.max(9, g - 1))}
                    style={s.extraStepBtn}
                  >
                    <Text style={s.extraStepTxt}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.extraStepNum}>{guests}</Text>
                  <TouchableOpacity
                    onPress={() => setGuests((g) => Math.min(30, g + 1))}
                    style={[s.extraStepBtn, { backgroundColor: PRIMARY }]}
                  >
                    <Text style={[s.extraStepTxt, { color: "#fff" }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={s.guestNote}>
              Nếu trên 12 khách, vui lòng liên hệ trực tiếp với chúng tôi để xem các tùy chọn đặt bàn có sẵn cho bạn
            </Text>
          </View>

          {/* Section: Chọn khung giờ */}
          <View style={s.section}>
            <View style={s.timeHeader}>
              <Text style={s.sectionTitle}>Chọn khung giờ</Text>
              <TouchableOpacity style={s.timeFilterBtn} onPress={toggleTimeFilter} activeOpacity={0.8}>
                <Text style={s.timeFilterTxt}>{timeFilterLabel}</Text>
              </TouchableOpacity>
            </View>

            <View style={s.timeGrid}>
              {filteredTimes.map((t) => {
                const isSelected = time === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[s.timeBox, isSelected && s.boxActive]}
                    onPress={() => setTime(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.timeTxt, isSelected && s.textActive]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Nút tiếp tục ở dưới cùng */}
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={s.gradientBtn}
            onPress={() => setStep(2)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={GRAD}
              style={s.gradientBtnInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={s.gradientBtnTxt}>Tiếp tục</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Step 2: Chọn Loại bàn ────────────────────────────────
  const renderStep2 = () => {
    if (tableGroups.length === 0) {
      return (
        <View style={s.emptyWrap}>
          <Ionicons name="time-outline" size={32} color="#9CA3AF" />
          <Text style={s.emptyTitle}>{t("booking.select.emptyTitle")}</Text>
          <Text style={s.emptyText}>{t("booking.select.emptySubtitle")}</Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
          {tableGroups.map((group) => {
            const cfg = TABLE_TYPE_CONFIG[group.type] ?? TABLE_TYPE_CONFIG.regular;
            const availableCount = group.tables.length;

            return (
              <View key={group.id} style={s.tableCard}>
                {/* Ảnh bàn */}
                <View style={s.cardImgContainer}>
                  <Image source={{ uri: group.images[0] }} style={s.cardImg} resizeMode="cover" />
                  {/* Nhãn loại bàn */}
                  <View style={[s.typeTag, { backgroundColor: cfg.color }]}>
                    <Text style={s.typeTagTxt}>{t(cfg.label)}</Text>
                  </View>
                </View>

                {/* Thông tin bàn */}
                <View style={s.cardBody}>
                  <View style={s.cardRow}>
                    <Text style={s.cardTitle}>{group.name}</Text>
                    <Text style={s.cardPrice}>
                      {group.pricing.baseDeposit.toLocaleString("vi-VN")}đ
                    </Text>
                  </View>
                  <View style={[s.cardRow, { marginTop: 4, marginBottom: 12 }]}>
                    <Text style={s.cardSub}>
                      {group.capacity.min} - {group.capacity.max} người
                    </Text>
                    <Text style={s.cardStatus}>Còn trống {availableCount} bàn</Text>
                  </View>

                  {/* Nút đặt bàn */}
                  <TouchableOpacity
                    style={s.cardBtn}
                    onPress={() => {
                      setSelectedGroup(group);
                      // Chọn bàn đầu tiên làm mặc định
                      if (group.tables.length > 0) {
                        setSelectedTableId(group.tables[0]._id);
                      }
                      setActiveImageIndex(0);
                      setStep(3);
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={GRAD}
                      style={s.cardBtnInner}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={s.cardBtnTxt}>Đặt bàn</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // ── Step 3: Chi tiết bàn & Chọn bàn cụ thể ──────────────────
  const renderStep3 = () => {
    if (!selectedGroup) return null;

    return (
      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Slider ảnh */}
          <View style={s.sliderWrap}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={{ width: SCREEN_W, height: 240 }}
            >
              {selectedGroup.images.map((img, idx) => (
                <Image key={idx} source={{ uri: img }} style={s.sliderImg} resizeMode="cover" />
              ))}
            </ScrollView>
            {/* Dots */}
            {selectedGroup.images.length > 1 && (
              <View style={s.dotsRow}>
                {selectedGroup.images.map((_, idx) => (
                  <View
                    key={idx}
                    style={[s.dot, activeImageIndex === idx && s.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Chi tiết thông tin bàn */}
          <View style={s.detailBody}>
            <Text style={s.detailTextItem}>• Bàn {selectedGroup.capacity.min} - {selectedGroup.capacity.max} người</Text>
            {selectedGroup.features.length > 0 ? (
              selectedGroup.features.map((feat, i) => (
                <Text key={i} style={s.detailTextItem}>• {feat}</Text>
              ))
            ) : (
              <>
                <Text style={s.detailTextItem}>• Hướng: Đông</Text>
                <Text style={s.detailTextItem}>• Có hỗ trợ máy lạnh</Text>
              </>
            )}
            {selectedGroup.description && (
              <Text style={s.detailDesc}>{selectedGroup.description}</Text>
            )}
          </View>

          {/* Chọn bàn cụ thể */}
          <View style={s.specificSection}>
            <Text style={s.specificTitle}>Chọn bàn cụ thể</Text>
            <View style={s.specificGrid}>
              {selectedGroup.tables.map((table) => {
                const isSelected = selectedTableId === table._id;
                return (
                  <TouchableOpacity
                    key={table._id}
                    style={[s.specificBox, isSelected && s.specificBoxActive]}
                    onPress={() => setSelectedTableId(table._id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.specificBoxTxt, isSelected && s.specificBoxTxtActive]}>
                      {table.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={s.specificCount}>Còn {selectedGroup.tables.length} bàn trống!!</Text>
          </View>

          {/* Thời lượng dự kiến & Điều chỉnh thời lượng */}
          {selectedTableId && (
            <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
              <Text style={s.specificTitle}>{t("booking.select.expectedTime")}</Text>
              
              <View style={s.durationBox}>
                <Ionicons name="time-outline" size={16} color={PRIMARY} />
                <Text style={s.durationLabel}>
                  {t("booking.select.expectedTime")}: {time} – {expectedEndTime}
                </Text>
                <Text style={s.durationValue}>
                  ({finalDuration} {t("booking.select.minutes")})
                </Text>
              </View>

              <View style={s.adjustRow}>
                <TouchableOpacity
                  style={[
                    s.adjustBtn,
                    durationAdjustment === -30 && s.adjustBtnActive,
                  ]}
                  onPress={() => setDurationAdjustment(durationAdjustment === -30 ? 0 : -30)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    s.adjustBtnTxt,
                    durationAdjustment === -30 && s.adjustBtnTxtActive,
                  ]}>
                    {t("booking.select.quickEat")}
                  </Text>
                  <Text style={[
                    s.adjustBtnSub,
                    durationAdjustment === -30 && s.adjustBtnSubActive,
                  ]}>-30 {t("booking.select.minutes")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.adjustBtn,
                    durationAdjustment === 30 && s.adjustBtnActive,
                  ]}
                  onPress={() => setDurationAdjustment(durationAdjustment === 30 ? 0 : 30)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    s.adjustBtnTxt,
                    durationAdjustment === 30 && s.adjustBtnTxtActive,
                  ]}>
                    {t("booking.select.longer")}
                  </Text>
                  <Text style={[
                    s.adjustBtnSub,
                    durationAdjustment === 30 && s.adjustBtnSubActive,
                  ]}>+30 {t("booking.select.minutes")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Nút đặt bàn cuối cùng */}
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={s.gradientBtn}
            onPress={handleContinue}
            disabled={!selectedTableId}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={GRAD}
              style={[s.gradientBtnInner, !selectedTableId && { opacity: 0.6 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={s.gradientBtnTxt}>Đặt bàn</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {renderHeader()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadTxt: { fontSize: 14, color: "#999" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 15 : 35,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTextWrapRight: {
    flex: 1,
    alignItems: "flex-end",
    paddingLeft: 20,
  },
  headerTitleRight: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "right",
  },
  headerSubRight: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
    textAlign: "right",
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 12,
  },

  // Grids
  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dateBox: {
    width: "23%",
    aspectRatio: 0.9,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  dateBoxDay: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
    textAlign: "center",
  },
  dateBoxDate: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "center",
  },

  // Guest Grid
  guestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  guestBox: {
    width: "18%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  guestTxt: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A1A1A",
  },

  // State Active styles
  boxActive: {
    borderColor: PRIMARY,
  },
  textActive: {
    color: PRIMARY,
  },

  // iOS Done Button
  iosDoneBtn: {
    alignSelf: "flex-end",
    marginRight: 16,
    marginVertical: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  iosDoneTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Extra guest Stepper
  extraGuestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  extraGuestLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  extraStepper: {
    flexDirection: "row",
    alignItems: "center",
  },
  extraStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  extraStepTxt: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4B5563",
  },
  extraStepNum: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginHorizontal: 12,
  },
  guestNote: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
    lineHeight: 16,
  },

  // Time grid
  timeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  timeFilterBtn: {
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timeFilterTxt: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeBox: {
    width: "18%",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  timeTxt: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },

  // Bottom Fixed Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 15,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  gradientBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  gradientBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  gradientBtnTxt: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  // Step 2: Table Card
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImgContainer: {
    width: "100%",
    height: 160,
    position: "relative",
  },
  cardImg: {
    width: "100%",
    height: "100%",
  },
  typeTag: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeTagTxt: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  cardBody: {
    padding: 16,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: "900",
    color: PRIMARY,
  },
  cardSub: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  cardStatus: {
    fontSize: 12,
    color: "#22C55E",
    fontWeight: "700",
  },
  cardBtn: {
    borderRadius: 12,
    overflow: "hidden",
  },
  cardBtnInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  cardBtnTxt: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  // Empty Wrap
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  emptyText: { fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 18 },

  // Step 3: Slider
  sliderWrap: {
    position: "relative",
    width: SCREEN_W,
    height: 240,
  },
  sliderImg: {
    width: SCREEN_W,
    height: 240,
  },
  dotsRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 14,
  },

  // Detail Info
  detailBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 4,
  },
  detailTextItem: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },
  detailDesc: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 18,
  },

  // Specific table section
  specificSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  specificTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  specificGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  specificBox: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FFD8C9",
    backgroundColor: "#FFF9F7",
    alignItems: "center",
    justifyContent: "center",
  },
  specificBoxActive: {
    borderColor: PRIMARY,
    backgroundColor: "#FFF3ED",
  },
  specificBoxTxt: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FF8C5F",
    textAlign: "center",
  },
  specificBoxTxtActive: {
    color: PRIMARY,
  },
  specificCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 12,
  },

  // Duration
  durationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF3ED",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  durationLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
  },
  durationValue: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },

  // Adjustment buttons
  adjustRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  adjustBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingVertical: 10,
    alignItems: "center",
    gap: 2,
  },
  adjustBtnActive: {
    borderColor: PRIMARY,
    backgroundColor: "#FFF3ED",
  },
  adjustBtnTxt: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  adjustBtnTxtActive: {
    color: PRIMARY,
  },
  adjustBtnSub: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  adjustBtnSubActive: {
    color: PRIMARY,
  },
});
