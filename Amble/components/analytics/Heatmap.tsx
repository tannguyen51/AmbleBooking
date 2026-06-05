import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

interface HeatmapCell {
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  hour: number;      // 0-23
  bookings: number;
}

interface HeatmapProps {
  data: HeatmapCell[];
  maxValue?: number;
  height?: number;
}

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const HOURS = [10, 11, 12, 13, 14, 17, 18, 19, 20, 21]; // Restaurant hours

const DAY_COLORS = [
  "#EF4444", // CN - đỏ
  "#3B82F6", // T2 - xanh dương
  "#8B5CF6", // T3 - tím
  "#E69A00", // T4 - vàng
  "#16A34A", // T5 - xanh lá
  "#FF6B35", // T6 - cam
  "#EC4899", // T7 - hồng
];

const getColor = (value: number, max: number, dayIdx: number): string => {
  if (value === 0) return "#F3F4F6";
  const base = DAY_COLORS[dayIdx] || "#6B7280";
  if (max <= 0) return base;
  const ratio = value / max;
  // Pha trắng để giảm độ đậm khi thấp
  if (ratio > 0.75) return base;
  if (ratio > 0.5) return lighten(base, 0.25);
  if (ratio > 0.25) return lighten(base, 0.5);
  return lighten(base, 0.75);
};

// Làm nhạt màu hex bằng cách pha trắng
function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round((num >> 16) + (255 - (num >> 16)) * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount));
  const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * amount));
  return `rgb(${r},${g},${b})`;
}

export default function Heatmap({ data, maxValue }: HeatmapProps) {
  const max = maxValue || Math.max(...data.map((d) => d.bookings), 1);

  const getValue = (day: number, hour: number) => {
    const cell = data.find((d) => d.dayOfWeek === day && d.hour === hour);
    return cell?.bookings || 0;
  };

  return (
    <View style={styles.wrapper}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.cornerCell} />
        {DAY_LABELS.map((d) => (
          <View key={d} style={styles.dayCell}>
            <Text style={styles.dayText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Data rows */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {HOURS.map((hour) => (
          <View key={hour} style={styles.dataRow}>
            <View style={styles.hourCell}>
              <Text style={styles.hourText}>{hour}:00</Text>
            </View>
            {DAY_LABELS.map((_, dayIdx) => {
              const val = getValue(dayIdx, hour);
              return (
                <View key={`${hour}-${dayIdx}`} style={styles.dataCell}>
                  <View
                    style={[
                      styles.cellBox,
                      { backgroundColor: getColor(val, max, dayIdx) },
                    ]}
                  >
                    {val > 0 && <Text style={styles.cellText}>{val}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          {DAY_LABELS.map((d, i) => (
            <View key={d} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: DAY_COLORS[i] }]} />
              <Text style={styles.legendText}>{d}</Text>
            </View>
          ))}
        </View>
        <View style={styles.legendRow}>
          <Text style={styles.legendText}>Ít</Text>
          {[0.75, 0.5, 0.25, 0].map((r, _i) => (
            <View key={_i} style={[styles.legendDot, {
              backgroundColor: _i === 3 ? "#F3F4F6" : lighten("#3B82F6", r),
              borderWidth: _i === 3 ? 1 : 0,
              borderColor: _i === 3 ? "#D1D5DB" : undefined,
            }]} />
          ))}
          <Text style={styles.legendText}>Nhiều</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: "#1A1A1A", borderRadius: 12, padding: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  cornerCell: { width: 44 },
  dayCell: { width: 36, alignItems: "center", marginHorizontal: 1 },
  dayText: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },
  dataRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  hourCell: { width: 44 },
  hourText: { fontSize: 10, color: "#6B7280" },
  dataCell: { width: 36, height: 30, alignItems: "center", justifyContent: "center", marginHorizontal: 1 },
  cellBox: { width: 32, height: 26, borderRadius: 4, justifyContent: "center", alignItems: "center" },
  cellText: { fontSize: 8, color: "#fff", fontWeight: "700" },
  legend: { marginTop: 10, gap: 6 },
  legendRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 9, color: "#6B7280" },
});
