import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../../src/theme/colors';
import { useStore } from '../../src/store/useStore';
import NotificationPermissionBanner from '../../src/components/NotificationPermissionBanner';

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

function CategoryCard({ item }: { item: any }) {
  const isOverBudget = item.percentage > 100;
  const isWarning = item.percentage > 80;
  return (
    <View style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryLeft}>
          <Text style={styles.categoryIcon}>{item.categoryIcon}</Text>
          <View>
            <Text style={styles.categoryName}>{item.categoryName}</Text>
            <Text style={styles.categoryAmount}>
              {formatCOP(item.spent)} / {formatCOP(item.limit)}
            </Text>
          </View>
        </View>
        <View style={[
          styles.percentageBadge,
          isOverBudget && styles.percentageBadgeRed,
          isWarning && !isOverBudget && styles.percentageBadgeYellow,
        ]}>
          <Text style={[
            styles.percentageText,
            isOverBudget && styles.percentageTextRed,
            isWarning && !isOverBudget && styles.percentageTextYellow,
          ]}>
            {Math.round(item.percentage)}%
          </Text>
        </View>
      </View>
      <ProgressBar percentage={item.percentage} color={item.categoryColor} />
    </View>
  );
}

export default function DashboardScreen() {
  const { getMonthlyStats, activeBudget } = useStore();
  const stats = getMonthlyStats();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Buenos dias 👋</Text>
          <Text style={styles.title}>Tu Resumen de Abril</Text>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Ingresos</Text>
              <Text style={[styles.balanceValue, { color: colors.income }]}>
                {formatCOP(stats.totalIncome)}
              </Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Gastos</Text>
              <Text style={[styles.balanceValue, { color: colors.expense }]}>
                {formatCOP(stats.totalExpenses)}
              </Text>
            </View>
          </View>
          <View style={styles.balanceTotal}>
            <Text style={styles.balanceTotalLabel}>Balance del Mes</Text>
            <Text style={[
              styles.balanceTotalValue,
              { color: stats.balance >= 0 ? colors.income : colors.expense }
            ]}>
              {stats.balance >= 0 ? '+' : ''}{formatCOP(stats.balance)}
            </Text>
          </View>
        </View>

        <NotificationPermissionBanner />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Progreso del Presupuesto</Text>
          <Text style={styles.sectionSubtitle}>
            {activeBudget?.name || 'Sin presupuesto activo'}
          </Text>

          <View style={styles.overallProgress}>
            <View style={styles.overallRow}>
              <Text style={styles.overallLabel}>Gastado del total</Text>
              <Text style={styles.overallAmount}>
                {formatCOP(stats.totalExpenses)} / {formatCOP(activeBudget?.totalLimit || 0)}
              </Text>
            </View>
            <ProgressBar
              percentage={activeBudget?.totalLimit ? (stats.totalExpenses / activeBudget.totalLimit) * 100 : 0}
              color={colors.primaryLight}
            />
          </View>

          {stats.categoryBreakdown.map((item) => (
            <CategoryCard key={item.categoryId} item={item} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Insights de FinanzAI</Text>
          <View style={styles.insightCard}>
            <Text style={styles.insightIcon}>⚠️</Text>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Servicios casi al limite</Text>
              <Text style={styles.insightText}>
                Has gastado el 90% de tu presupuesto de servicios. Te quedan $50,000 para el resto del mes.
              </Text>
            </View>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightIcon}>🎉</Text>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Meta de ahorro cumplida</Text>
              <Text style={styles.insightText}>
                Completaste tu meta de ahorro de $500,000 este mes. ¡Excelente disciplina!
              </Text>
            </View>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightIcon}>📉</Text>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Alimentacion bajo control</Text>
              <Text style={styles.insightText}>
                Gastas un 8% menos en alimentacion comparado con el mes pasado.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  greeting: { fontSize: fontSize.md, color: colors.textSecondary },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginTop: spacing.xs },

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
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  sectionSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md },

  overallProgress: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  overallLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  overallAmount: { fontSize: fontSize.sm, color: colors.text, fontWeight: '700' },

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
  percentageBadge: {
    backgroundColor: colors.divider,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  percentageBadgeYellow: { backgroundColor: '#FEF3C7' },
  percentageBadgeRed: { backgroundColor: '#FEE2E2' },
  percentageText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textSecondary },
  percentageTextYellow: { color: '#D97706' },
  percentageTextRed: { color: '#DC2626' },

  progressBarBg: {
    height: 8,
    backgroundColor: colors.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },

  insightCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  insightIcon: { fontSize: 24, marginTop: 2 },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  insightText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
});
