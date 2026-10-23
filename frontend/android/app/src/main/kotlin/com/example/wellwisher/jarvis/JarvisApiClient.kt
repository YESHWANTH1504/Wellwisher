package com.example.wellwisher.jarvis

import android.content.Context
import android.os.Build
import android.provider.Settings
import android.util.Log
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.ConnectException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.util.UUID
import java.util.concurrent.Executors

data class VoiceCommandResult(
    val success: Boolean,
    val sessionId: String,
    val responseText: String,
    val executionStatus: String,
    val intent: String?,
    val errorCode: String? = null,
    val errorMessage: String? = null,
    val reminderId: String? = null,
    val triggerAtMillis: Long? = null,
    val action: String? = null,
    val actionData: JSONObject? = null
)

/**
 * Android HTTP Client for JARVIS Voice API Gateway.
 * Dispatches transcribed voice commands securely to /api/jarvis/voice/command.
 * Preserves semantic error codes without collapsing them into generic strings.
 */
class JarvisApiClient(private val context: Context) {

    companion object {
        private const val TAG = "JarvisApiClient"
        private const val DEFAULT_BASE_URL = "http://127.0.0.1:3000" // Physical device via adb reverse or local host
        private const val FALLBACK_BASE_URL = "http://10.0.2.2:3000" // Android emulator loopback host
        private const val CONNECT_TIMEOUT_MS = 8000
        private const val READ_TIMEOUT_MS = 60000

        @Volatile
        private var sharedBaseUrl: String? = null
        @Volatile
        private var sharedAuthToken: String? = null

        fun setGlobalBaseUrl(url: String) {
            var clean = url.trimEnd('/')
            if (clean.endsWith("/api")) {
                clean = clean.substring(0, clean.length - 4)
            }
            sharedBaseUrl = clean
        }

        @Volatile
        private var sharedUserName: String? = null

        fun setGlobalAuthToken(token: String?) {
            sharedAuthToken = token
        }

        fun setGlobalUserName(name: String?) {
            sharedUserName = name
        }
    }

    private val executor = Executors.newSingleThreadExecutor()

    var baseUrl: String
        get() {
            val currentShared = sharedBaseUrl
            if (currentShared != null) return currentShared
            val stored = context.getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
                .getString("flutter.customServerUrl", null)
            if (!stored.isNullOrBlank()) {
                var clean = stored.trimEnd('/')
                if (clean.endsWith("/api")) {
                    clean = clean.substring(0, clean.length - 4)
                }
                return clean
            }
            return DEFAULT_BASE_URL
        }
        set(value) {
            var clean = value.trimEnd('/')
            if (clean.endsWith("/api")) {
                clean = clean.substring(0, clean.length - 4)
            }
            sharedBaseUrl = clean
        }

    var authToken: String?
        get() = sharedAuthToken ?: context.getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
            .getString("flutter.jwtToken", null)
        set(value) { sharedAuthToken = value }

    var currentUserName: String?
        get() = sharedUserName ?: context.getSharedPreferences("FlutterSharedPreferences", Context.MODE_PRIVATE)
            .getString("flutter.userName", null)
        set(value) { sharedUserName = value }


    /**
     * Send transcribed text command to JARVIS Voice API with semantic error handling
     */
    fun sendVoiceCommand(
        text: String,
        sessionId: String? = null,
        healthSnapshot: Map<String, Any?>? = null,
        onSuccess: (VoiceCommandResult) -> Unit,
        onError: (errorCode: String, message: String) -> Unit
    ) {
        val assignedSessionId = sessionId ?: UUID.randomUUID().toString()
        val deviceId = getDeviceId()
        val timestamp = System.currentTimeMillis().toString()
        val nonce = UUID.randomUUID().toString()

        executor.execute {
            val urlsToTry = listOf(baseUrl, DEFAULT_BASE_URL, FALLBACK_BASE_URL).distinct()
            var lastErrorCode = "BACKEND_UNREACHABLE"
            var lastErrorMessage = "Unable to connect to JARVIS API"

            for (rawHost in urlsToTry) {
                var currentHost = rawHost.trimEnd('/')
                if (currentHost.endsWith("/api")) {
                    currentHost = currentHost.substring(0, currentHost.length - 4)
                }
                var connection: HttpURLConnection? = null
                try {
                    val endpointUrl = URL("$currentHost/api/jarvis/voice/command")
                    connection = (endpointUrl.openConnection() as HttpURLConnection).apply {
                        requestMethod = "POST"
                        connectTimeout = CONNECT_TIMEOUT_MS
                        readTimeout = READ_TIMEOUT_MS
                        doOutput = true
                        doInput = true
                        setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                        setRequestProperty("Accept", "application/json")
                        val token = authToken ?: "dev_token"
                        setRequestProperty("Authorization", "Bearer $token")
                    }

                    val payload = JSONObject().apply {
                        put("sessionId", assignedSessionId)
                        put("text", text)
                        put("inputMode", "VOICE")
                        put("deviceId", deviceId)
                        put("timestamp", timestamp)
                        put("nonce", nonce)
                        put("deviceModel", Build.MODEL)
                        put("deviceManufacturer", Build.MANUFACTURER)
                        put("androidVersion", Build.VERSION.SDK_INT)

                        val nameToSend = currentUserName
                        if (!nameToSend.isNullOrBlank()) {
                            put("userName", nameToSend)
                        }

                        if (healthSnapshot != null) {
                            put("healthSnapshot", JSONObject(healthSnapshot))
                        }
                    }

                    OutputStreamWriter(connection.outputStream, "UTF-8").use { writer ->
                        writer.write(payload.toString())
                        writer.flush()
                    }

                    val responseCode = connection.responseCode
                    val stream = if (responseCode in 200..299) connection.inputStream else connection.errorStream
                    val responseBody = BufferedReader(InputStreamReader(stream, "UTF-8")).use { it.readText() }

                    if (responseCode in 200..299) {
                        val json = JSONObject(responseBody)
                        val actionObj = json.optJSONObject("action")
                        val reminderId = if (json.has("reminderId")) json.optString("reminderId") else actionObj?.optString("reminderId")
                        val triggerAt = if (json.has("triggerAtMillis") && !json.isNull("triggerAtMillis")) {
                            json.optLong("triggerAtMillis")
                        } else if (actionObj?.has("triggerAtMillis") == true && !actionObj.isNull("triggerAtMillis")) {
                            actionObj.optLong("triggerAtMillis")
                        } else null

                        val result = VoiceCommandResult(
                            success = json.optBoolean("success", true),
                            sessionId = json.optString("sessionId", assignedSessionId),
                            responseText = json.optString("speech", json.optString("message", json.optString("responseText", "Done."))),
                            executionStatus = json.optString("executionStatus", "VERIFIED"),
                            intent = json.optString("intent", null),
                            reminderId = reminderId,
                            triggerAtMillis = triggerAt,
                            action = if (json.has("action") && json.opt("action") is String) json.optString("action") else actionObj?.optString("tool"),
                            actionData = json.optJSONObject("actionData") ?: actionObj
                        )
                        Log.i(TAG, "Voice command processed successfully by backend at $currentHost (Intent: ${result.intent})")
                        onSuccess(result)
                        return@execute
                    } else {
                        val json = try { JSONObject(responseBody) } catch (_: Exception) { JSONObject() }
                        val code = json.optString("errorCode", when (responseCode) {
                            401 -> "AUTH_FAILED"
                            403 -> "AUTH_FAILED"
                            404 -> "BACKEND_NOT_FOUND"
                            429 -> "GEMINI_QUOTA"
                            500 -> "GEMINI_SERVER_ERROR"
                            504 -> "BACKEND_TIMEOUT"
                            else -> "TOOL_FAILED"
                        })
                        val msg = json.optString("message", "Server error ($responseCode)")
                        lastErrorCode = code
                        lastErrorMessage = msg
                        Log.w(TAG, "Backend returned error: code=$code msg=$msg")
                    }
                } catch (e: SocketTimeoutException) {
                    lastErrorCode = "BACKEND_TIMEOUT"
                    lastErrorMessage = "Connection timed out"
                    Log.w(TAG, "Voice API timeout at $currentHost: ${e.message}")
                } catch (e: ConnectException) {
                    lastErrorCode = "BACKEND_UNREACHABLE"
                    lastErrorMessage = "Backend unreachable at $currentHost"
                    Log.w(TAG, "Voice API unreachable at $currentHost: ${e.message}")
                } catch (e: Exception) {
                    lastErrorCode = "BACKEND_UNREACHABLE"
                    lastErrorMessage = e.message ?: "Connection failed"
                    Log.w(TAG, "Voice API attempt failed at $currentHost: $lastErrorMessage")
                } finally {
                    connection?.disconnect()
                }
            }
            onError(lastErrorCode, lastErrorMessage)
        }
    }

    private fun getDeviceId(): String {
        return try {
            Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "android_device_generic"
        } catch (_: Exception) {
            "android_device_generic"
        }
    }
}
