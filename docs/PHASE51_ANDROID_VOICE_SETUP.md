# PHASE 51: ANDROID VOICE SETUP & OEM CONFIGURATION GUIDE

## 1. Target Hardware & OEM Matrix
- **Primary OEM Reference**: Realme (Realme 12 Pro+ 5G / RMX3840)
- **Android Target Version**: Android 16 / SDK 36
- **Architecture**: ARM64-v8a / JVM 17 Desugared

---

## 2. Required Android Permissions
The application declares and requests the following runtime and install permissions:
- `android.permission.RECORD_AUDIO`: Required for local wake-word and STT capture.
- `android.permission.FOREGROUND_SERVICE`: Base foreground service execution.
- `android.permission.FOREGROUND_SERVICE_MICROPHONE`: Modern Android (API 34+) requirement for background microphone listening.
- `android.permission.POST_NOTIFICATIONS`: Android 13+ persistent notification display.
- `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`: Recommended to avoid OEM task-killer suspension.

---

## 3. Foreground Service Declaration in AndroidManifest.xml
```xml
<service
    android:name=".jarvis.JarvisVoiceService"
    android:enabled="true"
    android:exported="false"
    android:foregroundServiceType="microphone|dataSync" />
```

---

## 4. User Onboarding Flow
1. Open WellWisher JARVIS.
2. Navigate to **JARVIS Settings** → **Voice Assistant**.
3. Toggle `Always-On Voice Assistant` to ON.
4. Accept runtime permission dialog for Microphone and Notifications.
5. Request Battery Optimization Exemption (`Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`).
6. Persistent notification appears: `"JARVIS Voice Assistant Active: Listening for 'Hey Jarvis'"`.
7. Voice Assistant is now hands-free and active across app background and screen-off states.
