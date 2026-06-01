import { Tabs } from "expo-router";
import { View, Text, StyleSheet, Image } from "react-native";
import { Colors } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../i18n/useTranslation";
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      <Text style={styles.iconText}>{emoji}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
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
          title: t("tabs.home"),
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="home-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t("tabs.explore"),
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
                <Image
                  source={require("../../assets/images/chatbot-speech-bubble.png")}
                  style={styles.aiTabImg}
                />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("tabs.bookings"),
          tabBarIcon: ({ color }) => (
            <Ionicons size={28} name="calendar-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
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
    backgroundColor: "#e58015",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#ea835e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  aiTabText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
  },
  aiTabImg: {
    width: 36,
    height: 36,
    resizeMode: "contain",
    tintColor: "#fff",
  },
});
