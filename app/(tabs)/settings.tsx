import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '../../lib/constants/theme';
import { exportToPDF } from '../../lib/export/pdf';
import { exportToExcel } from '../../lib/export/excel';
import { useStore } from '../../lib/store/useStore';

const CURRENCIES = [
  { code: 'USD', label: 'Dólar Estadounidense' },
  { code: 'CUP', label: 'Peso Cubano' },
  { code: 'EUR', label: 'Euro' },
];

export default function SettingsScreen() {
  const { currency, setCurrency, isDarkMode, toggleDarkMode } = useStore();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="person" size={28} color={Colors.primary} />
        <Text style={styles.headerTitle}>Ajustes</Text>
        <TouchableOpacity>
          <MaterialIcons name="notifications-none" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Monedas */}
      <Text style={styles.sectionLabel}>MONEDAS</Text>
      <View style={styles.card}>
        {CURRENCIES.map((cur) => (
          <TouchableOpacity
            key={cur.code}
            style={styles.optionRow}
            onPress={() => setCurrency(cur.code)}
          >
            <View style={styles.currencyCode}>
              <Text style={styles.currencyCodeText}>{cur.code}</Text>
            </View>
            <Text style={styles.optionLabel}>{cur.label}</Text>
            <View style={[
              styles.radio,
              currency === cur.code && styles.radioSelected,
            ]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Apariencia */}
      <Text style={styles.sectionLabel}>APARIENCIA</Text>
      <View style={styles.card}>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, !isDarkMode && styles.modeBtnActive]}
            onPress={() => { if (isDarkMode) toggleDarkMode(); }}
          >
            <MaterialIcons name="wb-sunny" size={16} color={!isDarkMode ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.modeBtnText, !isDarkMode && { color: Colors.primary }]}>Modo Claro</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, isDarkMode && styles.modeBtnActive]}
            onPress={() => { if (!isDarkMode) toggleDarkMode(); }}
          >
            <MaterialIcons name="nightlight-round" size={16} color={isDarkMode ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.modeBtnText, isDarkMode && { color: Colors.primary }]}>Modo Oscuro</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gestión de datos */}
      <Text style={styles.sectionLabel}>GESTIÓN DE DATOS</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.dataBtn}
          onPress={() => exportToPDF().catch(() => Alert.alert('Error', 'No se pudo exportar el PDF'))}
        >
          <MaterialIcons name="picture-as-pdf" size={28} color={Colors.primary} />
          <Text style={styles.dataBtnLabel}>Exportar PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dataBtn}
          onPress={() => exportToExcel().catch(() => Alert.alert('Error', 'No se pudo exportar Excel'))}
        >
          <MaterialIcons name="table-chart" size={28} color={Colors.success} />
          <Text style={styles.dataBtnLabel}>Exportar Excel</Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <Text style={styles.sectionLabel}>INFORMACIÓN</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.infoRow}>
          <Text style={styles.optionLabel}>Acerca de FinTrack</Text>
          <View style={styles.infoRight}>
            <Text style={styles.versionText}>Versión 1.0.0</Text>
            <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>© 2024 FinTrack Financial Solutions.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.md,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.primary },
  sectionLabel: {
    fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary,
    marginHorizontal: Spacing.md, marginTop: Spacing.lg, marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md, overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  currencyCode: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, marginRight: Spacing.sm,
  },
  currencyCodeText: { fontSize: FontSize.xs, fontWeight: 'bold', color: Colors.primary },
  optionLabel: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
  },
  radioSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  modeRow: { flexDirection: 'row', padding: Spacing.sm, gap: Spacing.sm },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: Spacing.sm, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  modeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceSecondary },
  modeBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },
  dataBtn: {
    alignItems: 'center', padding: Spacing.xl,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  dataBtnLabel: { fontSize: FontSize.sm, color: Colors.textPrimary, marginTop: Spacing.sm, fontWeight: '500' },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md,
  },
  infoRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  versionText: { fontSize: FontSize.xs, color: Colors.textMuted },
  footer: {
    textAlign: 'center', fontSize: FontSize.xs, color: Colors.textMuted,
    margin: Spacing.xl,
  },
});