package com.example.wellwisher.jarvis

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import java.util.Locale
import java.util.UUID

/**
 * Android Text-To-Speech Manager for JARVIS.
 * Handles spoken response synthesis, utterance progress callbacks, audio ducking,
 * and immediate speech interruption / barge-in support.
 */
class JarvisTtsManager(
    private val context: Context,
    private val onSpeechStarted: () -> Unit = {},
    private val onSpeechCompleted: () -> Unit = {},
    private val onError: (String) -> Unit = {}
) : TextToSpeech.OnInitListener {

    companion object {
        private const val TAG = "JarvisTtsManager"
    }

    private var tts: TextToSpeech? = null
    var isInitialized: Boolean = false
        private set
    var isSpeaking: Boolean = false
        private set

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    private var audioFocusRequest: AudioFocusRequest? = null
    private val utteranceCallbacks = java.util.concurrent.ConcurrentHashMap<String, () -> Unit>()

    init {
        tts = TextToSpeech(context, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale.US)
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.w(TAG, "Language not supported by TTS engine, falling back to default")
                tts?.language = Locale.getDefault()
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val audioAttributes = android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_ASSISTANT)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
                tts?.setAudioAttributes(audioAttributes)
            }
            setupUtteranceListener()
            applyVoiceGender()
            isInitialized = true
            Log.i(TAG, "JarvisTtsManager initialized successfully")
        } else {
            Log.e(TAG, "Failed to initialize TextToSpeech engine (status: $status)")
            onError("TTS initialization failed with code $status")
        }
    }

    /**
     * Applies male or female voice persona based on saved user preference.
     * Uses pitch tuning and matching TTS engine voice descriptors.
     */
    fun applyVoiceGender(genderPreference: String? = null) {
        try {
            val prefs = context.getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
            val gender = genderPreference ?: prefs.getString("flutter.selectedVoiceGender", null) ?: "female"
            val isMale = gender.equals("male", ignoreCase = true)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val voices = tts?.voices
                if (!voices.isNullOrEmpty()) {
                    val targetVoice = voices.firstOrNull { voice ->
                        val name = voice.name.lowercase(Locale.ROOT)
                        val isFemaleVoice = name.contains("female") || name.contains("woman") || name.contains("girl") ||
                            name.contains("x-sfg") || name.contains("x-sfb") || name.contains("x-sfa") || name.contains("x-ioa") || name.contains("x-iof") || name.contains("x-tpf")
                        if (isMale) {
                            !isFemaleVoice && (
                                (name.contains("male") && !name.contains("female")) ||
                                name.contains("guy") || name.contains("man") || name.contains("david") ||
                                name.contains("george") || name.contains("alex") || name.contains("daniel") ||
                                name.contains("richard") || name.contains("oliver") ||
                                name.contains("x-iom") || name.contains("x-iob") || name.contains("x-tpd") ||
                                name.contains("x-sfd") || name.contains("x-iol") || name.contains("x-cxx") ||
                                name.contains("x-rjs") || name.contains("x-ahp") || name.contains("x-fis")
                            )
                        } else {
                            isFemaleVoice || name.contains("aria") || name.contains("jenny") || name.contains("samantha")
                        }
                    }
                    if (targetVoice != null) {
                        tts?.voice = targetVoice
                        Log.d(TAG, "Applied TTS voice: ${targetVoice.name} (gender=$gender)")
                    }
                }
            }

            if (isMale) {
                tts?.setPitch(0.70f)
                tts?.setSpeechRate(0.96f)
            } else {
                tts?.setPitch(1.12f)
                tts?.setSpeechRate(1.05f)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to apply voice gender: ${e.message}")
        }
    }

    private fun setupUtteranceListener() {
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {
                isSpeaking = true
                onSpeechStarted()
                Log.d(TAG, "TTS playback started: $utteranceId")
            }

            override fun onDone(utteranceId: String?) {
                isSpeaking = false
                abandonAudioFocus()
                Log.d(TAG, "TTS playback completed: $utteranceId")
                val cb = if (utteranceId != null) utteranceCallbacks.remove(utteranceId) else null
                cb?.invoke()
                onSpeechCompleted()
            }

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {
                isSpeaking = false
                abandonAudioFocus()
                Log.e(TAG, "TTS playback error for utterance: $utteranceId")
                if (utteranceId != null) utteranceCallbacks.remove(utteranceId)
                onError("TTS playback error for utterance: $utteranceId")
            }

            override fun onError(utteranceId: String?, errorCode: Int) {
                isSpeaking = false
                abandonAudioFocus()
                Log.e(TAG, "TTS playback error ($errorCode) for utterance: $utteranceId")
                if (utteranceId != null) utteranceCallbacks.remove(utteranceId)
                onError("TTS playback error ($errorCode)")
            }
        })
    }

    private fun requestAudioFocus(): Boolean {
        if (audioManager == null) return true
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val playbackAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANT)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
                val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                    .setAudioAttributes(playbackAttributes)
                    .setAcceptsDelayedFocusGain(true)
                    .setOnAudioFocusChangeListener { focusChange ->
                        when (focusChange) {
                            AudioManager.AUDIOFOCUS_LOSS,
                            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                                Log.i(TAG, "[JARVIS_AUDIO] Audio focus lost ($focusChange). Halting TTS playback.")
                                stop()
                            }
                            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                                Log.d(TAG, "[JARVIS_AUDIO] Audio focus loss transient can duck.")
                            }
                            AudioManager.AUDIOFOCUS_GAIN -> {
                                Log.d(TAG, "[JARVIS_AUDIO] Audio focus gained.")
                            }
                        }
                    }
                    .build()
                audioFocusRequest = request
                val res = audioManager.requestAudioFocus(request)
                res == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
            } else {
                @Suppress("DEPRECATION")
                val res = audioManager.requestAudioFocus(
                    { focusChange ->
                        if (focusChange == AudioManager.AUDIOFOCUS_LOSS || focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
                            stop()
                        }
                    },
                    AudioManager.STREAM_NOTIFICATION,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
                )
                res == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
            }
        } catch (e: Exception) {
            Log.w(TAG, "[JARVIS_AUDIO] Error requesting audio focus: ${e.message}")
            true
        }
    }

    private fun abandonAudioFocus() {
        if (audioManager == null) return
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest!!)
                audioFocusRequest = null
                Log.d(TAG, "[JARVIS_AUDIO] Abandoned AudioFocusRequest")
            } else {
                @Suppress("DEPRECATION")
                audioManager.abandonAudioFocus(null)
            }
        } catch (e: Exception) {
            Log.w(TAG, "[JARVIS_AUDIO] Error abandoning audio focus: ${e.message}")
        }
    }

    /**
     * Synthesize and speak JARVIS response
     */
    fun speak(
        text: String,
        queueMode: Int = TextToSpeech.QUEUE_FLUSH,
        onDone: (() -> Unit)? = null
    ): String {
        if (!isInitialized || tts == null) {
            Log.w(TAG, "Cannot speak: TTS not initialized")
            onError("TTS engine not ready")
            onDone?.invoke()
            return ""
        }

        applyVoiceGender()

        val sanitizedText = sanitizeForSpeech(text)
        if (sanitizedText.isBlank()) {
            onDone?.invoke()
            onSpeechCompleted()
            return ""
        }

        requestAudioFocus()

        val utteranceId = "jarvis_tts_${UUID.randomUUID()}"
        if (onDone != null) {
            utteranceCallbacks[utteranceId] = onDone
        }

        val params = Bundle().apply {
            putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, utteranceId)
        }

        val res = tts?.speak(sanitizedText, queueMode, params, utteranceId)
        if (res == TextToSpeech.ERROR) {
            Log.e(TAG, "TTS speak() returned ERROR")
            abandonAudioFocus()
            utteranceCallbacks.remove(utteranceId)
            onError("TTS speech playback failed")
        }
        return utteranceId
    }

    /**
     * Stop current speech immediately (barge-in / interruption)
     */
    fun stop() {
        try {
            if (tts?.isSpeaking == true || isSpeaking) {
                tts?.stop()
                isSpeaking = false
                abandonAudioFocus()
                Log.i(TAG, "[JARVIS_AUDIO] TTS interrupted and stopped. Audio focus released.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping TTS: ${e.message}")
        }
    }

    /**
     * Release TTS resources
     */
    fun shutdown() {
        try {
            stop()
            tts?.shutdown()
            tts = null
            isInitialized = false
        } catch (e: Exception) {
            Log.e(TAG, "Error shutting down TTS: ${e.message}")
        }
    }

    /**
     * Strips markdown symbols, URLs, JSON artifacts, and emojis so speech output sounds natural.
     * Guarantees that no asterisk (*), markdown bullet, or markdown formatting reaches TextToSpeech,
     * while strictly protecting legitimate words, punctuation, times (4:00 PM), and snake_case identifiers.
     */
    private fun sanitizeForSpeech(text: String): String {
        return text
            // 1. Strip JSON/code blocks
            .replace(Regex("```[\\s\\S]*?```"), "")
            // 2. Convert markdown links [Label](url) -> Label
            .replace(Regex("\\[([^\\]]+)\\]\\([^)]+\\)"), "$1")
            // 3. Remove inline code backticks
            .replace(Regex("`([^`]+)`"), "$1")
            .replace(Regex("`"), "")
            // 4. Convert bullet points and numbered lists to natural pauses
            .replace(Regex("^[ \\t]*[-•*+][ \\t]+", RegexOption.MULTILINE), "")
            .replace(Regex("^[ \\t]*\\d+\\.[ \\t]+", RegexOption.MULTILINE), "")
            // 5. Strip markdown headers
            .replace(Regex("^[ \\t]*[#]{1,6}[ \\t]+", RegexOption.MULTILINE), "")
            .replace(Regex("#+"), "")
            // 6. Strip markdown asterisks and strikethrough markers
            .replace(Regex("\\*{1,3}(.*?)\\*{1,3}"), "$1")
            .replace(Regex("\\*"), "")
            .replace(Regex("~{2,3}([^~\\n]+)~{2,3}"), "$1")
            .replace(Regex("~+"), "")
            // 7. Strip markdown emphasis underscores while preserving snake_case identifiers
            .replace(Regex("(^|[\\s(])_{1,3}([^_\\n]+?)_{1,3}(?=[\\s).,?!;:]|$)"), "$1$2")
            .replace(Regex("(^|[\\s])_+"), "$1")
            .replace(Regex("_+([\\s]|$)"), "$1")
            // 8. Strip emojis and non-speech symbols
            .replace(Regex("[\\p{So}\\p{Cn}]"), "")
            // 9. Strip any residual structural brackets/bars (preserve legitimate parentheses/quotes)
            .replace(Regex("[\\[\\]|]"), "")
            // 10. Convert newlines to sentence pauses
            .let { s ->
                val hadNewlines = s.contains("\n")
                val replaced = s.replace(Regex("\\r?\\n+"), ". ")
                    // 11. Absolute zero tolerance for any remaining asterisk
                    .replace(Regex("\\*"), "")
                    // 12. Normalize punctuation and whitespace
                    .replace(Regex("\\s+"), " ")
                    .replace(Regex(",\\s*,"), ",")
                    .replace(Regex("\\.\\s*\\.+"), ".")
                    .replace(Regex(",\\s*\\."), ".")
                    .replace(Regex("\\s+([.,?!;:])"), "$1")
                    .replace(Regex("([.,?!;:])(?=[A-Za-z])"), "$1 ")
                    .trim()
                if (hadNewlines && replaced.isNotEmpty() && !replaced.endsWith(".") && !replaced.endsWith("?") && !replaced.endsWith("!")) {
                    "$replaced."
                } else {
                    replaced
                }
            }
    }
}
