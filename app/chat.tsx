import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, SafeAreaView,
  ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize } from '../src/theme/colors';
import { useStore } from '../src/store/useStore';
import { sendMessageToAgent, chatToAnthropicHistory } from '../src/services/aiAgent';
import { hasApiKey } from '../src/services/config';
import type { ChatMessage, Category } from '../src/types';

const CATEGORY_COLORS = ['#FF6B6B', '#4ECDC4', '#9B59B6', '#3498DB', '#2ECC71', '#F1C40F', '#E74C3C', '#95A5A6'];
const CATEGORY_ICONS = ['🍔', '🚗', '🎬', '💡', '🏥', '🛍️', '✈️', '🏠', '📚', '💰'];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      {!isUser && <Text style={styles.botAvatar}>🤖</Text>}
      <View style={[styles.bubbleContent, isUser ? styles.userContent : styles.assistantContent]}>
        <Text style={[styles.messageText, isUser && styles.userText]}>{message.content}</Text>
        <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
          {new Date(message.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={[styles.messageBubble, styles.assistantBubble]}>
      <Text style={styles.botAvatar}>🤖</Text>
      <View style={[styles.bubbleContent, styles.assistantContent, styles.typingBubble]}>
        <ActivityIndicator size="small" color={colors.primaryLight} />
        <Text style={styles.typingText}>FinanzAI está pensando...</Text>
      </View>
    </View>
  );
}

function AddCategoryModal({ visible, onClose, onAdd }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (cat: Omit<Category, 'id' | 'budgetId' | 'spent'>) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [icon, setIcon] = useState('🍔');
  const [color, setColor] = useState('#FF6B6B');
  const [limite, setLimite] = useState('');

  const handleAdd = () => {
    if (!nombre.trim()) return;
    onAdd({
      name: nombre.trim(),
      icon,
      color,
      monthlyLimit: parseFloat(limite) || 0,
    });
    setNombre('');
    setLimite('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Nueva categoría</Text>

          <Text style={styles.modalLabel}>Nombre</Text>
          <TextInput
            style={styles.modalInput}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej: Viajes, Comida, Ropa..."
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={styles.modalLabel}>Ícono</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconRow}>
            {CATEGORY_ICONS.map((i) => (
              <TouchableOpacity
                key={i}
                style={[styles.iconButton, icon === i && styles.iconButtonSelected]}
                onPress={() => setIcon(i)}
              >
                <Text style={styles.iconText}>{i}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.modalLabel}>Color</Text>
          <View style={styles.colorRow}>
            {CATEGORY_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorButton, { backgroundColor: c }, color === c && styles.colorButtonSelected]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <Text style={styles.modalLabel}>Límite mensual (COP, opcional)</Text>
          <TextInput
            style={styles.modalInput}
            value={limite}
            onChangeText={setLimite}
            placeholder="Ej: 500000"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSaveButton, !nombre.trim() && styles.modalSaveDisabled]}
              onPress={handleAdd}
              disabled={!nombre.trim()}
            >
              <Text style={styles.modalSaveText}>Agregar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const { chatMessages, addChatMessage, activeBudget, addCategory } = useStore();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!activeBudget) router.replace('/');
  }, [activeBudget]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
    const userText = inputText.trim();
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMessage);
    setInputText('');
    setIsLoading(true);

    try {
      if (!hasApiKey()) {
        const fallback: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Para usar el agente de IA necesitas configurar tu API key. Ve a la pantalla de configuración.',
          timestamp: new Date().toISOString(),
        };
        addChatMessage(fallback);
        setIsLoading(false);
        return;
      }

      const history = chatToAnthropicHistory(
        chatMessages.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, content: m.content }))
      );
      const { response } = await sendMessageToAgent(userText, history);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };
      addChatMessage(aiMessage);
    } catch {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Ocurrió un error. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString(),
      };
      addChatMessage(errorMessage);
    }
    setIsLoading(false);
  };

  const handleAddCategory = (catData: Omit<Category, 'id' | 'budgetId' | 'spent'>) => {
    if (!activeBudget) return;
    const newCat: Category = {
      id: Date.now().toString(),
      budgetId: activeBudget.id,
      spent: 0,
      ...catData,
    };
    addCategory(activeBudget.id, newCat);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
    <TouchableOpacity onPress={() => router.replace('/(tabs)/')} style={styles.backBtn}>
        <Text style={styles.backText}>🏠</Text>
    </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{activeBudget?.name || 'FinanzAI'}</Text>
          <Text style={styles.headerSubtitle}>
            {hasApiKey() ? '● Agente IA activo' : '○ Modo demo'}
          </Text>
        </View>
      </View>

      {/* Categorías */}
      <View style={styles.categoriesBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
          {activeBudget?.categories.map((cat) => (
            <View key={cat.id} style={[styles.categoryChip, { borderColor: cat.color }]}>
              <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
              <Text style={styles.categoryChipName}>{cat.name}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.addCategoryChip} onPress={() => setShowAddCategory(true)}>
            <Text style={styles.addCategoryText}>+ Categoría</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isLoading ? <TypingIndicator /> : null}
        />

        <View style={styles.quickActions}>
          {['Crear presupuesto', 'Ver resumen', 'Agregar gasto'].map((action) => (
            <TouchableOpacity
              key={action}
              style={styles.quickActionButton}
              onPress={() => setInputText(action)}
              disabled={isLoading}
            >
              <Text style={styles.quickActionText}>{action}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.sendButtonText}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <AddCategoryModal
        visible={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onAdd={handleAddCategory}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backBtn: { padding: spacing.xs },
  backText: { fontSize: 28, color: colors.primary, fontWeight: '600' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
  headerSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary },

  categoriesBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  categoriesList: { paddingHorizontal: spacing.md, gap: spacing.sm },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  categoryChipIcon: { fontSize: 14 },
  categoryChipName: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text },
  addCategoryChip: {
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderRadius: borderRadius.full,
    borderStyle: 'dashed',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addCategoryText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primaryLight },

  chatContainer: { flex: 1 },
  messagesList: { padding: spacing.md, paddingBottom: spacing.sm },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  userBubble: { justifyContent: 'flex-end' },
  assistantBubble: { justifyContent: 'flex-start' },
  botAvatar: { fontSize: 24, marginBottom: 2 },
  bubbleContent: {
    maxWidth: '78%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  userContent: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
  },
  assistantContent: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  userText: { color: colors.textOnPrimary },
  timestamp: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.xs, textAlign: 'right' },
  userTimestamp: { color: 'rgba(255,255,255,0.6)' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  typingText: { fontSize: fontSize.sm, color: colors.textSecondary, fontStyle: 'italic' },

  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  quickActionButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  quickActionText: { fontSize: fontSize.sm, color: colors.primaryLight, fontWeight: '600' },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: colors.border },
  sendButtonText: { fontSize: 20, color: colors.textOnPrimary },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  modalLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconRow: { marginVertical: spacing.xs },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconButtonSelected: { borderColor: colors.primary },
  iconText: { fontSize: 22 },
  colorRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonSelected: { borderColor: colors.text },
  modalButtons: { flexDirection: 'row', gap: spacing.sm },
  modalCancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },
  modalSaveButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalSaveDisabled: { backgroundColor: colors.border },
  modalSaveText: { fontSize: fontSize.md, color: '#FFF', fontWeight: '700' },
});
