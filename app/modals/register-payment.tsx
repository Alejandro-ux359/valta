import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
import { getDebts, markDebtAsPaid } from "@/lib/database/debts";
import { Debt } from "@/components/cards/DebtItem";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { sendLocalNotification } from "@/lib/notifications";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function RegisterPaymentModal() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const loadDebts = useCallback(async () => {
    const all = await getDebts();
    // Solo mostrar las pendientes/vencidas
    setDebts(all.filter((d) => d.status !== "paid"));
  }, []);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  const handlePay = async () => {
    if (!selected) {
      Alert.alert("Selecciona", "Elige una deuda para marcar como pagada");
      return;
    }
    const debt = debts.find((d) => d.id === selected);
    if (!debt) return;

    setLoading(true);
    try {
      await markDebtAsPaid(selected);
      await sendLocalNotification(
        "✅ Pago registrado",
        `Deuda con ${debt.contact_name} por $${debt.amount.toFixed(2)} marcada como pagada`,
        "payment",
      );
      router.back();
    } catch {
      Alert.alert("Error", "No se pudo registrar el pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Registrar Pago</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Subtítulo */}
      <View style={styles.subtitleRow}>
        <MaterialIcons name="info-outline" size={16} color={Colors.textMuted} />
        <Text style={styles.subtitle}>
          Selecciona la deuda que deseas marcar como pagada
        </Text>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {debts.length === 0 ? (
          <EmptyState
            icon="check-circle"
            title="Sin deudas pendientes"
            subtitle="No tienes deudas por pagar en este momento"
          />
        ) : (
          debts.map((debt) => {
            const isSelected = selected === debt.id;
            const isPayable = debt.type === "payable";

            return (
              <TouchableOpacity
                key={debt.id}
                style={[styles.debtCard, isSelected && styles.debtCardSelected]}
                onPress={() => setSelected(debt.id ?? null)}
                activeOpacity={0.8}
              >
                {/* Selector circular */}
                <View
                  style={[styles.selector, isSelected && styles.selectorActive]}
                >
                  {isSelected && (
                    <MaterialIcons
                      name="check"
                      size={14}
                      color={Colors.white}
                    />
                  )}
                </View>

                {/* Avatar con iniciales */}
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: isPayable ? "#FFEBEE" : "#E8F5E9" },
                  ]}
                >
                  <Text
                    style={[
                      styles.initials,
                      { color: isPayable ? Colors.danger : Colors.success },
                    ]}
                  >
                    {debt.contact_name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.info}>
                  <Text style={styles.contactName}>{debt.contact_name}</Text>
                  <Text style={styles.debtDesc} numberOfLines={1}>
                    {debt.description || "Sin descripción"}
                  </Text>
                  {debt.due_date && (
                    <View style={styles.dateRow}>
                      <MaterialIcons
                        name="event"
                        size={12}
                        color={Colors.textMuted}
                      />
                      <Text style={styles.dateText}>
                        Vence{" "}
                        {format(new Date(debt.due_date), "d MMM yyyy", {
                          locale: es,
                        })}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Monto + badge */}
                <View style={styles.right}>
                  <Text
                    style={[
                      styles.amount,
                      { color: isPayable ? Colors.danger : Colors.success },
                    ]}
                  >
                    {isPayable ? "-" : "+"}${debt.amount.toFixed(2)}
                  </Text>
                  <Badge
                    label={debt.status === "overdue" ? "VENCIDO" : "PENDIENTE"}
                    variant={debt.status === "overdue" ? "danger" : "warning"}
                  />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Footer */}
      {debts.length > 0 && (
        <View
          style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}
        >
          {selected && (
            <View style={styles.selectedSummary}>
              <MaterialIcons
                name="check-circle"
                size={16}
                color={Colors.success}
              />
              <Text style={styles.selectedText}>
                {debts.find((d) => d.id === selected)?.contact_name} — $
                {debts.find((d) => d.id === selected)?.amount.toFixed(2)}
              </Text>
            </View>
          )}
          <Button
            label={loading ? "Registrando..." : "Confirmar Pago"}
            onPress={handlePay}
            loading={loading}
            variant="primary"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    paddingTop: 56,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    flex: 1,
  },
  list: {
    flex: 1,
    paddingTop: Spacing.sm,
  },
  debtCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: "transparent",
    gap: Spacing.sm,
  },
  debtCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#F0F4FF",
  },
  selector: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: FontSize.md,
    fontWeight: "bold",
  },
  info: { flex: 1 },
  contactName: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  debtDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  dateText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: "bold",
  },
  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  selectedSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#E8F5E9",
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  selectedText: {
    fontSize: FontSize.sm,
    color: Colors.success,
    fontWeight: "500",
    flex: 1,
  },
});
