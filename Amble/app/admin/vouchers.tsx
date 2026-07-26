import React, { useState, useCallback } from "react";
import {
  View, Text, SafeAreaView, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator, RefreshControl,
  StyleSheet, Switch,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";

const BG = "#FFF8F2";
const CARD = "#FFFFFF";
const TEXT = "#1A1A1A";
const TEXT_SEC = "#6B7280";
const PRIMARY = "#FF8F1F";

const FILTER_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang hoạt động" },
  { key: "inactive", label: "Đã tắt" },
];

const fmtNum = (n: number) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n));

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({
    code: "",
    discountType: "percent" as "percent" | "fixed",
    discountValue: "",
    minBill: "",
    maxUses: "",
    maxPerUser: "",
    expiresAt: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params: any = {};
      if (filter !== "all") params.status = filter;
      if (search.trim()) params.search = search.trim();
      const res = await adminAPI.getVouchers(params);
      setVouchers(res.data?.data || []);
    } catch (err) {
      console.error("[vouchers]", err);
    }
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, [filter, search]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const openCreate = () => {
    setEditItem(null);
    setForm({ code: "", discountType: "percent", discountValue: "", minBill: "", maxUses: "", expiresAt: "" });
    setModalVisible(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      code: item.code,
      discountType: item.discountType,
      discountValue: String(item.discountValue),
      minBill: String(item.minBill || ""),
      maxUses: item.maxUses ? String(item.maxUses) : "",
      maxPerUser: item.maxPerUser ? String(item.maxPerUser) : "",
      expiresAt: item.expiresAt ? item.expiresAt.slice(0, 10) : "",
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.discountValue) {
      Alert.alert("Lỗi", "Vui lòng nhập mã và giá trị giảm giá");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minBill: Number(form.minBill) || 0,
        maxUses: Number(form.maxUses) || null,
        maxPerUser: Number(form.maxPerUser) || null,
        expiresAt: form.expiresAt || null,
      };

      if (editItem) {
        await adminAPI.updateVoucher(editItem._id, payload);
      } else {
        await adminAPI.createVoucher(payload);
      }
      setModalVisible(false);
      fetchData();
    } catch (err: any) {
      Alert.alert("Lỗi", err.response?.data?.message || "Không thể lưu voucher");
    }
    setSaving(false);
  };

  const handleToggleActive = async (item: any) => {
    try {
      await adminAPI.updateVoucher(item._id, { isActive: !item.isActive });
      fetchData();
    } catch {
      Alert.alert("Lỗi", "Không thể cập nhật");
    }
  };

  const handleDelete = (item: any) => {
    Alert.alert("Xác nhận", `Xoá voucher "${item.code}"?`, [
      { text: "Huỷ", style: "cancel" },
      { text: "Xoá", style: "destructive", onPress: async () => {
        try {
          await adminAPI.deleteVoucher(item._id);
          fetchData();
        } catch {
          Alert.alert("Lỗi", "Không thể xoá");
        }
      }},
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const discountLabel = item.discountType === "percent" ? `${item.discountValue}%` : `${fmtNum(item.discountValue)}đ`;
    const used = item.currentUses || 0;
    const max = item.maxUses || "∞";
    const expired = item.expiresAt && new Date(item.expiresAt) < new Date();
    return (
      <TouchableOpacity style={s.card} activeOpacity={0.8} onPress={() => openEdit(item)}>
        <View style={s.cardTop}>
          <View style={s.codeRow}>
            <View style={s.codeBadge}>
              <Text style={s.codeText}>{item.code}</Text>
            </View>
            <Switch
              value={item.isActive}
              onValueChange={() => handleToggleActive(item)}
              trackColor={{ false: "#E5E7EB", true: "#FED7AA" }}
              thumbColor={item.isActive ? PRIMARY : "#9CA3AF"}
            />
          </View>
          <Text style={s.discountValue}>{discountLabel}</Text>
          {item.minBill > 0 && <Text style={s.minBill}>Tối thiểu {fmtNum(item.minBill)}đ</Text>}
        </View>
        <View style={s.cardMeta}>
          <View style={s.metaItem}>
            <Ionicons name="checkmark-circle-outline" size={13} color={TEXT_SEC} />
            <Text style={s.metaText}>Đã dùng {used}/{max}</Text>
          </View>
          {item.maxPerUser && (
            <View style={s.metaItem}>
              <Ionicons name="person-outline" size={13} color={TEXT_SEC} />
              <Text style={s.metaText}>{item.maxPerUser} lần/người</Text>
            </View>
          )}
          {item.expiresAt && (
            <View style={s.metaItem}>
              <Ionicons name="calendar-outline" size={13} color={expired ? "#EF4444" : TEXT_SEC} />
              <Text style={[s.metaText, expired && { color: "#EF4444" }]}>
                {expired ? "Hết hạn" : `HSD: ${item.expiresAt.slice(0, 10)}`}
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={() => handleDelete(item)} style={s.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <LinearGradient colors={["#FF8F1F", "#FFB266"]} style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Voucher</Text>
          <TouchableOpacity style={s.addBtn} onPress={openCreate}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#9CA3AF" />
          <TextInput
            style={s.searchInput}
            placeholder="Tìm mã voucher..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchData()}
          />
        </View>
        <View style={s.filterRow}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[s.filterTab, filter === tab.key && s.filterTabActive]}
              onPress={() => setFilter(tab.key)}
            >
              <Text style={[s.filterTabText, filter === tab.key && s.filterTabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={vouchers}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="pricetag-outline" size={40} color="#D1D5DB" />
              <Text style={{ marginTop: 10, color: TEXT_SEC, fontFamily: "Montserrat_500Medium" }}>Chưa có voucher nào</Text>
            </View>
          }
        />
      )}

      <AdminBottomNav />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{editItem ? "Sửa voucher" : "Tạo voucher mới"}</Text>

            <Text style={s.label}>Mã voucher *</Text>
            <TextInput style={s.input} value={form.code} onChangeText={(v) => setForm({ ...form, code: v })} placeholder="VD: AMBLE10" autoCapitalize="characters" placeholderTextColor="#9CA3AF" editable={!editItem} />

            <Text style={s.label}>Loại giảm giá</Text>
            <View style={s.typeRow}>
              <TouchableOpacity style={[s.typeBtn, form.discountType === "percent" && s.typeBtnActive]} onPress={() => setForm({ ...form, discountType: "percent" })}>
                <Text style={[s.typeBtnText, form.discountType === "percent" && s.typeBtnTextActive]}>Phần trăm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.typeBtn, form.discountType === "fixed" && s.typeBtnActive]} onPress={() => setForm({ ...form, discountType: "fixed" })}>
                <Text style={[s.typeBtnText, form.discountType === "fixed" && s.typeBtnTextActive]}>Số tiền</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Giá trị {form.discountType === "percent" ? "(%)" : "(VNĐ)"} *</Text>
            <TextInput style={s.input} value={form.discountValue} onChangeText={(v) => setForm({ ...form, discountValue: v })} keyboardType="numeric" placeholder={form.discountType === "percent" ? "10" : "50000"} placeholderTextColor="#9CA3AF" />

            <Text style={s.label}>Đơn tối thiểu (VNĐ)</Text>
            <TextInput style={s.input} value={form.minBill} onChangeText={(v) => setForm({ ...form, minBill: v })} keyboardType="numeric" placeholder="0" placeholderTextColor="#9CA3AF" />

            <Text style={s.label}>Giới hạn lượt dùng</Text>
            <TextInput style={s.input} value={form.maxUses} onChangeText={(v) => setForm({ ...form, maxUses: v })} keyboardType="numeric" placeholder="Không giới hạn" placeholderTextColor="#9CA3AF" />

            <Text style={s.label}>Giới hạn mỗi người</Text>
            <TextInput style={s.input} value={form.maxPerUser} onChangeText={(v) => setForm({ ...form, maxPerUser: v })} keyboardType="numeric" placeholder="Không giới hạn" placeholderTextColor="#9CA3AF" />

            <Text style={s.label}>Hết hạn (YYYY-MM-DD)</Text>
            <TextInput style={s.input} value={form.expiresAt} onChangeText={(v) => setForm({ ...form, expiresAt: v })} placeholder="Không hết hạn" placeholderTextColor="#9CA3AF" />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={s.cancelText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveText}>Lưu</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  headerTitle: { fontSize: 22, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#fff" },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, height: 40, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Montserrat_400Regular", color: TEXT, marginLeft: 6 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.25)" },
  filterTabActive: { backgroundColor: "#fff" },
  filterTabText: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: "rgba(255,255,255,0.8)" },
  filterTabTextActive: { color: PRIMARY },

  card: { backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTop: { marginBottom: 10 },
  codeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  codeBadge: { backgroundColor: "#FFF0E0", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  codeText: { fontSize: 14, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: PRIMARY },
  discountValue: { fontSize: 24, fontFamily: "Montserrat_800Bold", fontWeight: "800", color: TEXT },
  minBill: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: TEXT_SEC, marginTop: 2 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 14, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT_SEC },
  deleteBtn: { marginLeft: "auto", padding: 4 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.6)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 18, padding: 20, maxHeight: "90%" },
  modalTitle: { fontSize: 17, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: TEXT, marginBottom: 16 },
  label: { fontSize: 12, fontFamily: "Montserrat_600Bold", fontWeight: "600", color: TEXT, marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 14, fontFamily: "Montserrat_400Regular", color: TEXT },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" },
  typeBtnActive: { borderColor: PRIMARY, backgroundColor: "#FFF0E0" },
  typeBtnText: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "500", color: TEXT_SEC },
  typeBtnTextActive: { color: PRIMARY },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: TEXT_SEC },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: PRIMARY, alignItems: "center" },
  saveText: { fontSize: 14, fontFamily: "Montserrat_700Bold", fontWeight: "700", color: "#fff" },
});
