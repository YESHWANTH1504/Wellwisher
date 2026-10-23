package com.example.wellwisher

import android.app.assist.AssistContent
import android.app.assist.AssistStructure
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.os.Bundle
import android.service.voice.VoiceInteractionSession
import android.util.Base64
import android.util.Log
import java.io.ByteArrayOutputStream

/**
 * JARVIS Voice Interaction Session
 * Handles invocation events, native screenshot capture, and assist context
 * when the user activates the digital assistant.
 */
class JarvisVoiceInteractionSession(context: Context) : VoiceInteractionSession(context) {

    companion object {
        private const val TAG = "JarvisVoiceSession"
        var latestScreenshotBase64: String? = null
            private set
        var latestAssistPackage: String? = null
            private set
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "[JARVIS_ASSISTANT] VoiceInteractionSession created")
    }

    override fun onShow(args: Bundle?, showFlags: Int) {
        super.onShow(args, showFlags)
        JarvisVoiceInteractionService.setSessionActive(true)
        Log.i(TAG, "[JARVIS_ASSISTANT] VoiceInteractionSession onShow: showFlags=$showFlags")

        // 1. Notify background voice service to prepare for command intake
        try {
            val serviceIntent = Intent(context, com.example.wellwisher.jarvis.JarvisVoiceService::class.java).apply {
                action = com.example.wellwisher.jarvis.JarvisVoiceService.ACTION_START_VOICE
            }
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.w(TAG, "[JARVIS_ASSISTANT] Service notice from session: ${e.message}")
        }

        // 2. Launch or communicate with the assistant foreground pipeline
        try {
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("action", "ACTIVATE_VOICE_ASSISTANT")
                putExtra("source", "VOICE_INTERACTION_SESSION")
                if (latestAssistPackage != null) {
                    putExtra("assistPackage", latestAssistPackage)
                }
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "[JARVIS_ASSISTANT] Failed to launch MainActivity from session: ${e.message}")
        }
        hide()
    }

    override fun onHandleScreenshot(screenshot: Bitmap?) {
        super.onHandleScreenshot(screenshot)
        if (screenshot != null) {
            try {
                val stream = ByteArrayOutputStream()
                screenshot.compress(Bitmap.CompressFormat.JPEG, 75, stream)
                val bytes = stream.toByteArray()
                latestScreenshotBase64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                Log.i(TAG, "[JARVIS_ASSISTANT] Captured on-screen assist screenshot: ${bytes.size} bytes")
            } catch (e: Exception) {
                Log.w(TAG, "[JARVIS_ASSISTANT] Failed encoding screenshot: ${e.message}")
            }
        }
    }

    override fun onHandleAssist(data: Bundle?, structure: AssistStructure?, content: AssistContent?) {
        super.onHandleAssist(data, structure, content)
        if (structure != null) {
            val comp = structure.activityComponent
            latestAssistPackage = comp?.packageName
            Log.i(TAG, "[JARVIS_ASSISTANT] Captured on-screen assist component: $comp")
        }
    }

    override fun onHide() {
        super.onHide()
        JarvisVoiceInteractionService.setSessionActive(false)
        Log.i(TAG, "[JARVIS_ASSISTANT] VoiceInteractionSession onHide")
    }

    override fun onDestroy() {
        super.onDestroy()
        JarvisVoiceInteractionService.setSessionActive(false)
        Log.i(TAG, "[JARVIS_ASSISTANT] VoiceInteractionSession onDestroy")
    }
}
