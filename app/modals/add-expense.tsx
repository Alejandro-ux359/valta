import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
import {
  addTransaction,
  updateTransaction,
  getTransactions,
} from "@/lib/database/transactions";
import { sendLocalNotification } from "@/lib/notifications";
import { AmountInput } from "@/components/forms/AmountInput";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";

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
  // Si viene con ?id=X estamos editando
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [amountError, setAmountError] = useState("");
  const insets = useSafeAreaInsets();

  // Cargar datos si estamos editando
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditing ? "Editar Gasto" : "Agregar Gasto"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <AmountInput value={amount} onChange={setAmount} error={amountError} />

        <View style={styles.descRow}>
          <MaterialIcons name="notes" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.descInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Descripción (opcional)"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <Text style={styles.sectionLabel}>Categoría</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catItem,
                selectedCategory === cat.id && styles.catSelected,
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
              <Text style={styles.catName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}
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
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    paddingTop: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  content: { flex: 1, paddingHorizontal: Spacing.md },
  descRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.lg,
  },
  descInput: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
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
    borderColor: Colors.border,
  },
  catSelected: { borderColor: Colors.danger, backgroundColor: "#FFF5F5" },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  catName: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  footer: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
});
