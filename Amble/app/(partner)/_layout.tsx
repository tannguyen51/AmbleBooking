import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';

export default function PartnerLayout() {
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
