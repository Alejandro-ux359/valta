import { View, Text, StyleSheet } from "react-native";
import { FontSize, BorderRadius } from "@/lib/constants/theme";

type BadgeVariant = "success" | "danger" | "warning" | "info" | "neutral";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: "#E8F5E9", text: "#2E7D32" },
  danger: { bg: "#FFEBEE", text: "#C62828" },
  warning: { bg: "#FFF8E1", text: "#F57F17" },
  info: { bg: "#E3F2FD", text: "#1565C0" },
  neutral: { bg: "#F3F4F6", text: "#6B7280" },
};

export function Badge({ label, variant = "neutral" }: BadgeProps) {
  const { bg, text } = COLORS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  label: { fontSize: FontSize.xs, fontWeight: "600" },
});
