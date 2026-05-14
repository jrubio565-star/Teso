import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../../src/theme/colors';
import { useStore } from '../../src/store/useStore';
import CreateBudgetModal from '../../src/components/CreateBudgetModal';
import type { Budget } from '../../src/types';

function formatCOP(amount: number): string {
  return '$' + amount.toLocaleString('es-CO');
}

function typeIcon(type: string): string {
  switch (type) {
    case 'personal': return '👤';
    case 'pareja': return '💑';
    case 'hogar': return '🏠';
    case 'proyecto': return '🎯';
    default: return '💰';
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case 'personal': return 'Personal';
    case 'pareja': return 'Pareja';
    case 'hogar': return 'Hogar';
    case 'proyecto': return 'Proyecto';
    default: return type;
  }
}

function BudgetCard({ budget, isActive }: { budget: Budget; isActive: boolean }) {
  const totalSpent = budget.categories.reduce((sum, c) => sum + c.spent, 0);
  const percentage = budget.totalLimit > 0 ? (totalSpent / budget.totalLimit) * 100 : 0;

  return (
    <TouchableOpacity style={[styles.budgetCard, isActive && styles.budgetCardActive]} activeOpacity={0.7}>
      {isActive && (
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Activo</Text>
        </View>
      )}
      <View style={styles.budgetHeader}>
        <Text style={styles.budgetIcon}>{typeIcon(budget.type)}</Text>
        <View style={styles.budgetHeaderText}>
          <Text style={[styles.budgetName, isActive && styles.budgetNameActive]}>{budget.name}</Text>
          <Text style={[styles.budgetType, isActive && styles.budgetTypeActive]}>{typeLabel(budget.type)} · {budget.currency}</Text>
        </View>
      </View>

      <View style={styles.budgetStats}>
        <View style={styles.budgetStatItem}>
          <Text style={[styles.budgetStatLabel, isActive && styles.budgetStatLabelActive]}>Gastado</Text>
          <Text style={[styles.budgetStatValue, isActive && styles.budgetStatValueActive]}>{formatCOP(totalSpent)}</Text>
        </View>
        <View style={styles.budgetStatItem}>
          <Text style={[styles.budgetStatLabel, isActive && styles.budgetStatLabelActive]}>Limite</Text>
          <Text style={[styles.budgetStatValue, isActive && styles.budgetStatValueActive]}>{formatCOP(budget.totalLimit)}</Text>
        </View>
        <View style={styles.budgetStatItem}>
          <Text style={[styles.budgetStatLabel, isActive && styles.budgetStatLabelActive]}>Disponible</Text>
          <Text style={[styles.budgetStatValue, { color: colors.income }, isActive && { color: '#34D399' }]}>
            {formatCOP(budget.totalLimit - totalSpent)}
          </Text>
        </View>
      </View>

      {/* Progress */}
      <View style={[styles.progressBarBg, isActive && styles.progressBarBgActive]}>
        <View style={[styles.progressBarFill, {
          width: `${Math.min(percentage, 100)}%`,
          backgroundColor: isActive ? '#34D399' : colors.primaryLight,
        }]} />
      </View>

      {/* Categories preview */}
      <View style={styles.categoriesPreview}>
        <Text style={[styles.categoriesLabel, isActive && styles.categoriesLabelActive]}>
          {budget.categories.length} categorias
        </Text>
        <View style={styles.categoryIcons}>
          {budget.categories.slice(0, 6).map(c => (
            <Text key={c.id} style={styles.categoryPreviewIcon}>{c.icon}</Text>
          ))}
          {budget.categories.length > 6 && (
            <Text style={[styles.categoryMore, isActive && styles.categoryMoreActive]}>
              +{budget.categories.length - 6}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function BudgetsScreen() {
  const { budgets, activeBudget } = useStore();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Presupuestos</Text>
          <Text style={styles.subtitle}>Gestiona tus presupuestos activos</Text>
        </View>

        {/* Create new */}
        <TouchableOpacity style={styles.createButton} activeOpacity={0.7} onPress={() => setShowCreate(true)}>
          <Text style={styles.createIcon}>+</Text>
          <View>
            <Text style={styles.createText}>Crear Nuevo Presupuesto</Text>
            <Text style={styles.createSubtext}>Usa el chat IA para configurarlo</Text>
          </View>
        </TouchableOpacity>

        {/* Budget list */}
        <View style={styles.budgetList}>
          {budgets.map(budget => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              isActive={activeBudget?.id === budget.id}
            />
          ))}
        </View>

        {/* Tip */}
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Tip: Presupuestos compartidos</Text>
            <Text style={styles.tipText}>
              Con el plan Premium puedes crear presupuestos de pareja o hogar y compartirlos con otra persona para llevar las finanzas juntos.
            </Text>
          </View>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <CreateBudgetModal visible={showCreate} onClose={() => setShowCreate(false)} />
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
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },

  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
    gap: spacing.md,
  },
  createIcon: {
    fontSize: 32,
    color: colors.primaryLight,
    fontWeight: '300',
    width: 44,
    textAlign: 'center',
  },
  createText: { fontSize: fontSize.md, fontWeight: '600', color: colors.primary },
  createSubtext: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },

  budgetList: { paddingHorizontal: spacing.lg },
  budgetCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  budgetCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  activeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  activeBadgeText: { fontSize: fontSize.xs, color: colors.textOnPrimary, fontWeight: '700' },

  budgetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  budgetIcon: { fontSize: 32 },
  budgetHeaderText: { flex: 1 },
  budgetName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  budgetNameActive: { color: colors.textOnPrimary },
  budgetType: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  budgetTypeActive: { color: 'rgba(255,255,255,0.7)' },

  budgetStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  budgetStatItem: { alignItems: 'center' },
  budgetStatLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  budgetStatLabelActive: { color: 'rgba(255,255,255,0.6)' },
  budgetStatValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginTop: 2 },
  budgetStatValueActive: { color: colors.textOnPrimary },

  progressBarBg: {
    height: 8,
    backgroundColor: colors.divider,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarBgActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  categoriesPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoriesLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  categoriesLabelActive: { color: 'rgba(255,255,255,0.7)' },
  categoryIcons: { flexDirection: 'row', gap: spacing.xs },
  categoryPreviewIcon: { fontSize: 18 },
  categoryMore: { fontSize: fontSize.xs, color: colors.textTertiary, marginLeft: spacing.xs },
  categoryMoreActive: { color: 'rgba(255,255,255,0.5)' },

  tipCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tipIcon: { fontSize: 24 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: fontSize.md, fontWeight: '600', color: '#92400E', marginBottom: spacing.xs },
  tipText: { fontSize: fontSize.sm, color: '#A16207', lineHeight: 20 },
});
