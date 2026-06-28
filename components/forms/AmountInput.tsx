import { View, Text, TextInput, StyleSheet } from "react-native";
import { FontSize, BorderRadius, Spacing } from "@/lib/constants/theme";
import { useColors } from "@/lib/hooks/useColors";

interface AmountInputProps {
  value: string;
  onChange: (val: string) => void;
  currency?: string;
  error?: string;
}

export function AmountInput({
  value,
  onChange,
  currency = "$",
  error,
}: AmountInputProps) {
  const C = useColors();

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Text style={[styles.symbol, { color: C.danger }]}>{currency}</Text>
        <TextInput
          style={[styles.input, { color: C.textPrimary }]}
          value={value}
          onChangeText={onChange}
          placeholder="0.00"
          placeholderTextColor={C.textMuted}
          keyboardType="decimal-pad"
          autoFocus
        />
      </View>
      {error ? (
        <Text style={[styles.error, { color: C.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", paddingVertical: Spacing.xl },
  row: { flexDirection: "row", alignItems: "center" },
  symbol: { fontSize: 32, fontWeight: "bold", marginRight: 4 },
  input: {
    fontSize: 52,
    fontWeight: "bold",
    minWidth: 120,
    textAlign: "center",
  },
  error: { fontSize: FontSize.sm, marginTop: Spacing.sm },
});