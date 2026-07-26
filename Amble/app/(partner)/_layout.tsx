import { Stack, useRouter } from 'expo-router';
import { usePartnerAuthStore } from '../../store/partnerAuthStore';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function PartnerLayout() {
  const router = useRouter();
  const { partner } = usePartnerAuthStore();
  usePushNotifications(
    partner?._id,
    partner ? () => router.push("/(partner)/orders" as any) : undefined,
  );

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="tables" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
