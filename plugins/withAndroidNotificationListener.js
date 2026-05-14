/**
 * withAndroidNotificationListener.js
 *
 * Expo Config Plugin que agrega el NotificationListenerService a la app Android.
 *
 * Lo que hace:
 *  1. Declara el servicio en AndroidManifest.xml (con el permiso correcto)
 *  2. Copia los 3 archivos Kotlin al directorio java del proyecto Android
 *  3. Registra el NotificationPackage en MainApplication
 *
 * Uso: agregar "plugins/withAndroidNotificationListener" en app.json
 */

const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ─── 1. Inyectar el <service> en AndroidManifest.xml ─────────────────────────
function addServiceToManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const application = manifest.manifest.application[0];

    if (!application.service) {
      application.service = [];
    }

    // Evitar duplicados
    const alreadyAdded = application.service.some(
      (s) => s.$?.['android:name']?.includes('FinanzAINotificationService'),
    );
    if (!alreadyAdded) {
      application.service.push({
        $: {
          'android:name': '.FinanzAINotificationService',
          'android:label': 'FinanzAI — Lectura de notificaciones bancarias',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name':
                    'android.service.notification.NotificationListenerService',
                },
              },
            ],
          },
        ],
      });
    }

    return cfg;
  });
}

// ─── 2. Copiar archivos Kotlin al proyecto Android ────────────────────────────
function copyKotlinFiles(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const packageName = cfg.android?.package ?? 'com.finanzai.app';
      const packagePath = packageName.replace(/\./g, '/');
      const javaDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/src/main/java',
        packagePath,
      );

      if (!fs.existsSync(javaDir)) {
        fs.mkdirSync(javaDir, { recursive: true });
      }

      // Fuente: archivos Kotlin en src/native/android/
      const nativeDir = path.join(cfg.modRequest.projectRoot, 'src/native/android');
      const files = [
        'FinanzAINotificationService.kt',
        'NotificationModule.kt',
        'NotificationPackage.kt',
      ];

      for (const file of files) {
        const srcFile = path.join(nativeDir, file);
        const destFile = path.join(javaDir, file);
        if (fs.existsSync(srcFile)) {
          let content = fs.readFileSync(srcFile, 'utf8');
          // Reemplazar el package hardcodeado con el real
          content = content.replace(
            /^package com\.finanzai\.app/m,
            `package ${packageName}`,
          );
          fs.writeFileSync(destFile, content);
          console.log(`[FinanzAI] Copied ${file} → ${destFile}`);
        } else {
          console.warn(`[FinanzAI] Native file not found: ${srcFile}`);
        }
      }

      return cfg;
    },
  ]);
}

// ─── 3. Registrar NotificationPackage en MainApplication.kt ──────────────────
function registerPackageInMainApplication(config) {
  return withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;

    const importLine = 'import com.finanzai.app.NotificationPackage';
    const packageRegistration = 'packages.add(NotificationPackage())';

    // Agregar import si no existe
    if (!contents.includes(importLine)) {
      // Insertar después del último import existente
      contents = contents.replace(
        /(import [^\n]+\n)(?!import)/,
        `$1${importLine}\n`,
      );
    }

    // Agregar registro del package si no existe
    if (!contents.includes(packageRegistration)) {
      // Buscar el método getPackages() y agregar el package
      contents = contents.replace(
        /(override fun getPackages\(\)[^{]*\{[^}]*)(return packages)/s,
        `$1${packageRegistration}\n    $2`,
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

// ─── Plugin principal ─────────────────────────────────────────────────────────
module.exports = function withAndroidNotificationListener(config) {
  config = addServiceToManifest(config);
  config = copyKotlinFiles(config);
  config = registerPackageInMainApplication(config);
  return config;
};
