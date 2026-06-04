import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieSlice[];
  size?: number;
}

export default function PieChart({ data, size = 140 }: PieChartProps) {
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 5;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const rings = data.map((d) => {
    const percent = d.value / total;
    const dash = percent * circumference;
    const ring = { dash, offset, color: d.color, label: d.label, value: d.value, percent: Math.round(percent * 100) };
    offset += dash;
    return ring;
  });

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size}>
        {/* Background ring */}
        <Circle cx={size/2} cy={size/2} r={r} stroke="#333" strokeWidth={20} fill="none" />
        {/* Data rings */}
        {rings.map((ring, i) => (
          <Circle
            key={i}
            cx={size/2}
            cy={size/2}
            r={r}
            stroke={ring.color}
            strokeWidth={20}
            fill="none"
            strokeDasharray={`${ring.dash} ${circumference - ring.dash}`}
            strokeDashoffset={-offset + ring.dash}
            rotation="-90"
            origin={`${size/2}, ${size/2}`}
            opacity={0.85}
          />
        ))}
        {/* Inner circle for doughnut effect */}
        <Circle cx={size/2} cy={size/2} r={r - 10} fill="#1A1A1A" />
      </Svg>
      <View style={styles.centerLabel}>
        <Text style={styles.centerValue}>{total}</Text>
        <Text style={styles.centerSub}>Total</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", position: "relative", justifyContent: "center" },
  centerLabel: { position: "absolute", alignItems: "center" },
  centerValue: { fontSize: 18, fontWeight: "700", color: "#fff" },
  centerSub: { fontSize: 10, color: "#9CA3AF" },
});
