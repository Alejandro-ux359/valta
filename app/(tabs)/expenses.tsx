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
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
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
  { id: 4, name: "Salud", icon: "local-hospital", color: "#D32F2F" },
  { id: 7, name: "Agua", icon: "water-drop", color: "#0288D1" },
  { id: 8, name: "Electr.", icon: "bolt", color: "#F9A825" },
] as const;

export default function ExpensesScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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
    Alert.alert(
      "Eliminar transacción",
      "¿Estás seguro de que deseas eliminarla?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await deleteTransaction(id);
            await loadData();
          },
        },
      ],
    );
  };

  const filtered = transactions.filter((tx) => {
    const matchesFilter = filter === "all" || tx.type === filter;
    const matchesSearch =
      search.trim() === "" ||
      tx.description?.toLowerCase().includes(search.toLowerCase()) ||
      tx.category_name?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalIncome = filtered
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gastos e Ingresos</Text>
        <TouchableOpacity style={styles.notifBtn}>
          <MaterialIcons
            name="notifications-none"
            size={24}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

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
              {f === "all" ? "Todos" : f === "expense" ? "Gastos" : "Ingresos"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Categorías scroll horizontal */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catsScroll}
        contentContainerStyle={styles.catsContent}
      >
        {CATEGORIES_ICONS.map((cat) => (
          <TouchableOpacity key={cat.id} style={styles.catChip}>
            <View
              style={[
                styles.catIconWrap,
                { backgroundColor: cat.color + "22" },
              ]}
            >
              <MaterialIcons
                name={cat.icon as any}
                size={18}
                color={cat.color}
              />
            </View>
            <Text style={styles.catChipLabel}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Resumen inline */}
      {filter !== "all" && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {filter === "income" ? "Total ingresos" : "Total gastos"}
          </Text>
          <Text
            style={[
              styles.summaryValue,
              { color: filter === "income" ? Colors.success : Colors.danger },
            ]}
          >
            {filter === "income" ? "+" : "-"}$
            {(filter === "income" ? totalIncome : totalExpense).toFixed(2)}
          </Text>
        </View>
      )}

      {/* Lista */}
      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionLabel}>Transacciones Recientes</Text>

        {filtered.length === 0 ? (
          <EmptyState
            icon="receipt-long"
            title="Sin resultados"
            subtitle="No hay transacciones que coincidan con tu búsqueda"
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
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/modals/add-expense")}
      >
        <MaterialIcons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
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
  notifBtn: { padding: 4 },
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
  catsScroll: { marginTop: Spacing.sm },
  catsContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
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
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryValue: { fontSize: FontSize.lg, fontWeight: "bold" },
  list: { flex: 1, marginTop: Spacing.sm },
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
    marginBottom: 100,
    overflow: "hidden",
  },
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
});
