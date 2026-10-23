package com.example.wellwisher.jarvis

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.wellwisher.MainActivity
import com.example.wellwisher.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Android Foreground Service for Always-On JARVIS Voice Assistant.
 * Maintains hands-free local wake-word detection, speech command processing,
 * backend intelligence orchestration, and spoken TTS feedback.
 */
class JarvisVoiceService : Service() {

    companion object {
        private const val TAG = "JarvisVoiceService"
        const val CHANNEL_ID = "jarvis_always_on_voice_channel"
        const val NOTIFICATION_ID = 9501
        
        const val ACTION_START_VOICE = "com.example.wellwisher.START_VOICE_ASSISTANT"
        const val ACTION_STOP_VOICE = "com.example.wellwisher.STOP_VOICE_ASSISTANT"
        const val ACTION_TRIGGER_WAKE = "com.example.wellwisher.TRIGGER_WAKE_WORD"
        const val ACTION_CANCEL_SPEECH = "com.example.wellwisher.CANCEL_SPEECH"
        const val ACTION_PROCESS_VOICE_TRANSCRIPT = "com.example.wellwisher.PROCESS_VOICE_TRANSCRIPT"

        var isServiceRunning: Boolean = false
            private set
        var currentVoiceState: VoiceState = VoiceState.IDLE
            private set
        var instance: JarvisVoiceService? = null
            private set

        fun isWakeWordListening(): Boolean {
            return instance?.wakeWordManager?.isCurrentlyListening() ?: false
        }

        fun isMicrophoneActive(): Boolean {
            return (instance?.wakeWordManager?.isCurrentlyListening() == true) ||
                   (currentVoiceState == VoiceState.LISTENING)
        }
    }

    private lateinit var stateMachine: VoiceSessionStateMachine
    private var wakeWordManager: WakeWordManager? = null
    private var speechRecognizerManager: SpeechRecognizerManager? = null
    private var ttsManager: JarvisTtsManager? = null
    private var liveKitClient: LiveKitVoiceClient? = null
    private var apiClient: JarvisApiClient? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var activeSessionId: String? = null

    private var lastWakeTriggerTime = 0L
    private val wakeWordDebounceMs = 2500L
    private val wakeWordCooldownMs = 4000L
    private var isSessionActive = false

    override fun onCreate() {
        super.onCreate()
        instance = this
        Log.i(TAG, "JarvisVoiceService creating...")
        createNotificationChannel()

        stateMachine = VoiceSessionStateMachine { previous, current ->
            currentVoiceState = current
            Log.d(TAG, "Voice state transition: $previous -> $current")
            updateNotification("JARVIS: ${current.name}")
        }

        apiClient = JarvisApiClient(applicationContext)
        liveKitClient = LiveKitVoiceClient(applicationContext)

        liveKitClient?.setStateListener { lkState ->
            Log.d(TAG, "LiveKit state: $lkState")
            if (lkState == LiveKitVoiceClient.ConnectionState.INTERRUPTED) {
                ttsManager?.stop()
                startPassiveWakeWordListening()
            }
        }

        var isSuppressedDuringSpeech = false
        val mainHandler = Handler(Looper.getMainLooper())

        ttsManager = JarvisTtsManager(
            applicationContext,
            onSpeechStarted = {
                Log.i(TAG, "[TTS] Speaking started. Active barge-in listening enabled.")
                if (stateMachine.getCurrentState() != VoiceState.WAKE_DETECTED) {
                    stateMachine.transitionTo(VoiceState.SPEAKING)
                }
            },
            onSpeechCompleted = {
                mainHandler.post {
                    Log.i(TAG, "[TTS] completed.")
                    if (stateMachine.getCurrentState() == VoiceState.SPEAKING) {
                        stateMachine.transitionTo(VoiceState.RETURNING_TO_IDLE)
                        mainHandler.postDelayed({
                            if (stateMachine.getCurrentState() == VoiceState.RETURNING_TO_IDLE) {
                                Log.i(TAG, "[VOICE] Returning to IDLE.")
                                stateMachine.transitionTo(VoiceState.IDLE)
                                startPassiveWakeWordListening()
                            }
                        }, 500L)
                    }
                }
            },
            onError = { err ->
                Log.w(TAG, "[TTS] error notice: $err")
                stateMachine.transitionTo(VoiceState.ERROR)
                startPassiveWakeWordListening()
            }
        )

        speechRecognizerManager = SpeechRecognizerManager(
            applicationContext,
            onPartialTranscript = { partial ->
                Log.d(TAG, "[STT] partial=\"$partial\"")
                // Barge-in: immediately stop TTS when user begins speaking while assistant is speaking
                if (stateMachine.getCurrentState() == VoiceState.SPEAKING || ttsManager?.isSpeaking == true) {
                    Log.i(TAG, "[BARGE-IN] User speech detected during assistant speech: \"$partial\". Halting speech.")
                    ttsManager?.stop()
                    stateMachine.transitionTo(VoiceState.INTERRUPTED)
                    stateMachine.transitionTo(VoiceState.LISTENING)
                }
            },
            onFinalTranscript = { transcript ->
                if (stateMachine.getCurrentState() == VoiceState.SPEAKING || ttsManager?.isSpeaking == true) {
                    Log.i(TAG, "[BARGE-IN] Final transcript intercepted during speech: \"$transcript\". Halting speech.")
                    ttsManager?.stop()
                    stateMachine.transitionTo(VoiceState.INTERRUPTED)
                }
                handleCapturedVoiceCommand(transcript)
            },
            onError = { err ->
                Log.w(TAG, "[STT] error: $err")
                stateMachine.transitionTo(VoiceState.ERROR)
                startPassiveWakeWordListening()
            },
            onSilenceTimeout = {
                Log.d(TAG, "[STT] silence timeout on command capture")
                stateMachine.transitionTo(VoiceState.IDLE)
                startPassiveWakeWordListening()
            }
        )

        wakeWordManager = WakeWordManager(
            applicationContext,
            onWakeWordDetected = {
                handleWakeWordTriggered()
            },
            onError = { err ->
                Log.w(TAG, "Wake-word error: $err")
                stateMachine.transitionTo(VoiceState.ERROR)
            }
        )

        acquirePartialWakeLock()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action

        if (action == ACTION_STOP_VOICE) {
            stopVoiceAssistant()
            return START_NOT_STICKY
        }

        if (action == ACTION_TRIGGER_WAKE) {
            handleWakeWordTriggered()
            return START_STICKY
        }

        if (action == ACTION_CANCEL_SPEECH) {
            Log.i(TAG, "[BARGE-IN] ACTION_CANCEL_SPEECH intent received. Interrupting assistant.")
            ttsManager?.stop()
            stateMachine.transitionTo(VoiceState.INTERRUPTED)
            stateMachine.transitionTo(VoiceState.LISTENING)
            speechRecognizerManager?.startListening()
            return START_STICKY
        }

        if (action == ACTION_PROCESS_VOICE_TRANSCRIPT) {
            val transcript = intent?.getStringExtra("transcript")
            if (!transcript.isNullOrBlank()) {
                handleCapturedVoiceCommand(transcript)
            }
            return START_STICKY
        }

        // Start Foreground Service with Microphone Service Type
        isServiceRunning = true
        stateMachine.transitionTo(VoiceState.STARTING)
        val notification = buildForegroundNotification("JARVIS Voice Assistant Active")
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val dataSyncType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                } else 0
                val micType = android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                val fullType = if (dataSyncType != 0) (dataSyncType or micType) else micType

                try {
                    startForeground(NOTIFICATION_ID, notification, fullType)
                } catch (fgsEx: Exception) {
                    Log.w(TAG, "Cannot start foreground with MICROPHONE type from background; falling back: ${fgsEx.message}")
                    if (dataSyncType != 0) {
                        startForeground(NOTIFICATION_ID, notification, dataSyncType)
                    } else {
                        startForeground(NOTIFICATION_ID, notification)
                    }
                }
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting foreground service: ${e.message}", e)
        }

        startPassiveWakeWordListening()
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.i(TAG, "onTaskRemoved: Flutter Activity closed/swiped away. Maintaining background voice assistant.")
        if (isServiceRunning) {
            val restartIntent = Intent(applicationContext, JarvisVoiceService::class.java).apply {
                action = ACTION_START_VOICE
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                applicationContext.startForegroundService(restartIntent)
            } else {
                applicationContext.startService(restartIntent)
            }
        }
    }

    private fun startPassiveWakeWordListening() {
        isSessionActive = false
        ttsManager?.stop()
        speechRecognizerManager?.stopListening()

        stateMachine.transitionTo(VoiceState.IDLE)
        val started = wakeWordManager?.startListening() ?: false
        if (!started) {
            Log.w(TAG, "Failed to start passive wake-word listening")
        }
    }

    private fun handleWakeWordTriggered() {
        val now = System.currentTimeMillis()
        if (now - lastWakeTriggerTime < wakeWordDebounceMs || (isSessionActive && now - lastWakeTriggerTime < wakeWordCooldownMs)) {
            Log.d(TAG, "[WAKE] Repeated wake word trigger ignored by debounce/cooldown (delta=${now - lastWakeTriggerTime}ms, sessionActive=$isSessionActive)")
            return
        }
        lastWakeTriggerTime = now
        isSessionActive = true

        Log.i(TAG, "[WAKE] verified phrase=\"Hey Jarvis\"")
        ttsManager?.stop() // Instant barge-in on wake
        wakeWordManager?.stopListening()
        stateMachine.transitionTo(VoiceState.WAKE_DETECTED)

        // Wake prompt: "Yes?" as required
        ttsManager?.speak("Yes?") {
            stateMachine.transitionTo(VoiceState.LISTENING)
            speechRecognizerManager?.startListening()
        }
    }

    private var lastSubmissionTime = 0L
    private var lastSubmittedText = ""

    private fun handleCapturedVoiceCommand(rawTranscript: String) {
        // Strip wake phrase so backend receives the clean command
        val cleanTranscript = rawTranscript
            .replace(Regex("^(?:hey|hi|hello|ok|okay)?\\s*jarvis[,\\s]*", RegexOption.IGNORE_CASE), "")
            .trim()
        val finalTranscript = if (cleanTranscript.isNotEmpty()) cleanTranscript else rawTranscript

        if (finalTranscript.isBlank()) {
            Log.w(TAG, "[VOICE] Empty transcript ignored. Returning to passive monitoring.")
            stateMachine.transitionTo(VoiceState.LISTENING_FOR_WAKE_WORD)
            startPassiveWakeWordListening()
            return
        }

        // Deduplicate rapid identical submissions (RVA-019)
        val now = System.currentTimeMillis()
        if (now - lastSubmissionTime < 1500 && finalTranscript.equals(lastSubmittedText, ignoreCase = true)) {
            Log.d(TAG, "Skipping rapid duplicate voice command: \"$finalTranscript\"")
            return
        }
        lastSubmissionTime = now
        lastSubmittedText = finalTranscript

        val requestId = "req_${java.util.UUID.randomUUID().toString().replace("-", "").take(12)}"
        Log.i(TAG, "[STT] final=\"$finalTranscript\" requestId=$requestId")
        ttsManager?.stop() // Ensure TTS is silenced

        // Instant Barge-In Stop Command
        if (finalTranscript.lowercase() in listOf("stop", "cancel", "pause", "be quiet", "shut up")) {
            Log.i(TAG, "[VOICE] Barge-in stop command detected. Halting speech.")
            ttsManager?.stop()
            stateMachine.transitionTo(VoiceState.LISTENING_FOR_WAKE_WORD)
            startPassiveWakeWordListening()
            return
        }

        stateMachine.transitionTo(VoiceState.PROCESSING)
        Log.i(TAG, "[AI] requestId=$requestId source=WAKE_WORD prompt=\"$finalTranscript\"")

        apiClient?.sendVoiceCommand(
            text = finalTranscript,
            sessionId = activeSessionId,
            healthSnapshot = null,
            onSuccess = { result ->
                activeSessionId = result.sessionId
                stateMachine.transitionTo(VoiceState.ACTING)
                Log.i(TAG, "[AI] completed response_received intent=${result.intent} latency=ok")

                // Handle Native Device Actions in background
                var finalSpeech = result.responseText
                val lower = finalTranscript.lowercase()
                val isAppLaunch = result.intent == "OPEN_APPLICATION" ||
                    lower.startsWith("open ") || lower.startsWith("launch ") || lower.startsWith("go to ")

                if (isAppLaunch) {
                    val appName = lower
                        .replace(Regex("^(?:open|launch|go to|take me to|switch to)\\s+(?:my\\s+|the\\s+)?", RegexOption.IGNORE_CASE), "")
                        .replace(Regex("\\s+(?:app|application)$", RegexOption.IGNORE_CASE), "")
                        .trim()

                    try {
                        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                            addCategory(Intent.CATEGORY_LAUNCHER)
                        }
                        val launchables = packageManager.queryIntentActivities(mainIntent, 0)
                        val targetClean = appName.replace(" ", "")
                        val matched = launchables.firstOrNull { ri ->
                            val label = ri.loadLabel(packageManager).toString().lowercase().trim()
                            val labelClean = label.replace(" ", "")
                            val p = ri.activityInfo.packageName.lowercase()
                            labelClean == targetClean || labelClean.contains(targetClean) || targetClean.contains(labelClean) || p.contains(targetClean)
                        }

                        if (matched != null) {
                            val pkg = matched.activityInfo.packageName
                            val launchIntent = packageManager.getLaunchIntentForPackage(pkg)?.apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                            }
                            if (launchIntent != null) {
                                startActivity(launchIntent)
                                val resolvedName = if (appName.contains("whatsapp")) "WhatsApp" else matched.loadLabel(packageManager).toString()
                                finalSpeech = "$resolvedName is open."
                                Log.i(TAG, "[JARVIS_NATIVE] Launched $pkg ($resolvedName) from background voice")
                            } else {
                                finalSpeech = "I couldn't open $appName."
                            }
                        } else if (appName.contains("whatsapp")) {
                            val directIntent = packageManager.getLaunchIntentForPackage("com.whatsapp")?.apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                            }
                            if (directIntent != null) {
                                startActivity(directIntent)
                                finalSpeech = "WhatsApp is open."
                                Log.i(TAG, "[JARVIS_NATIVE] Launched com.whatsapp directly")
                            } else {
                                finalSpeech = "WhatsApp isn't installed."
                            }
                        } else {
                            finalSpeech = "I couldn't find $appName on this phone."
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "[JARVIS_NATIVE] Error launching app $appName: ${e.message}")
                        finalSpeech = if (appName.contains("whatsapp")) "WhatsApp isn't installed." else "I couldn't open $appName."
                    }
                } else if (result.action == "SCHEDULE_REMINDER" || result.action == "SCHEDULE_EVENT" || result.triggerAtMillis != null) {
                    val reminderId = result.reminderId ?: "rem_${System.currentTimeMillis()}"
                    val triggerAt = result.triggerAtMillis
                    if (triggerAt != null && triggerAt > System.currentTimeMillis()) {
                        val title = result.actionData?.optString("title", "Reminder") ?: "Reminder"
                        val time = result.actionData?.optString("time", "") ?: ""
                        JarvisReminderManager.scheduleReminder(
                            applicationContext,
                            reminderId,
                            title,
                            time,
                            triggerAt
                        )
                        Log.i(TAG, "[JARVIS] Background exact reminder scheduled: reminderId=$reminderId title=\"$title\" at=$triggerAt")
                    }
                } else if (result.action == "CANCEL_REMINDER" || result.action == "CANCEL_EVENT") {
                    val reminderId = result.reminderId ?: ""
                    if (reminderId.isNotEmpty()) {
                        JarvisReminderManager.cancelReminder(applicationContext, reminderId)
                        Log.i(TAG, "[JARVIS] Background reminder cancelled: reminderId=$reminderId")
                    }
                } else if (result.action == "RESCHEDULE_REMINDER" || result.action == "RESCHEDULE_EVENT") {
                    val reminderId = result.reminderId ?: ""
                    val triggerAt = result.triggerAtMillis
                    if (reminderId.isNotEmpty() && triggerAt != null && triggerAt > System.currentTimeMillis()) {
                        val title = result.actionData?.optString("title", "Reminder") ?: "Reminder"
                        val time = result.actionData?.optString("time", "") ?: ""
                        JarvisReminderManager.cancelReminder(applicationContext, reminderId)
                        JarvisReminderManager.scheduleReminder(
                            applicationContext,
                            reminderId,
                            title,
                            time,
                            triggerAt
                        )
                        Log.i(TAG, "[JARVIS] Background reminder rescheduled: reminderId=$reminderId at=$triggerAt")
                    }
                } else if (result.action == "START_WORKOUT") {
                    val type = result.actionData?.optString("exerciseType", "walking") ?: "walking"
                    com.example.wellwisher.jarvis.health.JarvisWorkoutTracker.startWorkout(type)
                    Log.i(TAG, "[JARVIS] Workout tracking started: $type")
                } else if (result.action == "STOP_WORKOUT") {
                    CoroutineScope(Dispatchers.Main).launch {
                        val stopRes = com.example.wellwisher.jarvis.health.JarvisWorkoutTracker.stopWorkout(applicationContext)
                        val duration = stopRes["durationMinutes"] ?: 0
                        val saved = stopRes["savedToHealthConnect"] == true
                        val updatedSpeech = if (saved) {
                            "Workout stopped. I've recorded your ${stopRes["exerciseType"]} session of $duration minutes to Health Connect."
                        } else {
                            "Workout stopped. Duration: $duration minutes. Saving to Health Connect was not completed."
                        }
                        stateMachine.transitionTo(VoiceState.SPEAKING)
                        ttsManager?.speak(updatedSpeech)
                    }
                    return@sendVoiceCommand
                }

                
                // Speak synthesized JARVIS response through TTS
                stateMachine.transitionTo(VoiceState.SPEAKING)
                ttsManager?.speak(finalSpeech)
            },
            onError = { errCode, errMsg ->
                Log.e(TAG, "[VOICE] ERROR code=$errCode message=$errMsg")
                stateMachine.transitionTo(VoiceState.ERROR)
                val spokenError = when (errCode) {
                    "BACKEND_UNREACHABLE" -> "I cannot reach the WellWisher server right now. Please ensure the backend is running."
                    "BACKEND_TIMEOUT" -> "The request timed out waiting for the server."
                    "AUTH_FAILED" -> "Authentication failed with the server."
                    "GEMINI_AUTH_FAILED" -> "AI authentication failed. Please check the Gemini API key."
                    "GEMINI_QUOTA" -> "AI request limit reached. Please try again shortly."
                    "GEMINI_MODEL_NOT_FOUND" -> "AI model not found. Please verify your configuration."
                    "GEMINI_SERVER_ERROR" -> "The AI reasoning engine encountered an internal error."
                    "HEALTH_PERMISSION_DENIED" -> "Health Connect permission was denied."
                    "HEALTH_NOT_AVAILABLE" -> "Health Connect is not available on this device."
                    "HEALTH_DATA_UNAVAILABLE" -> "Health data is currently unavailable."
                    "TOOL_FAILED" -> "I ran into an issue taking care of that."
                    "DEVICE_ACTION_FAILED" -> "The requested device action could not be completed."
                    else -> if (errMsg.isNotBlank() && errMsg.length < 80) errMsg else "I ran into an error processing your request."
                }
                ttsManager?.speak(spokenError)
            }
        )
    }

    private fun stopVoiceAssistant() {
        isServiceRunning = false
        wakeWordManager?.stopListening()
        speechRecognizerManager?.destroy()
        ttsManager?.shutdown()
        releaseWakeLock()

        stateMachine.transitionTo(VoiceState.SLEEPING)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    private fun acquirePartialWakeLock() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "WellWisher:JarvisVoiceWakeLock").apply {
                setReferenceCounted(false)
                acquire(10 * 60 * 1000L) // 10 minute safe acquisition cycle
            }
        } catch (e: Exception) {
            Log.w(TAG, "WakeLock acquisition warning: ${e.message}")
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            wakeLock = null
        } catch (_: Exception) {}
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "JARVIS Always-On Voice Assistant",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps hands-free 'Hey Jarvis' wake-word and proactive intelligence active"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(statusText: String): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingLaunch = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val cancelIntent = Intent(this, JarvisVoiceService::class.java).apply {
            action = ACTION_CANCEL_SPEECH
        }
        val pendingCancel = PendingIntent.getService(
            this,
            1,
            cancelIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("JARVIS Voice Assistant")
            .setContentText(statusText)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingLaunch)
            .addAction(R.mipmap.ic_launcher, "Interrupt", pendingCancel)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun updateNotification(statusText: String) {
        if (!isServiceRunning) return
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, buildForegroundNotification(statusText))
    }

    override fun onDestroy() {
        instance = null
        stopVoiceAssistant()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
