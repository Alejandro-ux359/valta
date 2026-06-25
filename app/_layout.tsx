import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initDatabase } from "../lib/database";
import { requestNotificationPermission } from "../lib/notifications";

export default function RootLayout() {
  useEffect(() => {
    async function setup() {
      await initDatabase();
      await requestNotificationPermission();
    }
    setup();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#1565C0" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="modals/add-expense"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="modals/add-income"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="modals/add-debt"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="modals/register-payment"
          options={{ presentation: "modal", headerShown: false }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
