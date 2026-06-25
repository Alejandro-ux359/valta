import { View, StyleSheet, ViewProps } from "react-native";
import { Colors, BorderRadius, Spacing } from "@/lib/constants/theme";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: number;
}

export function Card({ children, style, padding, ...props }: CardProps) {
  return (
    <View
      style={[styles.card, padding !== undefined && { padding }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
});
