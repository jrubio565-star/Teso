package com.finanzai.app

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * FinanzAINotificationService
 *
 * Servicio Android que escucha todas las notificaciones del sistema.
 * Cuando detecta una notificación de una app bancaria o de pagos,
 * la envía al puente de React Native para ser procesada por el agente IA.
 *
 * Requiere que el usuario otorgue acceso en:
 * Ajustes → Aplicaciones → Acceso especial → Acceso a notificaciones
 */
class FinanzAINotificationService : NotificationListenerService() {

    companion object {
        private const val TAG = "FinanzAINotif"

        /**
         * Apps de las que queremos capturar notificaciones.
         * Incluye Google Wallet, principales bancos colombianos y billeteras virtuales.
         */
        private val TARGET_PACKAGES = setOf(
            // Google Wallet / Google Pay
            "com.google.android.apps.walletnfcrel",
            "com.google.android.gms",
            "com.android.vending",

            // Nequi
            "com.nequi.mobilebanking",

            // Bancolombia
            "com.bancolombia.sucursalvirtual",
            "com.bancolombia.mobileapp",

            // Davivienda
            "com.davivienda.mobileapp",
            "co.com.davivienda.mobileapp",

            // BBVA Colombia
            "com.bbva.colombia",
            "bbva.colombia",

            // Scotiabank Colpatria
            "com.scotiabank.colpatria",

            // Falabella / CMR
            "com.falabella.banking",

            // Nubank Colombia
            "com.nu.production",

            // Bold (pagos con datáfono)
            "co.bold.app",

            // Rappipay
            "com.rappipay",
        )

        /**
         * Palabras clave que indican que es una notificación financiera.
         * Si el paquete no está en la lista pero el contenido tiene estas palabras, igual la procesamos.
         */
        private val FINANCIAL_KEYWORDS = listOf(
            "pagaste", "pago", "compra", "transacción", "transaccion",
            "débito", "debito", "cargo", "cobro", "retiro",
            "abono", "consignación", "consignacion", "depósito", "deposito",
            "transferencia", "enviaste", "recibiste", "te pagaron",
            "\$", "cop", "usd",
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        try {
            val packageName = sbn.packageName ?: return
            val notification = sbn.notification ?: return
            val extras = notification.extras ?: return

            val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
            val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
            val subText = extras.getString(Notification.EXTRA_SUB_TEXT) ?: ""

            // Usar el texto más largo disponible para mejor parsing
            val fullText = when {
                bigText.isNotBlank() -> bigText
                text.isNotBlank() -> text
                else -> return
            }

            val combinedText = "$title $fullText $subText"

            // Filtrar: solo procesar si es app bancaria conocida O tiene palabras clave financieras
            val isTargetApp = TARGET_PACKAGES.any { packageName.contains(it, ignoreCase = true) }
            val hasFinancialContent = FINANCIAL_KEYWORDS.any {
                combinedText.contains(it, ignoreCase = true)
            }

            if (!isTargetApp && !hasFinancialContent) return

            Log.d(TAG, "Financial notification from $packageName: $title | $fullText")

            // Enviar al puente de React Native
            NotificationModule.emitNotificationEvent(
                packageName = packageName,
                title = title,
                text = fullText,
                subText = subText,
                timestamp = sbn.postTime,
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error processing notification", e)
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        // No necesitamos procesar notificaciones eliminadas
    }

    override fun onListenerConnected() {
        Log.d(TAG, "FinanzAI notification listener connected")
    }

    override fun onListenerDisconnected() {
        Log.d(TAG, "FinanzAI notification listener disconnected")
    }
}
