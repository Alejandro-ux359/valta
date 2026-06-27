import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  ThemeProvider,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { initDatabase } from "../lib/database";
import { requestNotificationPermission } from "../lib/notifications";
import { useStore } from "../lib/store/useStore";

export default function RootLayout() {
  const isDarkMode = useStore((s) => s.isDarkMode);

  useEffect(() => {
    async function setup() {
      await initDatabase();
      await requestNotificationPermission();
    }
    setup();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
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
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
