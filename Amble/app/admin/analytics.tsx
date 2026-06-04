import React from "react";
import { View, StyleSheet } from "react-native";
import AnalyticsScreen from "../(partner)/analytics";
import { AdminBottomNav } from "../../components/admin/AdminBottomNav";

export default function AdminAnalyticsPage() {
  return (
    <View style={s.container}>
      <AnalyticsScreen isAdmin />
      <AdminBottomNav />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
});
