import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieSlice[];
  size?: number;
}

export default function PieChart({ data, size = 180 }: PieChartProps) {
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  // Build slices: start từ 12h (‑PI/2), đi clockwise
  let currentAngle = -Math.PI / 2;
  const slices = data.map((d) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    // Vị trí text ở centroid của miếng
    const midAngle = (startAngle + endAngle) / 2;
    const textR = r * 0.5;
    const tx = cx + textR * Math.cos(midAngle);
    const ty = cy + textR * Math.sin(midAngle);
    const pct = Math.round((d.value / total) * 100);
    const fontSize = pct >= 10 ? 14 : 11;

    return { ...d, path, tx, ty, pct };
  });

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {slices.map((s, i) => (
          <Path key={i} d={s.path} fill={s.color} stroke="none" opacity={0.9} />
        ))}
        {slices.filter(s => s.pct > 0).map((s, i) => (
          <SvgText
            key={i}
            x={s.tx}
            y={s.ty + 5}
            fill="#FFFFFF"
            fontSize={s.fontSize}
            fontWeight="bold"
            textAnchor="middle"
          >
            {s.pct}%
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", justifyContent: "center" },
});
