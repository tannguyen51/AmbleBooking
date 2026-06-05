import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect } from "react-native-svg";

interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarItem[];
  height?: number;
  maxValue?: number;
  showValues?: boolean;
  barRadius?: number;
}

export default function BarChart({ data, height = 160, maxValue, showValues = true, barRadius = 4 }: BarChartProps) {
  if (!data.length) return null;
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(8, Math.min(40, (280 / data.length) - 8));
  const chartW = data.length * (barWidth + 10);
  const actualH = height - (showValues ? 18 : 0);

  return (
    <View style={styles.wrapper}>
      <Svg width={chartW} height={height}>
        {data.map((item, i) => {
          const barH = (item.value / max) * actualH;
          const x = i * (barWidth + 10);
          const y = actualH - barH + (showValues ? 16 : 0);
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={barRadius}
              fill={item.color || "#FF6B35"}
              opacity={0.85}
            />
          );
        })}
      </Svg>
      {showValues && (
        <View style={styles.labelsRow}>
          {data.map((item, i) => (
            <View key={i} style={{ width: barWidth + 10, alignItems: "center" }}>
              <Text style={styles.label}>{item.label.length > 3 ? item.label.slice(0, 3) : item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  labelsRow: { flexDirection: "row", marginTop: 4 },
  label: { fontSize: 9, color: "#9CA3AF", textAlign: "center" },
  value: { fontSize: 10, fontWeight: "600", color: "#D1D5DB", textAlign: "center" },
});
