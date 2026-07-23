import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
  FlatList,
  Modal,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
import { useColors } from "@/lib/hooks/useColors";
import {
  getSummariesForCurrencies,
  getTransactions,
  deleteTransaction,
  Transaction,
  Summary,
} from "@/lib/database/transactions";
import { getCardsByCurrency, Card } from "@/lib/database/cards";
import { getUnreadCount } from "@/lib/notifications";
import { useStore } from "@/lib/store/useStore";
import { TransactionItem } from "@/components/cards/TransactionItem";
import { EmptyState } from "@/components/ui/EmptyState";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - Spacing.md * 2;

const EMPTY_SUMMARY: Summary = {
  balance: 0,
  income: 0,
  expenses: 0,
  savings: 0,
};

const TYPE_LABEL: Record<string, string> = {
  personal: "Personal",
  savings: "Ahorro",
  business: "Negocio",
};

const QUICK_ACTIONS = [
  {
    icon: "add-shopping-cart",
    label: "Agregar\nGasto",
    route: "/modals/add-expense",
    color: "#FFEBEE",
    iconColor: "#C62828",
  },
  {
    icon: "attach-money",
    label: "Agregar\nIngreso",
    route: "/modals/add-income",
    color: "#E8F5E9",
    iconColor: "#2E7D32",
  },
  {
    icon: "account-balance",
    label: "Agregar\nDeuda",
    route: "/modals/add-debt",
    color: "#E3F2FD",
    iconColor: "#1565C0",
  },
  {
    icon: "credit-card",
    label: "Mis\nPagos",
    route: "/modals/register-payment",
    color: "#FFF8E1",
    iconColor: "#F57F17",
  },
] as const;

export default function DashboardScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [summariesByCurrency, setSummariesByCurrency] = useState<
    Record<string, Summary>
  >({});
  const [cardsByCurrency, setCardsByCurrency] = useState<
    Record<string, Card[]>
  >({});
  const [showCardMenu, setShowCardMenu] = useState(false);
  const [menuCurrency, setMenuCurrency] = useState("");

  const {
    setSummary,
    setUnreadNotifications,
    isDarkMode,
    currency,
    userCurrencies,
    unreadNotifications,
    activeCardByCurrency,
    setActiveCard,
  } = useStore();

  const loadData = useCallback(async () => {
    const codes = userCurrencies.map((c) => c.code);

    const [summaries, txs, unread] = await Promise.all([
      getSummariesForCurrencies(codes),
      getTransactions(8),
      getUnreadCount(),
    ]);

    // Cargar tarjetas por cada moneda
    const cardMap: Record<string, Card[]> = {};
    for (const code of codes) {
      const cards = await getCardsByCurrency(code);
      cardMap[code] = cards;
      // Si no hay tarjeta activa para esta moneda, usar la primera
      if (!activeCardByCurrency[code] && cards[0]?.id) {
        setActiveCard(code, cards[0].id);
      }
    }

    setCardsByCurrency(cardMap);
    setSummariesByCurrency(summaries);
    setSummary(summaries[currency] ?? EMPTY_SUMMARY);
    setRecentTxs(txs);
    setUnreadNotifications(unread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, userCurrencies]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleDelete = (id: number) => {
    Alert.alert("Eliminar", "¿Eliminar esta transacción?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          await deleteTransaction(id);
          await loadData();
        },
      },
    ]);
  };

  const getActiveCard = (code: string): Card | null => {
    const cards = cardsByCurrency[code] ?? [];
    const activeId = activeCardByCurrency[code];
    return cards.find((c) => c.id === activeId) ?? cards[0] ?? null;
  };

  const actionColors = isDarkMode
    ? [
        { bg: "#3D1A1A", icon: "#EF5350" },
        { bg: "#1A3D1A", icon: "#4CAF50" },
        { bg: "#1A2744", icon: "#42A5F5" },
        { bg: "#3D2E0A", icon: "#FFA726" },
      ]
    : [
        { bg: "#FFEBEE", icon: "#C62828" },
        { bg: "#E8F5E9", icon: "#2E7D32" },
        { bg: "#E3F2FD", icon: "#1565C0" },
        { bg: "#FFF8E1", icon: "#F57F17" },
      ];

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* ── HEADER FIJO ── */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.appName}>Valta</Text>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => router.push("/modals/notifications" as any)}
        >
          <View>
            <MaterialIcons
              name="notifications"
              size={26}
              color={Colors.white}
            />
            {unreadNotifications > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadData();
              setRefreshing(false);
            }}
          />
        }
      >
        {/* ── TARJETAS ── */}
        <View style={[styles.cardWrapper, { backgroundColor: Colors.primary }]}>
          <FlatList
            data={userCurrencies}
            keyExtractor={(item) => item.code}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToAlignment="center"
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(
                e.nativeEvent.contentOffset.x / CARD_WIDTH,
              );
              setCardIndex(idx);
            }}
            renderItem={({ item: cur }) => {
              const activeCard = getActiveCard(cur.code);
              const balance = activeCard?.balance ?? 0;
              const isNegative = balance < 0;
              const cardColor = activeCard?.color ?? "#1565C0";

              return (
                <LinearGradient
                  colors={[cardColor, cardColor + "CC", "#00ACC1", "#00BCD4"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.card}
                >
                  <View style={styles.circle1} />
                  <View style={styles.circle2} />

                  {/* Fila superior: nombre tarjeta + 3 puntos */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardNameWrap}>
                      <MaterialIcons
                        name={
                          (activeCard?.icon ?? "account-balance-wallet") as any
                        }
                        size={14}
                        color="rgba(255,255,255,0.85)"
                      />
                      <Text style={styles.cardName}>
                        {activeCard?.name ?? cur.code}
                      </Text>
                      {activeCard?.type ? (
                        <View style={styles.cardTypePill}>
                          <Text style={styles.cardTypePillText}>
                            {TYPE_LABEL[activeCard.type]}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* 3 puntos */}
                    <TouchableOpacity
                      style={styles.cardMenuBtn}
                      onPress={() => {
                        setMenuCurrency(cur.code);
                        setShowCardMenu(true);
                      }}
                    >
                      <MaterialIcons
                        name="more-vert"
                        size={22}
                        color={Colors.white}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Monto */}
                  <View style={styles.cardAmountRow}>
                    <Text
                      style={[
                        styles.cardSymbol,
                        isNegative && { color: "#FFCDD2" },
                      ]}
                    >
                      {cur.symbol}
                    </Text>
                    <Text
                      style={[
                        styles.cardAmount,
                        isNegative && { color: "#FFCDD2" },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {isNegative ? "-" : ""}
                      {Math.abs(balance).toFixed(2)}
                    </Text>
                  </View>

                  {/* Barra inferior */}
                  <View style={styles.cardBottom}>
                    <View style={styles.trendRow}>
                      <MaterialIcons
                        name={balance >= 0 ? "trending-up" : "trending-down"}
                        size={16}
                        color="rgba(255,255,255,0.9)"
                      />
                      <View style={styles.progressBg}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: balance !== 0 ? "65%" : "10%" },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.currencyBadge}>
                      <Text style={styles.currencyText}>{cur.code}</Text>
                    </View>
                  </View>
                </LinearGradient>
              );
            }}
          />

          {/* Dots */}
          {userCurrencies.length > 1 && (
            <View style={styles.dotsRow}>
              {userCurrencies.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === cardIndex
                          ? Colors.white
                          : "rgba(255,255,255,0.35)",
                      width: i === cardIndex ? 16 : 6,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── CONTENIDO ── */}
        <View style={[styles.content, { backgroundColor: C.background }]}>
          {/* Stats de la tarjeta activa */}
          {(() => {
            const curCode = userCurrencies[cardIndex]?.code ?? currency;
            const activeCard = getActiveCard(curCode);
            return (
              <View style={[styles.statsCard, { backgroundColor: C.white }]}>
                <View style={styles.statItem}>
                  <MaterialIcons
                    name="arrow-upward"
                    size={20}
                    color="#2E7D32"
                  />
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>
                    Ingresos
                  </Text>
                  <Text style={[styles.statValue, { color: C.textPrimary }]}>
                    ${(activeCard?.income ?? 0).toFixed(2)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statDivider,
                    { backgroundColor: C.borderLight },
                  ]}
                />
                <View style={styles.statItem}>
                  <MaterialIcons
                    name="arrow-downward"
                    size={20}
                    color="#C62828"
                  />
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>
                    Gastos
                  </Text>
                  <Text style={[styles.statValue, { color: C.textPrimary }]}>
                    ${(activeCard?.expenses ?? 0).toFixed(2)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statDivider,
                    { backgroundColor: C.borderLight },
                  ]}
                />
                <View style={styles.statItem}>
                  <MaterialIcons name="savings" size={20} color="#1565C0" />
                  <Text style={[styles.statLabel, { color: C.textSecondary }]}>
                    Ahorros
                  </Text>
                  <Text style={[styles.statValue, { color: C.textPrimary }]}>
                    ${Math.max(0, activeCard?.balance ?? 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* Acciones rápidas */}
          <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
            Acciones rápidas
          </Text>
          <View style={styles.actionsRow}>
            {QUICK_ACTIONS.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.actionBtn,
                  { backgroundColor: actionColors[i].bg },
                ]}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={action.icon as any}
                  size={24}
                  color={actionColors[i].icon}
                />
                <Text style={[styles.actionLabel, { color: C.textPrimary }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transacciones recientes */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
              Transacciones Recientes
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/expenses")}>
              <Text style={styles.viewAll}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.txCard, { backgroundColor: C.white }]}>
            {recentTxs.length === 0 ? (
              <EmptyState
                icon="receipt-long"
                title="Sin transacciones"
                subtitle="Agrega tu primer gasto o ingreso"
              />
            ) : (
              recentTxs.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  onDelete={() => tx.id && handleDelete(tx.id)}
                  onEdit={() =>
                    router.push(`/modals/add-expense?id=${tx.id}` as any)
                  }
                />
              ))
            )}
          </View>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* ── MODAL MENÚ 3 PUNTOS ── */}
      <Modal
        visible={showCardMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCardMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowCardMenu(false)}
        >
          <View style={[styles.menuSheet, { backgroundColor: C.white }]}>
            {/* Tarjeta activa seleccionada */}
            {(() => {
              const activeCard = getActiveCard(menuCurrency);
              return activeCard ? (
                <View
                  style={[
                    styles.menuItem,
                    { borderBottomColor: C.borderLight, borderBottomWidth: 1 },
                  ]}
                >
                  <View
                    style={[
                      styles.menuCardIcon,
                      { backgroundColor: activeCard.color + "22" },
                    ]}
                  >
                    <MaterialIcons
                      name={activeCard.icon as any}
                      size={18}
                      color={activeCard.color}
                    />
                  </View>
                  <View style={styles.menuCardInfo}>
                    <Text
                      style={[styles.menuCardName, { color: C.textPrimary }]}
                    >
                      {activeCard.name}
                    </Text>
                    <Text style={[styles.menuCardType, { color: C.textMuted }]}>
                      {TYPE_LABEL[activeCard.type]}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="check"
                    size={20}
                    color={Colors.primary}
                  />
                </View>
              ) : null;
            })()}

            {/* Gestionar tarjetas */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setShowCardMenu(false);
                router.push(
                  `/modals/manage-cards?currency=${menuCurrency}` as any,
                );
              }}
            >
              <View
                style={[
                  styles.menuCardIcon,
                  { backgroundColor: C.surfaceSecondary },
                ]}
              >
                <MaterialIcons
                  name="credit-card"
                  size={18}
                  color={C.textSecondary}
                />
              </View>
              <Text style={[styles.menuCardName, { color: C.textPrimary }]}>
                Gestionar tarjetas
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={C.textMuted}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fixedHeader: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  appName: { fontSize: 28, fontWeight: "bold", color: Colors.white },
  bellBtn: { padding: 4 },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.danger,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: { color: Colors.white, fontSize: 9, fontWeight: "bold" },

  cardWrapper: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    overflow: "hidden",
    minHeight: 170,
  },
  circle1: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#00BCD4",
    opacity: 0.45,
    top: -40,
    right: -50,
  },
  circle2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#000",
    opacity: 0.12,
    bottom: -60,
    left: -40,
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  cardNameWrap: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  cardName: { color: Colors.white, fontSize: FontSize.sm, fontWeight: "600" },
  cardTypePill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cardTypePillText: { color: Colors.white, fontSize: 10, fontWeight: "600" },
  cardMenuBtn: { padding: 4 },

  cardAmountRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: Spacing.md,
  },
  cardSymbol: {
    fontSize: 26,
    fontWeight: "bold",
    color: Colors.white,
    marginTop: 8,
  },
  cardAmount: {
    fontSize: 44,
    fontWeight: "bold",
    color: Colors.white,
    flex: 1,
  },

  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: Spacing.md,
  },
  progressBg: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 3,
  },
  currencyBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  currencyText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: Spacing.sm,
  },
  dot: { height: 6, borderRadius: 3 },

  content: { paddingTop: Spacing.md },
  statsCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statLabel: { fontSize: FontSize.xs },
  statValue: { fontSize: FontSize.sm, fontWeight: "bold" },
  statDivider: { width: 1, marginVertical: 4 },

  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: 6,
  },
  actionLabel: { fontSize: 10, textAlign: "center", fontWeight: "500" },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  viewAll: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: "500" },
  txCard: {
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Menú 3 puntos
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuSheet: {
    width: width * 0.78,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  menuTitle: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  menuCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  menuCardInfo: { flex: 1 },
  menuCardName: { fontSize: FontSize.sm, fontWeight: "600" },
  menuCardType: { fontSize: FontSize.xs, marginTop: 1 },
  menuDivider: { height: 1, marginVertical: Spacing.xs },
});
