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
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import { partnerDashboardAPI, uploadAPI } from "../../services/api";
import { PartnerBottomNav } from "../../components/partner/PartnerBottomNav";
import { usePartnerAuthStore } from "../../store/partnerAuthStore";
import { hasPartnerPermission } from "../../constants/partnerPermissions";
import { useTranslation } from "../../i18n/useTranslation";

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
  status: "available" | "reserved" | "occupied" | "cleaning" | "released";
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

const TABLE_TYPE_STYLES: Record<
  "regular" | "standard" | "view" | "vip",
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
  standard: {
    textColor: "#3B82F6",
    borderColor: "#93C5FD",
    backgroundColor: "#EFF6FF",
    activeBackgroundColor: "#DBEAFE",
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



export default function PartnerTablesScreen() {
  const { t } = useTranslation();
  const [tables, setTables] = useState<PartnerTable[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<TableFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | TableType>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [form, setForm] = useState<TableFormState>(DEFAULT_FORM);
  const { partner } = usePartnerAuthStore();
  const canManageTables = hasPartnerPermission(partner?.role, "tables:manage");
  if (__DEV__) {
    console.log("[tables] role:", partner?.role, "canManageTables:", canManageTables);
  }

  const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://amblebooking-production.up.railway.app/api").replace(/\/api$/, "");
  const resolveImageUrl = (url: string) => url.startsWith("/uploads/") ? API_URL + url : url;

  const getTableTypeLabel = (type: TableType): string => {
    switch (type) {
      case "regular":
      case "standard":
        return t("partner.tables.typeRegular");
      case "view":
        return t("partner.tables.typeView");
      case "vip":
        return t("partner.tables.typeVIP");
      default:
        return type;
    }
  };

  const getStatusConfig = (status: string): { label: string; color: string; bg: string; border: string } => {
    switch (status) {
      case 'available': return { label: t("partner.tables.available"), color: '#22C55E', bg: '#F0FDF4', border: '#86EFAC' };
      case 'reserved': return { label: t("partner.tables.booked"), color: '#EAB308', bg: '#FEFCE8', border: '#FDE68A' };
      case 'occupied': return { label: 'Đang dùng', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' };
      case 'cleaning': return { label: 'Đang dọn', color: '#9CA3AF', bg: '#F3F4F6', border: '#D1D5DB' };
      case 'released': return { label: 'Đã release', color: '#8B5CF6', bg: '#F5F3FF', border: '#C4B5FD' };
      default: return { label: status, color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' };
    }
  };

  const tableTypeOptions: Array<{
    key: "standard" | "view" | "vip";
    label: string;
  }> = [
    { key: "standard", label: "Standard" },
    { key: "view", label: t("partner.tables.typeView") },
    { key: "vip", label: t("partner.tables.typeVIP") },
  ];

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditingTableId(null);
  };

  const loadData = async () => {
    try {
      const tablesRes = await partnerDashboardAPI.getTables();
      setTables(tablesRes.data?.tables || []);
      // getOverview không block table list
      partnerDashboardAPI.getOverview().then(res => {
        setPendingCount(res.data?.overview?.pendingOrders || 0);
      }).catch(() => {});
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Không tải được danh sách bàn";
      Alert.alert(t("common.error"), message);
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
    const reserved = tables.filter((t) => t.status === "reserved" || t.status === "occupied").length;
    return { total, available, booked: reserved, reserved };
  }, [tables]);

  const filteredTables = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return tables.filter((table) => {
      const isBookedStatus = ['reserved', 'occupied', 'cleaning', 'released'].includes(table.status);
      const matchFilter = filter === "all" ? true :
        filter === "available" ? table.status === "available" :
        filter === "booked" ? !table.isAvailable || isBookedStatus : false;
      const matchType = typeFilter === "all" ? true : table.type === typeFilter;
      const matchSearch =
        !keyword ||
        table.name.toLowerCase().includes(keyword) ||
        getTableTypeLabel(table.type).toLowerCase().includes(keyword);
      return matchFilter && matchType && matchSearch;
    });
  }, [tables, filter, typeFilter, searchText]);

  const filterTabs = [
    { key: "all" as TableFilter, label: `Tất cả (${stats.total})` },
    { key: "available" as TableFilter, label: `Trống (${stats.available})` },
    { key: "booked" as TableFilter, label: `Đặt (${stats.booked})` },
  ];

  const typeTabs: Array<{ key: "all" | TableType; label: string }> = [
    { key: "standard", label: "Standard" },
    { key: "vip", label: "VIP" },
    { key: "view", label: "Bàn view" },
  ];

  const updateForm = (key: keyof TableFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addImage = () => {
    const next = form.imageInput.trim();
    if (!next) return;
    if (form.images.includes(next)) {
      Alert.alert(t("common.notification"), t("partner.tables.duplicateImage"));
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
      Alert.alert(t("common.notification"), "Vui lòng cấp quyền thư viện ảnh.");
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
      Alert.alert(t("common.notification"), "Vui lòng cấp quyền camera.");
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
      type: table.type || "regular",
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
      Alert.alert(t("common.notification"), t("partner.tables.nameRequired"));
      return null;
    }
    if (
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min < 1 ||
      max < min
    ) {
      Alert.alert(t("common.error"), t("partner.tables.invalidCapacity"));
      return null;
    }
    if (!Number.isFinite(deposit) || deposit < 0) {
      Alert.alert(t("common.error"), t("partner.tables.invalidDeposit"));
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
    };
  };

  const handleSubmit = async () => {
    const payload = buildPayload();
    if (!payload) return;

    try {
      setIsSubmitting(true);

      // Upload ảnh local → server
      if (payload.images && payload.images.length > 0) {
        const uploaded: string[] = [];
        for (const img of payload.images) {
          if (img.startsWith("file://") || img.startsWith("content://")) {
            try {
              const base64 = await FileSystem.readAsStringAsync(img, { encoding: FileSystem.EncodingType.Base64 });
              const res = await uploadAPI.uploadImage(`data:image/jpeg;base64,${base64}`, "tables");
              if (res.data?.url) {
                uploaded.push(resolveImageUrl(res.data.url));
              }
            } catch (e: any) {
              console.log("[upload] failed:", e?.message);
              uploaded.push(img);
            }
          } else {
            uploaded.push(img);
          }
        }
        payload.images = uploaded;
      }

      if (editingTableId) {
        await partnerDashboardAPI.updateTable(editingTableId, payload);
      } else {
        await partnerDashboardAPI.createTable({ ...payload, isAvailable: form.isAvailable } as any);
      }
      setModalVisible(false);
      resetForm();
      await loadData();
    } catch (error: any) {
      setIsSubmitting(false);
      const message = error?.response?.data?.message || "Không thể lưu bàn";
      Alert.alert(t("common.error"), message);
    }
  };

  const handleDelete = (tableId: string) => {
    Alert.alert(t("partner.tables.deleteTitle"), t("partner.tables.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
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
            Alert.alert(t("common.error"), message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerWrap}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>{t("partner.tables.title")}</Text>
        </View>
      </View>

      {/* Stats Cards — Figma: 117×57, white, r=15, shadow */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.available}</Text>
          <Text style={styles.statLabel}>Bàn trống</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.booked}</Text>
          <Text style={styles.statLabel}>Đã đặt</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { fontFamily: "Montserrat_700Bold" }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { fontFamily: "Montserrat_700Bold" }]}>Tổng</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#9CA3AF" />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search by name or type..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>

      {/* Type tabs */}
      <View style={styles.filterRow}>
        {typeTabs.map((tab) => {
          const isActive = typeFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setTypeFilter(tab.key)}
            >
              <Text style={[styles.typeText, isActive && styles.typeTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.listWrap}
        contentContainerStyle={styles.listContent}
      >
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.helperText}>{t("common.loading")}</Text>
          </View>
        ) : filteredTables.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="restaurant-outline" size={36} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>{t("partner.tables.emptyTitle")}</Text>
            <Text style={styles.helperText}>{t("partner.tables.emptySubtitle")}</Text>
          </View>
        ) : (
          filteredTables.map((table) => {
            const statusInfo = getStatusConfig(table.status);
            const coverImage = table.images?.[0];
            const isVip = table.type === "vip";
            return (
              <View key={table.id} style={[styles.tableCard, isVip && styles.tableCardVip]}>
                <View style={styles.tableRow}>
                  <View style={styles.tableThumbWrap}>
                    {coverImage ? (
                      <Image source={{ uri: resolveImageUrl(coverImage) }} style={styles.tableThumb} />
                    ) : (
                      <View style={styles.tableThumbPlaceholder}>
                        <Ionicons name="restaurant-outline" size={20} color="#D4A574" />
                      </View>
                    )}
                  </View>
                  <View style={styles.tableInfo}>
                    <View style={styles.tableNameRow}>
                      {isVip && <Ionicons name="diamond" size={14} color="#D4A574" style={{ marginRight: 4 }} />}
                      <Text style={styles.tableName}>{table.name}</Text>
                    </View>
                    <View style={styles.tableMetaRow}>
                      <Ionicons name="people-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.tableMetaText}>{table.capacity.min}–{table.capacity.max} người</Text>
                    </View>
                    <View style={styles.tableMetaRow}>
                      <Ionicons name="cash-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.tableMetaText}>{(table.pricing?.baseDeposit || 0).toLocaleString("vi-VN")}đ</Text>
                    </View>
                    {table.images && table.images.length > 0 && (
                      <View style={styles.tableMetaRow}>
                        <Ionicons name="images-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.tableMetaText}>{table.images.length} ảnh</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.tableBadgeCol}>
                    <Text style={[styles.statusBadge, { color: statusInfo.color, backgroundColor: statusInfo.bg, borderColor: statusInfo.border, borderWidth: 1 }]}>
                      {statusInfo.label}
                    </Text>
                    {isVip && (
                      <View style={styles.vipBadge}>
                        <Ionicons name="diamond" size={10} color="#fff" />
                        <Text style={styles.vipBadgeText}>VIP</Text>
                      </View>
                    )}
                  </View>
                </View>

                {table.currentBooking && (
                  <View style={styles.bookingInfoBox}>
                    <Text style={styles.bookingInfoTitle}>{t("partner.tables.currentBooking")}</Text>
                    <Text style={styles.bookingInfoText}>{table.currentBooking.customerName} • {table.currentBooking.customerPhone || "--"}</Text>
                    <Text style={styles.bookingInfoText}>{table.currentBooking.date} • {table.currentBooking.time} • {table.currentBooking.guests} {t("partner.dashboard.guests")}</Text>
                  </View>
                )}

                {canManageTables && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(table)} disabled={isSubmitting}>
                      <Text style={styles.editBtnText}>Chỉnh sửa bàn</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(table.id)} disabled={isSubmitting}>
                      <Ionicons name="trash" size={18} color="#FF8B25" />
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
                {editingTableId ? t("partner.tables.editModalTitle") : t("partner.tables.createModalTitle")}
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
                onChangeText={(v) => {
                  updateForm("name", v);
                  // Tự động chọn loại VIP nếu tên bàn có chứa "vip"
                  if (v.toLowerCase().includes("vip") && form.type === "regular") {
                    updateForm("type", "vip");
                  }
                }}
                placeholder={t("partner.tables.namePlaceholder")}
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.availabilityRow}>
                <View>
                  <Text style={styles.availabilityLabel}>Trạng thái bàn</Text>
                  <Text style={styles.availabilityHint}>
                    {form.isAvailable ? t("partner.tables.available") : t("partner.tables.booked")}
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
                {tableTypeOptions.map(({ key: tableType, label }) => {
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
                  placeholder={t("partner.tables.minCapacity")}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.inlineInput]}
                  value={form.maxCapacity}
                  onChangeText={(v) => updateForm("maxCapacity", v)}
                  placeholder={t("partner.tables.maxCapacity")}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <TextInput
                style={styles.input}
                value={form.baseDeposit}
                onChangeText={(v) => updateForm("baseDeposit", v)}
                placeholder={t("partner.tables.depositPlaceholder")}
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                value={form.featuresText}
                onChangeText={(v) => updateForm("featuresText", v)}
                placeholder={t("partner.tables.features")}
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.description}
                onChangeText={(v) => updateForm("description", v)}
                placeholder={t("partner.tables.description")}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.imageSectionTitle}>
                {editingTableId ? t("partner.tables.photosEdit") : t("partner.tables.photosCreate")}
              </Text>
              <Text style={styles.imageSectionHint}>
                {editingTableId
                  ? t("partner.tables.editHint")
                  : t("partner.tables.createHint")}
              </Text>

              <View style={styles.imagePickerRow}>
                <TouchableOpacity style={styles.imagePickerBtn} onPress={takePhoto}>
                  <Ionicons name="camera-outline" size={16} color="#374151" />
                  <Text style={styles.imagePickerBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickFromLibrary}>
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
                      <Image source={{ uri: resolveImageUrl(img) }} style={styles.previewImg} />
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
                    {editingTableId ? t("partner.tables.saveChanges") : t("partner.tables.createButton")}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {canManageTables && (
        <TouchableOpacity style={styles.fab} onPress={openCreateModal} disabled={isSubmitting} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
      <PartnerBottomNav pendingCount={pendingCount} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1A1A1A",
  },
  fab: {
    position: "absolute",
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },

  // Stats Cards
  statsRow: {
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  statCard: {
    flex: 1,
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  statNumber: { fontSize: 24, fontFamily: "Montserrat_500Medium", color: "#202020" },
  statLabel: { fontSize: 12, fontFamily: "Montserrat_500Medium", color: "#202020", marginTop: 2 },
  statValue: { fontSize: 18, fontWeight: "900" },

  // Search — Figma: 370×40, r=15, white, shadow
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 15,
    height: 40,
    paddingHorizontal: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Montserrat_400Regular", color: "#202020", padding: 0 },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterChipActive: {
    backgroundColor: "#FF8F1F",
    borderColor: "#FF8F1F",
  },
  filterChipVip: {
    overflow: "hidden",
    borderColor: "#D4AF37",
    backgroundColor: "#FFFDF0",
  },
  filterChipVipGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  filterText: { fontSize: 13, fontFamily: "Montserrat_500Medium", color: "#202020" },
  filterTextActive: { color: "#FFFFFF", fontFamily: "Montserrat_700Bold" },

  // Table List
  listWrap: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingBottom: 80, gap: 8 },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  helperText: { fontSize: 12, color: "#9CA3AF" },

  // Table Card
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tableCardVip: {
    borderColor: "#D4AF37",
    backgroundColor: "#FFFCF8",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tableThumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableThumb: {
    width: "100%",
    height: "100%",
  },
  tableThumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#FFF5EB",
    alignItems: "center",
    justifyContent: "center",
  },
  tableInfo: {
    flex: 1,
    gap: 4,
  },
  tableNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tableName: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  tableMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tableMetaText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  tableBadgeCol: {
    alignItems: "flex-end",
    gap: 6,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: "700",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#D4A574",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vipBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.5,
  },

  // Booking Info
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

  // Action buttons
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12, alignItems: "center" },
  editBtn: {
    flex: 1,
    borderRadius: 15,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  editBtnText: { fontSize: 15, fontFamily: "Montserrat_500Medium", color: "#505050" },

  // Modal
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
  typeText: { fontSize: 12, fontFamily: "Montserrat_500Medium", color: "#202020" },
  typeTextActive: { color: "#FFFFFF", fontFamily: "Montserrat_700Bold" },
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
