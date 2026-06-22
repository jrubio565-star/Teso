import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize } from '../src/theme/colors';
import { useStore } from '../src/store/useStore';
import { hasApiKey } from '../src/services/config';
import type { Category } from '../src/types';

const CATEGORY_COLORS = ['#FF6B6B', '#4ECDC4', '#9B59B6', '#3498DB', '#2ECC71', '#F1C40F', '#E74C3C', '#95A5A6', '#E67E22', '#1ABC9C'];
const CATEGORY_ICONS: Record<string, string> = {
  'Alimentación': '🍔',
  'Transporte': '🚗',
  'Entretenimiento': '🎬',
  'Servicios': '💡',
  'Salud': '🏥',
  'Compras': '🛍️',
  'Viajes': '✈️',
  'Hogar': '🏠',
  'Educación': '📚',
  'Ahorro': '💰',
  'Deporte': '⚽',
  'Mascotas': '🐾',
  'Restaurantes': '🍽️',
  'Ropa': '👕',
  'Tecnología': '💻',
};

const SUGERENCIAS_DEFAULT = [
  'Alimentación', 'Transporte', 'Entretenimiento', 'Servicios',
  'Salud', 'Compras', 'Viajes', 'Hogar', 'Educación', 'Ahorro',
];

interface CategoriaSeleccionada {
  name: string;
  icon: string;
  color: string;
  monthlyLimit: number;
}

export default function ConfigurarCategorias() {
  const router = useRouter();
  const { activeBudget, addCategory } = useStore();
  const [sugerencias, setSugerencias] = useState<string[]>(SUGERENCIAS_DEFAULT);
  const [seleccionadas, setSeleccionadas] = useState<CategoriaSeleccionada[]>([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [cargandoIA, setCargandoIA] = useState(false);
  const [mensajeIA, setMensajeIA] = useState('');

  useEffect(() => {
    console.log('activeBudget:', activeBudget);
    if (activeBudget) {
      cargarSugerenciasIA();
    } else {
      router.replace('/');
    }
  }, []);

  const cargarSugerenciasIA = async () => {
    if (!hasApiKey()) {
      setMensajeIA(`¡Hola! Vamos a configurar las categorías para tu presupuesto "${activeBudget?.name}". Selecciona las que más se adapten a tus gastos o agrega las tuyas.`);
      return;
    }

    setCargandoIA(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Soy un usuario colombiano creando un presupuesto llamado "${activeBudget?.name}" con descripción "${activeBudget?.description || 'sin descripción'}". 
            
            Responde SOLO con un JSON con este formato exacto, sin texto adicional:
            {
              "mensaje": "mensaje de bienvenida corto y amigable en español (máximo 2 oraciones)",
              "sugerencias": ["categoria1", "categoria2", "categoria3", "categoria4", "categoria5", "categoria6", "categoria7", "categoria8"]
            }
            
            Las sugerencias deben ser categorías de gastos relevantes para este presupuesto específico en Colombia.`
          }]
        })
      });
      const data = await response.json();
      const text = data.content[0].text;
      const parsed = JSON.parse(text);
      setMensajeIA(parsed.mensaje);
      if (parsed.sugerencias?.length > 0) {
        setSugerencias(parsed.sugerencias);
      }
    } catch {
      setMensajeIA(`¡Hola! Configuremos las categorías para "${activeBudget?.name}". Selecciona las que más uses o agrega las tuyas.`);
    }
    setCargandoIA(false);
  };

  const toggleSeleccion = (nombre: string) => {
    const yaSeleccionada = seleccionadas.find(c => c.name === nombre);
    if (yaSeleccionada) {
      setSeleccionadas(seleccionadas.filter(c => c.name !== nombre));
    } else {
      const icon = CATEGORY_ICONS[nombre] || '📦';
      const color = CATEGORY_COLORS[seleccionadas.length % CATEGORY_COLORS.length];
      setSeleccionadas([...seleccionadas, { name: nombre, icon, color, monthlyLimit: 0 }]);
    }
  };

  const agregarPersonalizada = () => {
    const nombre = nuevaCategoria.trim();
    if (!nombre) return;
    if (seleccionadas.find(c => c.name === nombre)) return;
    const icon = CATEGORY_ICONS[nombre] || '📦';
    const color = CATEGORY_COLORS[seleccionadas.length % CATEGORY_COLORS.length];
    setSeleccionadas([...seleccionadas, { name: nombre, icon, color, monthlyLimit: 0 }]);
    if (!sugerencias.includes(nombre)) {
      setSugerencias([...sugerencias, nombre]);
    }
    setNuevaCategoria('');
  };

  const handleContinuar = () => {
    if (!activeBudget || seleccionadas.length === 0) return;
    seleccionadas.forEach((cat, index) => {
      const newCat: Category = {
        id: `${Date.now()}_${index}`,
        budgetId: activeBudget.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        monthlyLimit: cat.monthlyLimit,
        spent: 0,
      };
      addCategory(activeBudget.id, newCat);
    });
    router.replace('/chat');
  };

  const estaSeleccionada = (nombre: string) => seleccionadas.some(c => c.name === nombre);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>🤖</Text>
          <Text style={styles.headerTitle}>{activeBudget?.name}</Text>
        </View>

        {/* Mensaje IA */}
        <View style={styles.mensajeIA}>
          {cargandoIA ? (
            <View style={styles.cargando}>
              <ActivityIndicator size="small" color={colors.primaryLight} />
              <Text style={styles.cargandoText}>Personalizando sugerencias...</Text>
            </View>
          ) : (
            <Text style={styles.mensajeIAText}>
              {mensajeIA || `¡Hola! Configuremos las categorías para "${activeBudget?.name}".`}
            </Text>
          )}
        </View>

        {/* Sugerencias */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorías sugeridas</Text>
          <Text style={styles.sectionSubtitle}>Toca para seleccionar</Text>
          <View style={styles.chipsContainer}>
            {sugerencias.map((cat) => {
              const seleccionada = estaSeleccionada(cat);
              const icon = CATEGORY_ICONS[cat] || '📦';
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, seleccionada && styles.chipSelected]}
                  onPress={() => toggleSeleccion(cat)}
                >
                  <Text style={styles.chipIcon}>{icon}</Text>
                  <Text style={[styles.chipText, seleccionada && styles.chipTextSelected]}>{cat}</Text>
                  {seleccionada && <Text style={styles.chipCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Agregar personalizada */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agregar categoría propia</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={nuevaCategoria}
              onChangeText={setNuevaCategoria}
              placeholder="Ej: Mascotas, Gym, Suscripciones..."
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={agregarPersonalizada}
            />
            <TouchableOpacity
              style={[styles.addButton, !nuevaCategoria.trim() && styles.addButtonDisabled]}
              onPress={agregarPersonalizada}
              disabled={!nuevaCategoria.trim()}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seleccionadas */}
        {seleccionadas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Seleccionadas ({seleccionadas.length})
            </Text>
            <View style={styles.seleccionadasRow}>
              {seleccionadas.map((cat) => (
                <View key={cat.name} style={[styles.seleccionadaChip, { backgroundColor: cat.color + '22', borderColor: cat.color }]}>
                  <Text style={styles.chipIcon}>{cat.icon}</Text>
                  <Text style={[styles.chipText, { color: cat.color }]}>{cat.name}</Text>
                  <TouchableOpacity onPress={() => toggleSeleccion(cat.name)}>
                    <Text style={[styles.chipText, { color: cat.color }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Botón continuar */}
      <View style={styles.footer}>
        {seleccionadas.length === 0 && (
          <Text style={styles.footerHint}>Selecciona al menos una categoría</Text>
        )}
        <TouchableOpacity
          style={[styles.continueButton, seleccionadas.length === 0 && styles.continueButtonDisabled]}
          onPress={handleContinuar}
          disabled={seleccionadas.length === 0}
        >
          <Text style={styles.continueButtonText}>
            Continuar al chat →
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  headerEmoji: { fontSize: 40, marginBottom: spacing.xs },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary, textAlign: 'center' },

  mensajeIA: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cargando: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cargandoText: { fontSize: fontSize.sm, color: colors.textSecondary, fontStyle: 'italic' },
  mensajeIAText: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  sectionSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md },

  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  chipIcon: { fontSize: 16 },
  chipText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  chipTextSelected: { color: colors.primary, fontWeight: '700' },
  chipCheck: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '700' },

  inputRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: {
    width: 50,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { backgroundColor: colors.border },
  addButtonText: { fontSize: 24, color: '#FFF', fontWeight: '700' },

  seleccionadasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  seleccionadaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },

  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerHint: { fontSize: fontSize.sm, color: colors.textTertiary, textAlign: 'center', marginBottom: spacing.sm },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  continueButtonDisabled: { backgroundColor: colors.border },
  continueButtonText: { fontSize: fontSize.md, fontWeight: '700', color: '#FFF' },
});
