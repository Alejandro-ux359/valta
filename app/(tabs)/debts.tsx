import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
import {
  getDebts,
  markDebtAsPaid,
  deleteDebt,
  getDebtsSummary,
} from "@/lib/database/debts";
import { DebtItem, Debt } from "@/components/cards/DebtItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { useColors } from "@/lib/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/lib/store/useStore";

type DebtTab = "payable" | "receivable";

export default function DebtsScreen() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [activeTab, setActiveTab] = useState<DebtTab>("payable");
  const [refreshing, setRefreshing] = useState(false);
  const [totalPayable, setTotalPayable] = useState(0);
  const [totalReceivable, setTotalReceivable] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const C = useColors();
  const { isDarkMode } = useStore();
  const insets = useSafeAreaInsets();

  const loadData = useCallback(async () => {
    const [allDebts, summary] = await Promise.all([
      getDebts(),
      getDebtsSummary(),
    ]);
    setDebts(allDebts);
    setTotalPayable(summary.totalPayable);
    setTotalReceivable(summary.totalReceivable);
    setPendingCount(summary.pendingCount);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMarkPaid = async (id: number) => {
    Alert.alert(
      "Marcar como pagado",
      "¿Confirmas que esta deuda ya fue pagada?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            await markDebtAsPaid(id);
            await loadData();
          },
        },
      ],
    );
  };

  const handleDelete = (id: number) => {
    Alert.alert("Eliminar deuda", "¿Estás seguro de que deseas eliminarla?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteDebt(id);
          await loadData();
        },
      },
    ]);
  };

  const filtered = debts.filter((d) => d.type === activeTab);

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
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
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
          Gestión de Deudas
        </Text>
        <TouchableOpacity>
          <MaterialIcons
            name="notifications-none"
            size={24}
            color={C.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Resumen */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: C.white }]}>
          <Text style={styles.summaryLabel}>TOTAL POR PAGAR</Text>
          <Text style={[styles.summaryAmount, { color: Colors.danger }]}>
            ${totalPayable.toFixed(2)}
          </Text>
          <View style={styles.summaryFooter}>
            <MaterialIcons name="schedule" size={12} color={Colors.textMuted} />
            <Text style={styles.summaryFooterText}>
              {pendingCount} deudas pendientes
            </Text>
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: C.white }]}>
          <Text style={styles.summaryLabel}>TOTAL POR COBRAR</Text>
          <Text style={[styles.summaryAmount, { color: Colors.success }]}>
            ${totalReceivable.toFixed(2)}
          </Text>
          <View style={styles.summaryFooter}>
            <MaterialIcons name="history" size={12} color={Colors.textMuted} />
            <Text style={styles.summaryFooterText}>Cobros próximos</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "payable" && styles.tabActive]}
          onPress={() => setActiveTab("payable")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "payable" && styles.tabTextActive,
            ]}
          >
            Dinero a Pagar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "receivable" && styles.tabActive]}
          onPress={() => setActiveTab("receivable")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "receivable" && styles.tabTextActive,
            ]}
          >
            Dinero a Recibir
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon="account-balance"
            title={
              activeTab === "payable"
                ? "Sin deudas por pagar"
                : "Sin cobros pendientes"
            }
            subtitle="Toca el botón + para agregar una deuda"
          />
        ) : (
          filtered.map((debt) => (
            <DebtItem
              key={debt.id}
              debt={debt}
              onMarkPaid={() => debt.id && handleMarkPaid(debt.id)}
              onPress={() => debt.id && handleDelete(debt.id)}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/modals/add-debt")}
      >
        <MaterialIcons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "bold" },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryAmount: { fontSize: FontSize.xl, fontWeight: "bold" },
  summaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  summaryFooterText: { fontSize: FontSize.xs, color: Colors.textMuted },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingBottom: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  tabTextActive: { color: Colors.primary, fontWeight: "700" },
  list: { flex: 1, marginTop: Spacing.sm },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: Colors.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});
