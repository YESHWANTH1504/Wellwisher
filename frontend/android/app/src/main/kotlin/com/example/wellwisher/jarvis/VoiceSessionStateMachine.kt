package com.example.wellwisher.jarvis

import android.util.Log

/**
 * Authoritative Deterministic Voice State Machine for JARVIS Assistant.
 * Enforces the strict lifecycle:
 * SLEEPING -> LISTENING_FOR_WAKE_WORD -> WAKE_DETECTED -> LISTENING_FOR_COMMAND
 * -> TRANSCRIBING -> THINKING -> ACTING -> SPEAKING -> WAITING_FOR_FOLLOWUP -> SLEEPING
 */
enum class VoiceState {
    IDLE,
    CONNECTING,
    CONNECTED,
    WAKE_DETECTED,
    LISTENING,
    USER_SPEAKING,
    PROCESSING,
    ACTING,
    SPEAKING,
    INTERRUPTED,
    RECONNECTING,
    RETURNING_TO_IDLE,
    DISCONNECTING,
    DISCONNECTED,
    ERROR;

    companion object {
        // Backward-compatibility aliases
        val SLEEPING get() = IDLE
        val STARTING get() = CONNECTING
        val LISTENING_FOR_WAKE_WORD get() = IDLE
        val LISTENING_FOR_COMMAND get() = LISTENING
        val TRANSCRIBING get() = PROCESSING
        val THINKING get() = PROCESSING
        val WAITING_FOR_FOLLOWUP get() = RETURNING_TO_IDLE
        val MANUAL_MODE get() = LISTENING
        val WAKE_WORD_DETECTED get() = WAKE_DETECTED
        val UNDERSTANDING get() = PROCESSING
        val EXECUTING get() = ACTING
        val VERIFYING get() = ACTING
        val RECOVERY get() = ERROR
        val STT_ERROR get() = ERROR
        val WAKE_WORD_ERROR get() = ERROR
        val BACKEND_ERROR get() = ERROR
        val NETWORK_ERROR get() = ERROR
        val TTS_ERROR get() = ERROR
        val PERMISSION_ERROR get() = ERROR
        val SERVICE_ERROR get() = ERROR
    }
}

class VoiceSessionStateMachine(
    private var currentState: VoiceState = VoiceState.IDLE,
    private val onStateChanged: ((VoiceState, VoiceState) -> Unit)? = null
) {
    companion object {
        private const val TAG = "VoiceStateMachine"
    }

    // Explicit state sequence:
    // IDLE -> CONNECTING -> CONNECTED -> WAKE_DETECTED -> LISTENING -> USER_SPEAKING -> PROCESSING -> ACTING -> SPEAKING -> (INTERRUPTED) -> RETURNING_TO_IDLE -> IDLE
    private val validTransitions: Map<VoiceState, Set<VoiceState>> = mapOf(
        VoiceState.IDLE to setOf(
            VoiceState.CONNECTING,
            VoiceState.WAKE_DETECTED,
            VoiceState.LISTENING,
            VoiceState.PROCESSING,
            VoiceState.ERROR
        ),
        VoiceState.CONNECTING to setOf(
            VoiceState.CONNECTED,
            VoiceState.IDLE,
            VoiceState.ERROR
        ),
        VoiceState.CONNECTED to setOf(
            VoiceState.LISTENING,
            VoiceState.WAKE_DETECTED,
            VoiceState.PROCESSING,
            VoiceState.IDLE,
            VoiceState.ERROR
        ),
        VoiceState.WAKE_DETECTED to setOf(
            VoiceState.LISTENING,
            VoiceState.RETURNING_TO_IDLE,
            VoiceState.IDLE,
            VoiceState.ERROR
        ),
        VoiceState.LISTENING to setOf(
            VoiceState.USER_SPEAKING,
            VoiceState.PROCESSING,
            VoiceState.RETURNING_TO_IDLE,
            VoiceState.IDLE,
            VoiceState.ERROR
        ),
        VoiceState.USER_SPEAKING to setOf(
            VoiceState.PROCESSING,
            VoiceState.LISTENING,
            VoiceState.INTERRUPTED,
            VoiceState.ERROR
        ),
        VoiceState.PROCESSING to setOf(
            VoiceState.ACTING,
            VoiceState.SPEAKING,
            VoiceState.INTERRUPTED,
            VoiceState.RETURNING_TO_IDLE,
            VoiceState.IDLE,
            VoiceState.ERROR
        ),
        VoiceState.ACTING to setOf(
            VoiceState.SPEAKING,
            VoiceState.RETURNING_TO_IDLE,
            VoiceState.IDLE,
            VoiceState.ERROR
        ),
        VoiceState.SPEAKING to setOf(
            VoiceState.USER_SPEAKING,
            VoiceState.LISTENING,
            VoiceState.INTERRUPTED,
            VoiceState.RETURNING_TO_IDLE,
            VoiceState.IDLE,
            VoiceState.ERROR
        ),
        VoiceState.INTERRUPTED to setOf(
            VoiceState.LISTENING,
            VoiceState.USER_SPEAKING,
            VoiceState.PROCESSING,
            VoiceState.RETURNING_TO_IDLE,
            VoiceState.IDLE,
            VoiceState.ERROR
        ),
        VoiceState.RECONNECTING to setOf(
            VoiceState.CONNECTED,
            VoiceState.LISTENING,
            VoiceState.IDLE,
            VoiceState.ERROR
        ),
        VoiceState.RETURNING_TO_IDLE to setOf(
            VoiceState.IDLE,
            VoiceState.WAKE_DETECTED,
            VoiceState.LISTENING,
            VoiceState.ERROR
        ),
        VoiceState.DISCONNECTING to setOf(
            VoiceState.DISCONNECTED,
            VoiceState.IDLE
        ),
        VoiceState.DISCONNECTED to setOf(
            VoiceState.IDLE,
            VoiceState.CONNECTING
        ),
        VoiceState.ERROR to setOf(
            VoiceState.SPEAKING,
            VoiceState.RETURNING_TO_IDLE,
            VoiceState.IDLE
        )
    )

    fun getCurrentState(): VoiceState = currentState

    fun isErrorState(): Boolean = currentState == VoiceState.ERROR

    @Synchronized
    fun transitionTo(newState: VoiceState): Boolean {
        val allowable = validTransitions[currentState] ?: emptySet()
        if (newState in allowable || newState == currentState) {
            val previous = currentState
            currentState = newState
            Log.i(TAG, "[VOICE] state=${newState.name} (from ${previous.name})")
            onStateChanged?.invoke(previous, newState)
            return true
        }
        Log.w(TAG, "[VOICE] Illegal state transition attempted: ${currentState.name} -> ${newState.name}")
        return false
    }

    @Synchronized
    fun reset() {
        val previous = currentState
        currentState = VoiceState.IDLE
        Log.i(TAG, "[VOICE] state=IDLE (reset)")
        onStateChanged?.invoke(previous, VoiceState.IDLE)
    }
}
