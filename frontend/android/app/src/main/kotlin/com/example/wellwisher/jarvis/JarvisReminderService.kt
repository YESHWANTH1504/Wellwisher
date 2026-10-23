package com.example.wellwisher.jarvis

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.wellwisher.MainActivity
import com.example.wellwisher.R

/**
 * Android Foreground Service for Executing Scheduled Alarm Reminders.
 * Ensures that audio playback (TTS) and notification delivery run within
 * an authorized Android Service context with partial wake lock, surviving
 * app closure and device sleep.
 */
class JarvisReminderService : Service() {

    companion object {
        private const val TAG = "JarvisReminderService"
        const val CHANNEL_ID = "JARVIS_REMINDERS"
        const val CHANNEL_NAME = "JARVIS Reminders & Alerts"
        const val NOTIFICATION_ID = 9601

        const val ACTION_FIRE_REMINDER = "com.example.wellwisher.jarvis.FIRE_REMINDER"
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var ttsManager: JarvisTtsManager? = null
    private val handler = Handler(Looper.getMainLooper())

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager
        wakeLock = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "wellwisher:JarvisReminderServiceWakeLock")?.apply {
            setReferenceCounted(false)
            acquire(30000L) // 30s max safety timeout
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val reminderId = intent?.getStringExtra("reminderId") ?: "rem_unknown"
        val title = intent?.getStringExtra("title") ?: "Reminder"
        val time = intent?.getStringExtra("time") ?: ""

        Log.i(TAG, "[JARVIS] REMINDER_SERVICE_ACTIVE reminderId=$reminderId title=\"$title\"")

        // 1. Post notification and attach to foreground
        val notification = postReminderNotification(reminderId, title, time)
        try {
            startForeground(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.w(TAG, "startForeground non-fatal notice: ${e.message}")
        }

        // 2. Initialize and speak reminder through TTS
        handler.post {
            try {
                ttsManager = JarvisTtsManager(
                    applicationContext,
                    onSpeechStarted = {
                        Log.i(TAG, "[REMINDER] TTS speaking: \"Reminder: $title\"")
                    },
                    onSpeechCompleted = {
                        Log.i(TAG, "[REMINDER] TTS completed for reminderId=$reminderId")
                        finishService()
                    },
                    onError = { err ->
                        Log.w(TAG, "[REMINDER] TTS error: $err")
                        finishService()
                    }
                )

                // Give TTS engine 600ms to initialize then speak
                handler.postDelayed({
                    ttsManager?.speak("Reminder: $title", onDone = {
                        finishService()
                    })
                }, 600L)

            } catch (e: Exception) {
                Log.e(TAG, "[REMINDER] Error initializing TTS: ${e.message}")
                finishService()
            }
        }

        // Failsafe timeout to stop service after 15s
        handler.postDelayed({
            finishService()
        }, 15000L)

        return START_NOT_STICKY
    }

    private fun postReminderNotification(reminderId: String, title: String, time: String): android.app.Notification {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

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

        val tapIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("action", "OPEN_REMINDER")
            putExtra("reminderId", reminderId)
        }
        val notifId = (reminderId.hashCode() and 0x7FFFFFFF)
        val pendingIntent = PendingIntent.getActivity(
            this,
            notifId,
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
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
        Log.i(TAG, "[REMINDER] NOTIFICATION_DELIVERED id=$notifId title=\"$title\"")
        return notification
    }

    private fun finishService() {
        try {
            ttsManager?.shutdown()
            ttsManager = null
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            stopSelf()
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        super.onDestroy()
        finishService()
    }
}
