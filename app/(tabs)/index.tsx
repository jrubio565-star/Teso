import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, SafeAreaView,
  ActivityIndicator, Modal,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../../src/theme/colors';
import { useStore } from '../../src/store/useStore';
import { sendMessageToAgent, chatToAnthropicHistory } from '../../src/services/aiAgent';
import { loadApiKey, saveApiKey, hasApiKey } from '../../src/services/config';
import type { ChatMessage } from '../../src/types';

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
        <Text style={styles.typingText}>FinanzAI esta pensando...</Text>
      </View>
    </View>
  );
}

function ApiKeyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!keyInput.trim()) return;
    setSaving(true);
    try {
      await saveApiKey(keyInput.trim());
      setKeyInput('');
      onClose();
    } catch {
      // handle error
    }
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🔑 Configurar API Key</Text>
          <Text style={styles.modalDescription}>
            Para activar el agente de IA, necesitas una API key de Anthropic.
            Puedes obtenerla en console.anthropic.com
          </Text>
          <TextInput
            style={styles.apiKeyInput}
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder="sk-ant-api03-..."
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelText}>Despues</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSaveButton, !keyInput.trim() && styles.modalSaveDisabled]}
              onPress={handleSave}
              disabled={!keyInput.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.modalSaveText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false);
  const { chatMessages, addChatMessage } = useStore();
  const flatListRef = useRef<FlatList>(null);

  // Cargar API key al iniciar
  useEffect(() => {
    loadApiKey().then(() => setApiKeyLoaded(true));
  }, []);

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
      // Verificar si hay API key
      if (!hasApiKey()) {
        // Usar respuesta simulada y sugerir configurar la key
        const fallbackResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: generateFallbackResponse(userText),
          timestamp: new Date().toISOString(),
        };
        addChatMessage(fallbackResponse);
        setIsLoading(false);
        return;
      }

      // Preparar historial (excluir el mensaje de bienvenida y el mensaje actual)
      const history = chatToAnthropicHistory(
        chatMessages
          .filter(m => m.id !== 'welcome')
          .map(m => ({ role: m.role, content: m.content }))
      );

      // Enviar al agente de IA real
      const { response } = await sendMessageToAgent(userText, history);

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };
      addChatMessage(aiMessage);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Ocurrio un error inesperado. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString(),
      };
      addChatMessage(errorMessage);
    }

    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🤖</Text>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>FinanzAI</Text>
          <Text style={styles.headerSubtitle}>
            {hasApiKey() ? '● Agente IA activo' : '○ Modo demo'}
          </Text>
        </View>
        {!hasApiKey() && apiKeyLoaded && (
          <TouchableOpacity
            style={styles.configButton}
            onPress={() => setShowApiKeyModal(true)}
          >
            <Text style={styles.configButtonText}>🔑</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Banner si no hay API key */}
      {!hasApiKey() && apiKeyLoaded && (
        <TouchableOpacity
          style={styles.apiKeyBanner}
          onPress={() => setShowApiKeyModal(true)}
        >
          <Text style={styles.apiKeyBannerText}>
            💡 Configura tu API key para activar el agente de IA real
          </Text>
          <Text style={styles.apiKeyBannerArrow}>→</Text>
        </TouchableOpacity>
      )}

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

      <ApiKeyModal
        visible={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
      />
    </SafeAreaView>
  );
}

/**
 * Respuestas simuladas cuando no hay API key configurada.
 */
function generateFallbackResponse(userInput: string): string {
  const input = userInput.toLowerCase();

  if (input.includes('presupuesto') || input.includes('crear')) {
    return '📝 ¡Me encantaria ayudarte a crear un presupuesto!\n\nPero primero necesito que configures la API key para activar mi cerebro de IA. Toca el boton 🔑 arriba para configurarla.\n\nMientras tanto, puedes explorar el Dashboard y la seccion de Presupuestos para ver como se vera tu app.';
  }
  if (input.includes('resumen') || input.includes('como voy')) {
    return '📊 Aqui tienes un resumen rapido con datos de ejemplo:\n\n💰 Ingresos: $3,500,000 COP\n💸 Gastos: $2,100,000 COP\n📈 Balance: +$1,400,000 COP\n\n⚠️ Servicios al 90% del limite.\n\nPara analisis personalizados con IA real, configura tu API key con el boton 🔑';
  }
  if (input.includes('gasto') || input.includes('agregar')) {
    return '💸 Para registrar gastos automaticamente con IA, necesitas activar el agente.\n\nToca el boton 🔑 en la parte superior para configurar tu API key de Anthropic.\n\nMientras tanto, estos son datos de ejemplo que puedes ver en la seccion de Movimientos.';
  }

  return `Entiendo tu mensaje. 🤔\n\nEstoy funcionando en modo demo ahora mismo. Para tener respuestas inteligentes y poder crear presupuestos, registrar gastos y darte consejos personalizados, necesito que configures la API key.\n\nToca el boton 🔑 arriba para empezar.`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  headerEmoji: {
    fontSize: 36,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  configButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  configButtonText: {
    fontSize: 18,
  },
  apiKeyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  apiKeyBannerText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: '#92400E',
    fontWeight: '500',
  },
  apiKeyBannerArrow: {
    fontSize: fontSize.lg,
    color: '#92400E',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  assistantBubble: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    fontSize: 24,
    marginBottom: 2,
  },
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
  messageText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  userText: {
    color: colors.textOnPrimary,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.6)',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  typingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
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
  quickActionText: {
    fontSize: fontSize.sm,
    color: colors.primaryLight,
    fontWeight: '600',
  },
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
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  sendButtonText: {
    fontSize: 20,
    color: colors.textOnPrimary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  apiKeyInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalSaveDisabled: {
    backgroundColor: colors.border,
  },
  modalSaveText: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    fontWeight: '700',
  },
});
