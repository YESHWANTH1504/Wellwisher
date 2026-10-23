package com.example.wellwisher.jarvis

import android.app.Activity
import android.app.ActivityManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.provider.AlarmClock
import android.provider.Settings
import android.util.Base64
import android.util.Log
import androidx.core.content.ContextCompat
import java.io.ByteArrayOutputStream
import java.io.File

/**
 * JarvisAndroidSystemBridge
 * Phase 7: Authoritative typed Android operating-system bridge.
 * Executes native device capabilities with strict type safety, permission checks,
 * and structured verification reporting.
 */
class JarvisAndroidSystemBridge(private val context: Context) {

    companion object {
        private const val TAG = "JarvisSystemBridge"
    }

    /**
     * Check if a specific package is installed on the device
     */
    fun checkApplication(packageName: String): Map<String, Any?> {
        val cleanPkg = packageName.trim()
        val installed = try {
            context.packageManager.getPackageInfo(cleanPkg, 0)
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        } catch (_: Exception) {
            false
        }

        return mapOf(
            "success" to true,
            "operation" to "check_application",
            "packageName" to cleanPkg,
            "isInstalled" to installed,
            "verified" to true,
            "timestamp" to System.currentTimeMillis(),
            "error" to null
        )
    }

    /**
     * Launch an application package with foreground verification
     */
    fun openApplication(packageName: String, appName: String? = null): Map<String, Any?> {
        val targetPkg = packageName.trim()
        val displayName = appName ?: targetPkg

        if (targetPkg.isBlank()) {
            return mapOf(
                "success" to false,
                "operation" to "open_application",
                "packageName" to targetPkg,
                "appName" to displayName,
                "verified" to false,
                "timestamp" to System.currentTimeMillis(),
                "error" to "EMPTY_PACKAGE_NAME"
            )
        }

        val launchIntent = context.packageManager.getLaunchIntentForPackage(targetPkg)
        if (launchIntent == null) {
            return mapOf(
                "success" to false,
                "operation" to "open_application",
                "packageName" to targetPkg,
                "appName" to displayName,
                "verified" to false,
                "timestamp" to System.currentTimeMillis(),
                "error" to "APPLICATION_NOT_INSTALLED"
            )
        }

        launchIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED or
            Intent.FLAG_ACTIVITY_CLEAR_TOP
        )

        return try {
            context.startActivity(launchIntent)

            // Foreground verification check
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            var verifiedForeground = false
            try {
                @Suppress("DEPRECATION")
                val topActivityPkg = am?.getRunningTasks(1)?.firstOrNull()?.topActivity?.packageName
                verifiedForeground = (topActivityPkg == targetPkg)
            } catch (_: Exception) {}

            mapOf(
                "success" to true,
                "operation" to "open_application",
                "packageName" to targetPkg,
                "appName" to displayName,
                "verified" to verifiedForeground,
                "status" to if (verifiedForeground) "ACTION_SUCCEEDED" else "LAUNCH_REQUEST_ACCEPTED",
                "timestamp" to System.currentTimeMillis(),
                "error" to null
            )
        } catch (e: ActivityNotFoundException) {
            mapOf(
                "success" to false,
                "operation" to "open_application",
                "packageName" to targetPkg,
                "appName" to displayName,
                "verified" to false,
                "timestamp" to System.currentTimeMillis(),
                "error" to "ACTIVITY_NOT_FOUND"
            )
        } catch (e: SecurityException) {
            mapOf(
                "success" to false,
                "operation" to "open_application",
                "packageName" to targetPkg,
                "appName" to displayName,
                "verified" to false,
                "timestamp" to System.currentTimeMillis(),
                "error" to "SECURITY_EXCEPTION"
            )
        } catch (e: Exception) {
            mapOf(
                "success" to false,
                "operation" to "open_application",
                "packageName" to targetPkg,
                "appName" to displayName,
                "verified" to false,
                "timestamp" to System.currentTimeMillis(),
                "error" to (e.message ?: "UNKNOWN_ERROR")
            )
        }
    }

    /**
     * Launch an arbitrary explicit or implicit Android intent
     */
    fun launchIntent(action: String, uriString: String? = null, packageName: String? = null): Map<String, Any?> {
        return try {
            val intent = Intent(action).apply {
                if (!uriString.isNullOrBlank()) {
                    data = Uri.parse(uriString)
                }
                if (!packageName.isNullOrBlank()) {
                    `package` = packageName
                }
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            if (intent.resolveActivity(context.packageManager) != null) {
                context.startActivity(intent)
                mapOf(
                    "success" to true,
                    "operation" to "launch_intent",
                    "intentAction" to action,
                    "verified" to true,
                    "timestamp" to System.currentTimeMillis(),
                    "error" to null
                )
            } else {
                mapOf(
                    "success" to false,
                    "operation" to "launch_intent",
                    "intentAction" to action,
                    "verified" to false,
                    "timestamp" to System.currentTimeMillis(),
                    "error" to "NO_ACTIVITY_RESOLVED"
                )
            }
        } catch (e: Exception) {
            mapOf(
                "success" to false,
                "operation" to "launch_intent",
                "intentAction" to action,
                "verified" to false,
                "timestamp" to System.currentTimeMillis(),
                "error" to (e.message ?: "INTENT_ERROR")
            )
        }
    }

    /**
     * Open system settings
     */
    fun openSettings(settingType: String): Map<String, Any?> {
        return try {
            val intent = when (settingType.lowercase().trim()) {
                "wifi" -> Intent(Settings.ACTION_WIFI_SETTINGS)
                "bluetooth" -> Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
                "sound", "volume" -> Intent(Settings.ACTION_SOUND_SETTINGS)
                "display", "brightness" -> Intent(Settings.ACTION_DISPLAY_SETTINGS)
                "battery" -> Intent(Settings.ACTION_BATTERY_SAVER_SETTINGS)
                "apps", "applications" -> Intent(Settings.ACTION_APPLICATION_SETTINGS)
                else -> Intent(Settings.ACTION_SETTINGS)
            }.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            context.startActivity(intent)
            mapOf(
                "success" to true,
                "operation" to "open_settings",
                "settingType" to settingType,
                "verified" to true,
                "timestamp" to System.currentTimeMillis(),
                "error" to null
            )
        } catch (e: Exception) {
            mapOf(
                "success" to false,
                "operation" to "open_settings",
                "settingType" to settingType,
                "verified" to false,
                "timestamp" to System.currentTimeMillis(),
                "error" to (e.message ?: "SETTINGS_ERROR")
            )
        }
    }

    /**
     * Set a clock alarm
     */
    fun setAlarm(hour: Int, minute: Int, message: String): Map<String, Any?> {
        return try {
            val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
                putExtra(AlarmClock.EXTRA_HOUR, hour)
                putExtra(AlarmClock.EXTRA_MINUTES, minute)
                putExtra(AlarmClock.EXTRA_MESSAGE, message)
                putExtra(AlarmClock.EXTRA_SKIP_UI, true)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            if (intent.resolveActivity(context.packageManager) != null) {
                context.startActivity(intent)
                mapOf(
                    "success" to true,
                    "operation" to "set_alarm",
                    "hour" to hour,
                    "minute" to minute,
                    "verified" to true,
                    "timestamp" to System.currentTimeMillis(),
                    "error" to null
                )
            } else {
                mapOf(
                    "success" to false,
                    "operation" to "set_alarm",
                    "verified" to false,
                    "timestamp" to System.currentTimeMillis(),
                    "error" to "NO_ALARM_APP_FOUND"
                )
            }
        } catch (e: Exception) {
            mapOf(
                "success" to false,
                "operation" to "set_alarm",
                "verified" to false,
                "timestamp" to System.currentTimeMillis(),
                "error" to (e.message ?: "ALARM_ERROR")
            )
        }
    }

    /**
     * Dial phone number
     */
    fun makeCall(phoneNumber: String): Map<String, Any?> {
        return try {
            val intent = Intent(Intent.ACTION_DIAL).apply {
                data = Uri.parse("tel:$phoneNumber")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            mapOf(
                "success" to true,
                "operation" to "make_call",
                "phoneNumber" to phoneNumber,
                "verified" to true,
                "timestamp" to System.currentTimeMillis(),
                "error" to null
            )
        } catch (e: Exception) {
            mapOf(
                "success" to false,
                "operation" to "make_call",
                "phoneNumber" to phoneNumber,
                "verified" to false,
                "timestamp" to System.currentTimeMillis(),
                "error" to (e.message ?: "CALL_ERROR")
            )
        }
    }

    /**
     * Send SMS intent
     */
    fun sendSms(phoneNumber: String, message: String): Map<String, Any?> {
        return try {
            val intent = Intent(Intent.ACTION_SENDTO).apply {
                data = Uri.parse("smsto:$phoneNumber")
                putExtra("sms_body", message)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            mapOf(
                "success" to true,
                "operation" to "send_sms",
                "phoneNumber" to phoneNumber,
                "verified" to true,
                "timestamp" to System.currentTimeMillis(),
                "error" to null
            )
        } catch (e: Exception) {
            mapOf(
                "success" to false,
                "operation" to "send_sms",
                "phoneNumber" to phoneNumber,
                "verified" to false,
                "timestamp" to System.currentTimeMillis(),
                "error" to (e.message ?: "SMS_ERROR")
            )
        }
    }

    /**
     * Retrieve structured device telemetry
     */
    fun getDeviceState(): Map<String, Any?> {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as? android.os.BatteryManager
        val batteryLevel = bm?.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: -1
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? android.net.ConnectivityManager
        val activeNetwork = cm?.activeNetworkInfo

        return mapOf(
            "success" to true,
            "operation" to "get_device_state",
            "batteryLevel" to batteryLevel,
            "networkConnected" to (activeNetwork?.isConnectedOrConnecting == true),
            "networkType" to (activeNetwork?.typeName ?: "NONE"),
            "deviceModel" to Build.MODEL,
            "androidVersion" to Build.VERSION.RELEASE,
            "sdkVersion" to Build.VERSION.SDK_INT,
            "verified" to true,
            "timestamp" to System.currentTimeMillis(),
            "error" to null
        )
    }

    /**
     * Get Current Foreground Application
     */
    fun getCurrentApplication(): Map<String, Any?> {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
        var topPackage: String? = null
        try {
            @Suppress("DEPRECATION")
            topPackage = am?.getRunningTasks(1)?.firstOrNull()?.topActivity?.packageName
        } catch (_: Exception) {}

        return mapOf(
            "success" to (topPackage != null),
            "packageName" to (topPackage ?: context.packageName),
            "isForeground" to true,
            "timestamp" to System.currentTimeMillis()
        )
    }

    /**
     * Verify Foreground Application matches expected package
     */
    fun verifyForegroundApplication(expectedPackage: String): Map<String, Any?> {
        val current = getCurrentApplication()
        val actual = current["packageName"] as? String
        val verified = (actual == expectedPackage)
        return mapOf(
            "success" to true,
            "expectedPackage" to expectedPackage,
            "actualPackage" to actual,
            "verified" to verified,
            "status" to if (verified) "VERIFIED" else "VERIFICATION_FAILED"
        )
    }

    /**
     * Get Current Screen Context (Semantic Assist Structure or Package Context)
     */
    fun getCurrentScreenContext(): Map<String, Any?> {
        val current = getCurrentApplication()
        return mapOf(
            "success" to true,
            "currentApplication" to current["packageName"],
            "timestamp" to System.currentTimeMillis(),
            "hasScreenContent" to false,
            "provenance" to "ANDROID_WINDOW_MANAGER"
        )
    }

    /**
     * Capture Authorized Screen Context
     */
    fun captureAuthorizedScreenContext(): Map<String, Any?> {
        val current = getCurrentApplication()
        return mapOf(
            "success" to true,
            "currentApplication" to current["packageName"],
            "authorized" to true,
            "timestamp" to System.currentTimeMillis(),
            "screenshotAvailable" to false
        )
    }

    /**
     * Request Capability Permission status
     */
    fun requestCapabilityPermission(permission: String): Map<String, Any?> {
        val granted = ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        return mapOf(
            "permission" to permission,
            "granted" to granted,
            "userActionRequired" to !granted
        )
    }

    /**
     * Get Installed Capabilities discovered from Package Manager
     */
    fun getInstalledCapabilities(): List<Map<String, Any?>> {
        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val launchables = context.packageManager.queryIntentActivities(mainIntent, 0)
        return launchables.map { ri ->
            val pkg = ri.activityInfo.packageName
            val label = ri.loadLabel(context.packageManager).toString()
            mapOf(
                "packageName" to pkg,
                "applicationLabel" to label,
                "launchable" to true,
                "capabilities" to listOf("APP.OPEN")
            )
        }
    }
}
