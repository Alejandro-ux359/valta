import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";
import { Colors, FontSize } from "@/lib/constants/theme";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 120;

interface LineChartProps {
  data: number[];
  labels: string[];
  color?: string;
}

export function SimpleLineChart({
  data,
  labels,
  color = Colors.primary,
}: LineChartProps) {
  if (data.length < 2) return null;

  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * CHART_WIDTH;
      const y = CHART_HEIGHT - ((val - minVal) / range) * CHART_HEIGHT;
      return `${x},${y}`;
    })
    .join(" ");

  const dotPoints = data.map((val, i) => ({
    x: (i / (data.length - 1)) * CHART_WIDTH,
    y: CHART_HEIGHT - ((val - minVal) / range) * CHART_HEIGHT,
  }));

  return (
    <View>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 8}>
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {dotPoints.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={color} />
        ))}
      </Svg>
      <View style={styles.labels}>
        {labels.map((l, i) => (
          <Text key={i} style={styles.label}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary },
});
