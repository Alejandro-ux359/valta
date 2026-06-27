import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing, FontSize, BorderRadius } from "@/lib/constants/theme";
import { exportToPDF } from "@/lib/export/pdf";
import { exportToExcel } from "@/lib/export/excel";
import { useStore } from "@/lib/store/useStore";
import { useColors } from "@/lib/hooks/useColors";

interface Currency {
  code: string;
  label: string;
  symbol: string;
}

const DEFAULT_CURRENCY: Currency = {
  code: "CUP",
  label: "Peso Cubano",
  symbol: "$",
};

const PRESET_CURRENCIES: Currency[] = [
  { code: "USD", label: "Dólar Estadounidense", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "Libra Esterlina", symbol: "£" },
  { code: "MXN", label: "Peso Mexicano", symbol: "$" },
  { code: "CAD", label: "Dólar Canadiense", symbol: "$" },
  { code: "BRL", label: "Real Brasileño", symbol: "R$" },
  { code: "ARS", label: "Peso Argentino", symbol: "$" },
  { code: "COP", label: "Peso Colombiano", symbol: "$" },
  { code: "CLP", label: "Peso Chileno", symbol: "$" },
  { code: "PEN", label: "Sol Peruano", symbol: "S/" },
  { code: "JPY", label: "Yen Japonés", symbol: "¥" },
  { code: "CNY", label: "Yuan Chino", symbol: "¥" },
];

type ModalType =
  | "currency"
  | "add_currency"
  | "about"
  | "guide"
  | "license"
  | null;

export default function SettingsScreen() {
  const C = useColors();
  const { currency, setCurrency, isDarkMode, toggleDarkMode } = useStore();
  const insets = useSafeAreaInsets();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [userCurrencies, setUserCurrencies] = useState<Currency[]>(() => {
    const base = [DEFAULT_CURRENCY];
    if (currency !== "CUP") {
      const found = PRESET_CURRENCIES.find((p) => p.code === currency);
      if (found) base.push(found);
    }
    return base;
  });
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [currencySearch, setCurrencySearch] = useState("");

  const allCurrencies = [
    DEFAULT_CURRENCY,
    ...userCurrencies.filter((c) => c.code !== "CUP"),
  ];

  const availableToAdd = PRESET_CURRENCIES.filter(
    (p) => !allCurrencies.some((c) => c.code === p.code),
  ).filter(
    (p) =>
      currencySearch === "" ||
      p.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      p.label.toLowerCase().includes(currencySearch.toLowerCase()),
  );

  const currentCurrencyLabel =
    [...allCurrencies, ...PRESET_CURRENCIES].find((c) => c.code === currency)
      ?.label ?? currency;

  const handleAddPreset = (cur: Currency) => {
    setUserCurrencies((prev) => [...prev, cur]);
    setActiveModal("currency");
    setCurrencySearch("");
  };

  const handleAddCustom = () => {
    if (!newCode.trim() || !newLabel.trim()) {
      Alert.alert("Error", "Completa el código y el nombre");
      return;
    }
    const custom: Currency = {
      code: newCode.trim().toUpperCase(),
      label: newLabel.trim(),
      symbol: newSymbol.trim() || newCode.trim().toUpperCase(),
    };
    if (allCurrencies.some((c) => c.code === custom.code)) {
      Alert.alert("Error", "Ya existe esa moneda");
      return;
    }
    setUserCurrencies((prev) => [...prev, custom]);
    setNewCode("");
    setNewLabel("");
    setNewSymbol("");
    setActiveModal("currency");
  };

  const handleRemoveCurrency = (code: string) => {
    if (code === "CUP") {
      Alert.alert("", "El Peso Cubano no se puede eliminar");
      return;
    }
    if (currency === code) setCurrency("CUP");
    setUserCurrencies((prev) => prev.filter((c) => c.code !== code));
  };

  // ── Estilos dinámicos según el modo ──────────────────────────
  const d = {
    bg: { backgroundColor: C.background },
    surface: { backgroundColor: C.white },
    border: { borderColor: C.border },
    titleText: { color: C.textPrimary },
    subText: { color: C.textSecondary },
    mutedText: { color: C.textMuted },
    inputBg: { backgroundColor: C.white, borderColor: C.border },
    badgeBg: { backgroundColor: C.surfaceSecondary },
    divider: { backgroundColor: C.border },
  };

  return (
    <View style={[styles.root, d.bg]}>
      {/* ── HEADER FIJO ── */}
      <View
        style={[
          styles.fixedHeader,
          d.surface,
          d.border,
          { paddingTop: insets.top + 8 },
        ]}
      >
        <Text style={[styles.fixedTitle, d.titleText]}>Ajustes</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* ── APARIENCIA ── */}
        <Text style={[styles.sectionLabel, d.subText]}>APARIENCIA</Text>
        <View style={[styles.card, d.surface]}>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                d.border,
                !isDarkMode && styles.modeBtnActive,
              ]}
              onPress={() => {
                if (isDarkMode) toggleDarkMode();
              }}
            >
              <MaterialIcons
                name="wb-sunny"
                size={18}
                color={!isDarkMode ? C.primary : C.textMuted}
              />
              <Text
                style={[
                  styles.modeBtnText,
                  { color: !isDarkMode ? C.primary : C.textMuted },
                ]}
              >
                Modo Claro
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                d.border,
                isDarkMode && styles.modeBtnActive,
              ]}
              onPress={() => {
                if (!isDarkMode) toggleDarkMode();
              }}
            >
              <MaterialIcons
                name="nightlight-round"
                size={18}
                color={isDarkMode ? C.primary : C.textMuted}
              />
              <Text
                style={[
                  styles.modeBtnText,
                  { color: isDarkMode ? C.primary : C.textMuted },
                ]}
              >
                Modo Oscuro
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── MONEDAS ── */}
        <Text style={[styles.sectionLabel, d.subText]}>MONEDAS</Text>
        <TouchableOpacity
          style={[styles.card, d.surface]}
          onPress={() => setActiveModal("currency")}
          activeOpacity={0.8}
        >
          <View style={styles.rowBetween}>
            <View style={styles.rowLeft}>
              <View style={[styles.currencyBadge, d.badgeBg]}>
                <Text style={[styles.currencyBadgeText, { color: C.primary }]}>
                  {currency}
                </Text>
              </View>
              <View>
                <Text style={[styles.rowTitle, d.titleText]}>
                  Moneda seleccionada
                </Text>
                <Text style={[styles.rowSub, d.subText]}>
                  {currentCurrencyLabel}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={C.textMuted} />
          </View>
        </TouchableOpacity>

        {/* ── GESTIÓN DE DATOS ── */}
        <Text style={[styles.sectionLabel, d.subText]}>GESTIÓN DE DATOS</Text>
        <View style={[styles.card, d.surface, styles.dataRow]}>
          <TouchableOpacity
            style={styles.dataBtn}
            onPress={() =>
              exportToPDF().catch(() =>
                Alert.alert("Error", "No se pudo exportar el PDF"),
              )
            }
          >
            <View style={[styles.dataIconWrap, { backgroundColor: "#E3F2FD" }]}>
              <MaterialIcons name="picture-as-pdf" size={26} color="#1565C0" />
            </View>
            <Text style={[styles.dataBtnLabel, d.titleText]}>Exportar PDF</Text>
          </TouchableOpacity>
          <View style={[styles.dataDivider, d.divider]} />
          <TouchableOpacity
            style={styles.dataBtn}
            onPress={() =>
              exportToExcel().catch(() =>
                Alert.alert("Error", "No se pudo exportar Excel"),
              )
            }
          >
            <View style={[styles.dataIconWrap, { backgroundColor: "#E8F5E9" }]}>
              <MaterialIcons name="table-chart" size={26} color="#2E7D32" />
            </View>
            <Text style={[styles.dataBtnLabel, d.titleText]}>
              Exportar Excel
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── INFORMACIÓN ── */}
        <Text style={[styles.sectionLabel, d.subText]}>INFORMACIÓN</Text>
        <View style={[styles.card, d.surface]}>
          {[
            {
              key: "about",
              icon: "info",
              bg: "#E3F2FD",
              color: "#1565C0",
              label: "Acerca de Valta",
            },
            {
              key: "guide",
              icon: "menu-book",
              bg: "#E8F5E9",
              color: "#2E7D32",
              label: "Guía de uso",
            },
            {
              key: "license",
              icon: "gavel",
              bg: "#FFF8E1",
              color: "#F57F17",
              label: "Licencia",
            },
          ].map((item, i, arr) => (
            <View key={item.key}>
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => setActiveModal(item.key as ModalType)}
              >
                <View style={[styles.infoIcon, { backgroundColor: item.bg }]}>
                  <MaterialIcons
                    name={item.icon as any}
                    size={18}
                    color={item.color}
                  />
                </View>
                <Text style={[styles.infoLabel, d.titleText]}>
                  {item.label}
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={C.textMuted}
                />
              </TouchableOpacity>
              {i < arr.length - 1 && (
                <View style={[styles.infoDivider, d.divider]} />
              )}
            </View>
          ))}
        </View>

        {/* ── CONTACTO ── */}
        <Text style={[styles.sectionLabel, d.subText]}>CONTACTO</Text>
        <View style={[styles.card, d.surface]}>
          {[
            {
              icon: "send",
              bg: "#E3F2FD",
              color: "#1565C0",
              label: "Telegram personal",
              value: "@alejandro",
              url: "https://t.me/alejandro",
            },
            {
              icon: "groups",
              bg: "#E3F2FD",
              color: "#1565C0",
              label: "Grupo de Telegram",
              value: "t.me/nombredelgrupo",
              url: "https://t.me/nombredelgrupo",
            },
            {
              icon: "email",
              bg: "#FCE4EC",
              color: "#C62828",
              label: "Correo electrónico",
              value: "micorreo@gmail.com",
              url: "mailto:micorreo@gmail.com?subject=Hola desde Valta",
            },
            {
              icon: "code",
              bg: "#E8F5E9",
              color: "#2E7D32",
              label: "Desarrollo colaborativo",
              value: "¿Tienes un proyecto? Escríbeme",
              url: "mailto:micorreo@gmail.com?subject=Propuesta de desarrollo",
            },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL(item.url)}
              >
                <View
                  style={[styles.contactIcon, { backgroundColor: item.bg }]}
                >
                  <MaterialIcons
                    name={item.icon as any}
                    size={18}
                    color={item.color}
                  />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactLabel, d.titleText]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.contactValue, d.subText]}>
                    {item.value}
                  </Text>
                </View>
                <MaterialIcons
                  name="open-in-new"
                  size={16}
                  color={C.textMuted}
                />
              </TouchableOpacity>
              {i < arr.length - 1 && (
                <View style={[styles.infoDivider, d.divider]} />
              )}
            </View>
          ))}
        </View>

        <Text style={[styles.footer, d.mutedText]}>
          © 2026 Valta. Todos los derechos reservados.
        </Text>
      </ScrollView>

      {/* ══════════════════════
          MODAL: MONEDAS
      ══════════════════════ */}
      <Modal
        visible={activeModal === "currency"}
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.modalContainer, d.bg]}>
          <View
            style={[
              styles.modalHeader,
              d.surface,
              d.border,
              { paddingTop: insets.top + 8 },
            ]}
          >
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <MaterialIcons name="close" size={24} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, d.titleText]}>Monedas</Text>
            <TouchableOpacity onPress={() => setActiveModal("add_currency")}>
              <MaterialIcons name="add" size={26} color={C.primary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalSub, d.subText]}>
            La moneda predeterminada es CUP. Selecciona la moneda activa.
          </Text>

          <FlatList
            data={allCurrencies}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{
              paddingHorizontal: Spacing.md,
              paddingBottom: 40,
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.curItem,
                  d.surface,
                  currency === item.code && styles.curItemActive,
                ]}
                onPress={() => {
                  setCurrency(item.code);
                  setActiveModal(null);
                }}
              >
                <View
                  style={[
                    styles.curBadge,
                    d.badgeBg,
                    currency === item.code && { backgroundColor: C.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.curBadgeText,
                      { color: currency === item.code ? "#fff" : C.primary },
                    ]}
                  >
                    {item.code}
                  </Text>
                </View>
                <View style={styles.curInfo}>
                  <Text style={[styles.curLabel, d.titleText]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.curSymbol, d.subText]}>
                    Símbolo: {item.symbol}
                  </Text>
                </View>
                {currency === item.code ? (
                  <MaterialIcons
                    name="check-circle"
                    size={22}
                    color={C.primary}
                  />
                ) : item.code !== "CUP" ? (
                  <TouchableOpacity
                    onPress={() => handleRemoveCurrency(item.code)}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={22}
                      color="#C62828"
                    />
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[styles.defaultBadge, { backgroundColor: C.border }]}
                  >
                    <Text style={[styles.defaultBadgeText, d.subText]}>
                      Por defecto
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* ══════════════════════
          MODAL: AGREGAR MONEDA
      ══════════════════════ */}
      <Modal
        visible={activeModal === "add_currency"}
        animationType="slide"
        onRequestClose={() => setActiveModal("currency")}
      >
        <View style={[styles.modalContainer, d.bg]}>
          <View
            style={[
              styles.modalHeader,
              d.surface,
              d.border,
              { paddingTop: insets.top + 8 },
            ]}
          >
            <TouchableOpacity onPress={() => setActiveModal("currency")}>
              <MaterialIcons
                name="arrow-back"
                size={24}
                color={C.textPrimary}
              />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, d.titleText]}>Agregar Moneda</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.md }}>
            <Text style={[styles.addSectionTitle, d.titleText]}>
              Monedas disponibles
            </Text>
            <View style={[styles.searchWrap, d.surface, d.border]}>
              <MaterialIcons name="search" size={18} color={C.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: C.textPrimary }]}
                placeholder="Buscar..."
                placeholderTextColor={C.textMuted}
                value={currencySearch}
                onChangeText={setCurrencySearch}
              />
            </View>
            {availableToAdd.map((cur) => (
              <TouchableOpacity
                key={cur.code}
                style={[styles.addPresetItem, d.surface, d.border]}
                onPress={() => handleAddPreset(cur)}
              >
                <View style={[styles.curBadge, d.badgeBg]}>
                  <Text style={[styles.curBadgeText, { color: C.primary }]}>
                    {cur.code}
                  </Text>
                </View>
                <View style={styles.curInfo}>
                  <Text style={[styles.curLabel, d.titleText]}>
                    {cur.label}
                  </Text>
                  <Text style={[styles.curSymbol, d.subText]}>
                    Símbolo: {cur.symbol}
                  </Text>
                </View>
                <MaterialIcons
                  name="add-circle-outline"
                  size={22}
                  color={C.primary}
                />
              </TouchableOpacity>
            ))}
            {availableToAdd.length === 0 && (
              <Text style={[styles.noResultsText, d.mutedText]}>
                No hay más monedas disponibles
              </Text>
            )}

            <Text
              style={[
                styles.addSectionTitle,
                d.titleText,
                { marginTop: Spacing.xl },
              ]}
            >
              Agregar moneda personalizada
            </Text>
            {[
              {
                label: "Código (ej: DKK)",
                value: newCode,
                setter: setNewCode,
                placeholder: "USD",
                caps: true,
                max: 5,
              },
              {
                label: "Nombre completo",
                value: newLabel,
                setter: setNewLabel,
                placeholder: "Ej: Corona Danesa",
                caps: false,
                max: 50,
              },
              {
                label: "Símbolo (opcional)",
                value: newSymbol,
                setter: setNewSymbol,
                placeholder: "Ej: kr",
                caps: false,
                max: 4,
              },
            ].map((field) => (
              <View key={field.label} style={styles.inputGroup}>
                <Text style={[styles.inputLabel, d.subText]}>
                  {field.label}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    d.inputBg,
                    { color: C.textPrimary },
                  ]}
                  placeholder={field.placeholder}
                  placeholderTextColor={C.textMuted}
                  value={field.value}
                  onChangeText={field.setter}
                  autoCapitalize={field.caps ? "characters" : "sentences"}
                  maxLength={field.max}
                />
              </View>
            ))}
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: C.primary }]}
              onPress={handleAddCustom}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>Agregar moneda</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ══════════════════════
          MODAL: ACERCA DE
      ══════════════════════ */}
      <Modal
        visible={activeModal === "about"}
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.modalContainer, d.bg]}>
          <View
            style={[
              styles.modalHeader,
              d.surface,
              d.border,
              { paddingTop: insets.top + 8 },
            ]}
          >
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <MaterialIcons name="close" size={24} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, d.titleText]}>
              Acerca de Valta
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.infoModalContent}>
            <View style={styles.appLogoWrap}>
              <MaterialIcons
                name="account-balance-wallet"
                size={56}
                color={C.primary}
              />
              <Text style={[styles.appLogoTitle, { color: C.primary }]}>
                Valta
              </Text>
              <Text style={[styles.appLogoVersion, d.subText]}>
                Versión 1.0.0
              </Text>
            </View>
            <Text style={[styles.infoModalSectionTitle, d.titleText]}>
              ¿Qué es Valta?
            </Text>
            <Text style={[styles.infoModalText, d.subText]}>
              Valta es una aplicación de finanzas personales diseñada para
              ayudarte a gestionar tus ingresos, gastos y deudas de forma simple
              e intuitiva, completamente offline.
            </Text>
            <Text style={[styles.infoModalSectionTitle, d.titleText]}>
              Tecnología utilizada
            </Text>
            {[
              {
                icon: "phone-android",
                label: "React Native",
                sub: "Framework de desarrollo móvil multiplataforma",
              },
              {
                icon: "flash-on",
                label: "Expo SDK 53",
                sub: "Plataforma de desarrollo y herramientas nativas",
              },
              {
                icon: "storage",
                label: "SQLite",
                sub: "Base de datos local embebida, 100% offline",
              },
              {
                icon: "route",
                label: "Expo Router",
                sub: "Navegación basada en archivos (file-based routing)",
              },
              {
                icon: "layers",
                label: "Zustand",
                sub: "Gestión de estado global ligera y reactiva",
              },
              {
                icon: "notifications",
                label: "Expo Notifications",
                sub: "Notificaciones locales y recordatorios",
              },
              {
                icon: "share",
                label: "Expo Sharing",
                sub: "Exportación de reportes en PDF y Excel",
              },
              {
                icon: "code",
                label: "TypeScript",
                sub: "Tipado estático para mayor seguridad",
              },
            ].map((item, i) => (
              <View key={i} style={styles.techItem}>
                <View style={[styles.techIcon, d.badgeBg]}>
                  <MaterialIcons
                    name={item.icon as any}
                    size={20}
                    color={C.primary}
                  />
                </View>
                <View style={styles.techInfo}>
                  <Text style={[styles.techLabel, d.titleText]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.techSub, d.subText]}>{item.sub}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ══════════════════════
          MODAL: GUÍA DE USO
      ══════════════════════ */}
      <Modal
        visible={activeModal === "guide"}
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.modalContainer, d.bg]}>
          <View
            style={[
              styles.modalHeader,
              d.surface,
              d.border,
              { paddingTop: insets.top + 8 },
            ]}
          >
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <MaterialIcons name="close" size={24} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, d.titleText]}>Guía de uso</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.infoModalContent}>
            {[
              {
                icon: "dashboard",
                color: C.primary,
                title: "Dashboard",
                steps: [
                  "Visualiza tu saldo actual, ingresos, gastos y ahorros del mes.",
                  "Usa las acciones rápidas para registrar gastos, ingresos o deudas.",
                  "Desliza una transacción hacia la izquierda para editarla o eliminarla.",
                ],
              },
              {
                icon: "receipt-long",
                color: "#7B1FA2",
                title: "Gastos e Ingresos",
                steps: [
                  "Filtra por Todos, Gastos o Ingresos con los botones superiores.",
                  "Filtra por categoría tocando los iconos de categorías.",
                  "Usa el buscador para encontrar transacciones por nombre o descripción.",
                  "Toca el botón + para agregar un gasto o ingreso nuevo.",
                ],
              },
              {
                icon: "bar-chart",
                color: "#00838F",
                title: "Estadísticas",
                steps: [
                  "Selecciona el período: Semana, Mes o Año.",
                  "Toca el ícono de calendario para filtrar por un período específico.",
                  "La tasa de ahorro muestra qué porcentaje de tus ingresos ahorras.",
                  "La salud financiera puntúa del 0 al 100 según tu balance.",
                ],
              },
              {
                icon: "account-balance",
                color: "#C62828",
                title: "Gestión de Deudas",
                steps: [
                  "Agrega deudas que debes tú (Debo yo) o que te deben a ti (Me deben).",
                  "Cambia entre Dinero a Pagar y Dinero a Recibir con las pestañas.",
                  "Usa Registrar Pago para marcar una deuda como pagada.",
                  "El historial guarda todos los pagos realizados.",
                ],
              },
              {
                icon: "settings",
                color: C.textSecondary,
                title: "Ajustes",
                steps: [
                  "Cambia entre modo claro y oscuro desde Apariencia.",
                  "Selecciona tu moneda preferida o agrega una nueva.",
                  "Exporta tus datos en PDF o Excel para compartirlos.",
                ],
              },
            ].map((section, i) => (
              <View key={i} style={styles.guideSection}>
                <View style={styles.guideSectionHeader}>
                  <View
                    style={[
                      styles.guideIcon,
                      { backgroundColor: section.color + "22" },
                    ]}
                  >
                    <MaterialIcons
                      name={section.icon as any}
                      size={20}
                      color={section.color}
                    />
                  </View>
                  <Text style={[styles.guideSectionTitle, d.titleText]}>
                    {section.title}
                  </Text>
                </View>
                {section.steps.map((step, j) => (
                  <View key={j} style={styles.guideStep}>
                    <View
                      style={[
                        styles.guideStepDot,
                        { backgroundColor: section.color },
                      ]}
                    />
                    <Text style={[styles.guideStepText, d.subText]}>
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ══════════════════════
          MODAL: LICENCIA
      ══════════════════════ */}
      <Modal
        visible={activeModal === "license"}
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.modalContainer, d.bg]}>
          <View
            style={[
              styles.modalHeader,
              d.surface,
              d.border,
              { paddingTop: insets.top + 8 },
            ]}
          >
            <TouchableOpacity onPress={() => setActiveModal(null)}>
              <MaterialIcons name="close" size={24} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, d.titleText]}>Licencia</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.infoModalContent}>
            <View style={styles.licenseBadge}>
              <MaterialIcons name="gavel" size={32} color="#F57F17" />
              <Text style={[styles.licenseTitle, d.titleText]}>
                MIT License
              </Text>
              <Text style={[styles.licenseSub, d.subText]}>
                Otorgada por GitHub
              </Text>
            </View>
            <Text style={[styles.licenseBody, d.subText]}>
              {`Copyright (c) 2026 Valta\n\nSe concede permiso, de forma gratuita, a cualquier persona que obtenga una copia de este software y de los archivos de documentación asociados (el Software), para tratar el Software sin restricción, incluyendo sin limitación los derechos de usar, copiar, modificar, fusionar, publicar, distribuir, sublicenciar y/o vender copias del Software.\n\nEl aviso de copyright anterior y este aviso de permiso se incluirán en todas las copias o partes sustanciales del Software.\n\nEL SOFTWARE SE PROPORCIONA TAL CUAL, SIN GARANTÍA DE NINGÚN TIPO, EXPRESA O IMPLÍCITA.`}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fixedHeader: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  fixedTitle: { fontSize: FontSize.xl, fontWeight: "bold" },
  scroll: { flex: 1 },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    overflow: "hidden",
  },

  // Apariencia
  modeRow: { flexDirection: "row", padding: Spacing.sm, gap: Spacing.sm },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  modeBtnActive: { borderColor: "#1565C0", backgroundColor: "#EEF4FF" },
  modeBtnText: { fontSize: FontSize.sm, fontWeight: "500" },

  // Moneda
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  rowTitle: { fontSize: FontSize.md, fontWeight: "600" },
  rowSub: { fontSize: FontSize.xs, marginTop: 2 },
  currencyBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: "center",
  },
  currencyBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  // Datos
  dataRow: { flexDirection: "row" },
  dataBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  dataIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  dataBtnLabel: { fontSize: FontSize.sm, fontWeight: "500" },
  dataDivider: { width: 1, marginVertical: Spacing.md },

  // Info
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { flex: 1, fontSize: FontSize.md, fontWeight: "500" },
  infoDivider: { height: 1, marginHorizontal: Spacing.md },

  // Contacto
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  contactIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: FontSize.sm, fontWeight: "600" },
  contactValue: { fontSize: FontSize.xs, marginTop: 1 },

  footer: { textAlign: "center", fontSize: FontSize.xs, margin: Spacing.xl },

  // Modales
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: "bold" },
  modalSub: {
    fontSize: FontSize.sm,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
  },

  // Monedas list
  curItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  curItemActive: { borderColor: "#1565C0", backgroundColor: "#EEF4FF" }, //este es el que hay cambiar
  curBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 52,
    alignItems: "center",
  },
  curBadgeText: { fontSize: FontSize.xs, fontWeight: "bold" },
  curInfo: { flex: 1 },
  curLabel: { fontSize: FontSize.sm, fontWeight: "600" },
  curSymbol: { fontSize: FontSize.xs, marginTop: 1 },
  defaultBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  defaultBadgeText: { fontSize: 10, fontWeight: "600" },

  // Agregar moneda
  addSectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm },
  addPresetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  noResultsText: {
    textAlign: "center",
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
  },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  addBtnText: { color: "#fff", fontSize: FontSize.md, fontWeight: "600" },

  // Acerca de
  infoModalContent: { padding: Spacing.lg },
  appLogoWrap: { alignItems: "center", marginBottom: Spacing.xl },
  appLogoTitle: { fontSize: 28, fontWeight: "bold", marginTop: Spacing.sm },
  appLogoVersion: { fontSize: FontSize.sm },
  infoModalSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  infoModalText: { fontSize: FontSize.sm, lineHeight: 22 },
  techItem: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: "flex-start",
  },
  techIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  techInfo: { flex: 1 },
  techLabel: { fontSize: FontSize.sm, fontWeight: "600" },
  techSub: { fontSize: FontSize.xs, marginTop: 2, lineHeight: 18 },

  // Guía
  guideSection: { marginBottom: Spacing.xl },
  guideSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  guideIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  guideSectionTitle: { fontSize: FontSize.md, fontWeight: "700" },
  guideStep: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    alignItems: "flex-start",
  },
  guideStepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  guideStepText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },

  // Licencia
  licenseBadge: { alignItems: "center", marginBottom: Spacing.xl },
  licenseTitle: {
    fontSize: FontSize.xl,
    fontWeight: "bold",
    marginTop: Spacing.sm,
  },
  licenseSub: { fontSize: FontSize.sm },
  licenseBody: { fontSize: FontSize.sm, lineHeight: 22 },
});
