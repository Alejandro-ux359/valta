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
import { useColors } from "@/lib/hooks/useColors";
import { addDebt } from "@/lib/database/debts";
import { scheduleDebtReminder } from "@/lib/notifications";
import { AmountInput } from "@/components/forms/AmountInput";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { CurrencySelector } from "@/components/forms/CurrencySelector";
import { useStore } from "@/lib/store/useStore";
import { ValidatedInput } from "@/components/forms/ValidatedInput";
import { DatePickerField } from "@/components/forms/DatePickerField";

type DebtType = "payable" | "receivable";

export default function AddDebtModal() {
  const C = useColors();
  const [debtType, setDebtType] = useState<DebtType>("payable");
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [contactName, setContactName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
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
      if (debtType === "payable" && dueDate)
        await scheduleDebtReminder(contactName.trim(), num, dueDate);
      router.back();
    } catch {
      Alert.alert("Error", "No se pudo guardar la deuda");
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
          Agregar Deuda
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.label, { color: C.textSecondary }]}>
          Tipo de deuda
        </Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              { borderColor: C.border },
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
                { color: C.textSecondary },
                debtType === "payable" && { color: Colors.white },
              ]}
            >
              Debo yo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              { borderColor: C.border },
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
                { color: C.textSecondary },
                debtType === "receivable" && { color: Colors.white },
              ]}
            >
              Me deben
            </Text>
          </TouchableOpacity>
        </View>

        <AmountInput value={amount} onChange={setAmount} error={amountError} />
        <CurrencySelector
          selected={selectedCurrency}
          onSelect={setSelectedCurrency}
        />

        <Text style={[styles.label, { color: C.textSecondary }]}>
          Nombre del contacto
        </Text>
        <ValidatedInput
          icon="person"
          value={contactName}
          onChange={setContactName}
          placeholder="Ej: Juan Pérez"
          type="name"
          maxLength={50}
        />

        <Text style={[styles.label, { color: C.textSecondary }]}>
          Descripción
        </Text>
        <ValidatedInput
          icon="notes"
          value={description}
          onChange={setDescription}
          placeholder="Ej: Préstamo personal"
          type="description"
          maxLength={80}
        />

        <Text style={[styles.label, { color: C.textSecondary }]}>
          Fecha de vencimiento
        </Text>
        <DatePickerField
          value={dueDate}
          onChange={setDueDate}
          placeholder="Selecciona la fecha de vencimiento"
        />

        <View style={{ height: Spacing.xl }} />
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
  label: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  typeRow: { flexDirection: "row", gap: Spacing.sm },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
  },
  typeBtnDanger: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  typeBtnSuccess: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  typeBtnText: { fontSize: FontSize.md, fontWeight: "600" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  input: { flex: 1, fontSize: FontSize.md },
  footer: { padding: Spacing.md, borderTopWidth: 1 },
});
