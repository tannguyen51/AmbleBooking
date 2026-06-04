import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="partners" />
      <Stack.Screen name="partners/[id]" />
      <Stack.Screen name="restaurants" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="routes" />
    </Stack>
  );
}
