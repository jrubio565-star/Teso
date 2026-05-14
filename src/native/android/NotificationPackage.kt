package com.finanzai.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * NotificationPackage
 *
 * Registra el NotificationModule en la cadena de módulos nativos de React Native.
 * Debe ser añadido a la lista de packages en MainApplication.kt.
 */
class NotificationPackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext,
    ): List<NativeModule> = listOf(NotificationModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext,
    ): List<ViewManager<*, *>> = emptyList()
}
