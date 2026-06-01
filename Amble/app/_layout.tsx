import { useEffect, useState } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../store/authStore";
import { usePartnerAuthStore } from "../store/partnerAuthStore";
import { useLanguageStore } from "../store/languageStore";
export default function RootLayout() {
  const { isAuthenticated, loadUser, user } = useAuthStore();
  const { isAuthenticated: isPartnerAuthenticated, loadPartner, partner } =
    usePartnerAuthStore();
  const { language, loadLanguage } = useLanguageStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await Font.loadAsync({
          "TAN-NIMBUS": require("../assets/TAN-NIMBUS.ttf"),
          "DFVN-TAN-NIMBUS": require("../assets/TAN-NIMBUS.ttf"),
        });
        if (cancelled) return;
        console.log("Font isLoaded:", Font.isLoaded("TAN-NIMBUS"), Font.isLoaded("DFVN-TAN-NIMBUS"));
      } catch (e) {
        console.warn("Font loading error:", e);
      }
      if (!cancelled) setFontsLoaded(true);
      if (cancelled) return;
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
    const inAdminGroup = pathname.startsWith("/admin");
    const onAdminLogin = pathname.startsWith("/admin/login");
    const inTabsGroup = pathname.startsWith("/(tabs)") || pathname === "/";
    const onWelcome = pathname === "/welcome";
    const onLanguage = pathname === "/language";
    const onIntro = pathname === "/intro";
    const isAdmin = isAuthenticated && user?.role === "admin";

    // ── Không redirect khi đang ở các màn hình con ──────────
    if (pathname.startsWith("/restaurant/")) return; // detail nhà hàng
    if (pathname.startsWith("/booking/")) return; // flow đặt bàn

    if (isPartnerAuthenticated) {
      const isStaffRoute =
        pathname.includes("/partner-team") || pathname.includes("/team");
      const isOwner = partner?.role === "owner";
      if (isStaffRoute && !isOwner) {
        router.replace("/dashboard");
        return;
      }
      if (!inPartnerGroup) router.replace("/dashboard");
      return;
    }

    if (isAdmin) {
      if (!inAdminGroup) router.replace("/admin/dashboard");
      return;
    }

    if (isAuthenticated) {
      // Chỉ redirect khi đang ở auth screens.
      // KHÔNG redirect từ restaurant, booking, hay bất kỳ screen con nào khác
      // vì khi router.back() chạy, pathname thay đổi và trigger effect này
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

    if (!language) {
      if (!onLanguage) router.replace("/language");
      return;
    }

    if (onLanguage || onIntro || onWelcome) {
      return;
    }

    if (!inAuthGroup && !inPartnerAuthGroup) {
      router.replace("/intro");
    }
  }, [
    isReady,
    isAuthenticated,
    isPartnerAuthenticated,
    pathname,
    language,
    user,
    partner?.role,
  ]);

  if (!fontsLoaded || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FAFAFA" }}>
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      {/*
        QUAN TRỌNG: KHÔNG liệt kê Stack.Screen với name cụ thể ở đây.
        Expo Router tự detect routes từ file system.
        Chỉ khai báo khi muốn override options (animation, gesture...).
      */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="restaurant/[id]"
          options={{
            animation: "slide_from_right",
            gestureEnabled: true,
            gestureDirection: "horizontal",
          }}
        />
        {/*
          QUAN TRỌNG: booking KHÔNG có _layout.tsx riêng.
          Tất cả screens nằm cùng root Stack → router.back() hoạt động
          xuyên suốt từ payment → confirm → select-table → restaurant/[id]
        */}
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
