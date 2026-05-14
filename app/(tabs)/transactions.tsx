import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize } from '../../src/theme/colors';
import { useStore } from '../../src/store/useStore';
import type { Transaction } from '../../src/types';

function formatCOP(amount: number): string {
  return '$' + amount.toLocaleString('es-CO');
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function sourceIcon(source: string): string {
  switch (source) {
    case 'email': return '📧';
    case 'notification': return '🔔';
    case 'manual': return '✏️';
    case 'ocr': return '📷';
    default: return '📄';
  }
}

function TransactionItem({ item }: { item: Transaction }) {
  const isIncome = item.type === 'income';
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.transactionItem}
      activeOpacity={0.7}
      onPress={() => router.push(`/(tabs)/transaction/${item.id}` as any)}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.categoryColor + '20' }]}>
        <Text style={styles.categoryEmoji}>{item.categoryIcon}</Text>
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDesc} numberOfLines={1}>{item.description}</Text>
        <View style={styles.transactionMeta}>
          <Text style={styles.transactionCategory}>{item.categoryName}</Text>
          <Text style={styles.metaDot}> · </Text>
          <Text style={styles.transactionSource}>{sourceIcon(item.source)}</Text>
          {item.aiConfidence && item.aiConfidence < 0.95 && (
            <>
              <Text style={styles.metaDot}> · </Text>
              <Text style={styles.lowConfidence}>Verificar</Text>
            </>
          )}
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[styles.transactionAmount, { color: isIncome ? colors.income : colors.expense }]}>
          {isIncome ? '+' : '-'}{formatCOP(item.amount)}
        </Text>
        <Text style={styles.transactionTime}>
          {new Date(item.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TransactionsScreen() {
  const { transactions } = useStore();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const filtered = transactions
    .filter(t => filter === 'all' || t.type === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by date
  const grouped: { date: string; data: Transaction[] }[] = [];
  filtered.forEach(t => {
    const dateKey = formatDate(t.date);
    const existing = grouped.find(g => g.date === dateKey);
    if (existing) existing.data.push(t);
    else grouped.push({ date: dateKey, data: [t] });
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Movimientos</Text>
        <Text style={styles.subtitle}>{filtered.length} transacciones este mes</Text>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {[
          { key: 'all', label: 'Todos' },
          { key: 'expense', label: 'Gastos' },
          { key: 'income', label: 'Ingresos' },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterButton, filter === f.key && styles.filterButtonActive]}
            onPress={() => setFilter(f.key as any)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={grouped}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <View>
            <Text style={styles.dateHeader}>{item.date}</Text>
            {item.data.map(t => <TransactionItem key={t.id} item={t} />)}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No hay transacciones</Text>
            <Text style={styles.emptySubtext}>Las transacciones apareceran aqui automaticamente</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },

  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: colors.textOnPrimary },

  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  dateHeader: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: { fontSize: 22 },
  transactionInfo: { flex: 1 },
  transactionDesc: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  transactionMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  transactionCategory: { fontSize: fontSize.xs, color: colors.textSecondary },
  metaDot: { color: colors.textTertiary },
  transactionSource: { fontSize: 12 },
  lowConfidence: { fontSize: fontSize.xs, color: colors.warning, fontWeight: '600' },
  transactionRight: { alignItems: 'flex-end' },
  transactionAmount: { fontSize: fontSize.md, fontWeight: '700' },
  transactionTime: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },

  empty: { alignItems: 'center', paddingTop: spacing.xxl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  emptySubtext: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
});
