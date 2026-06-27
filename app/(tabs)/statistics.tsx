import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
import { useColors } from "@/lib/hooks/useColors";
import { useStore } from "@/lib/store/useStore";
import {
  getSummary,
  getExpensesByCategory,
  getMonthlyComparison,
  CategoryTotal,
  MonthlyData,
} from "@/lib/database/transactions";
import { getDatabase } from "@/lib/database";
import { MonthlyBarChart } from "@/components/charts/BarChart";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  isSameDay,
  isToday,
  parseISO,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";

type Period = "week" | "month" | "year";

const MONTH_LABELS: Record<string, string> = {
  "01": "Ene",
  "02": "Feb",
  "03": "Mar",
  "04": "Abr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dic",
};

export default function StatisticsScreen() {
  const C = useColors();
  const { isDarkMode } = useStore();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState<Period>("month");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarRef, setCalendarRef] = useState<Date>(new Date());
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [categories, setCategories] = useState<CategoryTotal[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [selectedStats, setSelectedStats] = useState<{
    income: number;
    expenses: number;
  } | null>(null);
  const [selectedLabel, setSelectedLabel] = useState("");

  const loadData = useCallback(async () => {
    const [summary, cats, monthData] = await Promise.all([
      getSummary(),
      getExpensesByCategory(),
      getMonthlyComparison(),
    ]);
    setIncome(summary.income);
    setExpenses(summary.expenses);
    setCategories(cats);
    setMonthly(monthData.reverse());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const loadStatsForDate = async (date: Date, p: Period) => {
    const db = getDatabase();
    let whereClause = "";
    let label = "";
    if (p === "week") {
      const start = format(
        startOfWeek(date, { weekStartsOn: 1 }),
        "yyyy-MM-dd",
      );
      const end = format(endOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
      whereClause = `date >= '${start}' AND date <= '${end}'`;
      label = `Semana del ${format(startOfWeek(date, { weekStartsOn: 1 }), "d MMM", { locale: es })}`;
    } else if (p === "month") {
      whereClause = `strftime('%Y-%m', date) = '${format(date, "yyyy-MM")}'`;
      label = format(date, "MMMM yyyy", { locale: es });
    } else {
      whereClause = `strftime('%Y', date) = '${format(date, "yyyy")}'`;
      label = format(date, "yyyy");
    }
    const result = (await db.getFirstAsync(
      `SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expenses
       FROM transactions WHERE ${whereClause}`,
    )) as { income: number; expenses: number } | null;
    setSelectedStats({
      income: result?.income ?? 0,
      expenses: result?.expenses ?? 0,
    });
    setSelectedLabel(label);
  };

  const getCalendarDays = () => {
    const ref = calendarRef;
    if (period === "week")
      return eachDayOfInterval({
        start: startOfWeek(ref, { weekStartsOn: 1 }),
        end: endOfWeek(ref, { weekStartsOn: 1 }),
      });
    if (period === "month")
      return eachDayOfInterval({
        start: startOfMonth(ref),
        end: endOfMonth(ref),
      });
    return eachMonthOfInterval({
      start: startOfYear(ref),
      end: endOfYear(ref),
    });
  };

  const handleSelectDay = (date: Date) => {
    setSelectedDate(date);
    loadStatsForDate(date, period);
    setShowCalendar(false);
  };

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    setSelectedStats(null);
    setSelectedLabel("");
  };

  const displayIncome = selectedStats?.income ?? income;
  const displayExpenses = selectedStats?.expenses ?? expenses;
  const savingsRate =
    displayIncome > 0
      ? Math.round(((displayIncome - displayExpenses) / displayIncome) * 100)
      : 0;
  const healthScore = Math.min(
    100,
    Math.max(
      0,
      displayIncome === 0
        ? 0
        : displayExpenses === 0
          ? 100
          : Math.round(
              (savingsRate > 0 ? Math.min(savingsRate * 1.5, 60) : 0) +
                (displayExpenses < displayIncome ? 30 : 0) +
                (savingsRate >= 20 ? 10 : 0),
            ),
    ),
  );
  const healthLabel =
    healthScore >= 80
      ? "Excelente"
      : healthScore >= 60
        ? "Bueno"
        : healthScore >= 40
          ? "Regular"
          : "Mejorar";
  const healthColor =
    healthScore >= 80
      ? Colors.success
      : healthScore >= 60
        ? "#2196F3"
        : healthScore >= 40
          ? Colors.warning
          : Colors.danger;
  const maxCategoryTotal = Math.max(...categories.map((c) => c.total), 1);
  const barData = monthly.map((m) => ({
    label: MONTH_LABELS[m.month] ?? m.month,
    income: m.income,
    expenses: m.expenses,
  }));
  const calendarDays = getCalendarDays();

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* ── HEADER FIJO ── */}
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
          Estadísticas
        </Text>
        <TouchableOpacity
          style={[styles.calendarBtn, { backgroundColor: C.surfaceSecondary }]}
          onPress={() => setShowCalendar(true)}
        >
          <MaterialIcons name="calendar-today" size={20} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* ── SELECTOR PERÍODO FIJO ── */}
      <View style={[styles.periodWrap, { backgroundColor: C.background }]}>
        <View
          style={[
            styles.periodRow,
            { backgroundColor: C.white, borderColor: C.border },
          ]}
        >
          {(["week", "month", "year"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => handlePeriodChange(p)}
            >
              <Text
                style={[
                  styles.periodText,
                  { color: C.textSecondary },
                  period === p && styles.periodTextActive,
                ]}
              >
                {p === "week" ? "Semana" : p === "month" ? "Mes" : "Año"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Label período seleccionado */}
        {selectedLabel ? (
          <View
            style={[
              styles.selectedPeriodRow,
              { backgroundColor: isDarkMode ? "#1a2744" : "#E3F2FD" },
            ]}
          >
            <MaterialIcons name="event" size={14} color={C.primary} />
            <Text style={[styles.selectedPeriodText, { color: C.primary }]}>
              {selectedLabel}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedStats(null);
                setSelectedLabel("");
              }}
            >
              <MaterialIcons name="close" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.calendarHint}
            onPress={() => setShowCalendar(true)}
          >
            <MaterialIcons name="touch-app" size={14} color={C.textMuted} />
            <Text style={[styles.calendarHintText, { color: C.textMuted }]}>
              Toca el calendario para filtrar por{" "}
              {period === "week"
                ? "semana"
                : period === "month"
                  ? "mes"
                  : "año"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── SCROLL ── */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: C.white }]}>
            <Text style={[styles.kpiLabel, { color: C.textMuted }]}>
              INGRESOS TOTALES
            </Text>
            <Text style={[styles.kpiValue, { color: Colors.success }]}>
              ${displayIncome.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: C.white }]}>
            <Text style={[styles.kpiLabel, { color: C.textMuted }]}>
              GASTOS TOTALES
            </Text>
            <Text style={[styles.kpiValue, { color: Colors.danger }]}>
              ${displayExpenses.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: C.white }]}>
            <Text style={[styles.kpiLabel, { color: C.textMuted }]}>
              TASA DE AHORRO
            </Text>
            <Text
              style={[
                styles.kpiValue,
                { color: savingsRate >= 0 ? C.primary : Colors.danger },
              ]}
            >
              {savingsRate}%
            </Text>
            <View
              style={[styles.progressBg, { backgroundColor: C.borderLight }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(Math.abs(savingsRate), 100)}%`,
                    backgroundColor:
                      savingsRate >= 0 ? C.primary : Colors.danger,
                  },
                ]}
              />
            </View>
            <Text style={[styles.kpiHint, { color: C.textMuted }]}>
              {savingsRate >= 20
                ? "✓ Meta alcanzada"
                : savingsRate >= 0
                  ? "Intenta ahorrar más del 20%"
                  : "Gastos superan tus ingresos"}
            </Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: C.white }]}>
            <Text style={[styles.kpiLabel, { color: C.textMuted }]}>
              SALUD FINANCIERA
            </Text>
            <Text style={[styles.kpiValue, { color: C.textPrimary }]}>
              {healthScore}
              <Text style={[styles.kpiSub, { color: C.textSecondary }]}>
                {" "}
                /100
              </Text>
            </Text>
            <View style={styles.healthRow}>
              <View
                style={[styles.healthDot, { backgroundColor: healthColor }]}
              />
              <Text style={[styles.healthLabel, { color: healthColor }]}>
                {healthLabel}
              </Text>
            </View>
            <Text style={[styles.kpiHint, { color: C.textMuted }]}>
              {healthScore >= 80
                ? "Finanzas en orden"
                : healthScore >= 60
                  ? "Vas por buen camino"
                  : healthScore >= 40
                    ? "Revisa tus gastos"
                    : "Necesitas mejorar urgente"}
            </Text>
          </View>
        </View>

        {/* Info card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: isDarkMode ? "#1a2744" : "#E3F2FD" },
          ]}
        >
          <MaterialIcons name="info-outline" size={16} color={C.primary} />
          <Text
            style={[
              styles.infoText,
              { color: isDarkMode ? "#90CAF9" : "#1565C0" },
            ]}
          >
            <Text style={{ fontWeight: "600" }}>Salud financiera</Text> se
            calcula en base a: tasa de ahorro (60pts) + balance positivo (30pts)
            + ahorro mayor al 20% (10pts).{"\n"}
            <Text style={{ fontWeight: "600" }}>Tasa de ahorro</Text> =
            (ingresos - gastos) / ingresos × 100
          </Text>
        </View>

        {/* Gráfica */}
        <Card style={[styles.chartCard, { backgroundColor: C.white }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: C.textPrimary }]}>
              Ingresos vs Gastos
            </Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: C.primary }]}
                />
                <Text style={[styles.legendText, { color: C.textSecondary }]}>
                  Ingresos
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: C.border }]}
                />
                <Text style={[styles.legendText, { color: C.textSecondary }]}>
                  Gastos
                </Text>
              </View>
            </View>
          </View>
          {barData.length === 0 ? (
            <EmptyState
              icon="bar-chart"
              title="Sin datos"
              subtitle="Agrega transacciones para ver la gráfica"
            />
          ) : (
            <MonthlyBarChart data={barData} />
          )}
        </Card>

        {/* Categorías */}
        <Card style={[styles.chartCard, { backgroundColor: C.white }]}>
          <Text style={[styles.chartTitle, { color: C.textPrimary }]}>
            Gastos por Categoría
          </Text>
          {categories.length === 0 ? (
            <EmptyState
              icon="pie-chart"
              title="Sin datos"
              subtitle="Sin gastos este período"
            />
          ) : (
            <View style={styles.catList}>
              {categories.map((cat, i) => (
                <View key={i} style={styles.catRow}>
                  <Text style={[styles.catName, { color: C.textPrimary }]}>
                    {cat.category_name}
                  </Text>
                  <View
                    style={[
                      styles.catBarWrap,
                      { backgroundColor: C.borderLight },
                    ]}
                  >
                    <View
                      style={[
                        styles.catBar,
                        {
                          width: `${(cat.total / maxCategoryTotal) * 100}%`,
                          backgroundColor: cat.color || C.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.catTotal, { color: C.textPrimary }]}>
                    ${cat.total.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Sugerencia */}
        {displayExpenses > displayIncome * 0.5 && displayIncome > 0 && (
          <View style={styles.tipCard}>
            <MaterialIcons name="lightbulb" size={20} color={Colors.white} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Sugerencia de ahorro</Text>
              <Text style={styles.tipText}>
                Tus gastos superan el 50% de tus ingresos. Considera revisar la
                categoría más alta.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* ── MODAL CALENDARIO ── */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <View style={[styles.calendarSheet, { backgroundColor: C.white }]}>
            <View style={styles.calHeader}>
              <TouchableOpacity
                onPress={() => {
                  const ref = new Date(calendarRef);
                  if (period === "week") ref.setDate(ref.getDate() - 7);
                  else if (period === "month") ref.setMonth(ref.getMonth() - 1);
                  else ref.setFullYear(ref.getFullYear() - 1);
                  setCalendarRef(new Date(ref));
                }}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={28}
                  color={C.textPrimary}
                />
              </TouchableOpacity>
              <Text style={[styles.calTitle, { color: C.textPrimary }]}>
                {period === "year"
                  ? format(calendarRef, "yyyy")
                  : format(calendarRef, "MMMM yyyy", { locale: es })}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const ref = new Date(calendarRef);
                  if (period === "week") ref.setDate(ref.getDate() + 7);
                  else if (period === "month") ref.setMonth(ref.getMonth() + 1);
                  else ref.setFullYear(ref.getFullYear() + 1);
                  setCalendarRef(new Date(ref));
                }}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={28}
                  color={C.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.calSubtitle, { color: C.textMuted }]}>
              {period === "week"
                ? "Selecciona un día de la semana"
                : period === "month"
                  ? "Selecciona un día del mes"
                  : "Selecciona un mes del año"}
            </Text>

            {period !== "year" && (
              <View style={styles.calWeekRow}>
                {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
                  <Text
                    key={i}
                    style={[styles.calWeekDay, { color: C.textMuted }]}
                  >
                    {d}
                  </Text>
                ))}
              </View>
            )}

            {period === "year" ? (
              <View style={styles.calMonthGrid}>
                {calendarDays.map((date, i) => {
                  const isSelected =
                    format(date, "yyyy-MM") === format(selectedDate, "yyyy-MM");
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.calMonthItem,
                        { borderColor: C.border },
                        isSelected && styles.calDaySelected,
                      ]}
                      onPress={() => handleSelectDay(date)}
                    >
                      <Text
                        style={[
                          styles.calMonthText,
                          { color: C.textPrimary },
                          isSelected && styles.calDaySelectedText,
                        ]}
                      >
                        {format(date, "MMM", { locale: es })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.calDayGrid}>
                {period === "month" &&
                  (() => {
                    const firstDay =
                      (startOfMonth(calendarRef).getDay() + 6) % 7;
                    return Array.from({ length: firstDay }).map((_, i) => (
                      <View key={`e-${i}`} style={styles.calDay} />
                    ));
                  })()}
                {calendarDays.map((date, i) => {
                  const isSelected = isSameDay(date, selectedDate);
                  const isTodayDate = isToday(date);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.calDay,
                        isSelected && styles.calDaySelected,
                        isTodayDate &&
                          !isSelected && {
                            backgroundColor: C.surfaceSecondary,
                          },
                      ]}
                      onPress={() => handleSelectDay(date)}
                    >
                      {period === "week" ? (
                        <>
                          <Text
                            style={[
                              styles.calDayLabel,
                              {
                                color: isSelected ? Colors.white : C.textMuted,
                              },
                            ]}
                          >
                            {format(date, "EEE", { locale: es })}
                          </Text>
                          <Text
                            style={[
                              styles.calDayNum,
                              {
                                color: isSelected
                                  ? Colors.white
                                  : C.textPrimary,
                              },
                            ]}
                          >
                            {format(date, "d")}
                          </Text>
                        </>
                      ) : (
                        <Text
                          style={[
                            styles.calDayText,
                            {
                              color: isSelected
                                ? Colors.white
                                : isTodayDate
                                  ? C.primary
                                  : C.textPrimary,
                            },
                          ]}
                        >
                          {format(date, "d")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={[styles.calClose, { backgroundColor: C.background }]}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={[styles.calCloseText, { color: C.textSecondary }]}>
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },

  // Header fijo
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "bold" },
  calendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // Período fijo
  periodWrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 4,
  },
  periodRow: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    padding: 4,
    borderWidth: 1,
  },
  periodBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  periodBtnActive: { backgroundColor: Colors.primary },
  periodText: { fontSize: FontSize.sm, fontWeight: "500" },
  periodTextActive: { color: Colors.white },

  selectedPeriodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  selectedPeriodText: { flex: 1, fontSize: FontSize.sm, fontWeight: "500" },
  calendarHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    marginTop: 2,
  },
  calendarHintText: { fontSize: FontSize.xs },

  // KPIs
  kpiRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 4,
  },
  kpiLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
  kpiValue: { fontSize: FontSize.xl, fontWeight: "bold" },
  kpiSub: { fontSize: FontSize.sm },
  kpiHint: { fontSize: 10, marginTop: 2 },
  progressBg: { height: 4, borderRadius: 2, marginTop: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  healthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
  healthLabel: { fontSize: FontSize.xs, fontWeight: "600" },

  infoCard: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  infoText: { flex: 1, fontSize: FontSize.xs, lineHeight: 18 },

  chartCard: { marginTop: Spacing.sm },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  chartTitle: { fontSize: FontSize.lg, fontWeight: "600" },
  legendRow: { flexDirection: "row", gap: Spacing.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSize.xs },

  catList: { gap: Spacing.sm },
  catRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  catName: { width: 90, fontSize: FontSize.sm },
  catBarWrap: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  catBar: { height: "100%", borderRadius: 4 },
  catTotal: {
    width: 70,
    fontSize: FontSize.sm,
    fontWeight: "600",
    textAlign: "right",
  },

  tipCard: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
  },
  tipContent: { flex: 1 },
  tipTitle: {
    fontSize: FontSize.sm,
    fontWeight: "bold",
    color: Colors.white,
    marginBottom: 2,
  },
  tipText: {
    fontSize: FontSize.xs,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 18,
  },

  // Modal calendario
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  calendarSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  calTitle: { fontSize: FontSize.lg, fontWeight: "bold" },
  calSubtitle: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  calWeekRow: { flexDirection: "row", marginBottom: Spacing.sm },
  calWeekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  calDayGrid: { flexDirection: "row", flexWrap: "wrap" },
  calDay: {
    width: "14.28%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  calDayText: { fontSize: FontSize.xs, textAlign: "center" },
  calDaySelected: { backgroundColor: Colors.primary },
  calDaySelectedText: { color: Colors.white, fontWeight: "bold" },
  calDayLabel: {
    fontSize: 9,
    textAlign: "center",
    textTransform: "capitalize",
  },
  calDayNum: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  calMonthGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  calMonthItem: {
    width: "30%",
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  calMonthText: { fontSize: FontSize.sm, fontWeight: "500" },
  calClose: {
    marginTop: Spacing.lg,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  calCloseText: { fontSize: FontSize.md, fontWeight: "600" },
});
