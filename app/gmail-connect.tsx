import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize } from '../src/theme/colors';
import { useStore } from '../src/store/useStore';
import {
  useGmailAuth,
  saveGmailToken,
  getGmailToken,
  removeGmailToken,
  fetchBankEmails,
  isGmailConnected,
} from '../src/services/gmailService';
import { parseEmail } from '../src/services/emailParser';
import type { Transaction } from '../src/types';

export default function GmailConnect() {
  const router = useRouter();
  const { activeBudget, addTransaction, transactions } = useStore();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [newTransactions, setNewTransactions] = useState(0);
  const { request, response, promptAsync } = useGmailAuth();

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.authentication?.accessToken;
      const expiresIn = response.authentication?.expiresIn || 3600;
      if (token) {
        saveGmailToken(token, expiresIn).then(() => {
          setConnected(true);
          syncEmails(token);
        });
      }
    }
  }, [response]);

  const checkConnection = async () => {
    const connected = await isGmailConnected();
    setConnected(connected);
  };

  const handleConnect = async () => {
    setLoading(true);
    await promptAsync();
    setLoading(false);
  };

  const handleDisconnect = async () => {
    await removeGmailToken();
    setConnected(false);
  };

  const handleSync = async () => {
    const token = await getGmailToken();
    if (!token) {
      setConnected(false);
      return;
    }
    syncEmails(token);
  };

  const syncEmails = async (token: string) => {
    if (!activeBudget) return;
    setSyncing(true);
    setNewTransactions(0);

    try {
      const emails = await fetchBankEmails(token, 30);
      let count = 0;

      for (const email of emails) {
        // Verificar si ya fue procesado
        const alreadyProcessed = transactions.some(t => t.rawData?.emailId === email.id);
        if (alreadyProcessed) continue;

        // Parsear el correo
        const parsed = parseEmail({
          subject: email.subject,
          from: email.from,
          body: email.body,
          date: email.date,
        });

        if (!parsed) continue;

        // Encontrar categoría
        const category = activeBudget.categories.find(c =>
          c.name.toLowerCase().includes(parsed.suggestedCategory?.toLowerCase() || '')
        ) || activeBudget.categories[activeBudget.categories.length - 1];

        if (!category) continue;

        const transaction: Transaction = {
          id: `email_${email.id}`,
          budgetId: activeBudget.id,
          categoryId: category?.id || '',
          amount: parsed.amount,
          type: parsed.type,
          description: parsed.description,
          source: 'email',
          rawData: { emailId: email.id, from: email.from },
          date: new Date(email.date).toISOString(),
          aiConfidence: parsed.confidence || 0.85,
          categoryName: category?.name,
          categoryIcon: category?.icon,
          categoryColor: category?.color,
        };

        addTransaction(transaction);
        count++;
      }

      setNewTransactions(count);
      setLastSync(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error('[Gmail] Sync error:', e);
    }

    setSyncing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>📧 Conectar Gmail</Text>
          <Text style={styles.subtitle}>
            Lee automáticamente tus correos bancarios y registra los gastos en tu presupuesto
          </Text>
        </View>

        {/* Estado de conexión */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: connected ? colors.success : colors.textTertiary }]} />
            <Text style={styles.statusText}>
              {connected ? 'Gmail conectado' : 'Gmail no conectado'}
            </Text>
          </View>
          {lastSync && (
            <Text style={styles.lastSync}>Última sincronización: {lastSync}</Text>
          )}
          {newTransactions > 0 && (
            <View style={styles.newTransBadge}>
              <Text style={styles.newTransText}>
                ✅ {newTransactions} transacciones nuevas importadas
              </Text>
            </View>
          )}
        </View>

        {/* Bancos soportados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bancos soportados</Text>
          <View style={styles.banksGrid}>
            {['🏦 Bancolombia', '🏦 Davivienda', '💚 Nequi', '🔵 BBVA', '🟠 Nubank', '🟡 Colpatria'].map(bank => (
              <View key={bank} style={styles.bankChip}>
                <Text style={styles.bankChipText}>{bank}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Cómo funciona */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>¿Cómo funciona?</Text>
          {[
            { icon: '🔐', text: 'Autorizas el acceso de solo lectura a tu Gmail' },
            { icon: '📬', text: 'La app lee correos de notificaciones bancarias' },
            { icon: '🤖', text: 'La IA extrae el monto, tipo y descripción' },
            { icon: '📊', text: 'Se registra automáticamente en tu presupuesto' },
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* Botones */}
        <View style={styles.buttonsSection}>
          {!connected ? (
            <TouchableOpacity
              style={[styles.connectButton, (!request || loading) && styles.buttonDisabled]}
              onPress={handleConnect}
              disabled={!request || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.connectButtonText}>Conectar con Google</Text>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.syncButton, syncing && styles.buttonDisabled]}
                onPress={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <View style={styles.syncingRow}>
                    <ActivityIndicator color="#FFF" size="small" />
                    <Text style={styles.syncButtonText}>Sincronizando...</Text>
                  </View>
                ) : (
                  <Text style={styles.syncButtonText}>🔄 Sincronizar ahora</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
                <Text style={styles.disconnectText}>Desconectar Gmail</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingTop: spacing.xl },
  backBtn: { marginBottom: spacing.md },
  backText: { fontSize: fontSize.md, color: colors.primaryLight, fontWeight: '600' },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },

  statusCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  lastSync: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.xs },
  newTransBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  newTransText: { fontSize: fontSize.sm, color: colors.success, fontWeight: '600' },

  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  banksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bankChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bankChipText: { fontSize: fontSize.sm, color: colors.text },

  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  stepIcon: { fontSize: 24 },
  stepText: { flex: 1, fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22 },

  buttonsSection: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  connectButton: {
    backgroundColor: '#4285F4',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  connectButtonText: { fontSize: fontSize.md, fontWeight: '700', color: '#FFF' },
  syncButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  syncingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  syncButtonText: { fontSize: fontSize.md, fontWeight: '700', color: '#FFF' },
  disconnectButton: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  disconnectText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
});
