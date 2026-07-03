import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  // TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
import { useColors } from "@/lib/hooks/useColors";
import {
  addTransaction,
  updateTransaction,
  getTransactions,
} from "@/lib/database/transactions";
import { sendLocalNotification } from "@/lib/notifications";
import { AmountInput } from "@/components/forms/AmountInput";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { CurrencySelector } from "@/components/forms/CurrencySelector";
import { useStore } from "@/lib/store/useStore";
import { ValidatedInput } from "@/components/forms/ValidatedInput";

const CATEGORIES = [
  { id: 1, name: "Comida", icon: "restaurant", color: "#FF6B35" },
  { id: 2, name: "Vivienda", icon: "home", color: "#1565C0" },
  { id: 3, name: "Transporte", icon: "directions-bus", color: "#7B1FA2" },
  { id: 4, name: "Entretenim.", icon: "movie", color: "#00838F" },
  { id: 5, name: "Salud", icon: "local-hospital", color: "#D32F2F" },
  { id: 6, name: "Ropa", icon: "checkroom", color: "#5D4037" },
  { id: 7, name: "Agua", icon: "water-drop", color: "#0288D1" },
  { id: 8, name: "Electr.", icon: "bolt", color: "#F9A825" },
  { id: 9, name: "Otros", icon: "category", color: "#455A64" },
];

export default function AddExpenseModal() {
  const C = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const { currency: defaultCurrency } = useStore();
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [amountError, setAmountError] = useState("");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!id) return;
    async function loadTx() {
      const txs = await getTransactions(500);
      const tx = txs.find((t) => t.id === parseInt(id!));
      if (tx) {
        setAmount(tx.amount.toString());
        setDescription(tx.description ?? "");
        setSelectedCategory(tx.category_id);
      }
    }
    loadTx();
  }, [id]);

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
      if (isEditing) {
        await updateTransaction({
          id: parseInt(id!),
          type: "expense",
          amount: num,
          description,
          category_id: selectedCategory,
          date: format(new Date(), "yyyy-MM-dd"),
        });
      } else {
        await addTransaction({
          type: "expense",
          amount: num,
          description,
          category_id: selectedCategory,
          date: format(new Date(), "yyyy-MM-dd"),
          currency: selectedCurrency, // ← agrega solo esta línea
        });
        await sendLocalNotification(
          "💸 Gasto registrado",
          `$${num.toFixed(2)} en ${CATEGORIES.find((c) => c.id === selectedCategory)?.name}`,
          "expense",
        );
      }
      router.back();
    } catch {
      Alert.alert("Error", "No se pudo guardar el gasto");
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
          {isEditing ? "Editar Gasto" : "Agregar Gasto"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <AmountInput value={amount} onChange={setAmount} error={amountError} />

        <CurrencySelector
          selected={selectedCurrency}
          onSelect={setSelectedCurrency}
        />
        <ValidatedInput
          icon="notes"
          value={description}
          onChange={setDescription}
          placeholder="Descripción (opcional)"
          type="description"
          maxLength={80}
        />

        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>
          Categoría
        </Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catItem,
                { borderColor: C.border },
                selectedCategory === cat.id && {
                  borderColor: Colors.danger,
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
                  size={22}
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
          label={
            loading
              ? "Guardando..."
              : isEditing
                ? "Actualizar Gasto"
                : "Guardar Gasto"
          }
          onPress={handleSave}
          loading={loading}
          variant="danger"
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
  descRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.lg,
  },
  descInput: { flex: 1, fontSize: FontSize.md },
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
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  catItem: {
    width: "30%",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  catName: { fontSize: FontSize.xs, textAlign: "center" },
  footer: { padding: Spacing.md, paddingBottom: Spacing.sm, borderTopWidth: 1 },
});
