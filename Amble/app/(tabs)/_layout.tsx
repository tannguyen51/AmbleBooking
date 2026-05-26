import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Path, Svg } from "react-native-svg";
import { Stack } from "expo-router";
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      <Text style={styles.iconText}>{emoji}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#E8E8F0",
          paddingBottom: 8,
          paddingTop: 8,
          height: 72,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="home-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Khám phá",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="compass-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "",
          tabBarIcon: () => (
            <View style={styles.aiTabWrap}>
              <View style={styles.aiTabBtn}>
                <Svg width={23} height={23} viewBox="0 0 24 24" fill="#fff">
                  <Path d="m22.5,9h-.5v-1c0-2.757-2.243-5-5-5h-4V1c0-.552-.447-1-1-1s-1,.448-1,1v2h-4c-2.757,0-5,2.243-5,5v1h-.5c-.827,0-1.5.673-1.5,1.5v3c0,.827.673,1.5,1.5,1.5h.5v1c0,2.757,2.243,5,5,5h7.697l3.963,2.642c.36.24.775.361,1.191.361.348,0,.696-.084,1.015-.255.699-.375,1.134-1.1,1.134-1.894v-6.855h.5c.827,0,1.5-.673,1.5-1.5v-3c0-.827-.673-1.5-1.5-1.5Zm-14-1c.828,0,1.5.672,1.5,1.5s-.672,1.5-1.5,1.5-1.5-.672-1.5-1.5.672-1.5,1.5-1.5Zm8.031,7.573c-1.037.651-2.666,1.427-4.531,1.427s-3.494-.776-4.531-1.427c-.468-.293-.609-.911-.315-1.378.294-.467.911-.609,1.378-.316.815.512,2.079,1.121,3.469,1.121s2.653-.609,3.469-1.121c.466-.294,1.085-.152,1.378.316.294.468.152,1.085-.315,1.378Zm-1.031-4.573c-.828,0-1.5-.672-1.5-1.5s.672-1.5,1.5-1.5,1.5.672,1.5,1.5-.672,1.5-1.5,1.5Z" />
                </Svg>
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Đặt bàn",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="calendar-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Cài đặt",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="person-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    width: 36,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  iconWrapperActive: {
    backgroundColor: Colors.primaryPale,
  },
  iconText: {
    fontSize: 18,
  },
  aiTabWrap: {
    
    marginTop: -28,
    width: 64,
    alignItems: "center",
  },
  aiTabBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFB100",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFF3D6",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  aiTabText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
  },
});
