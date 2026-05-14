/**
 * notificationListener.ts
 *
 * Capa JavaScript que:
 *  1. Se comunica con el módulo nativo Android (NotificationModule.kt)
 *  2. Recibe eventos de notificaciones bancarias en tiempo real
 *  3. Parsea cada notificación con notificationParser
 *  4. Categoriza con el agente IA o con reglas locales
 *  5. Guarda la transacción en el store de Zustand
 */

import { NativeModules, NativeEventEmitter, Platform, type EmitterSubscription } from 'react-native';
import { parseNotification, suggestCategoryFromNotification, type RawNotification } from './notificationParser';
import { useStore } from '../store/useStore';
import type { Transaction } from '../types';

// ─── Interfaz del módulo nativo ───────────────────────────────────────────────
interface NotificationListenerNative {
  hasNotificationPermission: () => Promise<boolean>;
  requestNotificationPermission: () => Promise<boolean>;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
}

const NativeNotificationListener: NotificationListenerNative | null =
  Platform.OS === 'android'
    ? (NativeModules.NotificationListener as NotificationListenerNative) ?? null
    : null;

// ─── EventEmitter ─────────────────────────────────────────────────────────────
let emitter: NativeEventEmitter | null = null;
let subscription: EmitterSubscription | null = null;
let isListening = false;

// Callback externo opcional (para actualizar la UI en tiempo real)
type OnTransactionCaptured = (transaction: Transaction) => void;
let onTransactionCapturedCallback: OnTransactionCaptured | null = null;

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Verifica si el módulo nativo está disponible (Android) y si el usuario
 * ya concedió el permiso de acceso a notificaciones.
 */
export async function hasNotificationPermission(): Promise<boolean> {
  if (!NativeNotificationListener) return false;
  try {
    return await NativeNotificationListener.hasNotificationPermission();
  } catch {
    return false;
  }
}

/**
 * Abre la pantalla de Android "Acceso a notificaciones" para que el usuario
 * habilite el permiso manualmente.
 */
export async function requestNotificationPermission(): Promise<void> {
  if (!NativeNotificationListener) return;
  await NativeNotificationListener.requestNotificationPermission();
}

/**
 * Verifica si la funcionalidad de notificaciones está disponible.
 * Solo disponible en Android con el módulo nativo instalado.
 */
export function isNotificationListenerAvailable(): boolean {
  return Platform.OS === 'android' && NativeNotificationListener !== null;
}

/**
 * Inicia la escucha de notificaciones bancarias.
 * Cada notificación entrante se parsea y se guarda en el store.
 *
 * @param onTransaction  Callback opcional que se llama con cada transacción capturada.
 * @returns              true si se inició correctamente, false si no está disponible.
 */
export function startListening(onTransaction?: OnTransactionCaptured): boolean {
  if (!NativeNotificationListener || isListening) return false;

  onTransactionCapturedCallback = onTransaction ?? null;

  try {
    emitter = new NativeEventEmitter(NativeModules.NotificationListener);
    subscription = emitter.addListener(
      'onFinancialNotification',
      handleIncomingNotification,
    );
    isListening = true;
    console.log('[FinanzAI] Notification listener started');
    return true;
  } catch (e) {
    console.error('[FinanzAI] Failed to start notification listener', e);
    return false;
  }
}

/**
 * Detiene la escucha de notificaciones.
 */
export function stopListening(): void {
  subscription?.remove();
  subscription = null;
  emitter = null;
  isListening = false;
  onTransactionCapturedCallback = null;
  console.log('[FinanzAI] Notification listener stopped');
}

/**
 * Retorna si el listener está activo.
 */
export function isListeningActive(): boolean {
  return isListening;
}

// ─── Procesamiento interno ────────────────────────────────────────────────────

async function handleIncomingNotification(raw: RawNotification): Promise<void> {
  try {
    // 1. Parsear la notificación
    const parsed = parseNotification(raw);
    if (!parsed) return;

    // 2. Obtener el estado actual del store
    const store = useStore.getState();
    const activeBudget = store.activeBudget;
    if (!activeBudget) return;

    // 3. Sugerir categoría (local primero, luego IA si hay confianza baja)
    const suggestedCatName = suggestCategoryFromNotification(parsed);
    const matchedCategory = activeBudget.categories.find(
      (c) => c.name.toLowerCase() === suggestedCatName.toLowerCase(),
    ) ?? activeBudget.categories[activeBudget.categories.length - 1]; // fallback: última categoría

    // 4. Construir transacción
    const transaction: Transaction = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      budgetId: activeBudget.id,
      categoryId: matchedCategory?.id ?? 'unknown',
      amount: parsed.amount,
      type: parsed.type,
      description: parsed.description,
      source: 'notification',
      rawData: {
        packageName: parsed.packageName,
        appName: parsed.appName,
        rawText: parsed.rawText,
        merchant: parsed.merchant,
      },
      date: parsed.date.toISOString(),
      aiConfidence: parsed.confidence,
      categoryName: matchedCategory?.name ?? suggestedCatName,
      categoryIcon: matchedCategory?.icon ?? '📦',
      categoryColor: matchedCategory?.color ?? '#95A5A6',
    };

    // 5. Guardar en el store
    store.addTransaction(transaction);

    // 6. Notificar al callback externo (para actualizar UI)
    onTransactionCapturedCallback?.(transaction);

    console.log(
      `[FinanzAI] Transaction captured from ${parsed.appName}: ` +
      `${parsed.type === 'income' ? '+' : '-'}$${parsed.amount.toLocaleString('es-CO')} ` +
      `→ ${matchedCategory?.name ?? suggestedCatName}`,
    );
  } catch (e) {
    console.error('[FinanzAI] Error handling notification', e);
  }
}
