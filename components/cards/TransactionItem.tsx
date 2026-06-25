import { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Colors, FontSize, Spacing } from "@/lib/constants/theme";
import { Transaction } from "@/lib/database/transactions";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 160;

interface TransactionItemProps {
  transaction: Transaction;
  onEdit?: () => void;
  onDelete?: () => void;
  onPress?: () => void;
}

export function TransactionItem({
  transaction: tx,
  onEdit,
  onDelete,
  onPress,
}: TransactionItemProps) {
  const isIncome = tx.type === "income";
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);
  const categoryColor = tx.category_color ?? "#1565C0";

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dy) < 20,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) {
          translateX.setValue(Math.max(gesture.dx, -ACTION_WIDTH));
        } else if (isOpen.current) {
          translateX.setValue(Math.min(-ACTION_WIDTH + gesture.dx, 0));
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -ACTION_WIDTH,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
          isOpen.current = true;
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
          isOpen.current = false;
        }
      },
    }),
  ).current;

  const closeSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    isOpen.current = false;
  };

  return (
    <View style={styles.container}>
      {/* Barra de color — absoluta, ocupa todo el alto del item */}
      <View style={[styles.colorBar, { backgroundColor: categoryColor }]} />

      {/* Botones de acción detrás */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            closeSwipe();
            onEdit?.();
          }}
        >
          <MaterialIcons name="edit" size={22} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => {
            closeSwipe();
            onDelete?.();
          }}
        >
          <MaterialIcons name="delete" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Fila principal deslizable */}
      <Animated.View
        style={[styles.row, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.rowInner}
          onPress={() => {
            if (isOpen.current) {
              closeSwipe();
            } else {
              onPress?.();
            }
          }}
          activeOpacity={0.8}
        >
          <View
            style={[styles.iconWrap, { backgroundColor: categoryColor + "22" }]}
          >
            <MaterialIcons
              name={(tx.category_icon as any) ?? "category"}
              size={20}
              color={categoryColor}
            />
          </View>

          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {tx.description || tx.category_name || "Sin descripción"}
            </Text>
            <Text style={styles.date}>
              {format(new Date(tx.date), "d MMM yyyy", { locale: es })}
              {tx.from_sms === 1 && <Text style={styles.smsTag}> · SMS</Text>}
            </Text>
          </View>

          <Text
            style={[
              styles.amount,
              { color: isIncome ? Colors.success : Colors.danger },
            ]}
          >
            {isIncome ? "+" : "-"}${tx.amount.toFixed(2)}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  colorBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 2,
  },
  actionsContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    flexDirection: "row",
  },
  editBtn: {
    flex: 1,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    backgroundColor: Colors.white,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: Spacing.md + 6,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, marginLeft: Spacing.sm },
  name: { fontSize: FontSize.md, fontWeight: "500", color: Colors.textPrimary },
  date: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  smsTag: { color: Colors.primary, fontWeight: "600" },
  amount: { fontSize: FontSize.md, fontWeight: "bold" },
});
