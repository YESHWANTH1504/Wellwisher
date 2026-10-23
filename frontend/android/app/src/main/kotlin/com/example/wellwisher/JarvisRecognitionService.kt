package com.example.wellwisher

import android.content.Intent
import android.speech.RecognitionService

/**
 * JARVIS Native Speech Recognition Service
 * Required by voice-interaction-service declaration.
 */
class JarvisRecognitionService : RecognitionService() {
    override fun onStartListening(recognizerIntent: Intent?, listener: Callback?) {
        // Recognition callback delegating to audio stream
    }

    override fun onCancel(listener: Callback?) {
        // Cancel speech recognition
    }

    override fun onStopListening(listener: Callback?) {
        // Stop speech recognition
    }
}
