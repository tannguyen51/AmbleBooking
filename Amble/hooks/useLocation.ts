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

      // Dùng getCurrentPositionAsync với timeout
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      console.log("[GPS] got position:", pos.coords.latitude, pos.coords.longitude);
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e: any) {
      console.log("[GPS] error:", e?.message);
      // Fallback: thử getLastKnownPositionAsync
      try {
        const lastPos = await Location.getLastKnownPositionAsync();
        if (lastPos) {
          console.log("[GPS] fallback last known:", lastPos.coords.latitude, lastPos.coords.longitude);
          setLocation({ lat: lastPos.coords.latitude, lng: lastPos.coords.longitude });
          return;
        }
      } catch {}
      // Fallback cứng: Hồ Chí Minh (10.76, 106.66)
      console.log("[GPS] fallback to HCM");
      setLocation({ lat: 10.7626, lng: 106.6603 });
    } finally {
      setLoading(false);
    }
  };

  return { location, loading, error, requestLocation };
}
