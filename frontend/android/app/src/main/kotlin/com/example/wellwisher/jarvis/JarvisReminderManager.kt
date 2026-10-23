package com.example.wellwisher.jarvis

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONObject

/**
 * Authoritative Android Native Reminder & Exact Alarm Scheduling Manager.
 * Handles persistence, OS-level exact alarm registration, boot restoration, and cancellation.
 */
object JarvisReminderManager {

    private const val TAG = "JarvisReminderManager"
    private const val PREFS_NAME = "jarvis_persisted_reminders"
    const val ACTION_TRIGGER_REMINDER = "com.example.wellwisher.jarvis.TRIGGER_REMINDER"

    /**
     * Schedule an exact OS alarm that survives app closure and device sleep.
     */
    fun scheduleReminder(
        context: Context,
        reminderId: String,
        title: String,
        time: String,
        triggerAtMillis: Long,
        isRecurring: Boolean = false,
        recurrenceRule: String? = null
    ): Boolean {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            if (alarmManager == null) {
                Log.e(TAG, "[JARVIS] AlarmManager system service unavailable")
                return false
            }

            // Android 12+ Exact Alarm Permission Check
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    Log.w(TAG, "[JARVIS] SCHEDULE_EXACT_ALARM permission not granted, requesting fallback or direct intent")
                }
            }

            // 1. Persist to local durable storage
            persistReminderRecord(context, reminderId, title, time, triggerAtMillis, isRecurring, recurrenceRule)

            // 2. Prepare PendingIntent
            val intent = Intent(context, JarvisReminderReceiver::class.java).apply {
                action = ACTION_TRIGGER_REMINDER
                putExtra("reminderId", reminderId)
                putExtra("title", title)
                putExtra("time", time)
                putExtra("triggerAtMillis", triggerAtMillis)
                putExtra("isRecurring", isRecurring)
                putExtra("recurrenceRule", recurrenceRule)
            }

            val requestCode = (reminderId.hashCode() and 0x7FFFFFFF)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            val pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, flags)

            // 3. Register Exact Wakeup Alarm
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
            }

            Log.i(TAG, "[JARVIS] ALARM_SCHEDULED reminderId=$reminderId title=\"$title\" at=$triggerAtMillis")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "[JARVIS] Failed to schedule exact alarm: ${e.message}", e)
            return false
        }
    }

    /**
     * Cancel an active scheduled reminder
     */
    fun cancelReminder(context: Context, reminderId: String): Boolean {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            val intent = Intent(context, JarvisReminderReceiver::class.java).apply {
                action = ACTION_TRIGGER_REMINDER
            }
            val requestCode = (reminderId.hashCode() and 0x7FFFFFFF)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            val pendingIntent = PendingIntent.getBroadcast(context, requestCode, intent, flags)

            if (alarmManager != null && pendingIntent != null) {
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
            }

            // Remove from local persistent storage
            removeReminderRecord(context, reminderId)
            Log.i(TAG, "[JARVIS] ALARM_CANCELLED reminderId=$reminderId")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "[JARVIS] Failed to cancel alarm: ${e.message}", e)
            return false
        }
    }

    /**
     * Restore all future scheduled alarms after device reboot
     */
    fun rescheduleAllAfterBoot(context: Context): Int {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val allEntries = prefs.all
        var restoredCount = 0
        val now = System.currentTimeMillis()

        Log.i(TAG, "[JARVIS] BOOT_COMPLETED restoring reminders from durable storage...")

        for ((id, rawJson) in allEntries) {
            if (rawJson is String) {
                try {
                    val obj = JSONObject(rawJson)
                    val triggerAt = obj.optLong("triggerAtMillis", 0L)
                    val title = obj.optString("title", "Reminder")
                    val time = obj.optString("time", "")
                    val isRecurring = obj.optBoolean("isRecurring", false)
                    val recurrenceRule = obj.optString("recurrenceRule", null)

                    if (triggerAt > now) {
                        scheduleReminder(context, id, title, time, triggerAt, isRecurring, recurrenceRule)
                        restoredCount++
                    } else if (isRecurring) {
                        // Reschedule next recurrence if recurring
                        val nextTrigger = triggerAt + 86400000L // Next day by default
                        scheduleReminder(context, id, title, time, nextTrigger, true, recurrenceRule)
                        restoredCount++
                    } else {
                        // Expired, clean up
                        removeReminderRecord(context, id)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Error restoring reminder $id: ${e.message}")
                }
            }
        }

        Log.i(TAG, "[JARVIS] BOOT_RESTORE_COMPLETED totalRestored=$restoredCount")
        return restoredCount
    }

    private fun persistReminderRecord(
        context: Context,
        reminderId: String,
        title: String,
        time: String,
        triggerAtMillis: Long,
        isRecurring: Boolean,
        recurrenceRule: String?
    ) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val obj = JSONObject().apply {
            put("reminderId", reminderId)
            put("title", title)
            put("time", time)
            put("triggerAtMillis", triggerAtMillis)
            put("isRecurring", isRecurring)
            put("recurrenceRule", recurrenceRule ?: "")
            put("createdAt", System.currentTimeMillis())
        }
        prefs.edit().putString(reminderId, obj.toString()).apply()
    }

    private fun removeReminderRecord(context: Context, reminderId: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().remove(reminderId).apply()
    }
}
