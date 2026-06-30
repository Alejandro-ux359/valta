import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useColors } from "@/lib/hooks/useColors";
import { FontSize, Spacing, BorderRadius } from "@/lib/constants/theme";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DatePickerFieldProps {
  value: string; // formato 'yyyy-MM-dd'
  onChange: (date: string) => void;
  placeholder?: string;
}

export function DatePickerField({
  value,
  onChange,
  placeholder = "Selecciona una fecha",
}: DatePickerFieldProps) {
  const C = useColors();
  const [showPicker, setShowPicker] = useState(false);

  const dateObj = value ? new Date(value + "T00:00:00") : new Date();

  const handleChange = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === "ios"); // en iOS se mantiene abierto, en Android se cierra solo
    if (event.type === "dismissed") {
      setShowPicker(false);
      return;
    }
    if (selectedDate) {
      onChange(format(selectedDate, "yyyy-MM-dd"));
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.row, { borderColor: C.border }]}
        onPress={() => setShowPicker(true)}
      >
        <MaterialIcons name="event" size={20} color={C.textMuted} />
        <Text
          style={[styles.text, { color: value ? C.textPrimary : C.textMuted }]}
        >
          {value
            ? format(dateObj, "d 'de' MMMM yyyy", { locale: es })
            : placeholder}
        </Text>
        <MaterialIcons name="chevron-right" size={20} color={C.textMuted} />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
          minimumDate={new Date(2020, 0, 1)}
        />
      )}

      {Platform.OS === "ios" && showPicker && (
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: C.primary }]}
          onPress={() => setShowPicker(false)}
        >
          <Text style={styles.confirmText}>Confirmar fecha</Text>
        </TouchableOpacity>
      )}
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
  text: { flex: 1, fontSize: FontSize.md },
  confirmBtn: {
    marginTop: Spacing.sm,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  confirmText: { color: "#fff", fontSize: FontSize.sm, fontWeight: "600" },
});
