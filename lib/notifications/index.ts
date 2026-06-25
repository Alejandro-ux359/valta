import { Platform } from "react-native";
import { getDatabase } from "../database";

// Solo importamos expo-notifications si NO estamos en Expo Go
let Notifications: typeof import("expo-notifications") | null = null;

async function getNotifications() {
  if (Notifications) return Notifications;
  try {
    Notifications = await import("expo-notifications");
    return Notifications;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const N = await getNotifications();
    if (!N) return false;

    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status: existing } = await N.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await N.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return false;

    if (Platform.OS === "android") {
      await N.setNotificationChannelAsync("default", {
        name: "Valta",
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1565C0",
      });
      await N.setNotificationChannelAsync("debts", {
        name: "Alertas de Deudas",
        importance: N.AndroidImportance.HIGH,
        vibrationPattern: [0, 500],
        lightColor: "#C62828",
      });
    }

    return true;
  } catch {
    return false;
  }
}

export async function sendLocalNotification(
  title: string,
  body: string,
  type: string = "general",
): Promise<void> {
  try {
    const N = await getNotifications();
    if (N) {
      await N.scheduleNotificationAsync({
        content: { title, body, sound: true, data: { type } },
        trigger: null,
      });
    }

    // Siempre guardamos en log local aunque no haya notificación
    const db = getDatabase();
    await db.runAsync(
      "INSERT INTO notifications_log (title, body, type) VALUES (?, ?, ?)",
      [title, body, type],
    );
  } catch {
    // Silencioso en Expo Go
  }
}

export async function scheduleDebtReminder(
  contactName: string,
  amount: number,
  dueDate: string,
): Promise<void> {
  try {
    const N = await getNotifications();
    if (!N) return;

    const due = new Date(dueDate);
    due.setHours(9, 0, 0, 0);

    if (due > new Date()) {
      await N.scheduleNotificationAsync({
        content: {
          title: "⚠️ Deuda por vencer",
          body: `Debes $${amount.toFixed(2)} a ${contactName}`,
          sound: true,
          data: { type: "debt_reminder" },
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.DATE,
          date: due,
          channelId: "debts",
        },
      });
    }
  } catch {
    // Silencioso en Expo Go
  }
}

export async function getNotificationsLog() {
  const db = getDatabase();
  return await db.getAllAsync(
    "SELECT * FROM notifications_log ORDER BY created_at DESC LIMIT 50",
  );
}

export async function getUnreadCount(): Promise<number> {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM notifications_log WHERE read = 0",
  );
  return result?.count ?? 0;
}

export async function markAllAsRead(): Promise<void> {
  const db = getDatabase();
  await db.runAsync("UPDATE notifications_log SET read = 1");
}
