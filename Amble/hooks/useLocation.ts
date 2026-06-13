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
        setError("Quyền truy cập vị trí bị từ chối");
        setLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      console.log("[GPS] got position:", pos.coords.latitude, pos.coords.longitude);
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e: any) {
      console.log("[GPS] error:", e?.message);
      setError("Không thể lấy vị trí. Bật GPS và thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return { location, loading, error, requestLocation };
}
