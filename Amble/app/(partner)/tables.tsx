import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { partnerDashboardAPI } from "../../services/api";
import { PartnerBottomNav } from "../../components/partner/PartnerBottomNav";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";
import { hasPartnerPermission } from "../../constants/partnerPermissions";

type TableFilter = "all" | "available" | "booked";
type TableType = "regular" | "standard" | "view" | "vip";

interface PartnerTable {
  id: string;
  name: string;
  type: TableType;
  capacity: { min: number; max: number };
  pricing: { baseDeposit: number };
  images?: string[];
  description?: string;
  features?: string[];
  isAvailable: boolean;
  status: "available" | "booked";
  currentBooking: {
    id: string;
    status: string;
    date: string;
    time: string;
    guests: number;
    customerName: string;
    customerPhone: string;
  } | null;
}

interface TableFormState {
  name: string;
  type: TableType;
  minCapacity: string;
  maxCapacity: string;
  baseDeposit: string;
  description: string;
  featuresText: string;
  imageInput: string;
  images: string[];
  isAvailable: boolean;
}

const TABLE_TYPE_LABELS: Record<TableType, string> = {
  standard: "Bàn thường",
  regular: "Bàn thường",
  view: "Bàn view",
  vip: "VIP",
};

const TABLE_TYPE_OPTIONS: Array<{
  key: "regular" | "view" | "vip";
  label: string;
}> = [
  { key: "regular", label: "Bàn thường" },
  { key: "view", label: "Bàn view" },
  { key: "vip", label: "VIP" },
];

const TABLE_TYPE_STYLES: Record<
  "regular" | "view" | "vip",
  {
    textColor: string;
    borderColor: string;
    backgroundColor: string;
    activeBackgroundColor: string;
  }
> = {
  regular: {
    textColor: "#22C55E",
    borderColor: "#7DDF9E",
    backgroundColor: "#E7F8EE",
    activeBackgroundColor: "#D3F2E0",
  },
  view: {
    textColor: "#2563EB",
    borderColor: "#93C5FD",
    backgroundColor: "#DBEAFE",
    activeBackgroundColor: "#BFDBFE",
  },
  vip: {
    textColor: "#9333EA",
    borderColor: "#D8B4FE",
    backgroundColor: "#F3E8FF",
    activeBackgroundColor: "#E9D5FF",
  },
};

const DEFAULT_FORM: TableFormState = {
  name: "",
  type: "regular",
  minCapacity: "2",
  maxCapacity: "4",
  baseDeposit: "200000",
  description: "",
  featuresText: "",
  imageInput: "",
  images: [],
  isAvailable: true,
};

const TABLE_FILTER_ACTIVE_STYLES: Record<
  Exclude<TableFilter, "all">,
  { backgroundColor: string; borderColor: string; textColor: string }
> = {
  available: {
    backgroundColor: "#E7F8EE",
    borderColor: "#7DDF9E",
    textColor: "#22C55E",
  },
  booked: {
    backgroundColor: "#FEE2E2",
    borderColor: "#F04444",
    textColor: "#F04444",
  },
};

export default function PartnerTablesScreen() {
  const router = useRouter();
  const [tables, setTables] = useState<PartnerTable[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<TableFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [form, setForm] = useState<TableFormState>(DEFAULT_FORM);
  const { partner } = usePartnerAuthStore();
  const canManageTables = hasPartnerPermission(partner?.role, "tables:manage");

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditingTableId(null);
  };

  const loadData = async () => {
    try {
      const [tablesRes, overviewRes] = await Promise.all([
        partnerDashboardAPI.getTables(),
        partnerDashboardAPI.getOverview(),
      ]);

      setTables(tablesRes.data?.tables || []);
      setPendingCount(overviewRes.data?.overview?.pendingOrders || 0);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Không tải được danh sách bàn";
      Alert.alert("Lỗi", message);
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === "available").length;
    const booked = tables.filter((t) => t.status === "booked").length;
    return { total, available, booked };
  }, [tables]);

  const filteredTables = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return tables.filter((table) => {
      const matchFilter = filter === "all" ? true : table.status === filter;
      const matchSearch =
        !keyword ||
        table.name.toLowerCase().includes(keyword) ||
        TABLE_TYPE_LABELS[table.type].toLowerCase().includes(keyword);
      return matchFilter && matchSearch;
    });
  }, [tables, filter, searchText]);

  const filterTabs = [
    { key: "all" as TableFilter, label: `Tất cả (${stats.total})` },
    {
      key: "available" as TableFilter,
      label: `Bàn trống (${stats.available})`,
    },
    { key: "booked" as TableFilter, label: `Đã đặt (${stats.booked})` },
  ];

  const updateForm = (key: keyof TableFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addImage = () => {
    const next = form.imageInput.trim();
    if (!next) return;
    if (form.images.includes(next)) {
      Alert.alert("Thông báo", "Ảnh này đã được thêm.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      images: [...prev.images, next],
      imageInput: "",
    }));
  };

  const appendPickedImage = (uri: string) => {
    if (!uri) return;
    setForm((prev) => {
      if (prev.images.includes(uri)) return prev;
      return { ...prev, images: [...prev.images, uri] };
    });
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Quyền truy cập", "Vui lòng cấp quyền thư viện ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      appendPickedImage(result.assets[0]?.uri || "");
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Quyền truy cập", "Vui lòng cấp quyền camera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      appendPickedImage(result.assets[0]?.uri || "");
    }
  };

  const removeImage = (url: string) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img !== url),
    }));
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (table: PartnerTable) => {
    setEditingTableId(table.id);
    setForm({
      name: table.name || "",
      type: table.type === "standard" ? "regular" : table.type || "regular",
      minCapacity: String(table.capacity?.min || 2),
      maxCapacity: String(table.capacity?.max || 4),
      baseDeposit: String(table.pricing?.baseDeposit || 0),
      description: table.description || "",
      featuresText: (table.features || []).join(", "),
      imageInput: "",
      images: table.images || [],
      isAvailable: table.status === "available",
    });
    setModalVisible(true);
  };

  const buildPayload = () => {
    const min = Number(form.minCapacity);
    const max = Number(form.maxCapacity);
    const deposit = Number(form.baseDeposit);

    if (!form.name.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên bàn.");
      return null;
    }
    if (
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min < 1 ||
      max < min
    ) {
      Alert.alert("Dữ liệu sai", "Sức chứa không hợp lệ.");
      return null;
    }
    if (!Number.isFinite(deposit) || deposit < 0) {
      Alert.alert("Dữ liệu sai", "Tiền cọc không hợp lệ.");
      return null;
    }

    return {
      name: form.name.trim(),
      type: form.type,
      capacity: { min, max },
      pricing: { baseDeposit: deposit },
      description: form.description.trim(),
      features: form.featuresText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      images: form.images,
      isAvailable: form.isAvailable,
    };
  };

  const handleSubmit = async () => {
    const payload = buildPayload();
    if (!payload) return;

    try {
      setIsSubmitting(true);
      if (editingTableId) {
        await partnerDashboardAPI.updateTable(editingTableId, payload);
      } else {
        await partnerDashboardAPI.createTable(payload);
      }
      setModalVisible(false);
      resetForm();
      await loadData();
    } catch (error: any) {
      setIsSubmitting(false);
      const message = error?.response?.data?.message || "Không thể lưu bàn";
      Alert.alert("Lỗi", message);
    }
  };

  const handleDelete = (tableId: string) => {
    Alert.alert("Xóa bàn", "Bạn chắc chắn muốn xóa bàn này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            setIsSubmitting(true);
            await partnerDashboardAPI.deleteTable(tableId);
            await loadData();
          } catch (error: any) {
            setIsSubmitting(false);
            const message =
              error?.response?.data?.message || "Không thể xóa bàn";
            Alert.alert("Lỗi", message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerWrap}>
        <Text style={styles.headerTitle}>Quản lý bàn</Text>
        <View style={styles.headerActions}>
          {canManageTables && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={openCreateModal}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={["#ff8b25", "#ffd109"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addBtnGradient}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.addBtnText}>Thêm bàn</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/dashboard")}
          ></TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.availableCard]}>
          <Text style={[styles.statLabel, styles.availableStatLabel]}>
            Bàn trống
          </Text>
          <Text style={[styles.statValue, styles.availableStatValue]}>
            {stats.available}
          </Text>
        </View>
        <View style={[styles.statCard, styles.bookedCard]}>
          <Text style={[styles.statLabel, styles.bookedStatLabel]}>Đã đặt</Text>
          <Text style={[styles.statValue, styles.bookedStatValue]}>
            {stats.booked}
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Tìm theo tên bàn hoặc loại bàn..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        horizontal
        style={styles.filterScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filterTabs.map((tab) => {
          const isActive = filter === tab.key;
          const isAllActive = isActive && tab.key === "all";
          const activeStyle =
            tab.key !== "all" && isActive
              ? TABLE_FILTER_ACTIVE_STYLES[tab.key]
              : undefined;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterChip,
                isActive && tab.key !== "all" && styles.filterChipActive,
                activeStyle && {
                  backgroundColor: activeStyle.backgroundColor,
                  borderColor: activeStyle.borderColor,
                },
              ]}
              onPress={() => setFilter(tab.key)}
            >
              {isAllActive && (
                <LinearGradient
                  colors={["#ff8b25", "#ffd109"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.filterChipGradient}
                />
              )}
              <Text
                style={[
                  styles.filterText,
                  isActive && styles.filterTextActive,
                  activeStyle && { color: activeStyle.textColor },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.listWrap}
        contentContainerStyle={styles.listContent}
      >
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.helperText}>Đang tải danh sách bàn...</Text>
          </View>
        ) : filteredTables.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyTitle}>Không tìm thấy bàn phù hợp</Text>
            <Text style={styles.helperText}>Thử đổi từ khóa hoặc bộ lọc.</Text>
          </View>
        ) : (
          filteredTables.map((table) => {
            const typeLabel = TABLE_TYPE_LABELS[table.type] || table.type;
            const isBooked = table.status === "booked";
            const coverImage = table.images?.[0];
            return (
              <View key={table.id} style={styles.tableCard}>
                <View style={styles.tableTopRow}>
                  <View style={styles.tableTopLeft}>
                    {!!coverImage && (
                      <Image
                        source={{ uri: coverImage }}
                        style={styles.tableThumb}
                      />
                    )}
                    <View>
                      <Text style={styles.tableName}>{table.name}</Text>
                      <Text style={styles.metaText}>{typeLabel}</Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.statusBadge,
                      isBooked ? styles.bookedBadge : styles.availableBadge,
                    ]}
                  >
                    {isBooked ? "Đã đặt" : "Trống"}
                  </Text>
                </View>

                <Text style={styles.metaText}>
                  Sức chứa: {table.capacity?.min || 0}-
                  {table.capacity?.max || 0} người
                </Text>
                <Text style={styles.metaText}>
                  Cọc:{" "}
                  {(table.pricing?.baseDeposit || 0).toLocaleString("vi-VN")}đ
                </Text>
                {table.images && table.images.length > 1 && (
                  <Text style={styles.metaText}>
                    Ảnh: {table.images.length}
                  </Text>
                )}

                {table.currentBooking && (
                  <View style={styles.bookingInfoBox}>
                    <Text style={styles.bookingInfoTitle}>
                      Booking hiện tại
                    </Text>
                    <Text style={styles.bookingInfoText}>
                      {table.currentBooking.customerName} •{" "}
                      {table.currentBooking.customerPhone || "--"}
                    </Text>
                    <Text style={styles.bookingInfoText}>
                      {table.currentBooking.date} • {table.currentBooking.time}{" "}
                      • {table.currentBooking.guests} khách
                    </Text>
                  </View>
                )}

                {canManageTables && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.editBtn]}
                      onPress={() => openEditModal(table)}
                      disabled={isSubmitting}
                    >
                      <Ionicons name="create-outline" size={14} color="#1D4ED8" />
                      <Text style={styles.editBtnText}>Sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => handleDelete(table.id)}
                      disabled={isSubmitting}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      <Text style={styles.deleteBtnText}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTableId ? "Chỉnh sửa bàn" : "Thêm bàn mới"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
            >
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => updateForm("name", v)}
                placeholder="Tên bàn"
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.availabilityRow}>
                <View>
                  <Text style={styles.availabilityLabel}>Trạng thái bàn</Text>
                  <Text style={styles.availabilityHint}>
                    {form.isAvailable ? "Bàn trống" : "Đã đặt"}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => updateForm("isAvailable", !form.isAvailable)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: form.isAvailable }}
                  style={[
                    styles.statusToggleTrack,
                    form.isAvailable
                      ? styles.statusToggleTrackOn
                      : styles.statusToggleTrackOff,
                  ]}
                >
                  <View
                    style={[
                      styles.statusToggleThumb,
                      form.isAvailable
                        ? styles.statusToggleThumbOn
                        : styles.statusToggleThumbOff,
                    ]}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typeRow}
              >
                {TABLE_TYPE_OPTIONS.map(({ key: tableType, label }) => {
                  const active = form.type === tableType;
                  const palette = TABLE_TYPE_STYLES[tableType];
                  return (
                    <TouchableOpacity
                      key={tableType}
                      style={[
                        styles.typeChip,
                        {
                          borderColor: active ? palette.borderColor : "#D1D5DB",
                          backgroundColor: active
                            ? palette.activeBackgroundColor
                            : "#FFFFFF",
                        },
                        active && styles.typeChipActive,
                      ]}
                      onPress={() => updateForm("type", tableType)}
                    >
                      <Text
                        style={[
                          styles.typeText,
                          { color: active ? palette.textColor : "#6B7280" },
                          active && styles.typeTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.inlineRow}>
                <TextInput
                  style={[styles.input, styles.inlineInput]}
                  value={form.minCapacity}
                  onChangeText={(v) => updateForm("minCapacity", v)}
                  placeholder="Min khách"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.inlineInput]}
                  value={form.maxCapacity}
                  onChangeText={(v) => updateForm("maxCapacity", v)}
                  placeholder="Max khách"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <TextInput
                style={styles.input}
                value={form.baseDeposit}
                onChangeText={(v) => updateForm("baseDeposit", v)}
                placeholder="Tiền cọc"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                value={form.featuresText}
                onChangeText={(v) => updateForm("featuresText", v)}
                placeholder="Tiện ích (cách nhau bằng dấu phẩy)"
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(v) => updateForm("description", v)}
                placeholder="Mô tả bàn"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.imageSectionTitle}>
                {editingTableId ? "Cập nhật ảnh bàn" : "Ảnh bàn"}
              </Text>
              <Text style={styles.imageSectionHint}>
                {editingTableId
                  ? "Bạn có thể chụp/chọn thêm ảnh mới hoặc xóa ảnh cũ ngay bên dưới."
                  : "Thêm ảnh bằng URL hoặc chọn nhanh từ camera/thư viện."}
              </Text>

              <View style={styles.imageInputRow}>
                <TextInput
                  style={[styles.input, styles.imageInput]}
                  value={form.imageInput}
                  onChangeText={(v) => updateForm("imageInput", v)}
                  placeholder="URL ảnh"
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity style={styles.addImageBtn} onPress={addImage}>
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.imagePickerRow}>
                <TouchableOpacity
                  style={styles.imagePickerBtn}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera-outline" size={16} color="#374151" />
                  <Text style={styles.imagePickerBtnText}>Chụp ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imagePickerBtn}
                  onPress={pickFromLibrary}
                >
                  <Ionicons name="images-outline" size={16} color="#374151" />
                  <Text style={styles.imagePickerBtnText}>Thư viện</Text>
                </TouchableOpacity>
              </View>

              {form.images.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.previewRow}
                >
                  {form.images.map((img) => (
                    <View key={img} style={styles.previewItem}>
                      <Image source={{ uri: img }} style={styles.previewImg} />
                      <TouchableOpacity
                        style={styles.previewRemove}
                        onPress={() => removeImage(img)}
                      >
                        <Ionicons name="close" size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={["#ff8b25", "#ffd109"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtnGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingTableId ? "Lưu thay đổi" : "Tạo bàn"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PartnerBottomNav pendingCount={pendingCount} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  addBtn: {
    borderRadius: 999,
    overflow: "hidden",
  },
  addBtnGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  backBtn: {
    backgroundColor: "#FFF3ED",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtnText: { fontSize: 12, fontWeight: "700", color: "#FF6B35" },
  statsRow: {
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  availableCard: { backgroundColor: "#E7F8EE", borderColor: "#7DDF9E" },
  bookedCard: { backgroundColor: "#FEE2E2", borderColor: "#F04444" },
  statLabel: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "900", color: "#1A1A1A" },
  availableStatLabel: { color: "#22C55E" },
  availableStatValue: { color: "#22C55E" },
  bookedStatLabel: { color: "#F04444" },
  bookedStatValue: { color: "#F04444" },
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#1A1A1A",
    fontSize: 13,
  },
  filterScroll: { maxHeight: 52 },
  filterRow: {
    paddingHorizontal: 16,
    paddingRight: 20,
    gap: 8,
    paddingBottom: 8,
    alignItems: "center",
  },
  filterChip: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  filterChipGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  filterText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  filterTextActive: { color: "#fff" },
  listWrap: { flex: 1 },
  listContent: { padding: 16, gap: 12, paddingBottom: 24 },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  helperText: { fontSize: 12, color: "#9CA3AF" },
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  tableTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  tableTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  tableThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  tableName: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  statusBadge: {
    fontSize: 11,
    fontWeight: "700",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  availableBadge: {
    color: "#22C55E",
    backgroundColor: "#E7F8EE",
    borderWidth: 1,
    borderColor: "#7DDF9E",
  },
  bookedBadge: {
    color: "#F04444",
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#F04444",
  },
  metaText: { fontSize: 12, color: "#6B7280", marginBottom: 2 },
  bookingInfoBox: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 10,
    gap: 2,
  },
  bookingInfoTitle: { fontSize: 12, fontWeight: "700", color: "#92400E" },
  bookingInfoText: { fontSize: 12, color: "#92400E" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    borderWidth: 1,
  },
  editBtn: { borderColor: "#BFDBFE", backgroundColor: "#EFF6FF" },
  deleteBtn: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  editBtnText: { fontSize: 12, fontWeight: "700", color: "#1D4ED8" },
  deleteBtnText: { fontSize: 12, fontWeight: "700", color: "#EF4444" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "88%",
    paddingBottom: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  modalBody: { maxHeight: "75%" },
  modalBodyContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    paddingBottom: 10,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#111827",
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  inlineRow: { flexDirection: "row", gap: 8 },
  inlineInput: { flex: 1 },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  availabilityLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  availabilityHint: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  statusToggleTrack: {
    width: 56,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  statusToggleTrackOn: {
    backgroundColor: "#FF8B25",
    borderColor: "#F97316",
  },
  statusToggleTrackOff: {
    backgroundColor: "#E5E7EB",
    borderColor: "#D1D5DB",
  },
  statusToggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 2,
  },
  statusToggleThumbOn: {
    alignSelf: "flex-end",
  },
  statusToggleThumbOff: {
    alignSelf: "flex-start",
  },
  typeRow: { gap: 8 },
  typeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  typeChipActive: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  typeText: { fontSize: 12, fontWeight: "700" },
  typeTextActive: { fontWeight: "800" },
  imageInputRow: { flexDirection: "row", gap: 8 },
  imageInput: { flex: 1 },
  imageSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  imageSectionHint: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: -4,
  },
  addImageBtn: {
    width: 42,
    borderRadius: 10,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePickerRow: {
    flexDirection: "row",
    gap: 8,
  },
  imagePickerBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  imagePickerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  previewRow: { gap: 8 },
  previewItem: { position: "relative" },
  previewImg: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  previewRemove: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: "hidden",
  },
  saveBtnGradient: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
});
