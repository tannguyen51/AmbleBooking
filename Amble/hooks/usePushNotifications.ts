import { useEffect, useRef } from "react";
import { Platform, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import { partnerAuthAPI } from "../services/api";

// Không show banner từ Expo để tránh double notification
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications(partnerId?: string, onNavigateToOrders?: () => void) {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  // Dùng ref để callback không thay đổi → effect không chạy lại
  const ordersRef = useRef(onNavigateToOrders);
  ordersRef.current = onNavigateToOrders;

  useEffect(() => {
    if (!partnerId) return;

    let cancelled = false;

    const register = async () => {
      try {
        const { status: existingStatus } = await Notifications.requestPermissionsAsync();
        if (existingStatus !== "granted") return;
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Mặc định",
            importance: Notifications.AndroidImportance.MAX,
            sound: "notification.wav",
            vibrationPattern: [0, 250, 250, 250, 250, 250],
            lightColor: "#FF8F1F",
          });
        }
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        if (!cancelled && token) {
          await partnerAuthAPI.updatePushToken(token);
        }
      } catch {
        // fail silently (Expo Go, simulator, etc.)
      }
    };

    register();

    // Foreground: Alert với nút Xem đơn
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body } = notification.request.content;
      if (title) {
        Alert.alert(title, body, [
          { text: "Đóng", style: "cancel" },
          ...(ordersRef.current ? [{ text: "Xem đơn", onPress: () => ordersRef.current?.() }] : []),
        ]);
      }
    });

    // Bấm notification ngoài màn hình → vào Orders
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      ordersRef.current?.();
    });

    return () => {
      cancelled = true;
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [partnerId]); // không phụ thuộc onNavigateToOrders
}
