import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
import { useColors } from "@/lib/hooks/useColors";
import { addTransaction } from "@/lib/database/transactions";
import { sendLocalNotification } from "@/lib/notifications";
import { AmountInput } from "@/components/forms/AmountInput";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { CurrencySelector } from "@/components/forms/CurrencySelector";
import { useStore } from "@/lib/store/useStore";

const INCOME_CATEGORIES = [
  { id: 10, name: "Salario", icon: "work", color: "#2E7D32" },
  { id: 11, name: "Freelance", icon: "laptop", color: "#1B5E20" },
  { id: 12, name: "Inversiones", icon: "trending-up", color: "#0D47A1" },
  { id: 13, name: "Otros", icon: "attach-money", color: "#33691E" },
];

export default function AddIncomeModal() {
  const C = useColors();
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const { currency: defaultCurrency } = useStore();
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);

  const handleSave = async () => {
    setAmountError("");
    if (!amount) {
      setAmountError("Ingresa un monto");
      return;
    }
    const num = parseFloat(amount.replace(",", "."));
    if (isNaN(num) || num <= 0) {
      setAmountError("Monto inválido");
      return;
    }
    if (!selectedCategory) {
      Alert.alert("Categoría", "Selecciona una categoría");
      return;
    }

    setLoading(true);
    try {
      await addTransaction({
        type: "income",
        amount: num,
        description,
        category_id: selectedCategory,
        date: format(new Date(), "yyyy-MM-dd"),
      });
      await sendLocalNotification(
        "💰 Ingreso registrado",
        `+$${num.toFixed(2)} en ${INCOME_CATEGORIES.find((c) => c.id === selectedCategory)?.name}`,
        "income",
      );
      router.back();
    } catch {
      Alert.alert("Error", "No se pudo guardar el ingreso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.white }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: C.white, borderBottomColor: C.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="close" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.textPrimary }]}>
          Agregar Ingreso
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AmountInput
          value={amount}
          onChange={setAmount}
          error={amountError}
          currency="$"
        />
        <CurrencySelector
          selected={selectedCurrency}
          onSelect={setSelectedCurrency}
        />

        <View style={[styles.inputRow, { borderColor: C.border }]}>
          <MaterialIcons name="notes" size={20} color={C.textMuted} />
          <TextInput
            style={[styles.input, { color: C.textPrimary }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descripción (opcional)"
            placeholderTextColor={C.textMuted}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>
          Categoría
        </Text>
        <View style={styles.grid}>
          {INCOME_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catItem,
                { borderColor: C.border },
                selectedCategory === cat.id && {
                  borderColor: Colors.success,
                  backgroundColor: C.surfaceSecondary,
                },
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <View
                style={[styles.catIcon, { backgroundColor: cat.color + "22" }]}
              >
                <MaterialIcons
                  name={cat.icon as any}
                  size={24}
                  color={cat.color}
                />
              </View>
              <Text style={[styles.catName, { color: C.textPrimary }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: C.white,
            borderTopColor: C.border,
            paddingBottom: insets.bottom + Spacing.sm,
          },
        ]}
      >
        <Button
          label={loading ? "Guardando..." : "Guardar Ingreso"}
          onPress={handleSave}
          loading={loading}
          variant="primary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    paddingTop: 56,
    borderBottomWidth: 1,
  },
  title: { fontSize: FontSize.lg, fontWeight: "bold" },
  content: { flex: 1, paddingHorizontal: Spacing.md },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.lg,
  },
  input: { flex: 1, fontSize: FontSize.md },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  catItem: {
    width: "45%",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  catName: { fontSize: FontSize.sm, fontWeight: "500" },
  footer: { padding: Spacing.md, borderTopWidth: 1 },
});
