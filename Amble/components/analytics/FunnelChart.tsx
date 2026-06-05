import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface FunnelStep {
  label: string;
  value: number;
  icon?: string;
}

interface FunnelChartProps {
  steps: FunnelStep[];
  color?: string;
}

export default function FunnelChart({ steps, color = "#FF6B35" }: FunnelChartProps) {
  if (!steps.length) return null;
  const hasData = steps.some((s) => s.value > 0);
  if (!hasData) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.emptyText}>No funnel data yet</Text>
      </View>
    );
  }
  const maxVal = Math.max(...steps.map((s) => s.value), 1);

  return (
    <View style={styles.wrapper}>
      {steps.map((step, i) => {
        const ratio = step.value / maxVal;
        const conversion = i > 0 && steps[i - 1].value > 0 ? Math.round((step.value / steps[i - 1].value) * 100) : i > 0 ? 0 : 100;
        return (
          <View key={i}>
            <View style={styles.stepRow}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepValue}>{step.value}</Text>
              {i > 0 && <Text style={styles.conversionText}>{conversion}%</Text>}
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(ratio * 100, 2)}%`,
                    backgroundColor: step.value === 0 ? "#333" : i === steps.length - 1 ? "#16A34A" : i === 0 ? "#3B82F6" : color,
                    opacity: step.value === 0 ? 0.15 : 1 - i * 0.12,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  stepLabel: { fontSize: 12, color: "#D1D5DB", fontWeight: "500" },
  stepValue: { fontSize: 14, fontWeight: "700", color: "#fff" },
  conversionText: { fontSize: 11, color: "#16A34A", fontWeight: "600", minWidth: 40, textAlign: "right" },
  barTrack: { height: 28, backgroundColor: "#2D2D2D", borderRadius: 6, marginBottom: 8, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 6 },
  emptyText: { fontSize: 12, color: "#6B7280", textAlign: "center", paddingVertical: 20 },
});
