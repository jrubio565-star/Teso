import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize } from '../../src/theme/colors';
import { useStore } from '../../src/store/useStore';

function formatCOP(amount: number): string {
  return '$' + amount.toLocaleString('es-CO');
}

function ProgressBar({ percentage, color }: { percentage: number; color: string }) {
  const [barWidth, setBarWidth] = React.useState(0);
  const clampedPct = Math.min(percentage, 100);
  const fillWidth = barWidth * (clampedPct / 100);
  return (
    <View style={styles.progressBarBg} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
      <View style={[styles.progressBarFill, { width: fillWidth, backgroundColor: color }]} />
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { activeBudget, transactions, budgets, setActiveBudget } = useStore();

  if (!activeBudget) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>Sin presupuesto activo</Text>
          <Text style={styles.emptySubtitle}>Crea o selecciona un presupuesto para ver tu resumen</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/(tabs)/')}>
            <Text style={styles.emptyButtonText}>Ir a Mis presupuestos</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calcular gastos por categoría desde transacciones
  const now = new Date();
  const monthTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear() &&
      t.budgetId === activeBudget.id;
  });

  const totalIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  // Gastos por categoría
  const categorySpending = activeBudget.categories.map(cat => {
    const spent = monthTransactions
      .filter(t => t.categoryId === cat.id && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const percentage = cat.monthlyLimit > 0 ? (spent / cat.monthlyLimit) * 100 : 0;
    return { ...cat, spent, percentage };
  });

  const totalLimit = activeBudget.categories.reduce((sum, c) => sum + c.monthlyLimit, 0);
  const totalPercentage = totalLimit > 0 ? (totalExpenses / totalLimit) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📊 Resumen</Text>
          <Text style={styles.headerSubtitle}>{activeBudget.name}</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Ingresos</Text>
              <Text style={[styles.balanceValue, { color: colors.income }]}>
                {formatCOP(totalIncome)}
              </Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Gastos</Text>
              <Text style={[styles.balanceValue, { color: colors.expense }]}>
                {formatCOP(totalExpenses)}
              </Text>
            </View>
          </View>
          <View style={styles.balanceTotal}>
            <Text style={styles.balanceTotalLabel}>Balance del Mes</Text>
            <Text style={[styles.balanceTotalValue, { color: balance >= 0 ? colors.income : colors.expense }]}>
              {balance >= 0 ? '+' : ''}{formatCOP(balance)}
            </Text>
          </View>
        </View>

        {/* Progreso general */}
        {totalLimit > 0 && (
          <View style={styles.section}>
            <View style={styles.overallProgress}>
              <View style={styles.overallRow}>
                <Text style={styles.overallLabel}>Gastado del total</Text>
                <Text style={styles.overallAmount}>
                  {formatCOP(totalExpenses)} / {formatCOP(totalLimit)}
                </Text>
              </View>
              <ProgressBar percentage={totalPercentage} color={colors.primaryLight} />
              <Text style={styles.overallPct}>{Math.round(totalPercentage)}% utilizado</Text>
            </View>
          </View>
        )}

        {/* Categorías */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por categoría</Text>

          {categorySpending.length === 0 ? (
            <View style={styles.noCategoriesBox}>
              <Text style={styles.noCategoriesText}>No hay categorías en este presupuesto.</Text>
              <TouchableOpacity onPress={() => router.push('/chat')}>
                <Text style={styles.noCategoriesLink}>Ir al chat para agregar →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            categorySpending.map((cat) => {
              const isOver = cat.percentage > 100;
              const isWarning = cat.percentage > 80;
              return (
                <View key={cat.id} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryLeft}>
                      <Text style={styles.categoryIcon}>{cat.icon}</Text>
                      <View>
                        <Text style={styles.categoryName}>{cat.name}</Text>
                        <Text style={styles.categoryAmount}>
                          {formatCOP(cat.spent)}
                          {cat.monthlyLimit > 0 ? ` / ${formatCOP(cat.monthlyLimit)}` : ''}
                        </Text>
                      </View>
                    </View>
                    {cat.monthlyLimit > 0 && (
                      <View style={[
                        styles.badge,
                        isOver && styles.badgeRed,
                        isWarning && !isOver && styles.badgeYellow,
                      ]}>
                        <Text style={[
                          styles.badgeText,
                          isOver && styles.badgeTextRed,
                          isWarning && !isOver && styles.badgeTextYellow,
                        ]}>
                          {Math.round(cat.percentage)}%
                        </Text>
                      </View>
                    )}
                  </View>
                  {cat.monthlyLimit > 0 && (
                    <ProgressBar percentage={cat.percentage} color={cat.color} />
                  )}
                  {cat.monthlyLimit === 0 && cat.spent > 0 && (
                    <Text style={styles.noLimit}>Gastado: {formatCOP(cat.spent)} · Sin límite definido</Text>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Otros presupuestos */}
        {budgets.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Otros presupuestos</Text>
            {budgets.filter(b => b.id !== activeBudget.id).map(b => (
              <TouchableOpacity
                key={b.id}
                style={styles.otherBudget}
                onPress={() => setActiveBudget(b)}
              >
                <View>
                  <Text style={styles.otherBudgetName}>{b.name}</Text>
                  <Text style={styles.otherBudgetCats}>{b.categories.length} categorías</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  emptySubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  emptyButton: { backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.md, paddingHorizontal: spacing.xl },
  emptyButtonText: { fontSize: fontSize.md, fontWeight: '700', color: '#FFF' },

  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },

  balanceCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  balanceItem: { alignItems: 'center' },
  balanceLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)', marginBottom: spacing.xs },
  balanceValue: { fontSize: fontSize.lg, fontWeight: '700' },
  balanceDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  balanceTotal: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  balanceTotalLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)' },
  balanceTotalValue: { fontSize: fontSize.xxl, fontWeight: '800', marginTop: spacing.xs },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  overallProgress: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  overallLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  overallAmount: { fontSize: fontSize.sm, color: colors.text, fontWeight: '700' },
  overallPct: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.xs, textAlign: 'right' },

  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  categoryIcon: { fontSize: 28 },
  categoryName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  categoryAmount: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  badge: {
    backgroundColor: colors.divider,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeYellow: { backgroundColor: '#FEF3C7' },
  badgeRed: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textSecondary },
  badgeTextYellow: { color: '#D97706' },
  badgeTextRed: { color: '#DC2626' },
  noLimit: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.xs },
  noCategoriesBox: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  noCategoriesText: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  noCategoriesLink: { fontSize: fontSize.sm, color: colors.primaryLight, fontWeight: '600' },

  progressBarBg: { height: 8, backgroundColor: colors.divider, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, borderRadius: 4 },

  otherBudget: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  otherBudgetName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  otherBudgetCats: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  arrow: { fontSize: 24, color: colors.textTertiary },
});
