import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, Modal, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize } from '../../../src/theme/colors';
import { useStore } from '../../../src/store/useStore';
import type { Transaction } from '../../../src/types';

function formatCOP(amount: number) {
  return '$' + amount.toLocaleString('es-CO') + ' COP';
}

function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    email: '📧 Email bancario',
    notification: '🔔 Notificación',
    manual: '✏️ Ingreso manual',
    ocr: '📷 Foto de recibo',
  };
  return labels[source] ?? '📄 Desconocido';
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 90 ? colors.success : pct >= 70 ? colors.warning : colors.error;
  return (
    <View>
      <View style={styles.confidenceBg}>
        <View style={[styles.confidenceFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.confidenceLabel, { color }]}>
        {pct}% de confianza en la categorización
      </Text>
    </View>
  );
}

function CategoryPicker({ visible, categories, selected, onSelect, onClose }: {
  visible: boolean;
  categories: { id: string; name: string; icon: string; color: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Cambiar categoría</Text>
          <ScrollView>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catOption, cat.id === selected && styles.catOptionSelected]}
                onPress={() => { onSelect(cat.id); onClose(); }}
              >
                <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[styles.catName, cat.id === selected && styles.catNameSelected]}>
                  {cat.name}
                </Text>
                {cat.id === selected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { transactions, activeBudget } = useStore();

  const transaction = transactions.find(t => t.id === id);
  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundIcon}>🔍</Text>
          <Text style={styles.notFoundText}>Transacción no encontrada</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const [editDesc, setEditDesc] = useState(transaction.description);
  const [selectedCatId, setSelectedCatId] = useState(transaction.categoryId);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const isIncome = transaction.type === 'income';

  const categories = activeBudget?.categories ?? [];
  const selectedCat = categories.find(c => c.id === selectedCatId);

  const handleSave = () => {
    // In a real app: dispatch update to store/backend
    Alert.alert('✅ Guardado', 'Los cambios se guardaron correctamente.');
    setEditing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle</Text>
        <TouchableOpacity onPress={() => setEditing(!editing)}>
          <Text style={styles.editButton}>{editing ? 'Cancelar' : 'Editar'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Amount hero */}
        <View style={[styles.amountCard, { backgroundColor: isIncome ? '#ECFDF5' : '#FEF2F2' }]}>
          <Text style={styles.amountEmoji}>{isIncome ? '💰' : '💸'}</Text>
          <Text style={[styles.amountValue, { color: isIncome ? colors.income : colors.expense }]}>
            {isIncome ? '+' : '-'}{formatCOP(transaction.amount)}
          </Text>
          <Text style={styles.amountType}>{isIncome ? 'Ingreso' : 'Gasto'}</Text>
          <Text style={styles.amountDate}>
            {new Date(transaction.date).toLocaleDateString('es-CO', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </Text>
        </View>

        {/* AI confidence */}
        {transaction.aiConfidence !== undefined && transaction.source !== 'manual' && (
          <View style={styles.section}>
            <ConfidenceBar confidence={transaction.aiConfidence} />
          </View>
        )}

        {/* Details */}
        <View style={styles.card}>
          {/* Description */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Descripción</Text>
            {editing ? (
              <TextInput
                style={styles.rowInput}
                value={editDesc}
                onChangeText={setEditDesc}
                multiline
              />
            ) : (
              <Text style={styles.rowValue}>{transaction.description}</Text>
            )}
          </View>

          {/* Category */}
          <View style={styles.rowDivider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => editing && setShowCatPicker(true)}
            activeOpacity={editing ? 0.7 : 1}
          >
            <Text style={styles.rowLabel}>Categoría</Text>
            <View style={styles.rowCat}>
              {selectedCat && (
                <View style={[styles.catBadge, { backgroundColor: selectedCat.color + '20' }]}>
                  <Text>{selectedCat.icon}</Text>
                  <Text style={[styles.catBadgeText, { color: selectedCat.color }]}>
                    {selectedCat.name}
                  </Text>
                </View>
              )}
              {editing && <Text style={styles.chevron}>›</Text>}
            </View>
          </TouchableOpacity>

          {/* Source */}
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Fuente</Text>
            <Text style={styles.rowValue}>{sourceLabel(transaction.source)}</Text>
          </View>

          {/* Time */}
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Hora</Text>
            <Text style={styles.rowValue}>
              {new Date(transaction.date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* Raw data (if from email/notification) */}
        {transaction.source !== 'manual' && transaction.rawData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📨 Datos originales del email</Text>
            <View style={styles.rawDataCard}>
              <Text style={styles.rawDataText}>
                {JSON.stringify(transaction.rawData, null, 2)}
              </Text>
            </View>
          </View>
        )}

        {/* Save button */}
        {editing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Guardar cambios</Text>
          </TouchableOpacity>
        )}

        {/* Delete */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => Alert.alert(
            'Eliminar transacción',
            '¿Estás seguro de que quieres eliminar esta transacción?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Eliminar', style: 'destructive', onPress: () => router.back() },
            ]
          )}
        >
          <Text style={styles.deleteButtonText}>🗑 Eliminar transacción</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <CategoryPicker
        visible={showCatPicker}
        categories={categories}
        selected={selectedCatId}
        onSelect={setSelectedCatId}
        onClose={() => setShowCatPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { padding: spacing.xs },
  backArrow: { fontSize: 24, color: colors.primary },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  editButton: { fontSize: fontSize.md, color: colors.primaryLight, fontWeight: '600' },
  content: { padding: spacing.lg },

  amountCard: {
    borderRadius: borderRadius.lg, padding: spacing.xl,
    alignItems: 'center', marginBottom: spacing.lg,
  },
  amountEmoji: { fontSize: 48, marginBottom: spacing.sm },
  amountValue: { fontSize: 36, fontWeight: '800' },
  amountType: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs },
  amountDate: { fontSize: fontSize.sm, color: colors.textTertiary, marginTop: spacing.xs, textAlign: 'center' },

  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.sm },

  confidenceBg: { height: 8, backgroundColor: colors.divider, borderRadius: 4, overflow: 'hidden' },
  confidenceFill: { height: '100%', borderRadius: 4 },
  confidenceLabel: { fontSize: fontSize.xs, marginTop: spacing.xs, fontWeight: '600' },

  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, gap: spacing.sm,
  },
  rowDivider: { height: 1, backgroundColor: colors.divider },
  rowLabel: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600', flex: 1 },
  rowValue: { fontSize: fontSize.md, color: colors.text, flex: 2, textAlign: 'right' },
  rowInput: {
    flex: 2, fontSize: fontSize.md, color: colors.text,
    borderWidth: 1, borderColor: colors.primaryLight,
    borderRadius: borderRadius.sm, padding: spacing.sm,
    backgroundColor: colors.background, textAlign: 'right',
  },
  rowCat: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm,
  },
  catBadgeText: { fontSize: fontSize.sm, fontWeight: '600' },
  chevron: { fontSize: 20, color: colors.textTertiary },

  rawDataCard: {
    backgroundColor: '#1E293B', borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  rawDataText: { fontFamily: 'monospace', fontSize: 11, color: '#94A3B8', lineHeight: 18 },

  saveButton: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm,
  },
  saveButtonText: { fontSize: fontSize.md, color: colors.textOnPrimary, fontWeight: '700' },

  deleteButton: {
    backgroundColor: '#FEF2F2', borderRadius: borderRadius.md,
    padding: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: '#FECACA',
  },
  deleteButtonText: { fontSize: fontSize.md, color: colors.error, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl, maxHeight: '70%',
  },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  catOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.xs,
  },
  catOptionSelected: { backgroundColor: colors.background },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catIcon: { fontSize: 22 },
  catName: { flex: 1, fontSize: fontSize.md, color: colors.text },
  catNameSelected: { fontWeight: '700', color: colors.primary },
  checkmark: { fontSize: fontSize.lg, color: colors.success },
  modalCloseButton: {
    marginTop: spacing.md, padding: spacing.md,
    backgroundColor: colors.background, borderRadius: borderRadius.md, alignItems: 'center',
  },
  modalCloseText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  notFoundIcon: { fontSize: 48 },
  notFoundText: { fontSize: fontSize.lg, color: colors.textSecondary },
  backLink: { fontSize: fontSize.md, color: colors.primaryLight },
});
