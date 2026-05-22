import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";
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
        name="favorites"
        options={{
          title: "Yêu thích",
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="heart-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "AI",
          tabBarIcon: () => (
            <View style={styles.aiTabWrap}>
              <View style={styles.aiTabBtn}>
                <Ionicons
                  size={23}
                  name="chatbubble-ellipses-outline"
                  color="#fff"
                />
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
          title: "Hồ sơ",
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
    marginTop: -30,
    width: 64,
    alignItems: "center",
  },
  aiTabBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
});
