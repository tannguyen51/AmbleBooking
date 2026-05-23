import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { adminAPI } from "../../services/api";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";
import { AdminHeader } from "../../components/admin/AdminHeader";
import AdminCard from "../../components/admin/AdminCard";
import { adminTheme } from "../../constants/adminTheme";

interface RouteItem {
  _id: string;
  name: string;
  location: string;
  distance: number;
  duration: number;
  difficulty: string;
  isPopular: boolean;
}

export default function AdminRoutesScreen() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    location: "",
    distance: "",
    duration: "",
    difficulty: "easy",
  });

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getRoutes();
      setRoutes(res.data?.routes || []);
    } catch {
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const createRoute = async () => {
    if (!form.name.trim() || !form.location.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên và địa điểm");
      return;
    }

    const distance = Number(form.distance);
    const duration = Number(form.duration);

    if (!Number.isFinite(distance) || !Number.isFinite(duration)) {
      Alert.alert("Lỗi", "Khoảng cách và thời gian phải là số");
      return;
    }

    try {
      await adminAPI.createRoute({
        name: form.name.trim(),
        location: form.location.trim(),
        distance,
        duration,
        difficulty: form.difficulty as any,
      });
      setForm({ name: "", location: "", distance: "", duration: "", difficulty: "easy" });
      await loadRoutes();
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không tạo được");
    }
  };

  const deleteRoute = async (id: string) => {
    try {
      await adminAPI.deleteRoute(id);
      await loadRoutes();
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || "Không xóa được");
    }
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="Routes" subtitle="Quản lý tuyến đường" />

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Thêm route</Text>
        <TextInput
          style={styles.input}
          placeholder="Tên route"
          placeholderTextColor={adminTheme.colors.muted}
          value={form.name}
          onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Địa điểm"
          placeholderTextColor="#94A3B8"
          value={form.location}
          onChangeText={(value) => setForm((prev) => ({ ...prev, location: value }))}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.rowItem]}
            placeholder="Khoảng cách (km)"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={form.distance}
            onChangeText={(value) => setForm((prev) => ({ ...prev, distance: value }))}
          />
          <TextInput
            style={[styles.input, styles.rowItem]}
            placeholder="Thời gian (phút)"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={form.duration}
            onChangeText={(value) => setForm((prev) => ({ ...prev, duration: value }))}
          />
        </View>
        <View style={styles.row}>
          {"easy,moderate,hard".split(",").map((level) => {
            const isActive = form.difficulty === level;
            return (
              <TouchableOpacity
                key={level}
                style={[styles.levelBtn, isActive && styles.levelBtnActive]}
                onPress={() =>
                  setForm((prev) => ({ ...prev, difficulty: level }))
                }
              >
                <Text
                  style={[styles.levelText, isActive && styles.levelTextActive]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={createRoute}>
          <Text style={styles.createBtnText}>Tạo route</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={adminTheme.colors.onSurface} />
          <Text style={styles.loadingText}>Đang tải danh sách...</Text>
        </View>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <AdminCard style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.location} • {item.distance}km • {item.duration}p
              </Text>
              <View style={styles.badgeRow}>
                <Badge label={item.difficulty} />
                {item.isPopular ? <Badge label="popular" tone="info" /> : null}
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteRoute(item._id)}
              >
                <Text style={styles.deleteText}>Xóa</Text>
              </TouchableOpacity>
            </AdminCard>
          )}
        />
      )}

      <AdminBottomNav />
    </View>
  );
}

function Badge({ label, tone = "default" }: { label: string; tone?: "default" | "info" }) {
  return (
    <View style={[styles.badge, tone === "info" && styles.badgeInfo]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: adminTheme.colors.background,
  },
  formCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: adminTheme.colors.surface,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: adminTheme.colors.onSurface,
    backgroundColor: adminTheme.colors.background,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  rowItem: {
    flex: 1,
  },
  levelBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    backgroundColor: adminTheme.colors.background,
  },
  levelBtnActive: {
    backgroundColor: adminTheme.colors.onSurface,
    borderColor: adminTheme.colors.onSurface,
  },
  levelText: {
    fontSize: 11,
    color: adminTheme.colors.onSurface,
    fontWeight: "600",
  },
  levelTextActive: {
    color: adminTheme.colors.onPrimary,
  },
  createBtn: {
    marginTop: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: adminTheme.colors.primary,
    alignItems: "center",
  },
  createBtnText: {
    color: adminTheme.colors.onPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  loadingWrap: {
    marginTop: 20,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: adminTheme.colors.muted,
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  card: {
    backgroundColor: adminTheme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  meta: {
    fontSize: 12,
    color: adminTheme.colors.muted,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: adminTheme.colors.surfaceVariant,
  },
  badgeInfo: {
    backgroundColor: adminTheme.colors.surfaceContainer,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  deleteBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: adminTheme.colors.danger,
  },
  deleteText: {
    fontSize: 11,
    fontWeight: "700",
    color: adminTheme.colors.danger,
  },
});
