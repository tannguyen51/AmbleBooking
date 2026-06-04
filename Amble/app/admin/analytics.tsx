import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import AnalyticsScreen from "../(partner)/analytics";

export default function AdminAnalyticsPage() {
  return (
    <SafeAreaView style={s.container}>
      <AnalyticsScreen isAdmin />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
});
