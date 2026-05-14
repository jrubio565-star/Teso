import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../theme/colors';
import { useStore } from '../store/useStore';
import type { Budget, Category, BudgetType } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

const BUDGET_TYPES: { key: BudgetType; icon: string; label: string; desc: string }[] = [
  { key: 'personal', icon: '👤', label: 'Personal', desc: 'Solo para mis gastos e ingresos' },
  { key: 'pareja', icon: '💑', label: 'Pareja', desc: 'Gastos compartidos con mi pareja' },
  { key: 'hogar', icon: '🏠', label: 'Hogar', desc: 'Gastos del hogar y familia' },
  { key: 'proyecto', icon: '🎯', label: 'Proyecto', desc: 'Para un objetivo o proyecto específico' },
];

const DEFAULT_CATEGORIES: { name: string; icon: string; color: string; suggestedLimit: number }[] = [
  { name: 'Alimentación', icon: '🍔', color: '#FF6B6B', suggestedLimit: 600000 },
  { name: 'Transporte', icon: '🚗', color: '#4ECDC4', suggestedLimit: 300000 },
  { name: 'Entretenimiento', icon: '🎬', color: '#9B59B6', suggestedLimit: 200000 },
  { name: 'Servicios', icon: '💡', color: '#3498DB', suggestedLimit: 400000 },
  { name: 'Salud', icon: '🏥', color: '#2ECC71', suggestedLimit: 150000 },
  { name: 'Educación', icon: '📚', color: '#F1C40F', suggestedLimit: 200000 },
  { name: 'Compras', icon: '🛍', color: '#E74C3C', suggestedLimit: 250000 },
  { name: 'Ahorro', icon: '🏦', color: '#27AE60', suggestedLimit: 500000 },
  { name: 'Otros', icon: '📦', color: '#95A5A6', suggestedLimit: 200000 },
];

function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <View style={styles.stepRow}>
      {Array.from({ length: total }, (_, i) => i + 1).map(s => (
        <React.Fragment key={s}>
          <View style={[styles.stepDot, s <= current && styles.stepDotActive]}>
            {s < current
              ? <Text style={styles.stepCheck}>✓</Text>
              : <Text style={[styles.stepNum, s === current && styles.stepNumActive]}>{s}</Text>
            }
          </View>
          {s < total && <View style={[styles.stepLine, s < current && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Step 1: Tipo y nombre ────────────────────────────────────────────────────
function Step1({
  selectedType, name, limit,
  onTypeSelect, onNameChange, onLimitChange,
}: {
  selectedType: BudgetType | null; name: string; limit: string;
  onTypeSelect: (t: BudgetType) => void; onNameChange: (s: string) => void; onLimitChange: (s: string) => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>¿Qué tipo de presupuesto?</Text>
      <View style={styles.typeGrid}>
        {BUDGET_TYPES.map(bt => (
          <TouchableOpacity
            key={bt.key}
            style={[styles.typeCard, selectedType === bt.key && styles.typeCardSelected]}
            onPress={() => onTypeSelect(bt.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.typeIcon}>{bt.icon}</Text>
            <Text style={[styles.typeLabel, selectedType === bt.key && styles.typeLabelSelected]}>
              {bt.label}
            </Text>
            <Text style={styles.typeDesc}>{bt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Nombre del presupuesto</Text>
      <TextInput
        style={styles.textInput}
        value={name}
        onChangeText={onNameChange}
        placeholder="Ej: Mi presupuesto 2026"
        placeholderTextColor={colors.textTertiary}
      />

      <Text style={styles.fieldLabel}>Límite mensual total (COP)</Text>
      <View style={styles.amountInput}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          style={styles.amountField}
          value={limit}
          onChangeText={onLimitChange}
          placeholder="3.000.000"
          placeholderTextColor={colors.textTertiary}
          keyboardType="numeric"
        />
      </View>
    </ScrollView>
  );
}

// ─── Step 2: Categorías ───────────────────────────────────────────────────────
function Step2({
  selected, onToggle,
}: {
  selected: Set<string>; onToggle: (name: string) => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Elige tus categorías</Text>
      <Text style={styles.stepSubtitle}>
        Selecciona las que usarás. Puedes agregar más luego.
      </Text>
      <View style={styles.catGrid}>
        {DEFAULT_CATEGORIES.map(cat => {
          const isSelected = selected.has(cat.name);
          return (
            <TouchableOpacity
              key={cat.name}
              style={[styles.catChip, isSelected && { backgroundColor: cat.color + '20', borderColor: cat.color }]}
              onPress={() => onToggle(cat.name)}
              activeOpacity={0.7}
            >
              <Text style={styles.catChipIcon}>{cat.icon}</Text>
              <Text style={[styles.catChipName, isSelected && { color: cat.color, fontWeight: '700' }]}>
                {cat.name}
              </Text>
              {isSelected && <Text style={[styles.catCheck, { color: cat.color }]}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Step 3: Límites por categoría ───────────────────────────────────────────
function Step3({
  selectedCats, limits, onLimitChange,
}: {
  selectedCats: string[]; limits: Record<string, string>; onLimitChange: (name: string, val: string) => void;
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Define los límites</Text>
      <Text style={styles.stepSubtitle}>¿Cuánto quieres gastar en cada categoría?</Text>
      {selectedCats.map(name => {
        const cat = DEFAULT_CATEGORIES.find(c => c.name === name)!;
        return (
          <View key={name} style={styles.limitRow}>
            <Text style={styles.limitIcon}>{cat.icon}</Text>
            <View style={styles.limitInfo}>
              <Text style={styles.limitName}>{name}</Text>
              <Text style={styles.limitSuggested}>
                Sugerido: ${cat.suggestedLimit.toLocaleString('es-CO')}
              </Text>
            </View>
            <View style={styles.limitInputWrap}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.limitInput}
                value={limits[name] ?? cat.suggestedLimit.toString()}
                onChangeText={v => onLimitChange(name, v)}
                keyboardType="numeric"
                placeholder={cat.suggestedLimit.toString()}
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function CreateBudgetModal({ visible, onClose }: Props) {
  const { addBudget, setActiveBudget } = useStore();

  const [step, setStep] = useState<Step>(1);
  const [budgetType, setBudgetType] = useState<BudgetType | null>(null);
  const [budgetName, setBudgetName] = useState('');
  const [totalLimit, setTotalLimit] = useState('');
  const [selectedCats, setSelectedCats] = useState<Set<string>>(
    new Set(['Alimentación', 'Transporte', 'Servicios', 'Ahorro'])
  );
  const [catLimits, setCatLimits] = useState<Record<string, string>>({});

  const toggleCat = (name: string) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const canNext = (): boolean => {
    if (step === 1) return !!budgetType && budgetName.trim().length > 0 && totalLimit.trim().length > 0;
    if (step === 2) return selectedCats.size > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 3) setStep((step + 1) as Step);
    else handleCreate();
  };

  const handleCreate = () => {
    const limitNum = parseFloat(totalLimit.replace(/\./g, '').replace(',', '.')) || 0;

    const categories: Category[] = Array.from(selectedCats).map((name, i) => {
      const def = DEFAULT_CATEGORIES.find(c => c.name === name)!;
      const limitStr = catLimits[name] ?? def.suggestedLimit.toString();
      return {
        id: `cat_${Date.now()}_${i}`,
        budgetId: '',  // will be set below
        name,
        icon: def.icon,
        color: def.color,
        monthlyLimit: parseFloat(limitStr.replace(/\./g, '')) || def.suggestedLimit,
        spent: 0,
      };
    });

    const newBudget: Budget = {
      id: `b_${Date.now()}`,
      userId: 'demo',
      name: budgetName.trim(),
      type: budgetType!,
      totalLimit: limitNum,
      currency: 'COP',
      isActive: true,
      createdAt: new Date().toISOString(),
      categories: categories.map(c => ({ ...c, budgetId: `b_${Date.now()}` })),
    };

    addBudget(newBudget);
    setActiveBudget(newBudget);

    Alert.alert('🎉 ¡Listo!', `Presupuesto "${newBudget.name}" creado con ${categories.length} categorías.`);
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setBudgetType(null);
    setBudgetName('');
    setTotalLimit('');
    setSelectedCats(new Set(['Alimentación', 'Transporte', 'Servicios', 'Ahorro']));
    setCatLimits({});
    onClose();
  };

  const stepLabels = ['Tipo', 'Categorías', 'Límites'];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Crear presupuesto</Text>
            <Text style={styles.stepLabel}>{stepLabels[step - 1]}</Text>
          </View>

          <StepIndicator current={step} total={3} />

          <View style={styles.stepContent}>
            {step === 1 && (
              <Step1
                selectedType={budgetType}
                name={budgetName}
                limit={totalLimit}
                onTypeSelect={setBudgetType}
                onNameChange={setBudgetName}
                onLimitChange={setTotalLimit}
              />
            )}
            {step === 2 && (
              <Step2 selected={selectedCats} onToggle={toggleCat} />
            )}
            {step === 3 && (
              <Step3
                selectedCats={Array.from(selectedCats)}
                limits={catLimits}
                onLimitChange={(name, val) => setCatLimits(prev => ({ ...prev, [name]: val }))}
              />
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {step > 1 && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep((step - 1) as Step)}
              >
                <Text style={styles.backBtnText}>← Atrás</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextBtn, !canNext() && styles.nextBtnDisabled]}
              onPress={handleNext}
              disabled={!canNext()}
            >
              <Text style={styles.nextBtnText}>
                {step === 3 ? '🎉 Crear presupuesto' : 'Siguiente →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  closeBtn: { fontSize: 20, color: colors.textSecondary, padding: spacing.xs },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  stepLabel: { fontSize: fontSize.sm, color: colors.primaryLight, fontWeight: '600' },

  stepRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, gap: 0,
  },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.divider, alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepNum: { fontSize: fontSize.sm, color: colors.textTertiary, fontWeight: '700' },
  stepNumActive: { color: '#FFF' },
  stepCheck: { fontSize: fontSize.sm, color: '#FFF', fontWeight: '700' },
  stepLine: { width: 40, height: 2, backgroundColor: colors.divider },
  stepLineActive: { backgroundColor: colors.primary },

  stepContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  stepTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  stepSubtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.md },

  // Step 1
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  typeCard: {
    width: '47%', backgroundColor: colors.background, borderRadius: borderRadius.md,
    padding: spacing.md, borderWidth: 2, borderColor: colors.border, alignItems: 'center',
  },
  typeCardSelected: { borderColor: colors.primary, backgroundColor: '#EFF6FF' },
  typeIcon: { fontSize: 32, marginBottom: spacing.xs },
  typeLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  typeLabelSelected: { color: colors.primary },
  typeDesc: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  textInput: {
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.md, color: colors.text, borderWidth: 1,
    borderColor: colors.border, marginBottom: spacing.md,
  },
  amountInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
  },
  currencySymbol: { fontSize: fontSize.lg, color: colors.textSecondary, marginRight: spacing.xs },
  amountField: { flex: 1, fontSize: fontSize.lg, color: colors.text, paddingVertical: spacing.md },

  // Step 2
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.background,
  },
  catChipIcon: { fontSize: 18 },
  catChipName: { fontSize: fontSize.sm, color: colors.text },
  catCheck: { fontSize: fontSize.xs, fontWeight: '700' },

  // Step 3
  limitRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  limitIcon: { fontSize: 28 },
  limitInfo: { flex: 1 },
  limitName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  limitSuggested: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  limitInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  limitInput: { fontSize: fontSize.md, color: colors.text, width: 90, paddingVertical: spacing.sm },

  // Footer
  footer: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  backBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.background, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  backBtnText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },
  nextBtn: {
    flex: 2, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: colors.border },
  nextBtnText: { fontSize: fontSize.md, color: '#FFF', fontWeight: '700' },
});
