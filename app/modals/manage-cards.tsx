import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Switch,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
import { useColors } from "@/lib/hooks/useColors";
import {
  getCardsByCurrency,
  addCard,
  updateCard,
  deleteCard,
  Card,
} from "@/lib/database/cards";
import { useStore } from "@/lib/store/useStore";
import { FontAwesome5, FontAwesome } from "@expo/vector-icons";

// ── Constantes ──────────────────────────────────────────────────

const CARD_TYPES = [
  { key: "personal", label: "Personal", icon: "person" },
  { key: "savings", label: "Ahorro", icon: "savings" },
  { key: "business", label: "Negocios", icon: "business-center" },
] as const;

const CARD_COLORS = [
  "#00BCD4",
  "#7C83FD",
  "#F5A623",
  "#E53935",
  "#43A047",
  "#8E24AA",
  "#1565C0",
  "#00897B",
  "#F57C00",
  "#546E7A",
];

const CARD_ICONS_MATERIAL = [
  { name: "account-balance", label: "Banco", lib: "material" },
  { name: "credit-card", label: "Tarjeta", lib: "material" },
  { name: "account-balance-wallet", label: "Cartera", lib: "material" },
  { name: "store", label: "Negocio", lib: "material" },
  { name: "work", label: "Trabajo", lib: "material" },
  { name: "home", label: "Casa", lib: "material" },
  { name: "savings", label: "Ahorros", lib: "material" },
  { name: "local-atm", label: "Efectivo", lib: "material" },
  { name: "payment", label: "Pago", lib: "material" },
  { name: "star", label: "Principal", lib: "material" },
] as const;

const CARD_ICONS_BRANDS = [
  { name: "cc-visa", label: "Visa" },
  { name: "cc-mastercard", label: "Mastercard" },
  { name: "cc-paypal", label: "PayPal" },
  { name: "cc-amex", label: "Amex" },
  { name: "cc-stripe", label: "Stripe" },
  { name: "cc-discover", label: "Discover" },
  { name: "cc-jcb", label: "JCB" },
  { name: "university", label: "BPA" },
  { name: "university", label: "BANDEC" },
  { name: "piggy-bank", label: "Ahorro" },
  { name: "money-bill-wave", label: "Efectivo" },
  { name: "coins", label: "Monedas" },
] as const;

const TYPE_LABEL: Record<string, string> = {
  personal: "Personal",
  savings: "Ahorro",
  business: "Negocio",
};

const EMPTY_FORM = {
  name: "",
  description: "",
  type: "personal" as Card["type"],
  color: "#00BCD4",
  icon: "account-balance-wallet",
  account_number: "",
  allow_transfers: 1,
};

type ScreenMode = "list" | "add" | "edit";

// Determina la librería del icono según su nombre
function getIconLib(iconName: string): "material" | "fa5" | "fa" {
  const fa5Icons = [
    "cc-visa",
    "cc-mastercard",
    "cc-paypal",
    "cc-amex",
    "cc-apple-pay",
    "cc-stripe",
    "cc-discover",
    "cc-jcb",
    "university",
    "piggy-bank",
    "money-bill-wave",
    "wallet",
    "coins",
    "hand-holding-usd",
  ];
  if (fa5Icons.includes(iconName)) return "fa5";
  return "material";
}

function AppIcon({
  name,
  size,
  color,
  style,
}: {
  name: string;
  size: number;
  color: string;
  style?: any;
}) {
  const lib = getIconLib(name);
  if (lib === "fa5") {
    return (
      <FontAwesome5
        name={name as any}
        size={size}
        color={color}
        style={style}
      />
    );
  }
  return (
    <MaterialIcons name={name as any} size={size} color={color} style={style} />
  );
}

// ── Componente tarjeta visual ────────────────────────────────────

function CardPreview({
  card,
  currency,
}: {
  card: typeof EMPTY_FORM & { name: string };
  currency: string;
}) {
  return (
    <LinearGradient
      colors={[card.color, card.color + "AA", "#1565C0"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.previewCard}
    >
      <View style={styles.previewCircle1} />
      <View style={styles.previewCircle2} />

      {/* Icono estampado en el fondo de la tarjeta */}
      <View style={styles.previewBgIcon}>
        <AppIcon name={card.icon} size={110} color="rgba(255,255,255,0.08)" />
      </View>

      {/* Top */}
      <View style={styles.previewTop}>
        <AppIcon name={card.icon} size={22} color="rgba(255,255,255,0.9)" />
        <Text style={styles.previewBrand}>
          VALTA {TYPE_LABEL[card.type]?.toUpperCase()}
        </Text>
      </View>

      {/* Dots */}
      <View style={styles.previewDots}>
        {[0, 1, 2, 3].map((g) => (
          <View key={g} style={styles.previewDotGroup}>
            {[0, 1, 2, 3].map((d) => (
              <View key={d} style={styles.previewDot} />
            ))}
          </View>
        ))}
      </View>

      {/* Bottom */}
      <View style={styles.previewBottom}>
        <View>
          <Text style={styles.previewLabel}>CARD HOLDER</Text>
          <Text style={styles.previewName}>
            {card.name.toUpperCase() || "NOMBRE DE LA TARJETA"}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

// ── Pantalla principal ───────────────────────────────────────────

export default function ManageCardsModal() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { currency = "CUP" } = useLocalSearchParams<{ currency: string }>();
  const { activeCardByCurrency, setActiveCard } = useStore();

  const [cards, setCards] = useState<Card[]>([]);
  const [mode, setMode] = useState<ScreenMode>("list");
  const [editingCard, setEditing] = useState<Card | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  // const [showTransfer, setShowTransfer] = useState(false);

  // Estado para la transferencia
  const [transferTo, setTransferTo] = useState<number | null>(null);
  const [transferAmount, setTransferAmount] = useState("");

  const loadCards = useCallback(async () => {
    const list = await getCardsByCurrency(currency);
    setCards(list);
    if (!activeCardByCurrency[currency] && list[0]?.id) {
      setActiveCard(currency, list[0].id);
    }
  }, [currency]);

  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setEditing(null);
    setMode("add");
  };

  const openEdit = (card: Card) => {
    setForm({
      name: card.name,
      description: card.description ?? "",
      type: card.type,
      color: card.color,
      icon: card.icon,
      account_number: card.account_number ?? "",
      allow_transfers: card.allow_transfers ?? 1,
    });
    setEditing(card);
    setMode("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      if (mode === "edit" && editingCard) {
        await updateCard({ ...editingCard, ...form });
      } else {
        const newId = await addCard({ ...form, currency });
        setActiveCard(currency, newId);
      }
      await loadCards();
      setMode("list");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (card: Card) => {
    if (cards.length === 1) {
      Alert.alert("", "Debes tener al menos una tarjeta");
      return;
    }
    Alert.alert("Eliminar tarjeta", `¿Eliminar "${card.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCard(card.id!);
            if (activeCardByCurrency[currency] === card.id) {
              const remaining = cards.filter((c) => c.id !== card.id);
              if (remaining[0]?.id) setActiveCard(currency, remaining[0].id);
            }
            await loadCards();
          } catch (e: any) {
            Alert.alert("No se puede eliminar", e.message);
          }
        },
      },
    ]);
  };

  // ── FORMULARIO ─────────────────────────────────────────────────
  if (mode === "add" || mode === "edit") {
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: C.white,
              borderBottomColor: C.border,
              paddingTop: insets.top + 12,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: C.background }]}
            onPress={() => setMode("list")}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={C.textSecondary}
            />
          </TouchableOpacity>
          <Text style={[styles.title, { color: C.textPrimary }]}>
            {mode === "add" ? "Nueva Tarjeta" : "Editar Tarjeta"}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }}
        >
          {/* Preview */}
          <CardPreview card={form} currency={currency} />

          {/* Nombre */}
          <Text style={[styles.label, { color: C.textSecondary }]}>
            Nombre de la tarjeta
          </Text>
          <View
            style={[
              styles.inputWrap,
              { borderColor: C.border, backgroundColor: C.white },
            ]}
          >
            <TextInput
              style={[styles.input, { color: C.textPrimary }]}
              value={form.name}
              onChangeText={(t) =>
                setForm((f) => ({
                  ...f,
                  name: t.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, ""),
                }))
              }
              placeholder="Ej. Gastos Diarios"
              placeholderTextColor={C.textMuted}
              maxLength={30}
            />
          </View>

          {/* Número de cuenta */}
          <Text style={[styles.label, { color: C.textSecondary }]}>
            Número de cuenta
          </Text>
          <View
            style={[
              styles.inputWrap,
              { borderColor: C.border, backgroundColor: C.white },
            ]}
          >
            <TextInput
              style={[styles.input, { color: C.textPrimary }]}
              value={form.account_number}
              onChangeText={(t) =>
                setForm((f) => ({
                  ...f,
                  account_number: t.replace(/[^0-9-]/g, ""),
                }))
              }
              placeholder="XXXX-XXXX-XXXX-XXXX"
              placeholderTextColor={C.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={19}
            />
          </View>

          {/* Tipo de cuenta */}
          <Text style={[styles.label, { color: C.textSecondary }]}>
            Tipo de cuenta
          </Text>
          <View style={styles.typeRow}>
            {CARD_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.typeBtn,
                  { borderColor: C.border, backgroundColor: C.white },
                  form.type === t.key && {
                    backgroundColor: Colors.primary,
                    borderColor: Colors.primary,
                  },
                ]}
                onPress={() => setForm((f) => ({ ...f, type: t.key }))}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    {
                      color:
                        form.type === t.key ? Colors.white : C.textSecondary,
                    },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Descripción */}
          <Text style={[styles.label, { color: C.textSecondary }]}>
            Descripción
          </Text>
          <View
            style={[
              styles.inputWrap,
              {
                borderColor: C.border,
                backgroundColor: C.white,
                minHeight: 80,
                alignItems: "flex-start",
              },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                { color: C.textPrimary, textAlignVertical: "top" },
              ]}
              value={form.description}
              onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
              placeholder="Añade una nota opcional..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
              maxLength={80}
            />
          </View>

          {/* Color */}
          <Text style={[styles.label, { color: C.textSecondary }]}>
            Color de la tarjeta
          </Text>
          <View style={styles.colorRow}>
            {CARD_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorDot,
                  { backgroundColor: color },
                  form.color === color && styles.colorDotSelected,
                ]}
                onPress={() => setForm((f) => ({ ...f, color }))}
              >
                {form.color === color && (
                  <MaterialIcons name="check" size={16} color={Colors.white} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Ícono */}
          <Text style={[styles.label, { color: C.textSecondary }]}>Ícono</Text>
          <View style={[styles.iconSheet, { backgroundColor: C.white }]}>
            <Text style={[styles.iconSheetTitle, { color: C.textPrimary }]}>
              Ícono de la tarjeta
            </Text>

            {/* General */}
            <Text style={[styles.iconSectionLabel, { color: C.textMuted }]}>
              General
            </Text>
            <View style={styles.iconGrid}>
              {CARD_ICONS_MATERIAL.map((ic) => (
                <TouchableOpacity
                  key={ic.name}
                  style={[
                    styles.iconGridBtn,
                    { backgroundColor: C.background },
                    form.icon === ic.name && {
                      backgroundColor: form.color + "22",
                      borderColor: form.color,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    setForm((f) => ({ ...f, icon: ic.name }));
                    setShowIconPicker(false);
                  }}
                >
                  <AppIcon
                    name={ic.name}
                    size={26}
                    color={form.icon === ic.name ? form.color : C.textSecondary}
                  />
                  <Text style={[styles.iconGridLabel, { color: C.textMuted }]}>
                    {ic.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Marcas financieras */}
            <Text style={[styles.iconSectionLabel, { color: C.textMuted }]}>
              Pasarelas y bancos
            </Text>
            <View style={styles.iconGrid}>
              {CARD_ICONS_BRANDS.map((ic) => (
                <TouchableOpacity
                  key={ic.name}
                  style={[
                    styles.iconGridBtn,
                    { backgroundColor: C.background },
                    form.icon === ic.name && {
                      backgroundColor: form.color + "22",
                      borderColor: form.color,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    setForm((f) => ({ ...f, icon: ic.name }));
                    setShowIconPicker(false);
                  }}
                >
                  <AppIcon
                    name={ic.name}
                    size={26}
                    color={form.icon === ic.name ? form.color : C.textSecondary}
                  />
                  <Text style={[styles.iconGridLabel, { color: C.textMuted }]}>
                    {ic.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Permitir transferencias */}
          <View
            style={[
              styles.switchRow,
              { backgroundColor: C.white, borderColor: C.border },
            ]}
          >
            <View style={styles.switchInfo}>
              <Text style={[styles.switchTitle, { color: C.textPrimary }]}>
                Permitir transferencias
              </Text>
              <Text style={[styles.switchDesc, { color: C.textSecondary }]}>
                Habilitar movimientos entre tus propias cuentas Valta
              </Text>
            </View>
            <Switch
              value={form.allow_transfers === 1}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, allow_transfers: v ? 1 : 0 }))
              }
              trackColor={{ false: C.border, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          {/* Sección de transferencia — visible si allow_transfers está activo y hay más de 1 tarjeta */}
          {form.allow_transfers === 1 && (
            <View
              style={[
                styles.transferBlock,
                { backgroundColor: C.white, borderColor: C.border },
              ]}
            >
              <View style={styles.transferHeader}>
                <MaterialIcons
                  name="swap-horiz"
                  size={20}
                  color={Colors.primary}
                />
                <Text style={[styles.transferTitle, { color: C.textPrimary }]}>
                  Transferir Dinero
                </Text>
              </View>

              {cards.filter((c) => c.id !== editingCard?.id).length === 0 ? (
                /* Sin otras tarjetas — mensaje informativo */
                <View
                  style={[
                    styles.transferEmptyWrap,
                    { backgroundColor: C.surfaceSecondary },
                  ]}
                >
                  <MaterialIcons
                    name="info-outline"
                    size={22}
                    color={C.textMuted}
                  />
                  <Text
                    style={[
                      styles.transferEmptyText,
                      { color: C.textSecondary },
                    ]}
                  >
                    Para poder hacer transferencias debes agregar otra tarjeta
                    en esta misma moneda.
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.transferEmptyBtn,
                      { borderColor: Colors.primary },
                    ]}
                    onPress={() => {
                      setForm({ ...EMPTY_FORM });
                      setEditing(null);
                      setMode("add");
                    }}
                  >
                    <MaterialIcons
                      name="add"
                      size={16}
                      color={Colors.primary}
                    />
                    <Text
                      style={[
                        styles.transferEmptyBtnText,
                        { color: Colors.primary },
                      ]}
                    >
                      Agregar tarjeta
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* Cuenta de destino — dropdown */}
                  <Text style={[styles.label, { color: C.textSecondary }]}>
                    Cuenta de destino
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dropdownBtn,
                      { borderColor: C.border, backgroundColor: C.white },
                    ]}
                    onPress={() => setShowDropdown(!showDropdown)}
                  >
                    <View style={styles.dropdownSelected}>
                      {transferTo ? (
                        <>
                          <View
                            style={[
                              styles.dropdownIcon,
                              {
                                backgroundColor:
                                  cards.find((c) => c.id === transferTo)
                                    ?.color + "22",
                              },
                            ]}
                          >
                            <MaterialIcons
                              name={
                                cards.find((c) => c.id === transferTo)
                                  ?.icon as any
                              }
                              size={16}
                              color={
                                cards.find((c) => c.id === transferTo)?.color
                              }
                            />
                          </View>
                          <Text
                            style={[
                              styles.dropdownSelectedText,
                              { color: C.textPrimary },
                            ]}
                          >
                            {cards.find((c) => c.id === transferTo)?.name}
                          </Text>
                        </>
                      ) : (
                        <Text
                          style={[
                            styles.dropdownPlaceholder,
                            { color: C.textMuted },
                          ]}
                        >
                          Selecciona una tarjeta
                        </Text>
                      )}
                    </View>
                    <MaterialIcons
                      name={
                        showDropdown
                          ? "keyboard-arrow-up"
                          : "keyboard-arrow-down"
                      }
                      size={22}
                      color={C.textMuted}
                    />
                  </TouchableOpacity>

                  {showDropdown && (
                    <View
                      style={[
                        styles.dropdownList,
                        { backgroundColor: C.white, borderColor: C.border },
                      ]}
                    >
                      {cards
                        .filter((c) => c.id !== editingCard?.id)
                        .map((c, i, arr) => (
                          <TouchableOpacity
                            key={c.id}
                            style={[
                              styles.dropdownOption,
                              {
                                borderBottomColor: C.borderLight,
                                borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                              },
                              transferTo === c.id && {
                                backgroundColor: "#EEF4FF",
                              },
                            ]}
                            onPress={() => {
                              setTransferTo(c.id!);
                              setShowDropdown(false);
                            }}
                          >
                            <View
                              style={[
                                styles.dropdownIcon,
                                { backgroundColor: c.color + "22" },
                              ]}
                            >
                              <MaterialIcons
                                name={c.icon as any}
                                size={16}
                                color={c.color}
                              />
                            </View>
                            <View style={styles.dropdownOptionInfo}>
                              <Text
                                style={[
                                  styles.dropdownOptionName,
                                  { color: C.textPrimary },
                                ]}
                              >
                                {c.name}
                              </Text>
                              <Text
                                style={[
                                  styles.dropdownOptionType,
                                  { color: C.textMuted },
                                ]}
                              >
                                {TYPE_LABEL[c.type]}
                              </Text>
                            </View>
                            {transferTo === c.id && (
                              <MaterialIcons
                                name="check"
                                size={18}
                                color={Colors.primary}
                              />
                            )}
                          </TouchableOpacity>
                        ))}
                    </View>
                  )}

                  {/* Monto */}
                  <Text style={[styles.label, { color: C.textSecondary }]}>
                    Monto a transferir
                  </Text>
                  <View
                    style={[
                      styles.transferAmountRow,
                      { borderColor: C.border, backgroundColor: C.white },
                    ]}
                  >
                    <TextInput
                      style={[
                        styles.transferAmountInput,
                        { color: C.textPrimary, backgroundColor: C.white },
                      ]}
                      value={transferAmount}
                      onChangeText={(t) =>
                        setTransferAmount(t.replace(/[^0-9.]/g, ""))
                      }
                      placeholder="0.00"
                      placeholderTextColor={C.textMuted}
                      keyboardType="decimal-pad"
                    />
                    {/* <View
                      style={[
                        styles.transferCurrencyBadge,
                        { backgroundColor: C.surfaceSecondary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.transferCurrencyText,
                          { color: C.textSecondary },
                        ]}
                      >
                        {currency}
                      </Text>
                    </View> */}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.transferBtn,
                      { backgroundColor: Colors.primary },
                    ]}
                    onPress={() => {
                      if (!transferTo) {
                        Alert.alert("", "Selecciona una tarjeta de destino");
                        return;
                      }
                      const amount = parseFloat(transferAmount);
                      if (!amount || amount <= 0) {
                        Alert.alert("", "Ingresa un monto válido");
                        return;
                      }
                      Alert.alert(
                        "Confirmar transferencia",
                        `¿Transferir ${currency} ${amount.toFixed(2)} a ${cards.find((c) => c.id === transferTo)?.name}?`,
                        [
                          { text: "Cancelar", style: "cancel" },
                          {
                            text: "Transferir",
                            onPress: () => {
                              Alert.alert("✓", "Transferencia registrada");
                              setTransferAmount("");
                              setTransferTo(null);
                            },
                          },
                        ],
                      );
                    }}
                  >
                    <MaterialIcons
                      name="swap-horiz"
                      size={18}
                      color={Colors.white}
                    />
                    <Text style={styles.transferBtnText}>
                      Realizar transferencia
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: C.white,
              borderTopColor: C.border,
              paddingBottom: insets.bottom + Spacing.sm,
            },
          ]}
        >
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[
                styles.footerBtn,
                styles.footerBtnCancel,
                { borderColor: C.border },
              ]}
              onPress={() => setMode("list")}
            >
              <MaterialIcons name="close" size={18} color={C.textSecondary} />
              <Text style={[styles.footerBtnText, { color: C.textSecondary }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.footerBtn,
                styles.footerBtnSave,
                { backgroundColor: Colors.primary },
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              <MaterialIcons name="check" size={18} color={Colors.white} />
              <Text style={[styles.footerBtnText, { color: Colors.white }]}>
                {saving ? "Guardando..." : "Aceptar"}
              </Text>
            </TouchableOpacity>
            {mode === "edit" && (
              <TouchableOpacity
                style={[
                  styles.footerBtn,
                  styles.footerBtnEdit,
                  { borderColor: C.border },
                ]}
                onPress={() => {
                  /* modificar sin cerrar */
                }}
              >
                <MaterialIcons name="edit" size={18} color={C.textSecondary} />
                <Text
                  style={[styles.footerBtnText, { color: C.textSecondary }]}
                >
                  Modificar
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Modal selector de iconos */}
        <Modal
          visible={showIconPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowIconPicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowIconPicker(false)}
          >
            <View style={[styles.iconSheet, { backgroundColor: C.white }]}>
              <Text style={[styles.iconSheetTitle, { color: C.textPrimary }]}>
                Ícono de la tarjeta
              </Text>

              <Text style={[styles.iconSectionLabel, { color: C.textMuted }]}>
                General
              </Text>
              <View style={styles.iconGrid}>
                {CARD_ICONS_MATERIAL.map((ic) => (
                  <TouchableOpacity
                    key={ic.name}
                    style={[
                      styles.iconGridBtn,
                      { backgroundColor: C.background },
                      form.icon === ic.name && {
                        backgroundColor: form.color + "22",
                        borderColor: form.color,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => {
                      setForm((f) => ({
                        ...f,
                        icon: ic.name,
                        iconLib: "material",
                      }));
                      setShowIconPicker(false);
                    }}
                  >
                    <MaterialIcons
                      name={ic.name as any}
                      size={26}
                      color={
                        form.icon === ic.name ? form.color : C.textSecondary
                      }
                    />
                    <Text
                      style={[styles.iconGridLabel, { color: C.textMuted }]}
                    >
                      {ic.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.iconSectionLabel, { color: C.textMuted }]}>
                Marcas financieras
              </Text>
              <View style={styles.iconGrid}>
                {CARD_ICONS_BRANDS.map((ic) => (
                  <TouchableOpacity
                    key={ic.name}
                    style={[
                      styles.iconGridBtn,
                      { backgroundColor: C.background },
                      form.icon === ic.name && {
                        backgroundColor: form.color + "22",
                        borderColor: form.color,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => {
                      setForm((f) => ({ ...f, icon: ic.name, iconLib: "fa5" }));
                      setShowIconPicker(false);
                    }}
                  >
                    <FontAwesome5
                      name={ic.name}
                      size={26}
                      color={
                        form.icon === ic.name ? form.color : C.textSecondary
                      }
                    />
                    <Text
                      style={[styles.iconGridLabel, { color: C.textMuted }]}
                    >
                      {ic.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // ── LISTA DE TARJETAS ──────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: C.white,
            borderBottomColor: C.border,
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: C.background }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="close" size={22} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.textPrimary }]}>
          Gestionar Tarjeta
        </Text>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: C.background }]}
          onPress={openAdd}
        >
          <MaterialIcons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}
      >
        {/* Título sección */}
        <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
          Tus Cuentas
        </Text>
        <Text style={[styles.sectionSub, { color: C.textSecondary }]}>
          Selecciona una tarjeta para gestionarla
        </Text>

        {/* Lista de tarjetas */}
        {cards.map((card) => {
          const isActive = activeCardByCurrency[currency] === card.id;
          const bal = card.balance ?? 0;

          return (
            <View key={card.id} style={{ marginBottom: Spacing.md }}>
              <TouchableOpacity
                onPress={() => {
                  if (card.id) setActiveCard(currency, card.id);
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[card.color, card.color + "BB", "#1565C0"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.listCard, isActive && styles.listCardActive]}
                >
                  {/* Círculo decorativo */}
                  <View style={styles.listCardCircle} />

                  {/* Ícono grande de fondo como tarjeta física */}
                  {/* Ícono estampado en fondo */}
                  <View style={styles.listCardBgIcon}>
                    <AppIcon
                      name={card.icon}
                      size={120}
                      color="rgba(255,255,255,0.07)"
                    />
                  </View>

                  {/* Si es marca financiera, mostrarla también en esquina inferior derecha visible */}
                  {getIconLib(card.icon) !== "material" && (
                    <View style={styles.listCardBrandIcon}>
                      <AppIcon
                        name={card.icon}
                        size={40}
                        color="rgba(255,255,255,0.5)"
                      />
                    </View>
                  )}

                  {/* Top */}
                  <View style={styles.listCardTop}>
                    <View>
                      <Text style={styles.listCardTypeLabel}>
                        {TYPE_LABEL[card.type]?.toUpperCase()}
                      </Text>
                      <Text style={styles.listCardName}>{card.name}</Text>
                    </View>
                    <View style={styles.listCardTopRight}>
                      <AppIcon
                        name={card.icon}
                        size={22}
                        color="rgba(255,255,255,0.85)"
                      />
                      {isActive && (
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color="rgba(255,255,255,0.9)"
                        />
                      )}
                    </View>
                  </View>

                  {/* Balance */}
                  <View style={styles.listCardBalance}>
                    <Text style={styles.listCardBalanceLabel}>
                      {bal >= 0 ? "Balance Disponible" : "Balance Negativo"}
                    </Text>
                    <Text
                      style={[
                        styles.listCardBalanceAmount,
                        bal < 0 && { color: "#FFCDD2" },
                      ]}
                    >
                      {currency} {bal < 0 ? "-" : ""}
                      {Math.abs(bal).toFixed(2)}
                    </Text>
                  </View>

                  {/* Footer: número + acciones */}
                  <View style={styles.listCardFooter}>
                    <Text style={styles.listCardNumber}>
                      {card.account_number
                        ? `•••• ${card.account_number.slice(-4)}`
                        : "•••• ••••"}
                    </Text>
                    {!isActive && card.is_active === 0 && (
                      <View style={styles.inactiveBadge}>
                        <View style={styles.inactiveDot} />
                        <Text style={styles.inactiveText}>Inactiva</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Botones editar y eliminar FUERA de la tarjeta, abajo a la derecha */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[
                    styles.cardActionBtn,
                    { backgroundColor: C.white, borderColor: C.border },
                  ]}
                  onPress={() => openEdit(card)}
                >
                  <MaterialIcons
                    name="edit"
                    size={16}
                    color={C.textSecondary}
                  />
                  <Text
                    style={[styles.cardActionText, { color: C.textSecondary }]}
                  >
                    Editar
                  </Text>
                </TouchableOpacity>
                {cards.length > 1 && (
                  <TouchableOpacity
                    style={[
                      styles.cardActionBtn,
                      {
                        backgroundColor: "#FFEBEE",
                        borderColor: Colors.danger,
                      },
                    ]}
                    onPress={() => handleDelete(card)}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={16}
                      color={Colors.danger}
                    />
                    <Text
                      style={[styles.cardActionText, { color: Colors.danger }]}
                    >
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {/* Botón vincular nueva */}
        <TouchableOpacity
          style={[styles.addCardBtn, { borderColor: C.border }]}
          onPress={openAdd}
        >
          <MaterialIcons
            name="add-circle-outline"
            size={26}
            color={C.textMuted}
          />
          <Text style={[styles.addCardText, { color: C.textSecondary }]}>
            Vincular Nueva Tarjeta
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: FontSize.lg, fontWeight: "bold" },

  // Preview card
  previewCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    minHeight: 180,
    overflow: "hidden",
  },
  previewCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.1)",
    top: -60,
    right: -40,
  },
  previewCircle2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(0,0,0,0.08)",
    bottom: -40,
    left: -20,
  },
  previewTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  previewBrand: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  previewDots: { flexDirection: "row", gap: 10, marginBottom: Spacing.lg },
  previewDotGroup: { flexDirection: "row", gap: 4 },
  previewDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  previewBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  previewLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  previewName: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  previewCurrency: {
    color: "rgba(255,255,255,0.8)",
    fontSize: FontSize.sm,
    fontWeight: "600",
  },

  // Form
  label: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },
  inputWrap: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  input: { fontSize: FontSize.md, padding: 0 },

  typeRow: { flexDirection: "row", gap: Spacing.sm },
  typeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  typeBtnText: { fontSize: FontSize.sm, fontWeight: "600" },

  colorRow: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap" },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  iconRow: { flexDirection: "row", gap: Spacing.sm },
  iconBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  switchInfo: { flex: 1 },
  switchTitle: { fontSize: FontSize.sm, fontWeight: "600" },
  switchDesc: { fontSize: FontSize.xs, marginTop: 2, lineHeight: 16 },

  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  footerRow: { flexDirection: "row", gap: Spacing.sm },
  footerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  footerBtnCancel: { borderWidth: 1 },
  footerBtnSave: {},
  footerBtnEdit: { borderWidth: 1 },
  footerBtnText: { fontSize: FontSize.sm, fontWeight: "600" },

  // Modal iconos
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  iconSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  iconSheetTitle: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    marginBottom: Spacing.lg,
  },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  iconGridBtn: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconGridLabel: { fontSize: 9 },

  // Lista de tarjetas
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "bold", marginBottom: 4 },
  sectionSub: { fontSize: FontSize.xs, marginBottom: Spacing.lg },

  listCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
    minHeight: 150,
  },
  listCardActive: {
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  listCardCircle: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -50,
    right: -30,
  },
  listCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  listCardTypeLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  listCardName: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: "700",
  },
  listCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  listCardActionBtn: { padding: 2 },
  listCardBalance: { marginBottom: Spacing.md },
  listCardBalanceLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    marginBottom: 2,
  },
  listCardBalanceAmount: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: "bold",
  },
  listCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listCardNumber: {
    color: "rgba(255,255,255,0.7)",
    fontSize: FontSize.xs,
    letterSpacing: 1,
  },
  inactiveBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  inactiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.danger,
  },
  inactiveText: { color: Colors.danger, fontSize: 10, fontWeight: "600" },

  addCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl,
    marginTop: Spacing.sm,
  },
  addCardText: { fontSize: FontSize.sm, fontWeight: "500" },
  listCardBgIcon: {
    position: "absolute",
    bottom: -20,
    right: -20,
  },
  listCardTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  cardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  cardActionText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  transferBlock: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: 4,
  },
  transferHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  transferTitle: { fontSize: FontSize.md, fontWeight: "700" },
  selectWrap: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  transferChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    marginRight: Spacing.sm,
  },
  transferChipText: { fontSize: FontSize.sm, fontWeight: "600" },
  transferAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  transferAmountInput: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: "bold",
    padding: Spacing.md,
  },
  transferCurrencyBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  transferCurrencyText: { fontSize: FontSize.sm, fontWeight: "700" },
  transferBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  transferBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: "600",
  },
  iconSectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  // Dropdown
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  dropdownSelected: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  dropdownIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownSelectedText: { fontSize: FontSize.md, fontWeight: "500" },
  dropdownPlaceholder: { fontSize: FontSize.md },
  dropdownList: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    overflow: "hidden",
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  dropdownOptionInfo: { flex: 1 },
  dropdownOptionName: { fontSize: FontSize.sm, fontWeight: "600" },
  dropdownOptionType: { fontSize: FontSize.xs, marginTop: 1 },

  // Sin tarjetas
  transferEmptyWrap: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.sm,
  },
  transferEmptyText: {
    fontSize: FontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  transferEmptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  transferEmptyBtnText: { fontSize: FontSize.sm, fontWeight: "600" },
  previewBgIcon: {
    position: "absolute",
    bottom: -10,
    right: 2,
    opacity: 1,
  },
  listCardBrandIcon: {
    position: "absolute",
    bottom: Spacing.md,
    right: Spacing.md,
  },
});
