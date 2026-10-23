package com.example.wellwisher

import android.content.Intent
import android.os.Build
import android.service.voice.VoiceInteractionService
import android.util.Log

enum class AssistantServiceState {
    SYSTEM_UNAVAILABLE,
    SYSTEM_AVAILABLE,
    ASSISTANT_ACTIVE,
    ASSISTANT_SHUTTING_DOWN
}

/**
 * JARVIS Android VoiceInteractionService
 * Allows WellWisher JARVIS to be selected as the OS Default Digital Assistant
 * in Android Settings -> Default Apps -> Digital Assistant App.
 */
class JarvisVoiceInteractionService : VoiceInteractionService() {

    companion object {
        private const val TAG = "JarvisVoiceInteraction"
        var currentServiceState: AssistantServiceState = AssistantServiceState.SYSTEM_UNAVAILABLE
            private set

        fun setSessionActive(active: Boolean) {
            currentServiceState = if (active) AssistantServiceState.ASSISTANT_ACTIVE else AssistantServiceState.SYSTEM_AVAILABLE
            Log.i(TAG, "[JARVIS_ASSISTANT] Service state updated: $currentServiceState")
        }
    }

    override fun onReady() {
        super.onReady()
        currentServiceState = AssistantServiceState.SYSTEM_AVAILABLE
        Log.i(TAG, "[JARVIS_ASSISTANT] System VoiceInteractionService ready. State=SYSTEM_AVAILABLE")
        try {
            val intent = Intent(this, com.example.wellwisher.jarvis.JarvisVoiceService::class.java).apply {
                action = com.example.wellwisher.jarvis.JarvisVoiceService.ACTION_START_VOICE
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
        } catch (e: Exception) {
            Log.w(TAG, "[JARVIS_ASSISTANT] Notice on starting JarvisVoiceService: ${e.message}")
        }
    }

    override fun onShutdown() {
        super.onShutdown()
        currentServiceState = AssistantServiceState.ASSISTANT_SHUTTING_DOWN
        Log.i(TAG, "[JARVIS_ASSISTANT] System VoiceInteractionService shutdown. State=ASSISTANT_SHUTTING_DOWN")
    }
}
