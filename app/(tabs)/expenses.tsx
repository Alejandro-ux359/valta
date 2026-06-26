import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
import {
  getTransactions,
  deleteTransaction,
  Transaction,
} from "@/lib/database/transactions";
import { TransactionItem } from "@/components/cards/TransactionItem";
import { EmptyState } from "@/components/ui/EmptyState";

type FilterType = "all" | "expense" | "income";

const CATEGORIES_ICONS = [
  { id: 1, name: "Comida", icon: "restaurant", color: "#FF6B35" },
  { id: 2, name: "Vivienda", icon: "home", color: "#1565C0" },
  { id: 3, name: "Transporte", icon: "directions-bus", color: "#7B1FA2" },
  { id: 5, name: "Salud", icon: "local-hospital", color: "#D32F2F" },
  { id: 7, name: "Agua", icon: "water-drop", color: "#0288D1" },
  { id: 8, name: "Electr.", icon: "bolt", color: "#F9A825" },
] as const;

export default function ExpensesScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const insets = useSafeAreaInsets();

  const loadData = useCallback(async () => {
    const txs = await getTransactions(200);
    setTransactions(txs);
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

  const handleDelete = (id: number) => {
    Alert.alert("Eliminar transacción", "¿Estás seguro?", [
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

  const filtered = transactions.filter((tx) => {
    const matchesFilter = filter === "all" || tx.type === filter;
    const matchesCat = activeCat === null || tx.category_id === activeCat;
    const matchesSearch =
      search.trim() === "" ||
      tx.description?.toLowerCase().includes(search.toLowerCase()) ||
      tx.category_name?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesCat && matchesSearch;
  });

  const totalIncome = filtered
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gastos e Ingresos</Text>
        <TouchableOpacity>
          <MaterialIcons
            name="notifications-none"
            size={24}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* ── Todo en un ScrollView para evitar espacios ── */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Buscador */}
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar transacciones..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <MaterialIcons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros */}
        <View style={styles.filterRow}>
          {(["all", "expense", "income"] as FilterType[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f === "all"
                  ? "Todos"
                  : f === "expense"
                    ? "Gastos"
                    : "Ingresos"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Categorías */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catsContent}
        >
          {CATEGORIES_ICONS.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.catChip}
              onPress={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
            >
              <View
                style={[
                  styles.catIconWrap,
                  { backgroundColor: cat.color + "22" },
                  activeCat === cat.id && {
                    borderWidth: 2,
                    borderColor: cat.color,
                  },
                ]}
              >
                <MaterialIcons
                  name={cat.icon as any}
                  size={18}
                  color={cat.color}
                />
              </View>
              <Text
                style={[
                  styles.catChipLabel,
                  activeCat === cat.id && {
                    color: cat.color,
                    fontWeight: "600",
                  },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Resumen */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Ingresos</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              +${totalIncome.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Gastos</Text>
            <Text style={[styles.summaryValue, { color: Colors.danger }]}>
              -${totalExpense.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Registros</Text>
            <Text style={styles.summaryValue}>{filtered.length}</Text>
          </View>
        </View>

        {/* Lista */}
        <Text style={styles.sectionLabel}>Transacciones Recientes</Text>

        {filtered.length === 0 ? (
          <EmptyState
            icon="receipt-long"
            title="Sin resultados"
            subtitle="No hay transacciones que coincidan"
          />
        ) : (
          <View style={styles.txCard}>
            {filtered.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                onDelete={() => tx.id && handleDelete(tx.id)}
                onEdit={() => router.push(`/modals/add-expense?id=${tx.id}`)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowFabMenu(true)}>
        <MaterialIcons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* ── FAB Menu Modal ── */}
      <Modal
        visible={showFabMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFabMenu(false)}
      >
        <TouchableOpacity
          style={styles.fabOverlay}
          activeOpacity={1}
          onPress={() => setShowFabMenu(false)}
        >
          <View
            style={[
              styles.fabSheet,
              { paddingBottom: insets.bottom + Spacing.md },
            ]}
          >
            <Text style={styles.fabSheetTitle}>¿Qué deseas agregar?</Text>

            <TouchableOpacity
              style={styles.fabOption}
              onPress={() => {
                setShowFabMenu(false);
                router.push("/modals/add-expense");
              }}
            >
              <View
                style={[styles.fabOptionIcon, { backgroundColor: "#FFEBEE" }]}
              >
                <MaterialIcons
                  name="add-shopping-cart"
                  size={22}
                  color={Colors.danger}
                />
              </View>
              <View style={styles.fabOptionText}>
                <Text style={styles.fabOptionTitle}>Agregar Gasto</Text>
                <Text style={styles.fabOptionSub}>Registra un nuevo gasto</Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={Colors.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.fabDivider} />

            <TouchableOpacity
              style={styles.fabOption}
              onPress={() => {
                setShowFabMenu(false);
                router.push("/modals/add-income");
              }}
            >
              <View
                style={[styles.fabOptionIcon, { backgroundColor: "#E8F5E9" }]}
              >
                <MaterialIcons
                  name="attach-money"
                  size={22}
                  color={Colors.success}
                />
              </View>
              <View style={styles.fabOptionText}>
                <Text style={styles.fabOptionTitle}>Agregar Ingreso</Text>
                <Text style={styles.fabOptionSub}>
                  Registra un nuevo ingreso
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={Colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fabCancel}
              onPress={() => setShowFabMenu(false)}
            >
              <Text style={styles.fabCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },

  scroll: { flex: 1 },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },

  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  filterBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  filterTextActive: { color: Colors.white },

  catsContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  catChip: { alignItems: "center", gap: 4 },
  catIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  catChipLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },

  summaryRow: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryLabel: { fontSize: 11, color: Colors.textMuted },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },

  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  txCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    overflow: "hidden",
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },

  // FAB Modal
  fabOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  fabSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  fabSheetTitle: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  fabOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  fabOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  fabOptionText: { flex: 1 },
  fabOptionTitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  fabOptionSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fabDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs,
  },
  fabCancel: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  fabCancelText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});
