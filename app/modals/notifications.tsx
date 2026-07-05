import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
import { useColors } from "@/lib/hooks/useColors";
import { getNotificationsLog, markAllAsRead } from "@/lib/notifications";
import { useStore } from "@/lib/store/useStore";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface NotificationItem {
  id: number;
  title: string;
  body: string;
  type: string;
  read: number;
  created_at: string;
}

const TYPE_ICON: Record<string, { icon: string; color: string }> = {
  expense: { icon: "shopping-cart", color: "#C62828" },
  income: { icon: "attach-money", color: "#2E7D32" },
  payment: { icon: "check-circle", color: "#1565C0" },
  debt_reminder: { icon: "warning", color: "#F57F17" },
  sms: { icon: "sms", color: "#7B1FA2" },
  general: { icon: "notifications", color: "#455A64" },
};

export default function NotificationsModal() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { setUnreadNotifications } = useStore();
  const [items, setItems] = useState<NotificationItem[]>([]);

  const loadItems = useCallback(async () => {
    const log = await getNotificationsLog();
    setItems(log as NotificationItem[]);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleClearAll = () => {
    Alert.alert("Limpiar bandeja", "¿Eliminar todas las notificaciones?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Limpiar",
        style: "destructive",
        onPress: async () => {
          const db = (await import("@/lib/database")).getDatabase();
          await db.runAsync("DELETE FROM notifications_log");
          await markAllAsRead();
          setUnreadNotifications(0);
          setItems([]);
        },
      },
    ]);
  };

  const handleMarkRead = async () => {
    await markAllAsRead();
    setUnreadNotifications(0);
    await loadItems();
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, "d MMM yyyy · HH:mm", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const unreadCount = items.filter((i) => i.read === 0).length;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: C.white,
            borderBottomColor: C.border,
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: C.background }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="close" size={22} color={C.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: C.textPrimary }]}>
            Notificaciones
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: C.background }]}
          onPress={handleClearAll}
        >
          <MaterialIcons
            name="delete-sweep"
            size={22}
            color={C.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Marcar todas como leídas */}
      {unreadCount > 0 && (
        <TouchableOpacity
          style={[styles.markReadRow, { backgroundColor: C.surfaceSecondary }]}
          onPress={handleMarkRead}
        >
          <MaterialIcons name="done-all" size={16} color={C.primary} />
          <Text style={[styles.markReadText, { color: C.primary }]}>
            Marcar todas como leídas
          </Text>
        </TouchableOpacity>
      )}

      {/* Lista */}
      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialIcons
            name="notifications-none"
            size={56}
            color={C.textMuted}
          />
          <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>
            Sin notificaciones
          </Text>
          <Text style={[styles.emptySub, { color: C.textMuted }]}>
            Las alertas de deudas y mensajes detectados aparecerán aquí
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => {
            const typeInfo = TYPE_ICON[item.type] ?? TYPE_ICON.general;
            const isUnread = item.read === 0;

            return (
              <View
                style={[
                  styles.item,
                  { backgroundColor: C.white },
                  isUnread && {
                    borderLeftColor: C.primary,
                    borderLeftWidth: 3,
                  },
                ]}
              >
                {/* Ícono */}
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: typeInfo.color + "22" },
                  ]}
                >
                  <MaterialIcons
                    name={typeInfo.icon as any}
                    size={20}
                    color={typeInfo.color}
                  />
                </View>

                {/* Contenido */}
                <View style={styles.itemContent}>
                  <View style={styles.itemTopRow}>
                    <Text
                      style={[styles.itemTitle, { color: C.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {isUnread && (
                      <View
                        style={[styles.dot, { backgroundColor: C.primary }]}
                      />
                    )}
                  </View>
                  <Text
                    style={[styles.itemBody, { color: C.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.body}
                  </Text>
                  <Text style={[styles.itemDate, { color: C.textMuted }]}>
                    {formatDate(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: FontSize.lg, fontWeight: "bold" },
  unreadBadge: {
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadText: { color: Colors.white, fontSize: 11, fontWeight: "bold" },

  markReadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  markReadText: { fontSize: FontSize.sm, fontWeight: "500" },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    marginTop: Spacing.md,
  },
  emptySub: {
    fontSize: FontSize.sm,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 20,
  },

  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
    flexShrink: 0,
  },
  itemContent: { flex: 1 },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemTitle: { fontSize: FontSize.sm, fontWeight: "600", flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
  itemBody: { fontSize: FontSize.xs, marginTop: 2, lineHeight: 18 },
  itemDate: { fontSize: 11, marginTop: 4 },
});