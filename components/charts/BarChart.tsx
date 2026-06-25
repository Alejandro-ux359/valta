import { View, Text, StyleSheet } from "react-native";
import { Colors, FontSize } from "@/lib/constants/theme";

interface BarData {
  label: string;
  income: number;
  expenses: number;
}

interface BarChartProps {
  data: BarData[];
}

export function MonthlyBarChart({ data }: BarChartProps) {
  const maxValue = Math.max(...data.flatMap((d) => [d.income, d.expenses]), 1);

  return (
    <View style={styles.container}>
      {data.map((item, i) => (
        <View key={i} style={styles.group}>
          <View style={styles.bars}>
            <View style={styles.barWrap}>
              <View
                style={[
                  styles.bar,
                  {
                    height: (item.income / maxValue) * 100,
                    backgroundColor: Colors.primary,
                  },
                ]}
              />
            </View>
            <View style={styles.barWrap}>
              <View
                style={[
                  styles.bar,
                  {
                    height: (item.expenses / maxValue) * 100,
                    backgroundColor: Colors.border,
                  },
                ]}
              />
            </View>
          </View>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 120,
    paddingBottom: 24,
  },
  group: { alignItems: "center", flex: 1 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 100 },
  barWrap: { alignItems: "center", justifyContent: "flex-end", height: 100 },
  bar: { width: 14, borderRadius: 4, minHeight: 4 },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
});
