package com.finanzai.app

import android.content.Intent
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * NotificationModule
 *
 * Puente entre el NotificationListenerService (nativo Android)
 * y el código JavaScript de React Native.
 *
 * Expone al JS:
 *  - hasNotificationPermission()  → Promise<boolean>
 *  - requestNotificationPermission() → abre Ajustes de Android
 *  - addListener / removeListeners   → para el EventEmitter
 *
 * Emite el evento "onFinancialNotification" con los datos de cada
 * notificación bancaria detectada.
 */
class NotificationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "NotificationModule"
        const val EVENT_NAME = "onFinancialNotification"
        private const val MODULE_NAME = "NotificationListener"

        // Referencia estática para que el Service pueda llamar a emitNotificationEvent
        private var instance: NotificationModule? = null

        /**
         * Llamado desde FinanzAINotificationService cuando llega una notificación.
         * Emite el evento hacia JavaScript.
         */
        fun emitNotificationEvent(
            packageName: String,
            title: String,
            text: String,
            subText: String,
            timestamp: Long,
        ) {
            val module = instance ?: run {
                Log.w(TAG, "NotificationModule instance not ready, dropping event")
                return
            }

            try {
                val params = Arguments.createMap().apply {
                    putString("packageName", packageName)
                    putString("title", title)
                    putString("text", text)
                    putString("subText", subText)
                    putDouble("timestamp", timestamp.toDouble())
                    putString("appName", resolveAppName(packageName))
                }

                module.reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit(EVENT_NAME, params)

                Log.d(TAG, "Emitted $EVENT_NAME from $packageName")
            } catch (e: Exception) {
                Log.e(TAG, "Error emitting notification event", e)
            }
        }

        /**
         * Resuelve un nombre amigable para los paquetes bancarios conocidos.
         */
        private fun resolveAppName(packageName: String): String = when {
            packageName.contains("wallet", ignoreCase = true) ||
            packageName.contains("google.android.gms", ignoreCase = true) -> "Google Wallet"
            packageName.contains("nequi", ignoreCase = true) -> "Nequi"
            packageName.contains("bancolombia", ignoreCase = true) -> "Bancolombia"
            packageName.contains("davivienda", ignoreCase = true) -> "Davivienda"
            packageName.contains("bbva", ignoreCase = true) -> "BBVA"
            packageName.contains("scotiabank", ignoreCase = true) ||
            packageName.contains("colpatria", ignoreCase = true) -> "Scotiabank Colpatria"
            packageName.contains("falabella", ignoreCase = true) -> "Falabella"
            packageName.contains("nu.", ignoreCase = true) -> "Nubank"
            packageName.contains("bold", ignoreCase = true) -> "Bold"
            packageName.contains("rappipay", ignoreCase = true) -> "RappiPay"
            else -> packageName
        }
    }

    override fun getName(): String = MODULE_NAME

    override fun initialize() {
        super.initialize()
        instance = this
        Log.d(TAG, "NotificationModule initialized")
    }

    override fun invalidate() {
        super.invalidate()
        if (instance === this) instance = null
    }

    /**
     * Verifica si el usuario otorgó permiso de lectura de notificaciones.
     */
    @ReactMethod
    fun hasNotificationPermission(promise: Promise) {
        try {
            val enabledListeners = Settings.Secure.getString(
                reactContext.contentResolver,
                "enabled_notification_listeners",
            )
            val packageName = reactContext.packageName
            val hasPermission = enabledListeners?.contains(packageName) == true
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking notification permission", e)
            promise.resolve(false)
        }
    }

    /**
     * Abre la pantalla de Android para que el usuario habilite el acceso a notificaciones.
     */
    @ReactMethod
    fun requestNotificationPermission(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening notification settings", e)
            promise.reject("ERROR", "No se pudo abrir la configuración de notificaciones: ${e.message}")
        }
    }

    // Requerido por el EventEmitter de React Native
    @ReactMethod
    fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {}

    @ReactMethod
    fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) {}
}
