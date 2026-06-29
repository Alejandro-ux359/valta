import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useColors } from "@/lib/hooks/useColors";
import { useStore } from "@/lib/store/useStore";
import { FontSize, Spacing, BorderRadius } from "@/lib/constants/theme";

interface CurrencySelectorProps {
  selected: string;
  onSelect: (code: string) => void;
}

export function CurrencySelector({
  selected,
  onSelect,
}: CurrencySelectorProps) {
  const C = useColors();
  const { userCurrencies } = useStore();

  if (userCurrencies.length <= 1) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: C.textSecondary }]}>MONEDA</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {userCurrencies.map((cur) => (
          <TouchableOpacity
            key={cur.code}
            style={[
              styles.chip,
              { borderColor: C.border, backgroundColor: C.white },
              selected === cur.code && {
                borderColor: C.primary,
                backgroundColor: C.surfaceSecondary,
              },
            ]}
            onPress={() => onSelect(cur.code)}
          >
            <Text
              style={[
                styles.code,
                { color: selected === cur.code ? C.primary : C.textSecondary },
              ]}
            >
              {cur.code}
            </Text>
            <Text
              style={[
                styles.label2,
                { color: selected === cur.code ? C.primary : C.textMuted },
              ]}
            >
              {cur.symbol}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  row: { gap: Spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  code: { fontSize: FontSize.sm, fontWeight: "700" },
  label2: { fontSize: FontSize.xs },
});
