import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Switch, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../../src/theme/colors';
import { useStore } from '../../src/store/useStore';
import { loadApiKey, saveApiKey, removeApiKey, hasApiKey } from '../../src/services/config';

function SettingRow({ icon, title, subtitle, onPress, rightElement, danger }: {
  icon: string; title: string; subtitle?: string;
  onPress?: () => void; rightElement?: React.ReactNode; danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !rightElement}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement ?? (onPress ? <Text style={styles.chevron}>›</Text> : null)}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionContent}>{children}</View>;
}

// ─── API Key Modal ────────────────────────────────────────────────────────────
function ApiKeyModal({ visible, currentKeySet, onClose }: {
  visible: boolean; currentKeySet: boolean; onClose: (changed: boolean) => void;
}) {
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed.startsWith('sk-ant-')) {
      Alert.alert('Key inválida', 'La API key debe comenzar con "sk-ant-". Verifica que copiaste la clave completa desde console.anthropic.com');
      return;
    }
    setSaving(true);
    await saveApiKey(trimmed);
    setSaving(false);
    setKeyInput('');
    onClose(true);
  };

  const handleRemove = () => {
    Alert.alert(
      'Eliminar API key',
      '¿Seguro? El agente de IA volverá a modo demo hasta que configures una nueva key.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: async () => {
            await removeApiKey();
            setKeyInput('');
            onClose(true);
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🔑 API Key de Anthropic</Text>

          {currentKeySet ? (
            <>
              <View style={styles.keySetBadge}>
                <Text style={styles.keySetIcon}>✅</Text>
                <View>
                  <Text style={styles.keySetTitle}>Agente IA activo</Text>
                  <Text style={styles.keySetSubtitle}>API key configurada correctamente</Text>
                </View>
              </View>
              <Text style={styles.modalDescription}>
                Para cambiar la key, ingresa la nueva a continuación. Para desactivar el agente, elimina la key actual.
              </Text>
            </>
          ) : (
            <Text style={styles.modalDescription}>
              Obtén tu key gratuita en{' '}
              <Text style={styles.modalLink}>console.anthropic.com</Text>
              {' '}→ API Keys. Los primeros $5 USD de crédito son gratis.
            </Text>
          )}

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
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => { setKeyInput(''); onClose(false); }}>
              <Text style={styles.modalCancelText}>Cerrar</Text>
            </TouchableOpacity>
            {currentKeySet && (
              <TouchableOpacity style={styles.modalDangerButton} onPress={handleRemove}>
                <Text style={styles.modalDangerText}>Eliminar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modalSaveButton, !keyInput.trim() && styles.modalSaveDisabled]}
              onPress={handleSave}
              disabled={!keyInput.trim() || saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={styles.modalSaveText}>{currentKeySet ? 'Actualizar' : 'Guardar'}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { user } = useStore();
  const [emailSync, setEmailSync] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [notifListener, setNotifListener] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);

  useEffect(() => {
    loadApiKey().then(() => setApiKeySet(hasApiKey()));
  }, []);

  const handleApiKeyModalClose = (changed: boolean) => {
    if (changed) setApiKeySet(hasApiKey());
    setShowApiKeyModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Configuración</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.displayName?.charAt(0) ?? 'U'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.displayName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>Plan Gratuito</Text>
            </View>
          </View>
        </View>

        {/* Premium upsell */}
        <TouchableOpacity style={styles.premiumCard} activeOpacity={0.8}>
          <View style={{ flex: 1 }}>
            <Text style={styles.premiumTitle}>Actualiza a Premium ✨</Text>
            <Text style={styles.premiumSubtitle}>
              Sin anuncios · Presupuestos ilimitados · Insights avanzados
            </Text>
          </View>
          <Text style={styles.premiumPrice}>$4.99/mes</Text>
        </TouchableOpacity>

        {/* ── Agente IA ── */}
        <SectionHeader title="Agente de IA" />
        <SectionCard>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowApiKeyModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.settingIcon}>🤖</Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>API Key de Anthropic</Text>
              <Text style={styles.settingSubtitle}>
                {apiKeySet ? '✅ Agente activo — toca para gestionar' : '⚠️ Sin configurar — modo demo activo'}
              </Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: apiKeySet ? colors.success : colors.warning }]} />
          </TouchableOpacity>
          <SettingRow
            icon="🧠"
            title="Modelo IA"
            subtitle="Claude Haiku 4.5 — Rápido y económico"
          />
          <SettingRow
            icon="📊"
            title="Tokens usados este mes"
            subtitle="~24,500 tokens · ~$0.03 USD"
          />
        </SectionCard>

        {/* ── Fuentes de Datos ── */}
        <SectionHeader title="Fuentes de Datos" />
        <SectionCard>
          <SettingRow
            icon="📧"
            title="Sincronizar Gmail"
            subtitle={emailSync ? 'Conectado — leyendo emails bancarios' : 'Conecta Gmail para captura automática'}
            rightElement={
              <Switch
                value={emailSync}
                onValueChange={setEmailSync}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={colors.surface}
              />
            }
          />
          <SettingRow
            icon="🔔"
            title="Leer notificaciones (Android)"
            subtitle={notifListener ? 'Leyendo notificaciones bancarias' : 'Acceso a notificaciones del sistema'}
            rightElement={
              <Switch
                value={notifListener}
                onValueChange={setNotifListener}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={colors.surface}
              />
            }
          />
          <SettingRow
            icon="🏦"
            title="Bancos configurados"
            subtitle="Davivienda · Bancolombia · Nequi · BBVA"
            onPress={() => {}}
          />
        </SectionCard>

        {/* ── Preferencias ── */}
        <SectionHeader title="Preferencias" />
        <SectionCard>
          <SettingRow
            icon="💵"
            title="Moneda principal"
            subtitle="COP — Peso Colombiano"
            onPress={() => {}}
          />
          <SettingRow
            icon="🔔"
            title="Notificaciones push"
            subtitle="Alertas de gastos y límites de presupuesto"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={colors.surface}
              />
            }
          />
          <SettingRow
            icon="🌙"
            title="Tema oscuro"
            subtitle="Próximamente"
          />
        </SectionCard>

        {/* ── Cuenta ── */}
        <SectionHeader title="Cuenta" />
        <SectionCard>
          <SettingRow icon="🔒" title="Privacidad y seguridad" onPress={() => {}} />
          <SettingRow icon="📤" title="Exportar datos" subtitle="CSV o PDF" onPress={() => {}} />
          <SettingRow icon="❓" title="Ayuda y soporte" onPress={() => {}} />
          <SettingRow icon="⭐" title="Calificar la app" onPress={() => {}} />
          <SettingRow icon="📜" title="Términos y condiciones" onPress={() => {}} />
          <SettingRow icon="🚪" title="Cerrar sesión" onPress={() => {}} danger />
        </SectionCard>

        <View style={styles.version}>
          <Text style={styles.versionText}>FinanzAI v1.0.0</Text>
          <Text style={styles.versionSubtext}>Hecho con ❤️ en Colombia</Text>
        </View>
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <ApiKeyModal
        visible={showApiKeyModal}
        currentKeySet={apiKeySet}
        onClose={handleApiKeyModalClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: colors.textOnPrimary },
  profileInfo: { flex: 1 },
  profileName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  profileEmail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  planBadge: {
    marginTop: spacing.xs, backgroundColor: colors.divider,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: borderRadius.sm, alignSelf: 'flex-start',
  },
  planBadgeText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600' },

  premiumCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: '#EFF6FF', borderRadius: borderRadius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: '#BFDBFE',
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  premiumTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  premiumSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  premiumPrice: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primaryLight },

  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm, marginTop: spacing.md,
  },
  sectionContent: {
    marginHorizontal: spacing.lg, backgroundColor: colors.surface,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: spacing.sm,
  },
  settingIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  settingTitleDanger: { color: colors.error },
  settingSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  chevron: { fontSize: 24, color: colors.textTertiary },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  version: { alignItems: 'center', paddingVertical: spacing.lg },
  versionText: { fontSize: fontSize.sm, color: colors.textTertiary },
  versionSubtext: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.xs },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl, paddingBottom: 40,
  },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  modalDescription: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.lg },
  modalLink: { color: colors.primaryLight, fontWeight: '600' },
  keySetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#ECFDF5', borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  keySetIcon: { fontSize: 22 },
  keySetTitle: { fontSize: fontSize.md, fontWeight: '700', color: '#065F46' },
  keySetSubtitle: { fontSize: fontSize.sm, color: '#047857' },
  apiKeyInput: {
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: fontSize.md, color: colors.text,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
    fontFamily: 'monospace',
  },
  modalButtons: { flexDirection: 'row', gap: spacing.sm },
  modalCancelButton: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.background, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  modalCancelText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },
  modalDangerButton: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: '#FEF2F2', alignItems: 'center',
    borderWidth: 1, borderColor: '#FECACA',
  },
  modalDangerText: { fontSize: fontSize.md, color: colors.error, fontWeight: '600' },
  modalSaveButton: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  modalSaveDisabled: { backgroundColor: colors.border },
  modalSaveText: { fontSize: fontSize.md, color: colors.textOnPrimary, fontWeight: '700' },
});
