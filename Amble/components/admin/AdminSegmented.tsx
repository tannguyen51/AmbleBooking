import React from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { adminTheme } from "../../constants/adminTheme";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface AdminSegmentedProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (next: T) => void;
  compact?: boolean;
}

export function AdminSegmented<T extends string>({
  options,
  value,
  onChange,
  compact = false,
}: AdminSegmentedProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroller}
    >
      <View style={styles.root}>
      {options.map((option, index) => {
        const active = option.value === value;
        const isLast = index === options.length - 1;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.item,
              compact && styles.itemCompact,
              active && styles.itemBorderActive,
              isLast && styles.itemLast,
              active && styles.itemActive,
            ]}
            onPress={() => onChange(option.value)}
          >
            <Text
              style={[
                styles.text,
                compact && styles.textCompact,
                active && styles.textActive,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    flexGrow: 1,
  },
  root: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: adminTheme.colors.surfaceVariant,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: adminTheme.colors.surface,
  },
  item: {
    minHeight: 40,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: adminTheme.colors.surfaceVariant,
  },
  itemCompact: {
    minHeight: 36,
    paddingHorizontal: 10,
  },
  itemBorderActive: {
    borderRightColor: adminTheme.colors.onSurface,
  },
  itemLast: {
    borderRightWidth: 0,
  },
  itemActive: {
    backgroundColor: adminTheme.colors.onSurface,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    color: adminTheme.colors.onSurface,
  },
  textCompact: {
    fontSize: 10,
  },
  textActive: {
    color: adminTheme.colors.onPrimary,
  },
});
