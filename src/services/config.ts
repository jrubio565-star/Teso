import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY_STORAGE_KEY = 'finanzai_anthropic_api_key';

let cachedApiKey: string | null = null;

/**
 * Obtiene la API key de Anthropic.
 * Primero revisa el cache en memoria, luego AsyncStorage.
 */
export function getApiKey(): string | null {
  return cachedApiKey;
}

/**
 * Carga la API key desde AsyncStorage al iniciar la app.
 */
export async function loadApiKey(): Promise<string | null> {
  try {
    const key = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
    cachedApiKey = key;
    return key;
  } catch {
    return null;
  }
}

/**
 * Guarda la API key en AsyncStorage y actualiza el cache.
 */
export async function saveApiKey(apiKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    cachedApiKey = apiKey;
  } catch (error) {
    console.error('Error saving API key:', error);
    throw error;
  }
}

/**
 * Elimina la API key guardada.
 */
export async function removeApiKey(): Promise<void> {
  try {
    await AsyncStorage.removeItem(API_KEY_STORAGE_KEY);
    cachedApiKey = null;
  } catch (error) {
    console.error('Error removing API key:', error);
  }
}

/**
 * Verifica si hay una API key configurada.
 */
export function hasApiKey(): boolean {
  return cachedApiKey !== null && cachedApiKey.length > 0;
}
