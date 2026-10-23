package com.example.wellwisher.jarvis

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.wellwisher.MainActivity
import com.example.wellwisher.R

/**
 * Android BroadcastReceiver for JARVIS Scheduled Exact Alarms.
 * Wakes the device, displays high-priority Heads-Up notification on JARVIS_REMINDERS channel,
 * speaks spoken reminder feedback, and records delivery telemetry.
 */
class JarvisReminderReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "JarvisReminderReceiver"
        const val CHANNEL_ID = "JARVIS_REMINDERS"
        const val CHANNEL_NAME = "JARVIS Reminders & Alerts"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val reminderId = intent.getStringExtra("reminderId") ?: "rem_unknown"
        val title = intent.getStringExtra("title") ?: "Reminder"
        val time = intent.getStringExtra("time") ?: ""
        val isRecurring = intent.getBooleanExtra("isRecurring", false)
        val recurrenceRule = intent.getStringExtra("recurrenceRule")

        Log.i(TAG, "[JARVIS] REMINDER_TRIGGERED reminderId=$reminderId title=\"$title\" time=\"$time\"")

        // 1. Acquire temporary wake lock to ensure CPU stays active during notification post
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = powerManager?.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "wellwisher:JarvisReminderWakeLock"
        )
        wakeLock?.acquire(10000L) // 10 seconds max

        try {
            // 2. Post high-priority notification immediately
            postReminderNotification(context, reminderId, title, time)

            // 3. Delegate to JarvisReminderService for reliable background TTS execution
            val serviceIntent = Intent(context, JarvisReminderService::class.java).apply {
                action = JarvisReminderService.ACTION_FIRE_REMINDER
                putExtra("reminderId", reminderId)
                putExtra("title", title)
                putExtra("time", time)
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            } catch (e: Exception) {
                try { context.startService(serviceIntent) } catch (_: Exception) {}
            }

            // 4. If recurring, calculate and schedule next occurrence
            if (isRecurring) {
                val nextTrigger = System.currentTimeMillis() + 86400000L // Next day (24 hours)
                JarvisReminderManager.scheduleReminder(
                    context,
                    reminderId,
                    title,
                    time,
                    nextTrigger,
                    true,
                    recurrenceRule
                )
                Log.i(TAG, "[JARVIS] RECURRING_REMINDER_RESCHEDULED reminderId=$reminderId nextTrigger=$nextTrigger")
            }
        } finally {
            if (wakeLock?.isHeld == true) {
                wakeLock.release()
            }
        }
    }

    private fun postReminderNotification(
        context: Context,
        reminderId: String,
        title: String,
        time: String
    ) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Ensure channel exists
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "High-priority scheduled reminders from JARVIS Personal AI"
                enableVibration(true)
                enableLights(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Tap opens JARVIS in MainActivity
        val tapIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("action", "OPEN_REMINDER")
            putExtra("reminderId", reminderId)
        }
        val notifId = (reminderId.hashCode() and 0x7FFFFFFF)
        val pendingIntent = PendingIntent.getActivity(
            context,
            notifId,
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("JARVIS Reminder: $title")
            .setContentText(if (time.isNotEmpty()) "Scheduled for $time" else "Time for $title")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build()

        notificationManager.notify(notifId, notification)
        Log.i(TAG, "[JARVIS] NOTIFICATION_DELIVERED id=$notifId title=\"$title\"")
    }
}
