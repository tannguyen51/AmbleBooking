import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

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
  showPercent?: boolean;
}

export default function BarChart({ data, height = 200, maxValue, showValues = true, barRadius = 6, showPercent = false }: BarChartProps) {
  if (!data.length) return null;
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  const barWidth = Math.max(12, Math.min(48, (320 / data.length) - 12));
  const gap = 24;
  const chartW = data.length * (barWidth + gap);
  const actualH = height - (showValues ? 28 : 0);

  return (
    <View style={styles.wrapper}>
      <Svg width={chartW} height={height}>
        {data.map((item, i) => {
          const barH = (item.value / max) * actualH;
          const x = i * (barWidth + gap);
          const y = actualH - barH + (showValues ? 16 : 0);
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <React.Fragment key={i}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, 0)}
                rx={barRadius}
                fill={item.color || "#FF6B35"}
                opacity={0.85}
              />
              {showPercent && barH > 20 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y + barH / 2 + 4}
                  fill="#FFFFFF"
                  fontSize={11}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {pct}%
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
      {showValues && (
        <View style={[styles.labelsRow, { width: chartW }]}>
          {data.map((item, i) => (
            <View key={i} style={{ width: barWidth + gap, alignItems: "center" }}>
              <Text style={styles.value} numberOfLines={1}>{item.value}</Text>
              <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  labelsRow: { flexDirection: "row", flexWrap: "nowrap", },
  label: { fontSize: 13, fontWeight: "800", color: "#1A1A1A", textAlign: "center", marginTop: 3 },
  value: { fontSize: 15, fontWeight: "900", color: "#1A1A1A", textAlign: "center" },
  percent: { fontSize: 12, fontWeight: "700", color: "#374151", textAlign: "center", marginTop: 1 },
});
