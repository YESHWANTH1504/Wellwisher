package com.example.wellwisher

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast

/**
 * BroadcastReceiver for JARVIS Actionable Notifications
 * Handles Done, Snooze 15m, Snooze 30m, and Ask JARVIS buttons
 */
class JarvisNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        val notifId = intent.getIntExtra("notification_id", -1)

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
        if (notifId != -1) {
            notificationManager.cancel(notifId)
        }

        when (action) {
            "com.example.wellwisher.ACTION_JARVIS_DONE" -> {
                Toast.makeText(context, "JARVIS: Task marked complete.", Toast.LENGTH_SHORT).show()
            }
            "com.example.wellwisher.ACTION_JARVIS_SNOOZE_15" -> {
                Toast.makeText(context, "JARVIS: Snoozed for 15 minutes.", Toast.LENGTH_SHORT).show()
            }
            "com.example.wellwisher.ACTION_JARVIS_SNOOZE_30" -> {
                Toast.makeText(context, "JARVIS: Snoozed for 30 minutes.", Toast.LENGTH_SHORT).show()
            }
            "com.example.wellwisher.ACTION_JARVIS_SPEAK" -> {
                val launchIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("action", "SPEAK_WITH_JARVIS")
                }
                context.startActivity(launchIntent)
            }
        }
    }
}
