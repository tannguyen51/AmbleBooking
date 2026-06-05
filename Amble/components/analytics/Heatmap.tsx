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

const getColor = (value: number, max: number): string => {
  if (value === 0) return "#F3F4F6";
  const ratio = value / max;
  if (ratio > 0.75) return "#FF6B35";    // do cam (cao)
  if (ratio > 0.5) return "#E69A00";      // cam (trung binh cao)
  if (ratio > 0.25) return "#2563EB";     // xanh duong (trung binh)
  return "#1E3A5F";                        // xanh dam (thap)
};

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
                      { backgroundColor: getColor(val, max) },
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
        <Text style={styles.legendText}>Thap</Text>
        {["#1A1A1A", "#1E3A5F", "#2563EB", "#E69A00", "#FF6B35"].map((c) => (
          <View key={c} style={[styles.legendDot, { backgroundColor: c }]} />
        ))}
        <Text style={styles.legendText}>Cao</Text>
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
  legend: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 10, gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 9, color: "#6B7280", marginHorizontal: 4 },
});
