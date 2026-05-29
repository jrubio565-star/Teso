import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize } from '../../src/theme/colors';
import { useStore } from '../../src/store/useStore';

export default function HomeScreen() {
  const router = useRouter();
  const { budgets, setActiveBudget } = useStore();

  const handleSelectBudget = (budget: any) => {
    setActiveBudget(budget);
    router.push('/chat');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🤖</Text>
        <Text style={styles.headerTitle}>FinanzAI</Text>
        <Text style={styles.headerSubtitle}>Tu asistente financiero inteligente</Text>
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/crear-presupuesto')}
        >
          <Text style={styles.createButtonIcon}>➕</Text>
          <View style={styles.buttonContent}>
            <Text style={styles.createButtonText}>Crear presupuesto</Text>
            <Text style={styles.createButtonSubtext}>Nuevo presupuesto con IA</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mis presupuestos</Text>

        {budgets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💰</Text>
            <Text style={styles.emptyText}>No tienes presupuestos aún</Text>
            <Text style={styles.emptySubtext}>Crea tu primer presupuesto para empezar</Text>
          </View>
        ) : (
          <FlatList
            data={budgets}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.budgetCard}
                onPress={() => handleSelectBudget(item)}
              >
                <View style={styles.budgetInfo}>
                  <Text style={styles.budgetName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.budgetDesc}>{item.description}</Text>
                  ) : null}
                  <Text style={styles.budgetCategories}>
                    {item.categories.length} categorías
                  </Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  headerEmoji: { fontSize: 56, marginBottom: spacing.sm },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.primary },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },

  menuSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  createButtonIcon: { fontSize: 28 },
  buttonContent: { flex: 1 },
  createButtonText: { fontSize: fontSize.lg, fontWeight: '700', color: '#FFF' },
  createButtonSubtext: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  arrow: { fontSize: 24, color: 'rgba(255,255,255,0.7)' },

  section: { flex: 1, paddingHorizontal: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  emptyState: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  emptySubtext: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },

  budgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  budgetInfo: { flex: 1 },
  budgetName: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  budgetDesc: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  budgetCategories: { fontSize: fontSize.xs, color: colors.primaryLight, marginTop: spacing.xs },
});
