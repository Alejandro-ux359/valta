import { View, Text, TextInput, StyleSheet } from "react-native";
import { Colors, FontSize, Spacing } from "@/lib/constants/theme";

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
  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Text style={styles.symbol}>{currency}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="0.00"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
          autoFocus
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", paddingVertical: Spacing.xl },
  row: { flexDirection: "row", alignItems: "center" },
  symbol: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.danger,
    marginRight: 4,
  },
  input: {
    fontSize: 52,
    fontWeight: "bold",
    color: Colors.textPrimary,
    minWidth: 120,
    textAlign: "center",
  },
  error: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    marginTop: Spacing.sm,
  },
});
