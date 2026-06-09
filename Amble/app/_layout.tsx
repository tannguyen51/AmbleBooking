import React, { useEffect, useState } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useAuthStore } from "../store/authStore";
import { usePartnerAuthStore } from "../store/partnerAuthStore";
import { useLanguageStore } from "../store/languageStore";

function RootLayout() {
  const { isAuthenticated, loadUser, user } = useAuthStore();
  const { isAuthenticated: isPartnerAuthenticated, loadPartner, partner } =
    usePartnerAuthStore();
  const { language, loadLanguage } = useLanguageStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [initTimeout, setInitTimeout] = useState(false);

  // Safety: nếu 15s không init xong → hiện thông báo
  useEffect(() => {
    const t = setTimeout(() => setInitTimeout(true), 15000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await Font.loadAsync({
          "TAN-NIMBUS": require("../assets/TAN-NIMBUS.ttf"),
          "DFVN-TAN-NIMBUS": require("../assets/TAN-NIMBUS.ttf"),
        });
      } catch (e) {
        console.warn("Font loading error:", e);
      }
      if (!cancelled) setFontsLoaded(true);
      await Promise.all([loadUser(), loadPartner(), loadLanguage()]);
      if (!cancelled) setIsReady(true);
    };
    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isReady || !fontsLoaded) return;

    const inAuthGroup =
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/(auth)");
    const inPartnerAuthGroup =
      pathname.startsWith("/partner-login") ||
      pathname.startsWith("/partner-register") ||
      pathname.startsWith("/(partner-auth)");
    const inPartnerGroup =
      pathname.includes("/dashboard") ||
      pathname.includes("/team") ||
      pathname.includes("/partner-team") ||
      pathname.includes("/partner-terms") ||
      pathname.includes("/tables") ||
      pathname.includes("/orders") ||
      pathname.includes("/notifications") ||
      pathname.includes("/profile") ||
      pathname.startsWith("/(partner)");
    const inPartnerPending =
      pathname.includes("/partner-register") ||
      pathname.includes("/partner-login") ||
      pathname.includes("/partner-forgot-password") ||
      pathname.includes("/partner-payment") ||
      pathname.includes("/partner-pending");
    const inAdminGroup = pathname.startsWith("/admin");
    const onAdminLogin = pathname.startsWith("/admin/login");
    const onWelcome = pathname === "/welcome";
    const onLanguage = pathname === "/language";
    const onIntro = pathname === "/intro";
    const isAdmin = isAuthenticated && user?.role === "admin";

    if (pathname.startsWith("/restaurant/")) return;
    if (pathname.startsWith("/booking/")) return;

    if (isPartnerAuthenticated) {
      const isPartnerOwner = partner?.role === "owner";
      const onStaffScreen =
        pathname.includes("/team") || pathname.includes("/partner-team");
      if (onStaffScreen && !isPartnerOwner) {
        router.replace("/dashboard");
        return;
      }

      const subStatus = partner?.subscriptionStatus;

      // Chưa thanh toán → chỉ cho phép ở register hoặc payment
      if (subStatus === "pending") {
        const isRegister = pathname.includes("/partner-register");
        const isPayment = pathname.includes("/partner-payment");
        if (!isRegister && !isPayment) {
          router.replace("/(partner-auth)/partner-register");
        }
        return;
      }

      // Đã thanh toán chờ duyệt → chỉ cho phép ở pending hoặc payment
      if (subStatus === "paid_pending") {
        const isPending = pathname.includes("/partner-pending");
        const isPayment = pathname.includes("/partner-payment");
        if (!isPending && !isPayment) {
          router.replace("/(partner-auth)/partner-pending");
        }
        return;
      }

      if (!inPartnerGroup && !inPartnerPending) router.replace("/dashboard");
      return;
    }

    if (isAdmin) {
      if (!inAdminGroup) router.replace("/admin/dashboard");
      return;
    }

    if (isAuthenticated) {
      if (inAuthGroup || inPartnerAuthGroup || inAdminGroup)
        router.replace("/(tabs)");
      return;
    }

    if (onAdminLogin) {
      return;
    }

    if (inAdminGroup) {
      router.replace("/admin/login");
      return;
    }

    // Ngôn ngữ mặc định là tiếng Việt — không redirect /language nữa
    // (người dùng có thể đổi ngôn ngữ từ settings sau này)

    if (onLanguage || onIntro || onWelcome) {
      return;
    }

    if (!inAuthGroup && !inPartnerAuthGroup) {
      router.replace("/intro");
    }
  }, [isReady, isAuthenticated, isPartnerAuthenticated, pathname, user, fontsLoaded, partner?.role, partner?.subscriptionStatus]);

  if (!fontsLoaded || !isReady) {
    if (initTimeout) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#fff" }}>
          <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 12 }}>Đang tải...</Text>
          <Text style={{ fontSize: 13, color: "#6B7280", textAlign: "center" }}>Ứng dụng đang mất nhiều thời gian khởi động.{"\n"}Vui lòng kiểm tra kết nối mạng và thử lại.</Text>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FAFAFA" }}>
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="restaurant/[id]"
          options={{
            animation: "slide_from_right",
            gestureEnabled: true,
            gestureDirection: "horizontal",
          }}
        />
        <Stack.Screen
          name="booking/select-table"
          options={{
            animation: "slide_from_right",
            gestureEnabled: true,
            gestureDirection: "horizontal",
          }}
        />
        <Stack.Screen
          name="booking/confirm"
          options={{
            animation: "slide_from_right",
            gestureEnabled: true,
            gestureDirection: "horizontal",
          }}
        />
        <Stack.Screen
          name="booking/success"
          options={{
            animation: "slide_from_right",
            gestureEnabled: true,
            gestureDirection: "horizontal",
          }}
        />
      </Stack>
    </>
  );
}

export default RootLayout;
