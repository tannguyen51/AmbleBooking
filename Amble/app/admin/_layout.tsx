import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="users" />
      <Stack.Screen name="partners" />
      <Stack.Screen name="restaurants" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="rewards" />
      <Stack.Screen name="routes" />
    </Stack>
  );
}
