import { useEffect, useState } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Font from "expo-font";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../store/authStore";
import { usePartnerAuthStore } from "../store/partnerAuthStore";
import { useLanguageStore } from "../store/languageStore";

// Lazy init Google Sign-in – tránh crash nếu native module chưa link
try {
  const { GoogleSignin } = require("@react-native-google-signin/google-signin");
  GoogleSignin.configure({
    iosClientId:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
      "456818206627-adg8depnb92f714l7fat8qdrg0nt78qg.apps.googleusercontent.com",
    webClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      "456818206627-tkq130qes9a9qafjf8ver989j7hv50ur.apps.googleusercontent.com",
    profileImageSize: 120,
  });
} catch (e) {
  // Google Sign-in chưa sẵn sàng – bỏ qua, sẽ init khi có native module
}

function RootLayout() {
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
  }, [isReady, isAuthenticated, isPartnerAuthenticated, pathname, language, user, fontsLoaded, partner?.role, partner?.subscriptionStatus]);

  if (!fontsLoaded || !isReady) {
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
