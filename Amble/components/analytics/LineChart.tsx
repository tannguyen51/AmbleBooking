import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Polyline, Circle, Line as SvgLine, Rect, LinearGradient, Defs, Stop } from "react-native-svg";

interface LinePoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LinePoint[];
  height?: number;
  lineColor?: string;
  showGrid?: boolean;
  showDots?: boolean;
}

export default function LineChart({ data, height = 160, lineColor = "#FF6B35", showGrid = true, showDots = true }: LineChartProps) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = Math.max(280, data.length * 35);
  const padding = { top: 16, bottom: 20, left: 30, right: 10 };
  const chartW = w;
  const chartH = height;

  const xStep = (chartW - padding.left - padding.right) / (data.length - 1 || 1);
  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + ((max - d.value) / max) * (chartH - padding.top - padding.bottom),
    value: d.value,
    label: d.label,
  }));

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <View style={styles.wrapper}>
      <Svg width={chartW} height={chartH}>
        {/* Grid lines */}
        {showGrid && [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + ratio * (chartH - padding.top - padding.bottom);
          return (
            <SvgLine key={ratio} x1={padding.left} y1={y} x2={chartW - padding.right} y2={y} stroke="#333" strokeWidth={0.5} />
          );
        })}

        {/* Area fill */}
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.3" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Polyline
          points={linePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
        />

        {/* Dots */}
        {showDots && points.filter((_, i) => i % Math.max(1, Math.floor(data.length / 7)) === 0 || i === points.length - 1).map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={lineColor} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
});
