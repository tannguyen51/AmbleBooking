import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { adminTheme } from "../../constants/adminTheme";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const router = useRouter();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => {
          if (navigation.canGoBack()) navigation.goBack();
          else router.replace("/admin/dashboard");
        }}
      >
        <Ionicons name="chevron-back" size={18} color={adminTheme.colors.onSurface} />
      </TouchableOpacity>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: adminTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: adminTheme.colors.outlineVariant,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: adminTheme.colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: adminTheme.colors.onSurface,
  },
  subtitle: {
    fontSize: 12,
    color: adminTheme.colors.muted,
    marginTop: 2,
  },
});
