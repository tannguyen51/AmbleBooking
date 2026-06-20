import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 20,
          left: "20%",
          right: "20%",
          backgroundColor: "#fff",
          borderTopWidth: 0,
          borderRadius: 13,
          height: 58,
          paddingBottom: 6,
          paddingTop: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 10,
        },
        tabBarActiveTintColor: "#3A3A3A",
        tabBarInactiveTintColor: "#898887",
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "500",
          fontFamily: "Montserrat_500Medium",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color }) => (
            <Ionicons size={24} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Bàn của bạn",
          tabBarIcon: ({ color }) => (
            <Ionicons size={24} name="receipt" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Hồ sơ",
          tabBarIcon: ({ color }) => (
            <Ionicons size={30} name="person-circle" color={color} />
          ),
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="rewards" options={{ href: null }} />
    </Tabs>
  );
}
