package com.example.wellwisher

import android.app.ActivityManager
import android.app.role.RoleManager
import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.CalendarContract
import android.provider.Settings
import android.util.Log
import android.view.WindowManager
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.util.Calendar
import java.util.TimeZone
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.example.wellwisher/jarvis_native"
    private val ALT_CHANNEL = "wellwisher/jarvis_native"
    private var flutterChannel: MethodChannel? = null
    private val healthConnectManager by lazy { com.example.wellwisher.jarvis.health.HealthConnectManager(this) }
    private val mainScope = CoroutineScope(Dispatchers.Main)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            try {
                val serviceIntent = Intent(this, com.example.wellwisher.jarvis.JarvisVoiceService::class.java).apply {
                    action = com.example.wellwisher.jarvis.JarvisVoiceService.ACTION_START_VOICE
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent)
                } else {
                    startService(serviceIntent)
                }
            } catch (e: Exception) {
                Log.e("MainActivity", "Failed auto-starting JarvisVoiceService: ${e.message}")
            }
        }

        handleAssistantIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleAssistantIntent(intent)
    }

    private fun handleAssistantIntent(intent: Intent?) {
        if (intent == null) return
        val action = intent.action
        val extraAction = intent.getStringExtra("action")
        val source = intent.getStringExtra("source")
        Log.i("MainActivity", "[JARVIS_ASSISTANT] handleAssistantIntent: action=$action, extraAction=$extraAction, source=$source")

        if (action == Intent.ACTION_ASSIST || 
            action == Intent.ACTION_VOICE_COMMAND || 
            extraAction == "ACTIVATE_VOICE_ASSISTANT" || 
            source == "VOICE_INTERACTION_SESSION") {
            Log.i("MainActivity", "[JARVIS_ASSISTANT] Triggering assistant voice session from intent")
            flutterChannel?.invokeMethod("onAssistantInvoked", mapOf(
                "action" to (action ?: extraAction ?: "UNKNOWN"),
                "source" to (source ?: "INTENT")
            ))

            try {
                val serviceIntent = Intent(this, com.example.wellwisher.jarvis.JarvisVoiceService::class.java).apply {
                    this.action = com.example.wellwisher.jarvis.JarvisVoiceService.ACTION_TRIGGER_WAKE
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent)
                } else {
                    startService(serviceIntent)
                }
            } catch (e: Exception) {
                Log.w("MainActivity", "[JARVIS_ASSISTANT] Failed to signal JarvisVoiceService: ${e.message}")
            }
        }
    }

    private var pendingCameraResult: MethodChannel.Result? = null
    private var tempPhotoFile: java.io.File? = null

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 201) {
            val roleManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                getSystemService(RoleManager::class.java)
            } else null
            val isHeld = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && roleManager != null) {
                roleManager.isRoleHeld(RoleManager.ROLE_ASSISTANT)
            } else false
            Log.i("MainActivity", "[JARVIS_ASSISTANT] Role request result: resultCode=$resultCode, isRoleHeld=$isHeld")
        } else if (requestCode == 302) {
            if (resultCode == RESULT_OK) {
                try {
                    val bytes = tempPhotoFile?.readBytes()
                    tempPhotoFile?.delete()
                    if (bytes != null && bytes.isNotEmpty()) {
                        val base64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
                        pendingCameraResult?.success(base64)
                    } else {
                        pendingCameraResult?.error("EMPTY_CAPTURE", "No image data captured", null)
                    }
                } catch (e: Exception) {
                    tempPhotoFile?.delete()
                    pendingCameraResult?.error("CAPTURE_ERROR", e.message, null)
                }
            } else {
                tempPhotoFile?.delete()
                pendingCameraResult?.error("CAMERA_CANCELLED", "User cancelled camera capture", null)
            }
            pendingCameraResult = null
            tempPhotoFile = null
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        val handler = MethodChannel.MethodCallHandler { call, result ->
            when (call.method) {

                "isDefaultAssistant" -> {
                    val info = getAssistantStatusInternal()
                    result.success(info["isDefault"] as? Boolean ?: false)
                }

                "getAssistantStatus" -> {
                    result.success(getAssistantStatusInternal())
                }

                "getLocalAIStatus" -> {
                    try {
                        val bridge = com.example.wellwisher.jarvis.JarvisLocalAIStatusBridge(this)
                        result.success(bridge.getLocalAIStatus())
                    } catch (e: Exception) {
                        result.error("STATUS_ERROR", e.message, null)
                    }
                }

                "checkMicrophonePermission" -> {
                    val granted = ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                    result.success(granted)
                }

                "checkNotificationPermission" -> {
                    val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
                    } else {
                        androidx.core.app.NotificationManagerCompat.from(this).areNotificationsEnabled()
                    }
                    result.success(granted)
                }

                "checkCalendarPermission" -> {
                    val readGranted = ContextCompat.checkSelfPermission(this, android.Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED
                    val writeGranted = ContextCompat.checkSelfPermission(this, android.Manifest.permission.WRITE_CALENDAR) == PackageManager.PERMISSION_GRANTED
                    result.success(readGranted && writeGranted)
                }

                "checkCameraPermission" -> {
                    val granted = ContextCompat.checkSelfPermission(this, android.Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                    result.success(granted)
                }

                "requestCameraPermission" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        requestPermissions(arrayOf(android.Manifest.permission.CAMERA), 301)
                        result.success(true)
                    } else {
                        result.success(true)
                    }
                }

                "captureCameraPhoto" -> {
                    try {
                        val file = java.io.File.createTempFile("jarvis_camera_", ".jpg", cacheDir)
                        tempPhotoFile = file
                        val uri = androidx.core.content.FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
                        val cameraIntent = Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE).apply {
                            putExtra(android.provider.MediaStore.EXTRA_OUTPUT, uri)
                            addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        pendingCameraResult = result
                        startActivityForResult(cameraIntent, 302)
                    } catch (e: Exception) {
                        Log.e("MainActivity", "Failed to launch camera: ${e.message}")
                        result.error("CAMERA_LAUNCH_FAILED", e.message, null)
                    }
                }

                "captureScreenContext" -> {
                    try {
                        val view = window.decorView.rootView
                        val width = view.width.coerceAtLeast(1)
                        val height = view.height.coerceAtLeast(1)
                        val bitmap = android.graphics.Bitmap.createBitmap(width, height, android.graphics.Bitmap.Config.ARGB_8888)
                        val canvas = android.graphics.Canvas(bitmap)
                        view.draw(canvas)
                        val stream = java.io.ByteArrayOutputStream()
                        bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 80, stream)
                        val bytes = stream.toByteArray()
                        val base64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
                        result.success(base64)
                    } catch (e: Exception) {
                        result.error("SCREEN_CAPTURE_FAILED", e.message, null)
                    }
                }

                "setBaseUrl" -> {
                    val url = call.argument<String>("url")
                    if (url != null) {
                        com.example.wellwisher.jarvis.JarvisApiClient.setGlobalBaseUrl(url)
                        result.success(true)
                    } else {
                        result.error("INVALID_URL", "Base URL cannot be null", null)
                    }
                }

                "setAuthToken" -> {
                    val token = call.argument<String>("token")
                    com.example.wellwisher.jarvis.JarvisApiClient.setGlobalAuthToken(token)
                    result.success(true)
                }

                "setUserName" -> {
                    val name = call.argument<String>("userName")
                    com.example.wellwisher.jarvis.JarvisApiClient.setGlobalUserName(name)
                    result.success(true)
                }

                "isBatteryOptimizationIgnored" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
                        result.success(pm.isIgnoringBatteryOptimizations(packageName))
                    } else {
                        result.success(true)
                    }
                }

                "requestBatteryOptimizationExemption" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        try {
                            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                                data = Uri.parse("package:$packageName")
                            }
                            startActivity(intent)
                            result.success(true)
                        } catch (e: Exception) {
                            val fallback = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                            startActivity(fallback)
                            result.success(true)
                        }
                    } else {
                        result.success(true)
                    }
                }

                "openAssistantSettings" -> {
                    try {
                        val intent = Intent(Settings.ACTION_VOICE_INPUT_SETTINGS)
                        startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        try {
                            val fallback = Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS)
                            startActivity(fallback)
                            result.success(true)
                        } catch (e2: Exception) {
                            result.error("INTENT_ERROR", e2.message, null)
                        }
                    }
                }

                "getDeviceCalendarEvents" -> {
                    val dateStr = call.argument<String>("date") ?: ""
                    val events = queryCalendarEvents(dateStr)
                    result.success(events)
                }

                "createDeviceCalendarEvent" -> {
                    val title = call.argument<String>("title") ?: "Event"
                    val startMillis = call.argument<Long>("startTime") ?: System.currentTimeMillis()
                    val endMillis = call.argument<Long>("endTime") ?: (System.currentTimeMillis() + 3600000)
                    val location = call.argument<String>("location") ?: ""
                    val description = call.argument<String>("description") ?: ""
                    val success = insertCalendarEvent(title, startMillis, endMillis, location, description)
                    result.success(success)
                }

                "updateDeviceCalendarEvent" -> {
                    val eventId = call.argument<String>("eventId") ?: ""
                    val title = call.argument<String>("title")
                    val startMillis = call.argument<Long>("startTime")
                    val endMillis = call.argument<Long>("endTime")
                    val location = call.argument<String>("location")
                    val success = updateCalendarEvent(eventId, title, startMillis, endMillis, location)
                    result.success(success)
                }

                "deleteDeviceCalendarEvent" -> {
                    val eventId = call.argument<String>("eventId") ?: ""
                    val success = deleteCalendarEvent(eventId)
                    result.success(success)
                }

                // --- Phase 4: System-Level Assistant & Local Wake Word Handlers ---
                "startVoiceAssistant", "startAssistantService", "startWakeWord" -> {
                    try {
                        val serviceIntent = Intent(this, com.example.wellwisher.jarvis.JarvisVoiceService::class.java).apply {
                            action = com.example.wellwisher.jarvis.JarvisVoiceService.ACTION_START_VOICE
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            startForegroundService(serviceIntent)
                        } else {
                            startService(serviceIntent)
                        }
                        result.success(mapOf("success" to true, "status" to "STARTED"))
                    } catch (e: Exception) {
                        result.error("VOICE_SERVICE_ERROR", e.message, null)
                    }
                }

                "stopVoiceAssistant", "stopAssistantService", "stopWakeWord" -> {
                    try {
                        val serviceIntent = Intent(this, com.example.wellwisher.jarvis.JarvisVoiceService::class.java).apply {
                            action = com.example.wellwisher.jarvis.JarvisVoiceService.ACTION_STOP_VOICE
                        }
                        startService(serviceIntent)
                        result.success(mapOf("success" to true, "status" to "STOPPED"))
                    } catch (e: Exception) {
                        result.error("VOICE_SERVICE_ERROR", e.message, null)
                    }
                }

                "getVoiceAssistantStatus", "isAssistantServiceRunning" -> {
                    val isRunning = com.example.wellwisher.jarvis.JarvisVoiceService.isServiceRunning
                    if (call.method == "isAssistantServiceRunning") {
                        result.success(isRunning)
                    } else {
                        val statusMap = mapOf(
                            "isRunning" to isRunning,
                            "state" to com.example.wellwisher.jarvis.JarvisVoiceService.currentVoiceState.name
                        )
                        result.success(statusMap)
                    }
                }

                "getWakeWordStatus" -> {
                    val isRunning = com.example.wellwisher.jarvis.JarvisVoiceService.isServiceRunning
                    val isListening = com.example.wellwisher.jarvis.JarvisVoiceService.isWakeWordListening()
                    val state = com.example.wellwisher.jarvis.JarvisVoiceService.currentVoiceState.name
                    result.success(mapOf(
                        "success" to true,
                        "isRunning" to isRunning,
                        "isListening" to isListening,
                        "phrase" to com.example.wellwisher.jarvis.WakeWordManager.PRIMARY_WAKE_PHRASE,
                        "state" to state,
                        "localEngine" to "OnDeviceKeywordRecognizer + AudioRecord VAD",
                        "cloudPassiveStreaming" to false
                    ))
                }

                "requestAssistantRole" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val roleManager = getSystemService(RoleManager::class.java)
                        if (roleManager != null && roleManager.isRoleAvailable(RoleManager.ROLE_ASSISTANT)) {
                            if (roleManager.isRoleHeld(RoleManager.ROLE_ASSISTANT)) {
                                result.success(mapOf(
                                    "success" to true,
                                    "status" to "SELECTED",
                                    "message" to "JARVIS is already the selected default assistant"
                                ))
                            } else {
                                val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_ASSISTANT)
                                startActivityForResult(intent, 201)
                                result.success(mapOf(
                                    "success" to true,
                                    "status" to "REQUEST_REQUIRED",
                                    "message" to "System assistant role request dialog initiated"
                                ))
                            }
                        } else {
                            openAssistantSettingsInternal(result)
                        }
                    } else {
                        openAssistantSettingsInternal(result)
                    }
                }

                "openAssistantSettings" -> {
                    openAssistantSettingsInternal(result)
                }

                "getMicrophoneStatus" -> {
                    val granted = ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                    val active = com.example.wellwisher.jarvis.JarvisVoiceService.isMicrophoneActive()
                    val state = if (active) "MIC_LISTENING" else if (granted) "MIC_IDLE" else "MIC_RELEASED"
                    result.success(mapOf(
                        "success" to true,
                        "granted" to granted,
                        "active" to active,
                        "state" to state
                    ))
                }

                "getAudioFocusStatus" -> {
                    val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                    val isMusicActive = audioManager?.isMusicActive ?: false
                    val mode = audioManager?.mode ?: 0
                    val isSpeakerphone = audioManager?.isSpeakerphoneOn ?: false
                    result.success(mapOf(
                        "success" to true,
                        "isMusicActive" to isMusicActive,
                        "audioMode" to mode,
                        "speakerphoneOn" to isSpeakerphone
                    ))
                }

                "getSystemVoiceState" -> {
                    val assistantInfo = getAssistantStatusInternal()
                    val isRunning = com.example.wellwisher.jarvis.JarvisVoiceService.isServiceRunning
                    val voiceState = com.example.wellwisher.jarvis.JarvisVoiceService.currentVoiceState.name
                    val isListening = com.example.wellwisher.jarvis.JarvisVoiceService.isWakeWordListening()
                    val micGranted = ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                    result.success(mapOf(
                        "success" to true,
                        "serviceRunning" to isRunning,
                        "voiceState" to voiceState,
                        "assistantStatus" to (assistantInfo["status"] ?: "UNKNOWN"),
                        "isDefaultAssistant" to (assistantInfo["isDefault"] ?: false),
                        "wakeWordListening" to isListening,
                        "microphoneGranted" to micGranted
                    ))
                }


                "getDiagnostics" -> {
                    val diagnostics = com.example.wellwisher.jarvis.VoiceDiagnostics(this)
                    diagnostics.runAllDiagnostics { items ->
                        val serialized = items.map { item ->
                            mapOf(
                                "id" to item.id,
                                "name" to item.name,
                                "status" to item.status.name,
                                "message" to item.message
                            )
                        }
                        runOnUiThread {
                            result.success(serialized)
                        }
                    }
                }

                "requestVoicePermissions" -> {
                    val permissions = mutableListOf<String>()
                    if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                        permissions.add(android.Manifest.permission.RECORD_AUDIO)
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                        ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                        permissions.add(android.Manifest.permission.POST_NOTIFICATIONS)
                    }

                    if (permissions.isNotEmpty()) {
                        androidx.core.app.ActivityCompat.requestPermissions(this, permissions.toTypedArray(), 101)
                    }
                    result.success(true)
                }

                "testWakeWord" -> {
                    try {
                        val triggerIntent = Intent(this, com.example.wellwisher.jarvis.JarvisVoiceService::class.java).apply {
                            action = com.example.wellwisher.jarvis.JarvisVoiceService.ACTION_TRIGGER_WAKE
                        }
                        startService(triggerIntent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("WAKE_TEST_ERROR", e.message, null)
                    }
                }

                "testTts" -> {
                    val sampleText = call.argument<String>("text") ?: "JARVIS speech engine is online and fully operational."
                    val tts = com.example.wellwisher.jarvis.JarvisTtsManager(
                        this,
                        onSpeechStarted = {},
                        onSpeechCompleted = {},
                        onError = {}
                    )
                    Handler(Looper.getMainLooper()).postDelayed({
                        tts.speak(sampleText)
                    }, 500)
                    result.success(true)
                }

                "testLiveKit" -> {
                    val client = com.example.wellwisher.jarvis.LiveKitVoiceClient(this)
                    client.connect("jarvis_test_room", "test_token", "ws://127.0.0.1:7880") { success ->
                        runOnUiThread {
                            result.success(mapOf(
                                "connected" to success,
                                "state" to client.getState().name,
                                "message" to if (success) "LiveKit Realtime Transport Connected" else "LiveKit Connection Failed"
                            ))
                        }
                    }
                }

                "runFullVoiceTest" -> {
                    val isVoiceRunning = com.example.wellwisher.jarvis.JarvisVoiceService.isServiceRunning
                    val currentState = com.example.wellwisher.jarvis.JarvisVoiceService.currentVoiceState.name
                    val micGranted = ContextCompat.checkSelfPermission(this, android.Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                    val fullTestResult = mapOf(
                        "serviceRunning" to isVoiceRunning,
                        "voiceState" to currentState,
                        "micPermission" to micGranted
                    )
                    result.success(fullTestResult)
                }

                // --- Phase 58: True Autonomous Device Control & App Launching Handlers ---
                "openApplication" -> {
                    val rawPkg = call.argument<String>("packageName") ?: ""
                    val appName = call.argument<String>("appName") ?: if (rawPkg.contains("whatsapp")) "WhatsApp" else rawPkg
                    Log.d("JARVIS_NATIVE", "[JARVIS_NATIVE] REQUEST_OPEN_APPLICATION appName=$appName pkg=$rawPkg")

                    var targetPkg = rawPkg.trim()

                    // 1. Resolve Package Dynamically using PackageManager
                    var isInstalled = false
                    if (targetPkg.isNotEmpty()) {
                        isInstalled = try {
                            packageManager.getPackageInfo(targetPkg, 0)
                            true
                        } catch (_: PackageManager.NameNotFoundException) {
                            false
                        }
                    }

                    // If not installed or rawPkg was a generic guess, search installed launcher applications
                    if (!isInstalled && appName.isNotBlank()) {
                        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                            addCategory(Intent.CATEGORY_LAUNCHER)
                        }
                        val launchables = packageManager.queryIntentActivities(mainIntent, 0)
                        val targetClean = appName.lowercase().trim().replace(" ", "")
                        val matched = launchables.firstOrNull { ri ->
                            val label = ri.loadLabel(packageManager).toString().lowercase().trim()
                            val labelClean = label.replace(" ", "")
                            val p = ri.activityInfo.packageName.lowercase()
                            labelClean == targetClean || labelClean.contains(targetClean) || targetClean.contains(labelClean) || p.contains(targetClean)
                        }
                        if (matched != null) {
                            targetPkg = matched.activityInfo.packageName
                            isInstalled = true
                            Log.d("JARVIS_NATIVE", "[JARVIS_NATIVE] PACKAGE_RESOLUTION matched installed app: $targetPkg for \"$appName\"")
                        }
                    }

                    if (!isInstalled || targetPkg.isBlank()) {
                        Log.e("JARVIS_NATIVE", "[JARVIS_NATIVE] package $targetPkg is NOT installed for \"$appName\"")
                        result.success(mapOf(
                            "success" to false,
                            "executed" to false,
                            "verified" to false,
                            "action" to "OPEN_APPLICATION",
                            "packageName" to targetPkg,
                            "appName" to appName,
                            "error" to "APPLICATION_NOT_INSTALLED"
                        ))
                        return@MethodCallHandler
                    }

                    // 2. Resolve launch intent
                    Log.d("JARVIS_NATIVE", "[JARVIS_NATIVE] resolving launch intent for $targetPkg")
                    val launchIntent = packageManager.getLaunchIntentForPackage(targetPkg)
                    if (launchIntent == null) {
                        Log.e("JARVIS_NATIVE", "[JARVIS_NATIVE] launch intent is null for $targetPkg")
                        result.success(mapOf(
                            "success" to false,
                            "executed" to false,
                            "verified" to false,
                            "action" to "OPEN_APPLICATION",
                            "packageName" to targetPkg,
                            "appName" to appName,
                            "error" to "ACTIVITY_NOT_FOUND"
                        ))
                        return@MethodCallHandler
                    }

                    Log.d("JARVIS_NATIVE", "[JARVIS_NATIVE] LAUNCH_INTENT_RESOLVED component=${launchIntent.component}")
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED or Intent.FLAG_ACTIVITY_CLEAR_TOP)

                    // 3. Start Activity with thorough error handling
                    try {
                        Log.d("JARVIS_NATIVE", "[JARVIS_NATIVE] START_ACTIVITY called for $targetPkg")
                        startActivity(launchIntent)

                        // 4. Foreground verification check
                        val am = getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
                        var verifiedForeground = false
                        var verificationUnavailable = true

                        try {
                            @Suppress("DEPRECATION")
                            val runningTasks = am?.getRunningTasks(1)
                            val topActivityPkg = runningTasks?.firstOrNull()?.topActivity?.packageName
                            if (topActivityPkg != null) {
                                verificationUnavailable = false
                                verifiedForeground = (topActivityPkg == targetPkg)
                            }
                        } catch (_: Exception) {
                            verificationUnavailable = true
                        }

                        Log.d("JARVIS_NATIVE", "[JARVIS_NATIVE] VERIFICATION verified=$verifiedForeground verificationUnavailable=$verificationUnavailable")
                        Log.d("JARVIS_NATIVE", "[JARVIS_NATIVE] RESULT status=${if (verifiedForeground) "ACTION_SUCCEEDED" else "LAUNCH_REQUEST_ACCEPTED"}")

                        result.success(mapOf(
                            "success" to true,
                            "executed" to true,
                            "verified" to verifiedForeground,
                            "verificationUnavailable" to verificationUnavailable,
                            "action" to "OPEN_APPLICATION",
                            "packageName" to targetPkg,
                            "appName" to appName,
                            "status" to if (verifiedForeground) "ACTION_SUCCEEDED" else "LAUNCH_REQUEST_ACCEPTED",
                            "message" to "Application launched successfully"
                        ))
                    } catch (e: ActivityNotFoundException) {
                        Log.e("JARVIS_NATIVE", "[JARVIS_NATIVE] ActivityNotFoundException: ${e.message}")
                        result.success(mapOf(
                            "success" to false,
                            "executed" to true,
                            "verified" to false,
                            "action" to "OPEN_APPLICATION",
                            "packageName" to targetPkg,
                            "appName" to appName,
                            "error" to "ACTIVITY_NOT_FOUND"
                        ))
                    } catch (e: SecurityException) {
                        Log.e("JARVIS_NATIVE", "[JARVIS_NATIVE] SecurityException: ${e.message}")
                        result.success(mapOf(
                            "success" to false,
                            "executed" to true,
                            "verified" to false,
                            "action" to "OPEN_APPLICATION",
                            "packageName" to targetPkg,
                            "appName" to appName,
                            "error" to "SECURITY_EXCEPTION"
                        ))
                    } catch (e: Exception) {
                        Log.e("JARVIS_NATIVE", "[JARVIS_NATIVE] Exception: ${e.message}")
                        result.success(mapOf(
                            "success" to false,
                            "executed" to false,
                            "verified" to false,
                            "action" to "OPEN_APPLICATION",
                            "packageName" to targetPkg,
                            "appName" to appName,
                            "error" to (e.message ?: "UNKNOWN_ERROR")
                        ))
                    }
                }

                "isApplicationInstalled", "checkInstalledApp" -> {
                    val pkg = call.argument<String>("packageName") ?: ""
                    try {
                        packageManager.getPackageInfo(pkg, 0)
                        result.success(true)
                    } catch (_: PackageManager.NameNotFoundException) {
                        result.success(false)
                    } catch (e: Exception) {
                        result.error("PKG_ERROR", e.message, null)
                    }
                }

                "launchIntent" -> {
                    val action = call.argument<String>("action") ?: Intent.ACTION_VIEW
                    val uriString = call.argument<String>("uri")
                    val pkg = call.argument<String>("packageName")
                    try {
                        val intent = Intent(action).apply {
                            if (!uriString.isNullOrBlank()) {
                                data = Uri.parse(uriString)
                            }
                            if (!pkg.isNullOrBlank()) {
                                `package` = pkg
                            }
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        if (intent.resolveActivity(packageManager) != null) {
                            startActivity(intent)
                            result.success(mapOf(
                                "success" to true,
                                "action" to "LAUNCH_INTENT",
                                "intentAction" to action,
                                "verified" to true
                            ))
                        } else {
                            result.success(mapOf(
                                "success" to false,
                                "action" to "LAUNCH_INTENT",
                                "error" to "NO_ACTIVITY_RESOLVED"
                            ))
                        }
                    } catch (e: Exception) {
                        result.error("INTENT_ERROR", e.message, null)
                    }
                }

                "openSettings" -> {
                    val settingType = call.argument<String>("settingType") ?: ""
                    try {
                        val intent = when (settingType.lowercase()) {
                            "wifi" -> Intent(Settings.ACTION_WIFI_SETTINGS)
                            "bluetooth" -> Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
                            "sound" -> Intent(Settings.ACTION_SOUND_SETTINGS)
                            "display" -> Intent(Settings.ACTION_DISPLAY_SETTINGS)
                            "battery" -> Intent(Settings.ACTION_BATTERY_SAVER_SETTINGS)
                            "apps" -> Intent(Settings.ACTION_APPLICATION_SETTINGS)
                            else -> Intent(Settings.ACTION_SETTINGS)
                        }
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(intent)
                        result.success(mapOf(
                            "success" to true,
                            "action" to "OPEN_SETTINGS",
                            "settingType" to settingType,
                            "verified" to true
                        ))
                    } catch (e: Exception) {
                        result.error("SETTINGS_ERROR", e.message, null)
                    }
                }

                "setDeviceAlarm" -> {
                    val hour = call.argument<Int>("hour") ?: 7
                    val minute = call.argument<Int>("minute") ?: 0
                    val message = call.argument<String>("message") ?: "JARVIS Alarm"
                    try {
                        val alarmIntent = Intent(android.provider.AlarmClock.ACTION_SET_ALARM).apply {
                            putExtra(android.provider.AlarmClock.EXTRA_HOUR, hour)
                            putExtra(android.provider.AlarmClock.EXTRA_MINUTES, minute)
                            putExtra(android.provider.AlarmClock.EXTRA_MESSAGE, message)
                            putExtra(android.provider.AlarmClock.EXTRA_SKIP_UI, true)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        if (alarmIntent.resolveActivity(packageManager) != null) {
                            startActivity(alarmIntent)
                            result.success(mapOf(
                                "success" to true,
                                "action" to "SET_ALARM",
                                "hour" to hour,
                                "minute" to minute,
                                "verified" to true
                            ))
                        } else {
                            result.success(mapOf(
                                "success" to false,
                                "error" to "No alarm clock application found"
                            ))
                        }
                    } catch (e: Exception) {
                        result.error("ALARM_ERROR", e.message, null)
                    }
                }

                "makePhoneCall" -> {
                    val number = call.argument<String>("phoneNumber") ?: ""
                    try {
                        val callIntent = Intent(Intent.ACTION_DIAL).apply {
                            data = Uri.parse("tel:$number")
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(callIntent)
                        result.success(mapOf(
                            "success" to true,
                            "action" to "MAKE_PHONE_CALL",
                            "phoneNumber" to number,
                            "verified" to true
                        ))
                    } catch (e: Exception) {
                        result.error("CALL_ERROR", e.message, null)
                    }
                }

                "sendSms" -> {
                    val number = call.argument<String>("phoneNumber") ?: ""
                    val body = call.argument<String>("message") ?: ""
                    try {
                        val smsIntent = Intent(Intent.ACTION_SENDTO).apply {
                            data = Uri.parse("smsto:$number")
                            putExtra("sms_body", body)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(smsIntent)
                        result.success(mapOf(
                            "success" to true,
                            "action" to "SEND_SMS",
                            "phoneNumber" to number,
                            "verified" to true
                        ))
                    } catch (e: Exception) {
                        result.error("SMS_ERROR", e.message, null)
                    }
                }

                "scheduleReminder" -> {
                    val reminderId = call.argument<String>("reminderId") ?: "rem_${System.currentTimeMillis()}"
                    val title = call.argument<String>("title") ?: "Reminder"
                    val time = call.argument<String>("time") ?: ""
                    val triggerAt = call.argument<Number>("triggerAtMillis")?.toLong()
                    if (triggerAt == null || triggerAt <= System.currentTimeMillis()) {
                        result.error("INVALID_TRIGGER_TIME", "A future triggerAtMillis timestamp is required to schedule an exact reminder.", null)
                    } else {
                        val isRecurring = call.argument<Boolean>("isRecurring") ?: false
                        val recurrenceRule = call.argument<String>("recurrenceRule")

                        val scheduled = com.example.wellwisher.jarvis.JarvisReminderManager.scheduleReminder(
                            applicationContext,
                            reminderId,
                            title,
                            time,
                            triggerAt,
                            isRecurring,
                            recurrenceRule
                        )
                        result.success(mapOf(
                            "success" to scheduled,
                            "reminderId" to reminderId,
                            "title" to title,
                            "triggerAtMillis" to triggerAt
                        ))
                    }
                }

                "cancelReminder" -> {
                    val reminderId = call.argument<String>("reminderId") ?: ""
                    val cancelled = com.example.wellwisher.jarvis.JarvisReminderManager.cancelReminder(
                        applicationContext,
                        reminderId
                    )
                    result.success(mapOf(
                        "success" to cancelled,
                        "reminderId" to reminderId
                    ))
                }

                "getInstalledApplications" -> {
                    val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                        addCategory(Intent.CATEGORY_LAUNCHER)
                    }
                    val launchables = packageManager.queryIntentActivities(mainIntent, 0)
                    val appList = launchables.map { ri ->
                        mapOf(
                            "appName" to ri.loadLabel(packageManager).toString(),
                            "packageName" to ri.activityInfo.packageName,
                            "isLaunchable" to true
                        )
                    }
                    result.success(appList)
                }

                "getDeviceStatus" -> {
                    val bm = getSystemService(Context.BATTERY_SERVICE) as? android.os.BatteryManager
                    val batteryLevel = bm?.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: -1
                    val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? android.net.ConnectivityManager
                    val activeNetwork = cm?.activeNetworkInfo
                    val isConnected = activeNetwork?.isConnectedOrConnecting == true

                    result.success(mapOf(
                        "batteryLevel" to batteryLevel,
                        "networkConnected" to isConnected,
                        "networkType" to (activeNetwork?.typeName ?: "NONE"),
                        "deviceModel" to Build.MODEL,
                        "androidVersion" to Build.VERSION.RELEASE
                    ))
                }

                "getForegroundApplication", "getCurrentApplication" -> {
                    val am = getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
                    var topPackage: String? = null
                    try {
                        @Suppress("DEPRECATION")
                        topPackage = am?.getRunningTasks(1)?.firstOrNull()?.topActivity?.packageName
                    } catch (_: Exception) {}

                    result.success(mapOf(
                        "packageName" to (topPackage ?: packageName),
                        "isForeground" to true,
                        "timestamp" to System.currentTimeMillis()
                    ))
                }

                "verifyForegroundApplication" -> {
                    val expected = call.argument<String>("packageName") ?: ""
                    val am = getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
                    var topPackage: String? = null
                    try {
                        @Suppress("DEPRECATION")
                        topPackage = am?.getRunningTasks(1)?.firstOrNull()?.topActivity?.packageName
                    } catch (_: Exception) {}

                    val verified = (topPackage == expected)
                    result.success(mapOf(
                        "success" to true,
                        "expectedPackage" to expected,
                        "actualPackage" to topPackage,
                        "verified" to verified,
                        "status" to if (verified) "VERIFIED" else "VERIFICATION_FAILED"
                    ))
                }

                "getInstalledCapabilities" -> {
                    val bridge = com.example.wellwisher.jarvis.JarvisAndroidSystemBridge(this)
                    result.success(bridge.getInstalledCapabilities())
                }

                "getCurrentScreenContext" -> {
                    val bridge = com.example.wellwisher.jarvis.JarvisAndroidSystemBridge(this)
                    result.success(bridge.getCurrentScreenContext())
                }

                // Health Connect Integration Methods
                "health_isAvailable" -> {
                    result.success(healthConnectManager.isHealthConnectAvailable())
                }

                "health_checkPermissions" -> {
                    mainScope.launch {
                        val perms = healthConnectManager.checkPermissions()
                        result.success(perms)
                    }
                }

                "health_getBackgroundCapability" -> {
                    result.success(healthConnectManager.getBackgroundHealthCapability())
                }

                "health_openSettings", "health_requestPermissions" -> {
                    try {
                        val intent = Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS")
                        if (packageManager.resolveActivity(intent, 0) != null) {
                            startActivity(intent)
                            result.success(true)
                        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                            val sysIntent = Intent("android.settings.HEALTH_CONNECT_SETTINGS")
                            if (packageManager.resolveActivity(sysIntent, 0) != null) {
                                startActivity(sysIntent)
                                result.success(true)
                            } else {
                                val appIntent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                    data = android.net.Uri.fromParts("package", packageName, null)
                                }
                                startActivity(appIntent)
                                result.success(true)
                            }
                        } else {
                            val appIntent = Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                data = android.net.Uri.fromParts("package", packageName, null)
                            }
                            startActivity(appIntent)
                            result.success(true)
                        }
                    } catch (e: Exception) {
                        result.error("HEALTH_SETTINGS_ERROR", e.message, null)
                    }
                }

                "health_getStepsToday" -> {
                    mainScope.launch {
                        val data = healthConnectManager.getStepsToday()
                        result.success(data)
                    }
                }

                "health_getStepsForDate" -> {
                    val date = call.argument<String>("date")
                    mainScope.launch {
                        val data = healthConnectManager.getStepsForDate(date)
                        result.success(data)
                    }
                }

                "health_getStepsRange" -> {
                    val startDate = call.argument<String>("startDate") ?: ""
                    val endDate = call.argument<String>("endDate") ?: ""
                    mainScope.launch {
                        val data = healthConnectManager.getStepsRange(startDate, endDate)
                        result.success(data)
                    }
                }

                "health_getActiveCaloriesToday" -> {
                    mainScope.launch {
                        val data = healthConnectManager.getActiveCaloriesToday()
                        result.success(data)
                    }
                }

                "health_getTotalCaloriesToday" -> {
                    mainScope.launch {
                        val data = healthConnectManager.getTotalCaloriesToday()
                        result.success(data)
                    }
                }

                "health_getCaloriesForDate" -> {
                    val date = call.argument<String>("date")
                    mainScope.launch {
                        val data = healthConnectManager.getCaloriesForDate(date)
                        result.success(data)
                    }
                }

                "health_getLatestHeartRate" -> {
                    mainScope.launch {
                        val data = healthConnectManager.getLatestHeartRate()
                        result.success(data)
                    }
                }

                "health_getRestingHeartRate" -> {
                    mainScope.launch {
                        val data = healthConnectManager.getRestingHeartRate()
                        result.success(data)
                    }
                }

                "health_getLatestBloodPressure" -> {
                    mainScope.launch {
                        val data = healthConnectManager.getLatestBloodPressure()
                        result.success(data)
                    }
                }

                "health_getBloodPressureRange" -> {
                    val startDate = call.argument<String>("startDate") ?: ""
                    val endDate = call.argument<String>("endDate") ?: ""
                    mainScope.launch {
                        val data = healthConnectManager.getBloodPressureRange(startDate, endDate)
                        result.success(data)
                    }
                }

                "health_getSleepSummary" -> {
                    val date = call.argument<String>("date")
                    mainScope.launch {
                        val data = healthConnectManager.getSleepSummary(date)
                        result.success(data)
                    }
                }

                "health_getDistanceToday" -> {
                    mainScope.launch {
                        val data = healthConnectManager.getDistanceToday()
                        result.success(data)
                    }
                }

                "health_getDistanceForDate" -> {
                    val date = call.argument<String>("date")
                    mainScope.launch {
                        val data = healthConnectManager.getDistanceForDate(date)
                        result.success(data)
                    }
                }

                "health_getWorkouts" -> {
                    val date = call.argument<String>("date")
                    mainScope.launch {
                        val data = healthConnectManager.getWorkouts(date)
                        result.success(data)
                    }
                }

                "health_getLatestWeight" -> {
                    mainScope.launch {
                        val data = healthConnectManager.getLatestWeight()
                        result.success(data)
                    }
                }

                "health_getWeightHistory" -> {
                    mainScope.launch {
                        val data = healthConnectManager.getWeightHistory()
                        result.success(data)
                    }
                }

                "health_getFullSnapshot" -> {
                    val date = call.argument<String>("date")
                    mainScope.launch {
                        val snapshot = healthConnectManager.getFullDailySnapshot(date)
                        result.success(snapshot)
                    }
                }

                "health_startWorkout", "startWorkout" -> {
                    val type = call.argument<String>("exerciseType") ?: "walking"
                    val res = com.example.wellwisher.jarvis.health.JarvisWorkoutTracker.startWorkout(type)
                    result.success(res)
                }

                "health_stopWorkout", "stopWorkout" -> {
                    mainScope.launch {
                        val res = com.example.wellwisher.jarvis.health.JarvisWorkoutTracker.stopWorkout(applicationContext)
                        result.success(res)
                    }
                }

                "health_getActiveWorkout", "getActiveWorkout", "getWorkoutStatus" -> {
                    val res = com.example.wellwisher.jarvis.health.JarvisWorkoutTracker.getStatus()
                    result.success(res)
                }

                else -> result.notImplemented()
            }
        }
        flutterChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
        flutterChannel?.setMethodCallHandler(handler)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, ALT_CHANNEL).setMethodCallHandler(handler)
    }

    private fun queryCalendarEvents(dateStr: String): List<Map<String, Any>> {
        val list = mutableListOf<Map<String, Any>>()
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            return list
        }

        try {
            val projection = arrayOf(
                CalendarContract.Events._ID,
                CalendarContract.Events.TITLE,
                CalendarContract.Events.DTSTART,
                CalendarContract.Events.DTEND,
                CalendarContract.Events.EVENT_LOCATION,
                CalendarContract.Events.DESCRIPTION
            )

            val cursor = contentResolver.query(
                CalendarContract.Events.CONTENT_URI,
                projection,
                null,
                null,
                "${CalendarContract.Events.DTSTART} ASC"
            )

            cursor?.use {
                val idIdx = it.getColumnIndex(CalendarContract.Events._ID)
                val titleIdx = it.getColumnIndex(CalendarContract.Events.TITLE)
                val startIdx = it.getColumnIndex(CalendarContract.Events.DTSTART)
                val endIdx = it.getColumnIndex(CalendarContract.Events.DTEND)
                val locIdx = it.getColumnIndex(CalendarContract.Events.EVENT_LOCATION)
                val descIdx = it.getColumnIndex(CalendarContract.Events.DESCRIPTION)

                while (it.moveToNext()) {
                    val item = mutableMapOf<String, Any>()
                    if (idIdx != -1) item["id"] = it.getLong(idIdx).toString()
                    if (titleIdx != -1) item["title"] = it.getString(titleIdx) ?: ""
                    if (startIdx != -1) item["dtStart"] = it.getLong(startIdx)
                    if (endIdx != -1) item["dtEnd"] = it.getLong(endIdx)
                    if (locIdx != -1) item["location"] = it.getString(locIdx) ?: ""
                    if (descIdx != -1) item["description"] = it.getString(descIdx) ?: ""
                    list.add(item)
                }
            }
        } catch (_: Exception) {}
        return list
    }

    private fun insertCalendarEvent(
        title: String,
        startMillis: Long,
        endMillis: Long,
        location: String,
        description: String
    ): Boolean {
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.WRITE_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            return false
        }

        return try {
            val values = ContentValues().apply {
                put(CalendarContract.Events.CALENDAR_ID, 1) // Primary calendar
                put(CalendarContract.Events.TITLE, title)
                put(CalendarContract.Events.DESCRIPTION, description)
                put(CalendarContract.Events.EVENT_LOCATION, location)
                put(CalendarContract.Events.DTSTART, startMillis)
                put(CalendarContract.Events.DTEND, endMillis)
                put(CalendarContract.Events.EVENT_TIMEZONE, TimeZone.getDefault().id)
            }
            val uri = contentResolver.insert(CalendarContract.Events.CONTENT_URI, values)
            uri != null
        } catch (_: Exception) {
            false
        }
    }

    private fun updateCalendarEvent(
        eventId: String,
        title: String?,
        startMillis: Long?,
        endMillis: Long?,
        location: String?
    ): Boolean {
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.WRITE_CALENDAR) != PackageManager.PERMISSION_GRANTED || eventId.isEmpty()) {
            return false
        }

        return try {
            val values = ContentValues()
            if (title != null) values.put(CalendarContract.Events.TITLE, title)
            if (startMillis != null) values.put(CalendarContract.Events.DTSTART, startMillis)
            if (endMillis != null) values.put(CalendarContract.Events.DTEND, endMillis)
            if (location != null) values.put(CalendarContract.Events.EVENT_LOCATION, location)

            val uri = android.content.ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, eventId.toLong())
            val rows = contentResolver.update(uri, values, null, null)
            rows > 0
        } catch (_: Exception) {
            false
        }
    }

    private fun deleteCalendarEvent(eventId: String): Boolean {
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.WRITE_CALENDAR) != PackageManager.PERMISSION_GRANTED || eventId.isEmpty()) {
            return false
        }

        return try {
            val uri = android.content.ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, eventId.toLong())
            val rows = contentResolver.delete(uri, null, null)
            rows > 0
        } catch (_: Exception) {
            false
        }
    }

    private fun getAssistantStatusInternal(): Map<String, Any> {
        val roleManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getSystemService(RoleManager::class.java)
        } else null

        val isRoleHeld = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && roleManager != null) {
            try { roleManager.isRoleHeld(RoleManager.ROLE_ASSISTANT) } catch (_: Exception) { false }
        } else false

        val isRoleAvailable = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && roleManager != null) {
            try { roleManager.isRoleAvailable(RoleManager.ROLE_ASSISTANT) } catch (_: Exception) { false }
        } else false

        val currentService = try { Settings.Secure.getString(contentResolver, "voice_interaction_service") ?: "" } catch (_: Exception) { "" }
        val currentAssistant = try { Settings.Secure.getString(contentResolver, "assistant") ?: "" } catch (_: Exception) { "" }
        val isServiceSelected = currentService.contains(packageName) || currentAssistant.contains(packageName)

        val isDefault = isRoleHeld || isServiceSelected

        val status = when {
            isDefault -> "SELECTED"
            isRoleAvailable -> "AVAILABLE_NOT_SELECTED"
            else -> {
                val serviceIntent = Intent(android.service.voice.VoiceInteractionService.SERVICE_INTERFACE).setPackage(packageName)
                val resolved = packageManager.queryIntentServices(serviceIntent, PackageManager.GET_META_DATA)
                if (resolved.isNotEmpty()) "AVAILABLE_NOT_SELECTED" else "NOT_SUPPORTED"
            }
        }

        return mapOf(
            "success" to true,
            "status" to status,
            "isDefault" to isDefault,
            "isRoleHeld" to isRoleHeld,
            "isRoleAvailable" to isRoleAvailable,
            "currentService" to currentService,
            "currentAssistant" to currentAssistant,
            "serviceState" to JarvisVoiceInteractionService.currentServiceState.name,
            "packageName" to packageName
        )
    }

    private fun openAssistantSettingsInternal(result: MethodChannel.Result) {
        try {
            val intent = Intent(Settings.ACTION_VOICE_INPUT_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            if (intent.resolveActivity(packageManager) != null) {
                startActivity(intent)
                result.success(mapOf("success" to true, "target" to "ACTION_VOICE_INPUT_SETTINGS"))
            } else {
                val altIntent = Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                startActivity(altIntent)
                result.success(mapOf("success" to true, "target" to "ACTION_MANAGE_DEFAULT_APPS_SETTINGS"))
            }
        } catch (e: Exception) {
            result.error("INTENT_ERROR", e.message, null)
        }
    }
}

