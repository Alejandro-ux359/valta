import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { MonthlyBarChart } from "@/components/charts/BarChart";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

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
  const [period, setPeriod] = useState<Period>("month");
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [categories, setCategories] = useState<CategoryTotal[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);

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

  const savingsRate =
    income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const healthScore = Math.min(100, Math.max(0, savingsRate + 50));

  const maxCategoryTotal = Math.max(...categories.map((c) => c.total), 1);

  const barData = monthly.map((m) => ({
    label: MONTH_LABELS[m.month] ?? m.month,
    income: m.income,
    expenses: m.expenses,
  }));

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Estadísticas</Text>
        <TouchableOpacity>
          <MaterialIcons
            name="calendar-today"
            size={22}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Selector de período */}
      <View style={styles.periodRow}>
        {(["week", "month", "year"] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
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

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>INGRESOS TOTALES</Text>
          <Text style={[styles.kpiValue, { color: Colors.success }]}>
            ${income.toFixed(2)}
          </Text>
          <Text style={styles.kpiChange}>+12.4%</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>GASTOS TOTALES</Text>
          <Text style={[styles.kpiValue, { color: Colors.danger }]}>
            ${expenses.toFixed(2)}
          </Text>
          <Text style={[styles.kpiChange, { color: Colors.danger }]}>
            +2.1%
          </Text>
        </View>
      </View>

      <View style={styles.kpiRow}>
        {/* Tasa de ahorro */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>TASA DE AHORRO</Text>
          <Text style={[styles.kpiValue, { color: Colors.primary }]}>
            {savingsRate}%
          </Text>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(savingsRate, 100)}%` },
              ]}
            />
          </View>
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
              style={[
                styles.healthDot,
                {
                  backgroundColor:
                    healthScore >= 70
                      ? Colors.success
                      : healthScore >= 40
                        ? Colors.warning
                        : Colors.danger,
                },
              ]}
            />
            <Text style={styles.healthLabel}>
              {healthScore >= 70
                ? "Excelente"
                : healthScore >= 40
                  ? "Regular"
                  : "Mejorar"}
            </Text>
          </View>
        </View>
      </View>

      {/* Gráfica comparativa */}
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

      {/* Gastos por categoría */}
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Gastos por Categoría</Text>

        {categories.length === 0 ? (
          <EmptyState
            icon="pie-chart"
            title="Sin datos"
            subtitle="Sin gastos registrados este mes"
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

      {/* Distribución */}
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Distribución</Text>
        <View style={styles.distRow}>
          {/* Gráfico de dona simple con vistas */}
          <View style={styles.donutWrap}>
            <View style={[styles.donutOuter, { borderColor: Colors.primary }]}>
              <View
                style={[styles.donutInner, { borderColor: Colors.success }]}
              >
                <View
                  style={[styles.donutCore, { borderColor: Colors.danger }]}
                >
                  <Text style={styles.donutText}>100%</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.distLegend}>
            {[
              { color: Colors.primary, label: "Fijos", pct: "60%" },
              { color: Colors.success, label: "Ahorro", pct: "25%" },
              { color: Colors.danger, label: "Ocio", pct: "15%" },
            ].map((item, i) => (
              <View key={i} style={styles.distItem}>
                <View
                  style={[styles.distDot, { backgroundColor: item.color }]}
                />
                <Text style={styles.distLabel}>
                  {item.label} ({item.pct})
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      {/* Sugerencia */}
      {expenses > income * 0.5 && (
        <View style={styles.tipCard}>
          <MaterialIcons name="lightbulb" size={20} color={Colors.white} />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Sugerencia de ahorro</Text>
            <Text style={styles.tipText}>
              Tus gastos superan el 50% de tus ingresos este mes. Considera
              revisar tus gastos en la categoría más alta.
            </Text>
          </View>
        </View>
      )}

      <View style={{ height: Spacing.xl }} />
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
  kpiChange: {
    fontSize: FontSize.xs,
    color: Colors.success,
    fontWeight: "500",
  },
  progressBg: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    marginTop: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  healthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
  healthLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
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
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  donutWrap: {
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  donutOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  donutInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  donutCore: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  donutText: {
    fontSize: FontSize.xs,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  distLegend: { gap: Spacing.sm },
  distItem: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  distDot: { width: 10, height: 10, borderRadius: 5 },
  distLabel: { fontSize: FontSize.sm, color: Colors.textPrimary },
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
});
