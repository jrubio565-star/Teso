import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize } from '../src/theme/colors';
import { useStore } from '../src/store/useStore';

export default function CrearPresupuesto() {
  const router = useRouter();
  const { addBudget, setActiveBudget } = useStore();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const handleCrear = () => {
    if (!nombre.trim()) return;

    const nuevoBudget = {
      id: Date.now().toString(),
      userId: 'demo',
      name: nombre.trim(),
      description: descripcion.trim(),
      type: 'personal' as const,
      totalLimit: 0,
      currency: 'COP',
      isActive: true,
      createdAt: new Date().toISOString(),
      categories: [],
    };

    addBudget(nuevoBudget);
    setActiveBudget(nuevoBudget);
    router.push('/configurar-categorias');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/')}>
            <Text style={styles.backText}>‹ Volver</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Crear presupuesto</Text>
          <Text style={styles.subtitle}>Dale un nombre a tu nuevo presupuesto</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Nombre del presupuesto</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej: Gastos del hogar, Viaje a Cartagena..."
              placeholderTextColor={colors.textTertiary}
              maxLength={50}
            />

            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Una descripción corta de este presupuesto..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={150}
            />

            <TouchableOpacity
              style={[styles.crearButton, !nombre.trim() && styles.crearButtonDisabled]}
              onPress={handleCrear}
              disabled={!nombre.trim()}
            >
              <Text style={styles.crearButtonText}>Crear y continuar →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },
  backButton: { marginBottom: spacing.lg },
  backText: { fontSize: fontSize.md, color: colors.primaryLight, fontWeight: '600' },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xl },
  form: { gap: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputMultiline: { height: 100, textAlignVertical: 'top' },
  crearButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  crearButtonDisabled: { backgroundColor: colors.border },
  crearButtonText: { fontSize: fontSize.md, fontWeight: '700', color: '#FFF' },
});
