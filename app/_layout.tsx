import { useEffect } from "react";
import { router, Stack } from "expo-router";
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
import { useColors } from "../lib/hooks/useColors";
import * as ExpoSplashScreen from "expo-splash-screen";

ExpoSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const isDarkMode = useStore((s) => s.isDarkMode);
  const C = useColors();

  useEffect(() => {
    async function setup() {
      await initDatabase();
      await requestNotificationPermission();
      await ExpoSplashScreen.hideAsync();
      router.replace("/splash" as any);
    }
    setup();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: C.background },
            animation: "fade",
          }}
        >
          <Stack.Screen
            name="splash"
            options={{
              animation: "none",
              headerShown: false,
              contentStyle: { backgroundColor: "#FFFFFF" },
            }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{
              animation: "none",
              contentStyle: { backgroundColor: C.background },
            }}
          />
          <Stack.Screen
            name="modals/add-expense"
            options={{
              presentation: "transparentModal",
              animation: "slide_from_bottom",
              headerShown: false,
              contentStyle: { backgroundColor: C.white },
            }}
          />
          <Stack.Screen
            name="modals/add-income"
            options={{
              presentation: "transparentModal",
              animation: "slide_from_bottom",
              headerShown: false,
              contentStyle: { backgroundColor: C.white },
            }}
          />
          <Stack.Screen
            name="modals/add-debt"
            options={{
              presentation: "transparentModal",
              animation: "slide_from_bottom",
              headerShown: false,
              contentStyle: { backgroundColor: C.white },
            }}
          />
          <Stack.Screen
            name="modals/register-payment"
            options={{
              presentation: "transparentModal",
              animation: "slide_from_bottom",
              headerShown: false,
              contentStyle: { backgroundColor: C.background },
            }}
          />
          <Stack.Screen
            name="modals/notifications"
            options={{
              presentation: "transparentModal",
              animation: "slide_from_bottom",
              headerShown: false,
              contentStyle: { backgroundColor: C.background },
            }}
          />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
