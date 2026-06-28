import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '@/lib/constants/theme';
import { useColors } from '@/lib/hooks/useColors';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface Debt {
  id?: number;
  type: 'payable' | 'receivable';
  contact_name: string;
  amount: number;
  description?: string;
  due_date?: string;
  status: 'pending' | 'paid' | 'overdue';
}

interface DebtItemProps {
  debt: Debt;
  onMarkPaid?: () => void;
  onPress?: () => void;
}

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  overdue: { label: 'VENCIDO',   bg: '#FFEBEE', text: '#C62828' },
  pending: { label: 'PENDIENTE', bg: '#FFF8E1', text: '#F57F17' },
  paid:    { label: 'PAGADO',    bg: '#E8F5E9', text: '#2E7D32' },
};

export function DebtItem({ debt, onMarkPaid, onPress }: DebtItemProps) {
  const C = useColors();
  const isPayable = debt.type === 'payable';
  const badge = STATUS_BADGE[debt.status];
  const initials = debt.contact_name.slice(0, 2).toUpperCase();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: C.white },
        debt.status === 'overdue' && styles.overdueLeft,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: isPayable ? '#FFEBEE' : '#E8F5E9' }]}>
        <Text style={[styles.initials, { color: isPayable ? Colors.danger : Colors.success }]}>
          {initials}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: C.textPrimary }]}>{debt.contact_name}</Text>
          <Text style={[styles.amount, { color: isPayable ? Colors.danger : Colors.success }]}>
            {isPayable ? '-' : '+'}{debt.amount.toFixed(2)}
          </Text>
        </View>

        <Text style={[styles.desc, { color: C.textSecondary }]} numberOfLines={1}>
          {debt.description ?? 'Sin descripción'}
        </Text>

        <View style={styles.bottomRow}>
          {debt.due_date && (
            <View style={styles.dateRow}>
              <MaterialIcons name="event" size={12} color={C.textMuted} />
              <Text style={[styles.dateText, { color: C.textMuted }]}>
                {debt.status === 'paid' ? 'Pagado el ' : 'Vence el '}
                {format(new Date(debt.due_date), 'd MMM', { locale: es })}
              </Text>
            </View>
          )}
          <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        {debt.status !== 'paid' && onMarkPaid && (
          <TouchableOpacity style={styles.markBtn} onPress={onMarkPaid}>
            <Text style={styles.markBtnText}>Marcar como pagado</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  overdueLeft: { borderLeftColor: Colors.danger },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  initials: { fontSize: FontSize.md, fontWeight: 'bold' },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name:   { fontSize: FontSize.md, fontWeight: '600' },
  amount: { fontSize: FontSize.md, fontWeight: 'bold' },
  desc:   { fontSize: FontSize.xs, marginTop: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  dateRow:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dateText:  { fontSize: FontSize.xs },
  badgePill: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  markBtn:   { marginTop: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  markBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '600' },
});