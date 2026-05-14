/**
 * NotificationPermissionBanner.tsx
 *
 * Banner que aparece en el Dashboard cuando el usuario tiene Android
 * pero aún no concedió el permiso de lectura de notificaciones.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../theme/colors';
import {
  isNotificationListenerAvailable,
  hasNotificationPermission,
  requestNotificationPermission,
  startListening,
} from '../services/notificationListener';

export default function NotificationPermissionBanner() {
  const [show, setShow] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!isNotificationListenerAvailable()) return;

    hasNotificationPermission().then((has) => {
      if (has) {
        setGranted(true);
        startListening();   // Iniciar escucha automáticamente si ya tiene permiso
      } else {
        setShow(true);
      }
    });
  }, []);

  // No mostrar en iOS ni si ya tiene permiso
  if (Platform.OS !== 'android' || !show) return null;

  const handleGrant = async () => {
    await requestNotificationPermission();
    // Verificar de nuevo después de que el usuario vuelva de Ajustes
    setTimeout(async () => {
      const has = await hasNotificationPermission();
      if (has) {
        startListening();
        setGranted(true);
        setShow(false);
      }
    }, 1500);
  };

  if (granted) {
    return (
      <View style={[styles.banner, styles.bannerGranted]}>
        <Text style={styles.icon}>🔔</Text>
        <Text style={styles.textGranted}>
          Capturando notificaciones bancarias en tiempo real
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <Text style={styles.icon}>🔔</Text>
        <View>
          <Text style={styles.title}>Activa la captura automática</Text>
          <Text style={styles.subtitle}>
            Lee tus pagos de Google Wallet, Nequi y bancos al instante
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleGrant}>
        <Text style={styles.buttonText}>Activar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    borderRadius: borderRadius.md, padding: spacing.md,
    borderWidth: 1, borderColor: '#BFDBFE', gap: spacing.sm,
  },
  bannerGranted: {
    backgroundColor: '#ECFDF5', borderColor: '#A7F3D0',
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm },
  icon: { fontSize: 28 },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  subtitle: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  textGranted: { fontSize: fontSize.sm, color: '#065F46', fontWeight: '600', flex: 1 },
  button: {
    backgroundColor: colors.primary, borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  buttonText: { fontSize: fontSize.sm, color: '#FFF', fontWeight: '700' },
});
