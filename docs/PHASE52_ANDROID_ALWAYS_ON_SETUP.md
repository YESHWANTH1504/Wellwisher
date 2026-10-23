# PHASE 52: ANDROID ALWAYS-ON & SCREEN-OFF ARCHITECTURE SETUP

## 1. Foreground Service Configuration
- **Service Name**: `com.example.wellwisher.jarvis.JarvisVoiceService`
- **Foreground Service Type**: `microphone|dataSync`
- **Notification Requirement**: Ongoing non-dismissible notification (`IMPORTANCE_LOW`)
- **WakeLock Strategy**: `PowerManager.PARTIAL_WAKE_LOCK` with auto-renewal

```xml
<service
    android:name=".jarvis.JarvisVoiceService"
    android:enabled="true"
    android:exported="false"
    android:foregroundServiceType="microphone|dataSync" />
```

---

## 2. Audio Capture Invariant: Passive Local Listening
- **Screen-Off Operation**: `WakeWordManager.kt` captures PCM audio locally at 16kHz on volatile RAM buffers.
- **Zero Remote Streaming During Standby**: The device NEVER streams microphone audio to LiveKit or backend servers while waiting for "Hey Jarvis".
- **LiveKit Trigger**: Only after a local wake-word match does the service initiate WebRTC session audio transport.

---

## 3. Battery Policy & OEM Guidance
- Surfaces battery optimization status to the user.
- Prompts for `Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` to ensure Android OEM task killers do not terminate the background listener during Doze deep sleep.
