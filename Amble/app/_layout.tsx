import { useEffect, useState } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../store/authStore";
import { usePartnerAuthStore } from "../store/partnerAuthStore";
import { useLanguageStore } from "../store/languageStore";

export default function RootLayout() {
  const { isAuthenticated, loadUser } = useAuthStore();
  const { isAuthenticated: isPartnerAuthenticated, loadPartner } =
    usePartnerAuthStore();
  const { language, loadLanguage } = useLanguageStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadUser(), loadPartner(), loadLanguage()]);
      setIsReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isReady) return;

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
      pathname.includes("/tables") ||
      pathname.includes("/orders") ||
      pathname.includes("/notifications") ||
      pathname.includes("/profile") ||
      pathname.startsWith("/(partner)");
    const inTabsGroup = pathname.startsWith("/(tabs)") || pathname === "/";
    const onWelcome = pathname === "/welcome";
    const onLanguage = pathname === "/language";
    const onIntro = pathname === "/intro";

    // ── Không redirect khi đang ở các màn hình con ──────────
    if (pathname.startsWith("/restaurant/")) return; // detail nhà hàng
    if (pathname.startsWith("/booking/")) return; // flow đặt bàn

    if (isPartnerAuthenticated) {
      if (!inPartnerGroup) router.replace("/dashboard");
      return;
    }

    if (isAuthenticated) {
      // Chỉ redirect khi đang ở auth screens.
      // KHÔNG redirect từ restaurant, booking, hay bất kỳ screen con nào khác
      // vì khi router.back() chạy, pathname thay đổi và trigger effect này
      if (inAuthGroup || inPartnerAuthGroup) router.replace("/(tabs)");
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
  }, [isReady, isAuthenticated, isPartnerAuthenticated, pathname, language]);

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
