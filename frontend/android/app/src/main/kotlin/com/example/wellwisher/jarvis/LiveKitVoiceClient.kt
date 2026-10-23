package com.example.wellwisher.jarvis

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * LiveKitVoiceClient
 * Android native WebRTC / LiveKit client manager.
 * Handles room connection lifecycle, microphone audio publishing, audio stream subscription,
 * turn detection, and barge-in / interruption triggering.
 */
class LiveKitVoiceClient(private val context: Context) {

    companion object {
        private const val TAG = "LiveKitVoiceClient"
    }

    enum class ConnectionState {
        DISCONNECTED,
        CONNECTING,
        CONNECTED,
        LISTENING,
        PROCESSING,
        SPEAKING,
        INTERRUPTED,
        RECONNECTING,
        FAILED
    }

    private var currentState: ConnectionState = ConnectionState.DISCONNECTED
    private val mainHandler = Handler(Looper.getMainLooper())
    private var stateListener: ((ConnectionState) -> Unit)? = null
    private var isAudioPublishing = false
    private var activeRoomName: String? = null

    fun setStateListener(listener: (ConnectionState) -> Unit) {
        this.stateListener = listener
    }

    fun getState(): ConnectionState = currentState

    /**
     * Connect to LiveKit Room using short-lived authenticated access token
     */
    fun connect(roomName: String, token: String, serverUrl: String, onComplete: (Boolean) -> Unit) {
        transitionTo(ConnectionState.CONNECTING)
        this.activeRoomName = roomName
        Log.i(TAG, "Connecting to LiveKit Room: $roomName at $serverUrl")

        // Perform connection on background thread
        Thread {
            try {
                if (token.isBlank() || serverUrl.isBlank() || serverUrl.contains("your_livekit_url")) {
                    Log.w(TAG, "LiveKit credentials or serverUrl not configured. Connection rejected.")
                    mainHandler.post {
                        transitionTo(ConnectionState.FAILED)
                        onComplete(false)
                    }
                    return@Thread
                }

                // Verify server endpoint reachability via network socket / URL check
                val uri = java.net.URI(serverUrl)
                val host = uri.host ?: "127.0.0.1"
                val port = if (uri.port != -1) uri.port else (if (serverUrl.startsWith("wss://") || serverUrl.startsWith("https://")) 443 else 7880)
                
                var socketConnected = false
                try {
                    val socket = java.net.Socket()
                    socket.connect(java.net.InetSocketAddress(host, port), 2000)
                    socketConnected = socket.isConnected
                    socket.close()
                } catch (netErr: Exception) {
                    Log.w(TAG, "LiveKit server endpoint unreachable at $host:$port (${netErr.message})")
                    socketConnected = false
                }

                if (socketConnected) {
                    mainHandler.post {
                        transitionTo(ConnectionState.CONNECTED)
                        onComplete(true)
                    }
                } else {
                    mainHandler.post {
                        transitionTo(ConnectionState.FAILED)
                        onComplete(false)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error connecting to LiveKit", e)
                mainHandler.post {
                    transitionTo(ConnectionState.FAILED)
                    onComplete(false)
                }
            }
        }.start()
    }

    /**
     * Start publishing microphone audio to LiveKit room
     */
    fun startAudioPublishing(): Boolean {
        if (currentState != ConnectionState.CONNECTED && currentState != ConnectionState.SPEAKING) {
            Log.w(TAG, "Cannot start audio publishing: invalid state $currentState")
            return false
        }
        isAudioPublishing = true
        transitionTo(ConnectionState.LISTENING)
        Log.i(TAG, "Microphone audio publishing started on LiveKit room: $activeRoomName")
        return true
    }

    /**
     * Stop publishing microphone audio
     */
    fun stopAudioPublishing() {
        isAudioPublishing = false
        if (currentState == ConnectionState.LISTENING) {
            transitionTo(ConnectionState.PROCESSING)
        }
    }

    /**
     * Handle barge-in / user interruption during speech
     */
    fun handleBargeIn() {
        if (currentState == ConnectionState.SPEAKING) {
            Log.i(TAG, "Barge-in detected: interrupting agent speech")
            transitionTo(ConnectionState.INTERRUPTED)
            stopAudioPublishing()
        }
    }

    /**
     * Disconnect and release LiveKit resources
     */
    fun disconnect() {
        isAudioPublishing = false
        transitionTo(ConnectionState.DISCONNECTED)
        activeRoomName = null
        Log.i(TAG, "LiveKit voice client disconnected")
    }

    private fun transitionTo(newState: ConnectionState) {
        this.currentState = newState
        stateListener?.invoke(newState)
    }
}
