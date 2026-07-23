import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'finanzai_gmail_token';
const TOKEN_EXPIRY_KEY = 'finanzai_gmail_token_expiry';

export async function saveGmailToken(token: string, expiresIn: number): Promise<void> {
  const expiry = Date.now() + expiresIn * 1000;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiry.toString());
}

export async function getGmailToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
    if (!token || !expiry) return null;
    if (Date.now() > parseInt(expiry)) return null;
    return token;
  } catch {
    return null;
  }
}

export async function removeGmailToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
}

export async function isGmailConnected(): Promise<boolean> {
  const token = await getGmailToken();
  return token !== null;
}

export function useGmailAuth() {
  return { request: null, response: null, promptAsync: async () => {} };
}

export async function fetchBankEmails(): Promise<any[]> {
  return [];
}