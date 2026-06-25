import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors, FontSize, Spacing, BorderRadius } from "@/lib/constants/theme";
import { useStore } from "@/lib/store/useStore";

interface BalanceCardProps {
  balance: number;
  income: number;
  expenses: number;
  savings: number;
}

export function BalanceCard({
  balance,
  income,
  expenses,
  savings,
}: BalanceCardProps) {
  const { currency } = useStore();

  return (
    <View style={styles.wrapper}>
      {/* Tarjeta con gradiente */}
      <LinearGradient
        colors={["#1565C0", "#1E88E5", "#00BCD4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Círculos decorativos */}
        <View style={styles.circleTopRight} />
        <View style={styles.circleBottomLeft} />

        {/* Contenido de la tarjeta */}
        <View style={styles.cardContent}>
          {/* Símbolo y monto */}
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>$</Text>
            <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
              {Math.abs(balance).toFixed(2)}
            </Text>
          </View>

          {/* Fila inferior: barra + moneda */}
          <View style={styles.cardBottom}>
            <View style={styles.progressRow}>
              <MaterialIcons
                name="trending-up"
                size={14}
                color="rgba(255,255,255,0.9)"
              />
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(Math.abs(balance > 0 ? 70 : 30), 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyText}>{currency}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Stats separados debajo */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <MaterialIcons name="arrow-upward" size={18} color={Colors.success} />
          <Text style={styles.statLabel}>Ingresos</Text>
          <Text style={styles.statValue}>${income.toFixed(2)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <MaterialIcons
            name="arrow-downward"
            size={18}
            color={Colors.danger}
          />
          <Text style={styles.statLabel}>Gastos</Text>
          <Text style={styles.statValue}>${expenses.toFixed(2)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <MaterialIcons name="savings" size={18} color={Colors.primary} />
          <Text style={styles.statLabel}>Ahorros</Text>
          <Text style={styles.statValue}>${savings.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    minHeight: 140,
    overflow: "hidden",
  },
  circleTopRight: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -50,
    right: -30,
  },
  circleBottomLeft: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -40,
    left: -20,
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: Spacing.md,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.white,
    marginTop: 6,
  },
  amount: {
    fontSize: 44,
    fontWeight: "bold",
    color: Colors.white,
    flex: 1,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: Spacing.md,
  },
  progressBg: {
    flex: 1,
    height: 5,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 3,
  },
  currencyBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  currencyText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
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
});
