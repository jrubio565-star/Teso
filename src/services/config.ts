import * as SecureStore from 'expo-secure-store';

const API_KEY_STORAGE_KEY = 'finanzai_anthropic_api_key';

let cachedApiKey: string | null = null;

export function getApiKey(): string | null {
  return cachedApiKey;
}

export async function loadApiKey(): Promise<string | null> {
  try {
    const key = await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);
    cachedApiKey = key;
    return key;
  } catch {
    return null;
  }
}

export async function saveApiKey(apiKey: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, apiKey);
    cachedApiKey = apiKey;
  } catch (error) {
    console.error('Error saving API key:', error);
    throw error;
  }
}

export async function removeApiKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
    cachedApiKey = null;
  } catch (error) {
    console.error('Error removing API key:', error);
  }
}

export function hasApiKey(): boolean {
  return cachedApiKey !== null && cachedApiKey.length > 0;
}