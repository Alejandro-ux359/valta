import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '@/lib/constants/theme';
import { addTransaction } from '@/lib/database/transactions';
import { sendLocalNotification } from '@/lib/notifications';
import { AmountInput } from '@/components/forms/AmountInput';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';

const INCOME_CATEGORIES = [
  { id: 10, name: 'Salario',     icon: 'work',         color: '#2E7D32' },
  { id: 11, name: 'Freelance',   icon: 'laptop',       color: '#1B5E20' },
  { id: 12, name: 'Inversiones', icon: 'trending-up',  color: '#0D47A1' },
  { id: 13, name: 'Otros',       icon: 'attach-money', color: '#33691E' },
];

export default function AddIncomeModal() {
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSave = async () => {
    setAmountError('');
    if (!amount) { setAmountError('Ingresa un monto'); return; }
    const num = parseFloat(amount.replace(',', '.'));
    if (isNaN(num) || num <= 0) { setAmountError('Monto inválido'); return; }
    if (!selectedCategory) { Alert.alert('Categoría', 'Selecciona una categoría'); return; }

    setLoading(true);
    try {
      await addTransaction({
        type: 'income',
        amount: num,
        description,
        category_id: selectedCategory,
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      await sendLocalNotification(
        '💰 Ingreso registrado',
        `+$${num.toFixed(2)} en ${INCOME_CATEGORIES.find((c) => c.id === selectedCategory)?.name}`,
        'income'
      );
      router.back();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el ingreso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Agregar Ingreso</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Monto */}
        <AmountInput value={amount} onChange={setAmount} error={amountError} currency="$" />

        {/* Descripción */}
        <View style={styles.inputRow}>
          <MaterialIcons name="notes" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Descripción (opcional)"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Categorías */}
        <Text style={styles.sectionLabel}>Categoría</Text>
        <View style={styles.grid}>
          {INCOME_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catItem,
                selectedCategory === cat.id && styles.catSelected,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
                <MaterialIcons name={cat.icon as any} size={24} color={cat.color} />
              </View>
              <Text style={styles.catName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Footer respetando área segura */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <Button
          label={loading ? 'Guardando...' : 'Guardar Ingreso'}
          onPress={handleSave}
          loading={loading}
          variant="primary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingTop: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  content: { flex: 1, paddingHorizontal: Spacing.md },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.lg,
  },
  input: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  catItem: {
    width: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  catSelected: {
    borderColor: Colors.success,
    backgroundColor: '#E8F5E9',
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
});