package com.example.wellwisher.jarvis

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import java.util.Locale

/**
 * Android Native Speech-To-Text Manager.
 * Orchestrates voice command listening post-wake-word, emits partial & final transcripts,
 * and enforces silence timeouts and graceful cancellation.
 */
class SpeechRecognizerManager(
    private val context: Context,
    private val onPartialTranscript: (String) -> Unit,
    private val onFinalTranscript: (String) -> Unit,
    private val onError: (String) -> Unit,
    private val onSilenceTimeout: () -> Unit
) : RecognitionListener {

    companion object {
        private const val TAG = "SpeechRecognizerMgr"
        private const val SILENCE_TIMEOUT_MS = 6000L
    }

    private var speechRecognizer: SpeechRecognizer? = null
    private var isRecording = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private var silenceRunnable: Runnable? = null
    private var isUsingOnDevice = false

    init {
        mainHandler.post {
            initRecognizer()
        }
    }

    private fun initRecognizer() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)) {
                Log.i(TAG, "Initializing on-device SpeechRecognizer")
                isUsingOnDevice = true
                speechRecognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(context).apply {
                    setRecognitionListener(this@SpeechRecognizerManager)
                }
            } else if (SpeechRecognizer.isRecognitionAvailable(context)) {
                Log.i(TAG, "Initializing system SpeechRecognizer")
                isUsingOnDevice = false
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                    setRecognitionListener(this@SpeechRecognizerManager)
                }
            } else {
                Log.e(TAG, "SpeechRecognizer is not available on this device")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize SpeechRecognizer: ${e.message}")
            try {
                if (SpeechRecognizer.isRecognitionAvailable(context)) {
                    isUsingOnDevice = false
                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                        setRecognitionListener(this@SpeechRecognizerManager)
                    }
                }
            } catch (ex: Exception) {
                Log.e(TAG, "Fallback SpeechRecognizer also failed: ${ex.message}")
            }
        }
    }

    fun startListening(languageLocale: Locale = Locale.getDefault()) {
        mainHandler.post {
            try {
                if (speechRecognizer == null) {
                    initRecognizer()
                }

                val langTag = languageLocale.toLanguageTag()
                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, langTag)
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                    putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
                }

                speechRecognizer?.startListening(intent)
                isRecording = true
                scheduleSilenceTimeout()
                Log.d(TAG, "Speech recognition listening started (locale=$langTag)")
            } catch (e: Exception) {
                Log.e(TAG, "Error starting speech recognizer: ${e.message}")
                onError("Failed to start speech recognition: ${e.message}")
            }
        }
    }

    fun stopListening() {
        mainHandler.post {
            cancelSilenceTimeout()
            try {
                if (isRecording) {
                    speechRecognizer?.stopListening()
                    isRecording = false
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping speech recognizer: ${e.message}")
            }
        }
    }

    fun cancel() {
        mainHandler.post {
            cancelSilenceTimeout()
            try {
                speechRecognizer?.cancel()
                isRecording = false
            } catch (e: Exception) {
                Log.e(TAG, "Error cancelling speech recognizer: ${e.message}")
            }
        }
    }

    fun destroy() {
        mainHandler.post {
            cancelSilenceTimeout()
            try {
                speechRecognizer?.destroy()
                speechRecognizer = null
                isRecording = false
            } catch (e: Exception) {
                Log.e(TAG, "Error destroying speech recognizer: ${e.message}")
            }
        }
    }

    private fun scheduleSilenceTimeout() {
        cancelSilenceTimeout()
        silenceRunnable = Runnable {
            if (isRecording) {
                Log.w(TAG, "Speech recognition silence timeout reached")
                cancel()
                onSilenceTimeout()
            }
        }
        mainHandler.postDelayed(silenceRunnable!!, SILENCE_TIMEOUT_MS)
    }

    private fun cancelSilenceTimeout() {
        silenceRunnable?.let { mainHandler.removeCallbacks(it) }
        silenceRunnable = null
    }

    // RecognitionListener Callbacks
    override fun onReadyForSpeech(params: Bundle?) {
        Log.d(TAG, "Ready for user speech")
    }

    override fun onBeginningOfSpeech() {
        Log.d(TAG, "User began speaking")
        cancelSilenceTimeout()
    }

    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {
        Log.d(TAG, "User finished speaking")
        isRecording = false
    }

    override fun onError(error: Int) {
        cancelSilenceTimeout()
        isRecording = false
        val errorMsg = when (error) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_CLIENT -> "Client-side recognition error"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient audio permissions"
            SpeechRecognizer.ERROR_NETWORK -> "Network error during recognition"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
            SpeechRecognizer.ERROR_NO_MATCH -> "No recognition match found"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognition service busy"
            SpeechRecognizer.ERROR_SERVER -> "Server error during recognition"
            13 -> "Language not supported on on-device recognizer"
            14 -> "Language unavailable on on-device recognizer"
            else -> "Speech recognition error ($error)"
        }
        Log.w(TAG, "SpeechRecognizer error: $errorMsg ($error)")

        // Fallback to standard system SpeechRecognizer if on-device model has issues
        if ((error == 13 || error == 14 || error == SpeechRecognizer.ERROR_CLIENT) && isUsingOnDevice) {
            Log.w(TAG, "On-device speech error ($error). Reverting to system SpeechRecognizer.")
            isUsingOnDevice = false
            try {
                speechRecognizer?.destroy()
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                    setRecognitionListener(this@SpeechRecognizerManager)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Fallback failed: ${e.message}")
            }
        }

        // Normal silence and non-matches should smoothly time out, NOT transition Jarvis into an ERROR state
        if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
            Log.d(TAG, "Speech recognition ended with silence / no-match ($error). Returning to passive listening.")
            onSilenceTimeout()
            return
        }

        onError(errorMsg)
    }

    override fun onResults(results: Bundle?) {
        cancelSilenceTimeout()
        isRecording = false
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val text = matches?.firstOrNull() ?: ""
        Log.i(TAG, "Final transcript captured: $text")
        if (text.isNotBlank()) {
            onFinalTranscript(text)
        } else {
            onError("No recognized text")
        }
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        val text = matches?.firstOrNull() ?: ""
        if (text.isNotBlank()) {
            onPartialTranscript(text)
        }
    }

    override fun onEvent(eventType: Int, params: Bundle?) {}
}
