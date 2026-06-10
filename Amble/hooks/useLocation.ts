import { useEffect, useState } from "react";
import * as Location from "expo-location";
import type { LocationObject } from "expo-location";

interface UseLocationResult {
  location: { lat: number; lng: number } | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<void>;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = async () => {
    console.log("[GPS] requestLocation called");
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log("[GPS] permission status:", status);
      if (status !== "granted") {
        // Không có quyền → fallback HCM ngay
        setLocation({ lat: 10.7626, lng: 106.6603 });
        setLoading(false);
        return;
      }

      // Set HCM fallback NGAY LẬP TỨC để hiện km, GPS thật cập nhật sau
      setLocation({ lat: 10.7626, lng: 106.6603 });

      // Thử lấy GPS thật (chạy ngầm, không block)
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        console.log("[GPS] got real position:", pos.coords.latitude, pos.coords.longitude);
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch (e: any) {
        console.log("[GPS] real GPS failed, keeping HCM fallback:", e?.message);
      }
    } catch (e: any) {
      console.log("[GPS] error:", e?.message);
      setLocation({ lat: 10.7626, lng: 106.6603 });
    } finally {
      setLoading(false);
    }
  };

  return { location, loading, error, requestLocation };
}
