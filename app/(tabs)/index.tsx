import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
import {
  getSummary,
  getTransactions,
  deleteTransaction,
  Transaction,
} from "@/lib/database/transactions";
import { getUnreadCount } from "@/lib/notifications";
import { useStore } from "@/lib/store/useStore";
import { TransactionItem } from "@/components/cards/TransactionItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { LinearGradient } from "expo-linear-gradient";

const QUICK_ACTIONS = [
  {
    icon: "add-shopping-cart",
    label: "Agregar\nGasto",
    route: "/modals/add-expense",
    color: "#FFEBEE",
    iconColor: Colors.danger,
  },
  {
    icon: "attach-money",
    label: "Agregar\nIngreso",
    route: "/modals/add-income",
    color: "#E8F5E9",
    iconColor: Colors.success,
  },
  {
    icon: "account-balance",
    label: "Agregar\nDeuda",
    route: "/modals/add-debt",
    color: "#E3F2FD",
    iconColor: Colors.primary,
  },
  {
    icon: "credit-card",
    label: "Registrar\nPago",
    route: "/modals/add-expense",
    color: "#FFF8E1",
    iconColor: "#F57F17",
  },
] as const;

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const {
    balance,
    income,
    expenses,
    savings,
    setSummary,
    setUnreadNotifications,
    currency,
  } = useStore();
  const insets = useSafeAreaInsets();

  const loadData = useCallback(async () => {
    const [summary, txs, unread] = await Promise.all([
      getSummary(),
      getTransactions(8),
      getUnreadCount(),
    ]);
    setSummary(summary);
    setRecentTxs(txs);
    setUnreadNotifications(unread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleDelete = (id: number) => {
    Alert.alert("Eliminar", "¿Eliminar esta transacción?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteTransaction(id);
          await loadData();
        },
      },
    ]);
  };

  const monthName = format(new Date(), "MMMM yyyy", { locale: es });

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadData();
              setRefreshing(false);
            }}
          />
        }
      >
        {/* ── ZONA AZUL: header + tarjeta ── */}
        <View style={[styles.blueZone, { paddingTop: insets.top + 12 }]}>
          {/* Fila logo + campana */}
          <View style={styles.topBar}>
            <Text style={styles.appName}>Valta</Text>
            <TouchableOpacity style={styles.bellBtn}>
              <MaterialIcons
                name="notifications"
                size={26}
                color={Colors.white}
              />
            </TouchableOpacity>
          </View>

          {/* ── TARJETA VISA ── */}
          {/* ── TARJETA VISA ── */}
          <LinearGradient
            colors={["#57ebbc", "#1976D2", "#00ACC1", "#00BCD4"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Círculos decorativos */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />

            {/* Monto */}
            <View style={styles.cardAmountRow}>
              <Text style={styles.cardSymbol}>$</Text>
              <Text
                style={styles.cardAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {Math.abs(balance).toFixed(2)}
              </Text>
            </View>

            {/* Barra inferior: tendencia + moneda */}
            <View style={styles.cardBottom}>
              <View style={styles.trendRow}>
                <MaterialIcons
                  name="trending-up"
                  size={16}
                  color="rgba(255,255,255,0.9)"
                />
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: balance >= 0 ? "65%" : "20%" },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyText}>{currency}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── ZONA BLANCA: stats + contenido ── */}
        <View style={styles.whiteZone}>
          {/* Stats row */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <MaterialIcons
                name="arrow-upward"
                size={20}
                color={Colors.success}
              />
              <Text style={styles.statLabel}>Ingresos</Text>
              <Text style={styles.statValue}>${income.toFixed(2)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons
                name="arrow-downward"
                size={20}
                color={Colors.danger}
              />
              <Text style={styles.statLabel}>Gastos</Text>
              <Text style={styles.statValue}>${expenses.toFixed(2)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialIcons name="savings" size={20} color={Colors.primary} />
              <Text style={styles.statLabel}>Ahorros</Text>
              <Text style={styles.statValue}>${savings.toFixed(2)}</Text>
            </View>
          </View>

          {/* Acciones rápidas */}
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          <View style={styles.actionsRow}>
            {QUICK_ACTIONS.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.actionBtn, { backgroundColor: action.color }]}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={action.icon as any}
                  size={24}
                  color={action.iconColor}
                />
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transacciones recientes */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transacciones Recientes</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/expenses")}>
              <Text style={styles.viewAll}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.txCard}>
            {recentTxs.length === 0 ? (
              <EmptyState
                icon="receipt-long"
                title="Sin transacciones"
                subtitle="Agrega tu primer gasto o ingreso"
              />
            ) : (
              recentTxs.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  onDelete={() => tx.id && handleDelete(tx.id)}
                  onEdit={() => router.push(`/modals/add-expense?id=${tx.id}`)}
                />
              ))
            )}
          </View>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Zona azul ──
  blueZone: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.white,
  },
  bellBtn: {
    padding: 4,
  },

  // ── Tarjeta ──
  card: {
    backgroundColor: "transparent",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    overflow: "hidden",
    minHeight: 140,
    // Gradiente manual con capas
    borderWidth: 0,
  },
  circle1: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#00BCD4",
    opacity: 0.75,
    top: -40,
    right: -50,
  },
  circle2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#0D47A1",
    opacity: 0.6,
    bottom: -60,
    left: -40,
  },
  cardAmountRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: Spacing.lg,
  },
  cardSymbol: {
    fontSize: 26,
    fontWeight: "bold",
    color: Colors.white,
    marginTop: 8,
  },
  cardAmount: {
    fontSize: 48,
    fontWeight: "bold",
    color: Colors.white,
    flex: 1,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: Spacing.md,
  },
  progressBg: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 3,
  },
  currencyBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  currencyText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },

  // ── Zona blanca ──
  whiteZone: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingTop: Spacing.md,
  },

  // Stats
  statsCard: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    // Sombra
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: FontSize.sm,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },

  // Acciones
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: 6,
  },
  actionLabel: {
    fontSize: 10,
    color: Colors.textPrimary,
    textAlign: "center",
    fontWeight: "500",
  },

  // Transacciones
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  viewAll: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "500",
  },
  txCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
});
