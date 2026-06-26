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
import { Colors, Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
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
  eachDayOfInterval as eachDay,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";

type Period = "week" | "month" | "year";

interface DayStats {
  income: number;
  expenses: number;
}

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
  const [period, setPeriod] = useState<Period>("month");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarRef, setCalendarRef] = useState<Date>(new Date());

  // Datos globales
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [categories, setCategories] = useState<CategoryTotal[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);

  // Datos del día/período seleccionado
  const [selectedStats, setSelectedStats] = useState<DayStats | null>(null);
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

  // ── Cargar stats para una fecha/período seleccionado ──
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
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expenses
       FROM transactions WHERE ${whereClause}`,
    )) as { income: number; expenses: number } | null;

    setSelectedStats({
      income: result?.income ?? 0,
      expenses: result?.expenses ?? 0,
    });
    setSelectedLabel(label);
  };

  // ── Días/meses para el calendario ──
  const getCalendarDays = () => {
    const ref = calendarRef;
    if (period === "week") {
      return eachDayOfInterval({
        start: startOfWeek(ref, { weekStartsOn: 1 }),
        end: endOfWeek(ref, { weekStartsOn: 1 }),
      });
    }
    if (period === "month") {
      return eachDay({ start: startOfMonth(ref), end: endOfMonth(ref) });
    }
    // year → meses
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

  // ── Métricas ──
  const displayIncome = selectedStats?.income ?? income;
  const displayExpenses = selectedStats?.expenses ?? expenses;
  const savingsRate =
    displayIncome > 0
      ? Math.round(((displayIncome - displayExpenses) / displayIncome) * 100)
      : 0;

  // Salud financiera: basada en tasa de ahorro + si gastos < ingresos
  const healthScore = Math.min(
    100,
    Math.max(
      0,
      displayIncome === 0
        ? 0
        : displayExpenses === 0
          ? 100
          : Math.round(
              (savingsRate > 0 ? Math.min(savingsRate * 1.5, 60) : 0) + // 60pts por ahorro
                (displayExpenses < displayIncome ? 30 : 0) + // 30pts por balance positivo
                (savingsRate >= 20 ? 10 : 0), // 10pts bonus por 20%+ ahorro
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Estadísticas</Text>
        <TouchableOpacity
          style={styles.calendarBtn}
          onPress={() => setShowCalendar(true)}
        >
          <MaterialIcons
            name="calendar-today"
            size={20}
            color={Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* ── Selector período ── */}
      <View style={styles.periodRow}>
        {(["week", "month", "year"] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => handlePeriodChange(p)}
          >
            <Text
              style={[
                styles.periodText,
                period === p && styles.periodTextActive,
              ]}
            >
              {p === "week" ? "Semana" : p === "month" ? "Mes" : "Año"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Label del período seleccionado ── */}
      {selectedLabel ? (
        <View style={styles.selectedPeriodRow}>
          <MaterialIcons name="event" size={14} color={Colors.primary} />
          <Text style={styles.selectedPeriodText}>{selectedLabel}</Text>
          <TouchableOpacity
            onPress={() => {
              setSelectedStats(null);
              setSelectedLabel("");
            }}
          >
            <MaterialIcons name="close" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.calendarHint}
          onPress={() => setShowCalendar(true)}
        >
          <MaterialIcons name="touch-app" size={14} color={Colors.textMuted} />
          <Text style={styles.calendarHintText}>
            Toca el calendario para filtrar por{" "}
            {period === "week" ? "semana" : period === "month" ? "mes" : "año"}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── KPIs ── */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>INGRESOS TOTALES</Text>
          <Text style={[styles.kpiValue, { color: Colors.success }]}>
            ${displayIncome.toFixed(2)}
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>GASTOS TOTALES</Text>
          <Text style={[styles.kpiValue, { color: Colors.danger }]}>
            ${displayExpenses.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.kpiRow}>
        {/* Tasa de ahorro */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>TASA DE AHORRO</Text>
          <Text
            style={[
              styles.kpiValue,
              { color: savingsRate >= 0 ? Colors.primary : Colors.danger },
            ]}
          >
            {savingsRate}%
          </Text>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(Math.abs(savingsRate), 100)}%`,
                  backgroundColor:
                    savingsRate >= 0 ? Colors.primary : Colors.danger,
                },
              ]}
            />
          </View>
          <Text style={styles.kpiHint}>
            {savingsRate >= 20
              ? "✓ Meta de ahorro alcanzada"
              : savingsRate >= 0
                ? "Intenta ahorrar más del 20%"
                : "Gastos superan tus ingresos"}
          </Text>
        </View>

        {/* Salud financiera */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>SALUD FINANCIERA</Text>
          <Text style={[styles.kpiValue, { color: Colors.textPrimary }]}>
            {healthScore}
            <Text style={styles.kpiSub}> /100</Text>
          </Text>
          <View style={styles.healthRow}>
            <View
              style={[styles.healthDot, { backgroundColor: healthColor }]}
            />
            <Text style={[styles.healthLabel, { color: healthColor }]}>
              {healthLabel}
            </Text>
          </View>
          <Text style={styles.kpiHint}>
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

      {/* Explicación salud financiera */}
      <View style={styles.infoCard}>
        <MaterialIcons name="info-outline" size={16} color={Colors.primary} />
        <Text style={styles.infoText}>
          <Text style={{ fontWeight: "600" }}>Salud financiera</Text> se calcula
          en base a: tasa de ahorro (60pts) + balance positivo (30pts) + ahorro
          mayor al 20% (10pts).
          {"\n"}
          <Text style={{ fontWeight: "600" }}>Tasa de ahorro</Text> = (ingresos
          - gastos) / ingresos × 100
        </Text>
      </View>

      {/* ── Gráfica ── */}
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Ingresos vs Gastos</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: Colors.primary }]}
              />
              <Text style={styles.legendText}>Ingresos</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: Colors.border }]}
              />
              <Text style={styles.legendText}>Gastos</Text>
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

      {/* ── Gastos por categoría ── */}
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Gastos por Categoría</Text>
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
                <Text style={styles.catName}>{cat.category_name}</Text>
                <View style={styles.catBarWrap}>
                  <View
                    style={[
                      styles.catBar,
                      {
                        width: `${(cat.total / maxCategoryTotal) * 100}%`,
                        backgroundColor: cat.color || Colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.catTotal}>${cat.total.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* ── Sugerencia ── */}
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
          <View style={styles.calendarSheet}>
            {/* Cabecera del calendario */}
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
                  color={Colors.textPrimary}
                />
              </TouchableOpacity>

              <Text style={styles.calTitle}>
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
                  color={Colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.calSubtitle}>
              {period === "week"
                ? "Selecciona un día de la semana"
                : period === "month"
                  ? "Selecciona un día del mes"
                  : "Selecciona un mes del año"}
            </Text>

            {/* Días de la semana (header) - solo para week y month */}
            {period !== "year" && (
              <View style={styles.calWeekRow}>
                {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
                  <Text key={i} style={styles.calWeekDay}>
                    {d}
                  </Text>
                ))}
              </View>
            )}

            {/* Grid */}
            {period === "year" ? (
              // Meses del año
              <View style={styles.calMonthGrid}>
                {calendarDays.map((date, i) => {
                  const isSelected =
                    format(date, "yyyy-MM") === format(selectedDate, "yyyy-MM");
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.calMonthItem,
                        isSelected && styles.calDaySelected,
                      ]}
                      onPress={() => handleSelectDay(date)}
                    >
                      <Text
                        style={[
                          styles.calMonthText,
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
              // Días de semana o mes
              <View style={styles.calDayGrid}>
                {/* Offset para el primer día del mes */}
                {period === "month" &&
                  (() => {
                    const firstDay =
                      (startOfMonth(calendarRef).getDay() + 6) % 7;
                    return Array.from({ length: firstDay }).map((_, i) => (
                      <View key={`empty-${i}`} style={styles.calDay} />
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
                        isTodayDate && !isSelected && styles.calDayToday,
                      ]}
                      onPress={() => handleSelectDay(date)}
                    >
                      {period === "week" ? (
                        <>
                          <Text
                            style={[
                              styles.calDayLabel,
                              isSelected && styles.calDaySelectedText,
                              isTodayDate &&
                                !isSelected &&
                                styles.calDayTodayText,
                            ]}
                          >
                            {format(date, "EEE", { locale: es })}
                          </Text>
                          <Text
                            style={[
                              styles.calDayNum,
                              isSelected && styles.calDaySelectedText,
                              isTodayDate &&
                                !isSelected &&
                                styles.calDayTodayText,
                            ]}
                          >
                            {format(date, "d")}
                          </Text>
                        </>
                      ) : (
                        <Text
                          style={[
                            styles.calDayText,
                            isSelected && styles.calDaySelectedText,
                            isTodayDate &&
                              !isSelected &&
                              styles.calDayTodayText,
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
              style={styles.calClose}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.calCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
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
  calendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },

  periodRow: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  periodBtnActive: { backgroundColor: Colors.primary },
  periodText: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  periodTextActive: { color: Colors.white },

  selectedPeriodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: "#E3F2FD",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  selectedPeriodText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "500",
  },
  calendarHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  calendarHintText: { fontSize: FontSize.xs, color: Colors.textMuted },

  kpiRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 4,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  kpiValue: { fontSize: FontSize.xl, fontWeight: "bold" },
  kpiSub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  kpiHint: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  progressBg: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
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
    backgroundColor: "#E3F2FD",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: "#1565C0",
    lineHeight: 18,
  },

  chartCard: { marginTop: Spacing.sm },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  chartTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  legendRow: { flexDirection: "row", gap: Spacing.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSize.xs, color: Colors.textSecondary },

  catList: { gap: Spacing.sm },
  catRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  catName: { width: 90, fontSize: FontSize.sm, color: Colors.textPrimary },
  catBarWrap: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: "hidden",
  },
  catBar: { height: "100%", borderRadius: 4 },
  catTotal: {
    width: 70,
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
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
    backgroundColor: Colors.white,
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
  calTitle: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  calSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    textAlign: "center",
  },

  calWeekRow: { flexDirection: "row", marginBottom: Spacing.sm },
  calWeekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textMuted,
  },

  calDayGrid: { flexDirection: "row", flexWrap: "wrap" },
  calDay: {
    width: "14.28%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  calDayText: {
    fontSize: 10,
    color: Colors.textPrimary,
    textAlign: "center",
    lineHeight: 14,
  },
  calDaySelected: { backgroundColor: Colors.primary },
  calDaySelectedText: { color: Colors.white, fontWeight: "bold" },
  calDayToday: { backgroundColor: Colors.surfaceSecondary },
  calDayTodayText: { color: Colors.primary, fontWeight: "600" },

  calMonthGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  calMonthItem: {
    width: "30%",
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calMonthText: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    color: Colors.textPrimary,
  },

  calClose: {
    marginTop: Spacing.lg,
    alignItems: "center",
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
  },
  calCloseText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  calDayLabel: {
  fontSize: 9,
  color: Colors.textMuted,
  textAlign: 'center',
  textTransform: 'capitalize',
},
calDayNum: {
  fontSize: 13,
  fontWeight: '600',
  color: Colors.textPrimary,
  textAlign: 'center',
},
});
