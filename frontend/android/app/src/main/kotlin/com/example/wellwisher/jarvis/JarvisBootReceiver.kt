package com.example.wellwisher.jarvis

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Android BroadcastReceiver for BOOT_COMPLETED and MY_PACKAGE_REPLACED events.
 * Re-registers all active future alarms with AlarmManager and restores the background voice assistant.
 */
class JarvisBootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "JarvisBootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.i(TAG, "[JARVIS] Boot broadcast received: $action")

        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == "android.intent.action.QUICKBOOT_POWERON" ||
            action == "com.htc.intent.action.QUICKBOOT_POWERON"
        ) {
            val restoredCount = JarvisReminderManager.rescheduleAllAfterBoot(context)
            Log.i(TAG, "[JARVIS] BOOT_RESTORATION_FINISHED restoredCount=$restoredCount")

            try {
                val serviceIntent = Intent(context, JarvisVoiceService::class.java).apply {
                    setAction(JarvisVoiceService.ACTION_START_VOICE)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
                Log.i(TAG, "[JARVIS] Background voice service restored on boot")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to restore voice service on boot: ${e.message}")
            }
        }
    }
}
