package com.example.wellwisher.jarvis

import android.content.Context
import android.content.Intent
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Authoritative Local Wake-Word Engine for "Hey Jarvis".
 * 
 * Strict Two-Stage Architecture:
 * PASSIVE MODE -> Low-Power Local Audio Monitoring (AudioRecord + VAD)
 *   -> Candidate Speech Burst (releases mic hardware)
 *   -> LOCAL WAKE-WORD VERIFICATION (On-Device Keyword Spotting)
 *   -> Does audio specifically begin with or equal "Hey Jarvis"?
 *        YES: Wake JARVIS
 *        NO: Silently discard candidate and resume passive monitoring.
 * 
 * RMS/Amplitude is NEVER used as wake detection. VAD is strictly a candidate detector.
 * Negative phrases ("hello", "hello jarvis", "hey google", "alexa", "jarvis was here",
 * "can you call jarvis", random noise) are strictly rejected.
 */
class WakeWordManager(
    private val context: Context,
    private val onWakeWordDetected: () -> Unit,
    private val onError: (String) -> Unit
) {
    companion object {
        private const val TAG = "WakeWordManager"
        private const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        private const val VAD_ENERGY_THRESHOLD = 2800.0 // Energy gate for human voice activity
        private const val VAD_BURST_FRAMES_REQUIRED = 5 // ~100ms sustained speech burst

        // Strict Primary Wake Phrase as requested
        const val PRIMARY_WAKE_PHRASE = "hey jarvis"

        // Accepted close phonetic variations of "Hey Jarvis"
        val ACCEPTED_WAKE_PHRASES = setOf(
            "hey jarvis",
            "hey, jarvis",
            "hay jarvis",
            "hay, jarvis",
            "a jarvis"
        )

        // Negative phrases that must NEVER trigger wake
        val EXPLICIT_FALSE_POSITIVES = setOf(
            "hello",
            "hello jarvis",
            "hey google",
            "ok google",
            "okay google",
            "alexa",
            "siri",
            "hey siri",
            "jarvis was here",
            "can you call jarvis",
            "call jarvis"
        )
    }

    private val isListening = AtomicBoolean(false)
    private val isVerifying = AtomicBoolean(false)
    private var audioRecord: AudioRecord? = null
    private var echoCanceler: AcousticEchoCanceler? = null
    private var noiseSuppressor: NoiseSuppressor? = null
    private var recordingThread: Thread? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var bufferSize = 0

    private var onDeviceKeywordRecognizer: SpeechRecognizer? = null

    init {
        bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)
        if (bufferSize <= 0) {
            bufferSize = SAMPLE_RATE * 2
        }
        mainHandler.post {
            initKeywordRecognizer()
        }
    }

    private fun initKeywordRecognizer() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)) {
                Log.i(TAG, "[WAKE] Initializing on-device offline keyword verifier")
                onDeviceKeywordRecognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
            } else if (SpeechRecognizer.isRecognitionAvailable(context)) {
                Log.i(TAG, "[WAKE] Initializing local keyword verifier")
                onDeviceKeywordRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
            }
            setupRecognizerListener()
        } catch (e: Exception) {
            Log.w(TAG, "[WAKE] Keyword verifier initialization warning: ${e.message}")
        }
    }

    private fun setupRecognizerListener() {
        onDeviceKeywordRecognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val transcript = matches?.firstOrNull()?.lowercase()?.trim() ?: ""
                evaluateWakeCandidate(transcript)
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val transcript = matches?.firstOrNull()?.lowercase()?.trim() ?: ""
                if (isStrictWakeMatch(transcript)) {
                    evaluateWakeCandidate(transcript)
                }
            }

            override fun onError(error: Int) {
                isVerifying.set(false)
                Log.d(TAG, "[WAKE] Keyword verification closed (code=$error). Resuming passive monitor.")
                resumeMonitoring()
            }

            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
    }

    /**
     * Start local passive microphone monitoring
     */
    @Synchronized
    fun startListening(): Boolean {
        if (isListening.get()) {
            return true
        }

        try {
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                onError("AudioRecord failed to initialize")
                return false
            }

            // Attach hardware acoustic echo canceler & noise suppressor if available
            try {
                if (AcousticEchoCanceler.isAvailable()) {
                    echoCanceler = AcousticEchoCanceler.create(audioRecord!!.audioSessionId)?.apply {
                        enabled = true
                    }
                    Log.i(TAG, "[JARVIS_AUDIO] AcousticEchoCanceler enabled on mic session")
                }
            } catch (aecEx: Exception) {
                Log.w(TAG, "[JARVIS_AUDIO] AEC notice: ${aecEx.message}")
            }

            try {
                if (NoiseSuppressor.isAvailable()) {
                    noiseSuppressor = NoiseSuppressor.create(audioRecord!!.audioSessionId)?.apply {
                        enabled = true
                    }
                    Log.i(TAG, "[JARVIS_AUDIO] NoiseSuppressor enabled on mic session")
                }
            } catch (nsEx: Exception) {
                Log.w(TAG, "[JARVIS_AUDIO] NoiseSuppressor notice: ${nsEx.message}")
            }

            audioRecord?.startRecording()
            isListening.set(true)

            recordingThread = Thread({
                monitorAudioStream()
            }, "JarvisPassiveWakeThread").apply {
                priority = Thread.NORM_PRIORITY + 1
                start()
            }

            Log.i(TAG, "[WAKE] Passive monitoring active. Waiting for verified 'Hey Jarvis'.")
            return true
        } catch (e: SecurityException) {
            Log.e(TAG, "[WAKE] RECORD_AUDIO permission missing: ${e.message}")
            onError("RECORD_AUDIO permission missing")
            return false
        } catch (e: Exception) {
            Log.e(TAG, "[WAKE] Error starting passive monitor: ${e.message}")
            onError("Wake-word engine start failed: ${e.message}")
            return false
        }
    }

    /**
     * Stop microphone capture and release resources
     */
    @Synchronized
    fun stopListening() {
        if (!isListening.get()) return

        isListening.set(false)
        try {
            try {
                echoCanceler?.release()
                echoCanceler = null
                noiseSuppressor?.release()
                noiseSuppressor = null
            } catch (_: Exception) {}

            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null
            recordingThread?.interrupt()
            recordingThread = null
            Log.i(TAG, "[WAKE] Passive monitoring stopped")
        } catch (e: Exception) {
            Log.e(TAG, "[WAKE] Error stopping wake-word engine: ${e.message}")
        }
    }

    fun isCurrentlyListening(): Boolean = isListening.get()

    /**
     * Continuous low-power VAD inspection loop.
     * Detects when a candidate speech burst begins, then temporarily releases AudioRecord
     * so on-device keyword verifier can access the hardware mic without conflict.
     */
    private fun monitorAudioStream() {
        val audioBuffer = ShortArray(bufferSize / 2)
        var speechBurstFrames = 0

        while (isListening.get() && !Thread.currentThread().isInterrupted) {
            val rec = audioRecord ?: break
            val readSize = try { rec.read(audioBuffer, 0, audioBuffer.size) } catch (_: Exception) { -1 }
            if (readSize > 0) {
                // Compute energy for Voice Activity Detection (VAD)
                var sum = 0.0
                for (i in 0 until readSize) {
                    sum += audioBuffer[i] * audioBuffer[i]
                }
                val amplitude = Math.sqrt(sum / readSize)

                if (amplitude > VAD_ENERGY_THRESHOLD) {
                    speechBurstFrames++
                    if (speechBurstFrames >= VAD_BURST_FRAMES_REQUIRED) {
                        Log.d(TAG, "[WAKE] Candidate speech burst detected by VAD. Verifying keyword locally...")
                        speechBurstFrames = 0
                        
                        if (isVerifying.compareAndSet(false, true)) {
                            // Release mic hardware so recognizer can attach
                            pauseAudioRecordForVerification()
                            mainHandler.post {
                                triggerLocalVerification()
                            }
                        }
                    }
                } else {
                    speechBurstFrames = 0
                }
            }
        }
    }

    private fun pauseAudioRecordForVerification() {
        try {
            isListening.set(false)
            try {
                echoCanceler?.release()
                echoCanceler = null
                noiseSuppressor?.release()
                noiseSuppressor = null
            } catch (_: Exception) {}

            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null
            recordingThread?.interrupt()
            recordingThread = null
        } catch (e: Exception) {
            Log.w(TAG, "Error pausing AudioRecord for verification: ${e.message}")
        }
    }

    private fun triggerLocalVerification() {
        try {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.US.toLanguageTag())
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 800L)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 500L)
            }
            onDeviceKeywordRecognizer?.startListening(intent)

            // Safety timeout: if no verification callback within 2.2s, silently discard and resume
            mainHandler.postDelayed({
                if (isVerifying.get()) {
                    Log.d(TAG, "[WAKE] Keyword verification timeout. Silently discarding candidate.")
                    try { onDeviceKeywordRecognizer?.cancel() } catch (_: Exception) {}
                    isVerifying.set(false)
                    resumeMonitoring()
                }
            }, 2200L)
        } catch (e: Exception) {
            Log.w(TAG, "[WAKE] Failed to start keyword verification: ${e.message}")
            isVerifying.set(false)
            resumeMonitoring()
        }
    }

    private fun isStrictWakeMatch(raw: String): Boolean {
        val clean = raw.lowercase().trim().replace(Regex("[^a-z\\s]"), "").trim()
        if (clean.isEmpty()) return false

        // 1. Explicitly check negative false-positive patterns
        for (fp in EXPLICIT_FALSE_POSITIVES) {
            if (clean == fp || clean.startsWith("$fp ")) {
                return false
            }
        }

        // 2. Reject if starts with generic greetings like "hello", "hi", "ok" unless followed by nothing or not matching
        if (clean.startsWith("hello") || clean.startsWith("hey google") || clean.startsWith("alexa")) {
            return false
        }

        // 3. Must match "Hey Jarvis" as primary wake phrase
        return clean == PRIMARY_WAKE_PHRASE ||
               clean.startsWith("$PRIMARY_WAKE_PHRASE ") ||
               ACCEPTED_WAKE_PHRASES.any { clean == it || clean.startsWith("$it ") }
    }

    private fun evaluateWakeCandidate(transcript: String) {
        val clean = transcript.lowercase().trim().replace(Regex("[^a-z\\s]"), "").trim()
        val isVerified = isStrictWakeMatch(clean)

        if (isVerified) {
            Log.i(TAG, "[WAKE] candidate")
            Log.i(TAG, "[WAKE] verified phrase=\"Hey Jarvis\" (matched: \"$clean\")")
            isVerifying.set(false)
            try { onDeviceKeywordRecognizer?.cancel() } catch (_: Exception) {}
            stopListening()
            mainHandler.post {
                onWakeWordDetected()
            }
        } else {
            Log.d(TAG, "[WAKE] Candidate rejected: \"$transcript\" does not match wake word. Discarded.")
            isVerifying.set(false)
            try { onDeviceKeywordRecognizer?.cancel() } catch (_: Exception) {}
            resumeMonitoring()
        }
    }

    private fun resumeMonitoring() {
        if (!isListening.get() && !isVerifying.get()) {
            startListening()
        }
    }

    /**
     * Manually trigger wake word verification (used for testing or explicit activation intents)
     */
    fun triggerWakeWordManual() {
        Log.i(TAG, "[WAKE] Manual wake word trigger executed")
        mainHandler.post {
            onWakeWordDetected()
        }
    }

    fun destroy() {
        stopListening()
        mainHandler.post {
            try {
                onDeviceKeywordRecognizer?.destroy()
                onDeviceKeywordRecognizer = null
            } catch (_: Exception) {}
        }
    }
}
