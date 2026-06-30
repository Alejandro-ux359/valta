import { View, Text, TextInput, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/lib/hooks/useColors";
import { FontSize, Spacing, BorderRadius } from "@/lib/constants/theme";

type ValidationType = "name" | "description" | "number";

interface ValidatedInputProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  type: ValidationType;
  maxLength?: number;
}

// Filtra el texto según el tipo de campo
function sanitize(text: string, type: ValidationType): string {
  switch (type) {
    case "name":
      // Solo letras, números y espacios
      return text.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, "");
    case "description":
      // Letras, números, espacios y los símbolos permitidos
      return text.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s!#$%()?¿¡]/g, "");
    case "number":
      // Solo dígitos
      return text.replace(/[^0-9]/g, "");
    default:
      return text;
  }
}

export function ValidatedInput({
  icon,
  value,
  onChange,
  placeholder,
  type,
  maxLength,
}: ValidatedInputProps) {
  const C = useColors();

  return (
    <View style={[styles.row, { borderColor: C.border }]}>
      <MaterialIcons name={icon} size={20} color={C.textMuted} />
      <TextInput
        style={[styles.input, { color: C.textPrimary }]}
        value={value}
        onChangeText={(text) => onChange(sanitize(text, type))}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        keyboardType={type === "number" ? "number-pad" : "default"}
        maxLength={maxLength}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  input: { flex: 1, fontSize: FontSize.md },
});
