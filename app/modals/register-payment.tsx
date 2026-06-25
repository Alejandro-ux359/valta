import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
import { getDebts, markDebtAsPaid } from "@/lib/database/debts";
import { Debt } from "@/components/cards/DebtItem";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { sendLocalNotification } from "@/lib/notifications";
import {
  format,
  parseISO,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";

type TabType = "pending" | "history";
type PeriodFilter = "all" | "this_month" | "last_month" | "last_3";

const PERIODS: { key: PeriodFilter; label: string }[] = [
  { key: "all", label: "Todo" },
  { key: "this_month", label: "Este mes" },
  { key: "last_month", label: "Mes anterior" },
  { key: "last_3", label: "Últimos 3 m." },
];

export default function RegisterPaymentModal() {
  const [allDebts, setAllDebts] = useState<Debt[]>([]);
  const [tab, setTab] = useState<TabType>("pending");
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [showCalendar, setShowCalendar] = useState(false);
  const insets = useSafeAreaInsets();

  const loadDebts = useCallback(async () => {
    const all = await getDebts();
    setAllDebts(all);
  }, []);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  // ── Filtros ──────────────────────────────
  const applyPeriod = (debt: Debt): boolean => {
    if (period === "all") return true;
    const dateStr = debt.due_date;
    if (!dateStr) return false;
    try {
      const date = parseISO(dateStr);
      const now = new Date();
      if (period === "this_month")
        return isWithinInterval(date, {
          start: startOfMonth(now),
          end: endOfMonth(now),
        });
      if (period === "last_month") {
        const last = subMonths(now, 1);
        return isWithinInterval(date, {
          start: startOfMonth(last),
          end: endOfMonth(last),
        });
      }
      if (period === "last_3")
        return isWithinInterval(date, {
          start: startOfMonth(subMonths(now, 3)),
          end: endOfMonth(now),
        });
    } catch {
      return true;
    }
    return true;
  };

  const applySearch = (debt: Debt): boolean => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      debt.contact_name.toLowerCase().includes(q) ||
      (debt.description ?? "").toLowerCase().includes(q) ||
      debt.amount.toString().includes(q)
    );
  };

  const pending = allDebts.filter(
    (d) => d.status !== "paid" && applySearch(d) && applyPeriod(d),
  );
  const history = allDebts.filter(
    (d) => d.status === "paid" && applySearch(d) && applyPeriod(d),
  );
  const shown = tab === "pending" ? pending : history;

  const totalPayable = pending
    .filter((d) => d.type === "payable")
    .reduce((s, d) => s + d.amount, 0);
  const totalReceivable = pending
    .filter((d) => d.type === "receivable")
    .reduce((s, d) => s + d.amount, 0);

  // ── Pagar ────────────────────────────────
  const handlePay = async () => {
    if (!selected) {
      Alert.alert("Selecciona", "Elige una deuda primero");
      return;
    }
    const debt = allDebts.find((d) => d.id === selected);
    if (!debt) return;

    Alert.alert(
      "Confirmar pago",
      `¿Marcar como pagada la deuda con ${debt.contact_name} por $${debt.amount.toFixed(2)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setLoading(true);
            try {
              await markDebtAsPaid(selected);
              await sendLocalNotification(
                "✅ Pago registrado",
                `Deuda con ${debt.contact_name} marcada como pagada`,
                "payment",
              );
              setSelected(null);
              await loadDebts();
              setTab("history");
            } catch {
              Alert.alert("Error", "No se pudo registrar el pago");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
        >
          <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Mis Pagos</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setShowCalendar(true)}
        >
          <MaterialIcons
            name="calendar-today"
            size={22}
            color={Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* ── BUSCADOR ── */}
      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, descripción..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <MaterialIcons name="cancel" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── TABS ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === "pending" && styles.tabActive]}
          onPress={() => {
            setTab("pending");
            setSelected(null);
          }}
        >
          <Text
            style={[styles.tabText, tab === "pending" && styles.tabTextActive]}
          >
            Pendiente
          </Text>
          {pending.length > 0 && tab !== "pending" && (
            <View style={styles.tabDot} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "history" && styles.tabActive]}
          onPress={() => {
            setTab("history");
            setSelected(null);
          }}
        >
          <Text
            style={[styles.tabText, tab === "history" && styles.tabTextActive]}
          >
            Historial
          </Text>
          {history.length > 0 && (
            <View
              style={[
                styles.tabCount,
                tab === "history" && styles.tabCountActive,
              ]}
            >
              <Text
                style={[
                  styles.tabCountText,
                  tab === "history" && { color: Colors.white },
                ]}
              >
                {history.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── RESUMEN ── */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Por pagar</Text>
          <Text style={[styles.summaryValue, { color: Colors.danger }]}>
            ${totalPayable.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Por cobrar</Text>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>
            ${totalReceivable.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Registro</Text>
          <Text style={styles.summaryValue}>{shown.length}</Text>
        </View>
      </View>

      {/* ── LISTA ── */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {shown.length === 0 ? (
          <EmptyState
            icon={tab === "pending" ? "check-circle" : "history"}
            title={
              tab === "pending" ? "Sin deudas pendientes" : "Sin historial"
            }
            subtitle={
              tab === "pending"
                ? "No tienes deudas por pagar en este momento"
                : "Aún no has registrado ningún pago"
            }
          />
        ) : (
          shown.map((debt) => {
            const isSelected = selected === debt.id;
            const isPayable = debt.type === "payable";
            const isPaid = debt.status === "paid";

            return (
              <TouchableOpacity
                key={debt.id}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                  isPaid && styles.cardPaid,
                ]}
                onPress={() =>
                  !isPaid && setSelected(isSelected ? null : (debt.id ?? null))
                }
                activeOpacity={isPaid ? 1 : 0.75}
              >
                {/* Línea lateral de color */}
                <View
                  style={[
                    styles.cardAccent,
                    {
                      backgroundColor: isPaid
                        ? Colors.success
                        : isPayable
                          ? Colors.danger
                          : Colors.success,
                    },
                  ]}
                />

                {/* Avatar */}
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: isPaid
                        ? "#E8F5E9"
                        : isPayable
                          ? "#FFEBEE"
                          : "#E8F5E9",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.initials,
                      {
                        color: isPaid
                          ? Colors.success
                          : isPayable
                            ? Colors.danger
                            : Colors.success,
                      },
                    ]}
                  >
                    {debt.contact_name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{debt.contact_name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={1}>
                    {debt.description || "Sin descripción"}
                  </Text>
                  {debt.due_date && (
                    <View style={styles.cardDate}>
                      <MaterialIcons
                        name={isPaid ? "check-circle" : "event"}
                        size={11}
                        color={isPaid ? Colors.success : Colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.cardDateText,
                          isPaid && { color: Colors.success },
                        ]}
                      >
                        {isPaid ? "Pagado" : "Vence"}{" "}
                        {format(parseISO(debt.due_date), "d MMM yyyy", {
                          locale: es,
                        })}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Derecha */}
                <View style={styles.cardRight}>
                  <Text
                    style={[
                      styles.cardAmount,
                      {
                        color: isPaid
                          ? Colors.textMuted
                          : isPayable
                            ? Colors.danger
                            : Colors.success,
                      },
                    ]}
                  >
                    {isPayable ? "-" : "+"}${debt.amount.toFixed(2)}
                  </Text>

                  <View
                    style={[
                      styles.statusPill,
                      isPaid
                        ? styles.statusPaid
                        : debt.status === "overdue"
                          ? styles.statusOverdue
                          : styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isPaid
                          ? { color: Colors.success }
                          : debt.status === "overdue"
                            ? { color: Colors.danger }
                            : { color: "#F57F17" },
                      ]}
                    >
                      {isPaid
                        ? "PAGADO"
                        : debt.status === "overdue"
                          ? "VENCIDO"
                          : "PENDIENTE"}
                    </Text>
                  </View>

                  {/* Selector */}
                  {!isPaid && (
                    <View
                      style={[
                        styles.selector,
                        isSelected && styles.selectorActive,
                      ]}
                    >
                      {isSelected && (
                        <MaterialIcons
                          name="check"
                          size={12}
                          color={Colors.white}
                        />
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ── FOOTER ── */}
      {tab === "pending" && (
        <View
          style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}
        >
          {selected && (
            <View style={styles.selectedBanner}>
              <MaterialIcons
                name="check-circle"
                size={16}
                color={Colors.success}
              />
              <Text style={styles.selectedBannerText} numberOfLines={1}>
                {allDebts.find((d) => d.id === selected)?.contact_name}
                {" — "}$
                {allDebts.find((d) => d.id === selected)?.amount.toFixed(2)}
              </Text>
            </View>
          )}
          <Button
            label={loading ? "Registrando..." : "Confirmar Pago"}
            onPress={handlePay}
            loading={loading}
            variant="primary"
            disabled={!selected}
          />
        </View>
      )}

      {/* ── MODAL CALENDARIO ── */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <View style={styles.calendarSheet}>
            <Text style={styles.calendarTitle}>Filtrar por período</Text>

            {PERIODS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.calendarOption,
                  period === opt.key && styles.calendarOptionActive,
                ]}
                onPress={() => {
                  setPeriod(opt.key);
                  setShowCalendar(false);
                }}
              >
                <MaterialIcons
                  name={
                    period === opt.key
                      ? "radio-button-checked"
                      : "radio-button-unchecked"
                  }
                  size={20}
                  color={period === opt.key ? Colors.primary : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.calendarOptionText,
                    period === opt.key && {
                      color: Colors.primary,
                      fontWeight: "600",
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                {period === opt.key && (
                  <MaterialIcons
                    name="check"
                    size={18}
                    color={Colors.primary}
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.calendarClose}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.calendarCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },

  // Buscador
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    padding: 0,
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  tabTextActive: { color: Colors.white, fontWeight: "600" },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.danger,
  },
  tabCount: {
    backgroundColor: Colors.borderLight,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  tabCountActive: { backgroundColor: "rgba(58, 223, 17, 0.88)" },
  tabCountText: {
    fontSize: 11,
    fontWeight: "bold",
    color: Colors.textSecondary,
  },

  // Resumen
  summaryRow: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
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

  // Lista
  list: { flex: 1, marginTop: Spacing.sm },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cardSelected: { borderColor: Colors.primary },
  cardPaid: { opacity: 0.8 },
  cardAccent: { width: 4, alignSelf: "stretch" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
    marginVertical: Spacing.md,
  },
  initials: { fontSize: FontSize.sm, fontWeight: "bold" },
  cardInfo: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  cardName: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  cardDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  cardDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  cardDateText: { fontSize: 11, color: Colors.textMuted },
  cardRight: {
    alignItems: "flex-end",
    paddingRight: Spacing.md,
    paddingVertical: Spacing.md,
    gap: 5,
  },
  cardAmount: { fontSize: FontSize.sm, fontWeight: "bold" },

  // Status pill
  statusPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusPaid: { backgroundColor: "#E8F5E9" },
  statusOverdue: { backgroundColor: "#FFEBEE" },
  statusPending: { backgroundColor: "#FFF8E1" },
  statusText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.3 },

  // Selector
  selector: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  selectorActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  // Footer
  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  selectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#E8F5E9",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  selectedBannerText: {
    fontSize: FontSize.sm,
    color: Colors.success,
    fontWeight: "500",
    flex: 1,
  },

  // Modal calendario
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  calendarSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  calendarTitle: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  calendarOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  calendarOptionActive: {
    backgroundColor: "#F0F4FF",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
  },
  calendarOptionText: { fontSize: FontSize.md, color: Colors.textPrimary },
  calendarClose: {
    marginTop: Spacing.lg,
    alignItems: "center",
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
  },
  calendarCloseText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});
