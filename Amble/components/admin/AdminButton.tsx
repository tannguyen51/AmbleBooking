import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { adminTheme } from "../../constants/adminTheme";

type Props = {
  title: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function AdminButton({ title, onPress, style }: Props) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, style]}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: adminTheme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: adminTheme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: adminTheme.shadow.color,
    shadowOffset: adminTheme.shadow.offset,
    shadowOpacity: adminTheme.shadow.opacity,
    shadowRadius: adminTheme.shadow.radius,
    elevation: 3,
  },
  text: {
    color: adminTheme.colors.onPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
});
