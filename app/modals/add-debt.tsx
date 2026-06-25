import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
import { addDebt } from "@/lib/database/debts";
import { scheduleDebtReminder } from "@/lib/notifications";
import { AmountInput } from "@/components/forms/AmountInput";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";

type DebtType = "payable" | "receivable";

export default function AddDebtModal() {
  const [debtType, setDebtType] = useState<DebtType>("payable");
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [contactName, setContactName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

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
    if (!contactName.trim()) {
      Alert.alert("Nombre", "Ingresa el nombre del contacto");
      return;
    }

    setLoading(true);
    try {
      await addDebt({
        type: debtType,
        contact_name: contactName.trim(),
        amount: num,
        description: description.trim(),
        due_date: dueDate || format(new Date(), "yyyy-MM-dd"),
        status: "pending",
      });

      if (debtType === "payable" && dueDate) {
        await scheduleDebtReminder(contactName.trim(), num, dueDate);
      }

      router.back();
    } catch {
      Alert.alert("Error", "No se pudo guardar la deuda");
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
        <Text style={styles.title}>Agregar Deuda</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Tipo de deuda */}
        <Text style={styles.label}>Tipo de deuda</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              debtType === "payable" && styles.typeBtnDanger,
            ]}
            onPress={() => setDebtType("payable")}
          >
            <MaterialIcons
              name="arrow-upward"
              size={18}
              color={debtType === "payable" ? Colors.white : Colors.danger}
            />
            <Text
              style={[
                styles.typeBtnText,
                debtType === "payable" && { color: Colors.white },
              ]}
            >
              Debo yo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeBtn,
              debtType === "receivable" && styles.typeBtnSuccess,
            ]}
            onPress={() => setDebtType("receivable")}
          >
            <MaterialIcons
              name="arrow-downward"
              size={18}
              color={debtType === "receivable" ? Colors.white : Colors.success}
            />
            <Text
              style={[
                styles.typeBtnText,
                debtType === "receivable" && { color: Colors.white },
              ]}
            >
              Me deben
            </Text>
          </TouchableOpacity>
        </View>

        {/* Monto */}
        <AmountInput value={amount} onChange={setAmount} error={amountError} />

        {/* Nombre */}
        <Text style={styles.label}>Nombre del contacto</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="person" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.input}
            value={contactName}
            onChangeText={setContactName}
            placeholder="Ej: Juan Pérez"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Descripción */}
        <Text style={styles.label}>Descripción</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="notes" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Ej: Préstamo personal"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Fecha */}
        <Text style={styles.label}>Fecha de vencimiento</Text>
        <View style={styles.inputRow}>
          <MaterialIcons name="event" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.input}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD  Ej: 2025-01-31"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Footer respetando área segura */}
      <View
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}
      >
        <Button
          label={loading ? "Guardando..." : "Guardar Deuda"}
          onPress={handleSave}
          loading={loading}
          variant={debtType === "payable" ? "danger" : "primary"}
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
  label: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  typeBtnDanger: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  typeBtnSuccess: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  typeBtnText: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  input: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
});
