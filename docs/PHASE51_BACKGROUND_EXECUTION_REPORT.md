# PHASE 51: ANDROID BACKGROUND & SCREEN-OFF EXECUTION REPORT

## 1. Background Execution Architecture
- **Component**: `JarvisVoiceService` (`android.app.Service`)
- **Service Type**: `android:foregroundServiceType="microphone|dataSync"`
- **Notification Requirement**: Ongoing non-dismissible notification (`IMPORTANCE_LOW`)
- **Wake Lock Strategy**: `PowerManager.PARTIAL_WAKE_LOCK` acquired with 10-minute safe renewal cycles

---

## 2. Android 14/15/16 Background Microphone Policies
- Android restricts starting background microphone capture without a pre-existing foreground service.
- JARVIS initializes the foreground service during user onboarding while the app is in the foreground.
- Once foreground status is established, `RECORD_AUDIO` remains active under the declared `microphone` foreground service type.

---

## 3. Battery Optimization & OEM Throttling Handling
- **Realme / ColorOS Policy**: Background services without battery exemption may be frozen during deep sleep (Doze mode).
- **Mitigation**: JARVIS surfaces `isBatteryOptimizationIgnored()` and guides the user via `requestBatteryOptimizationExemption()`.
- **Diagnostics Screen**: Displays real-time status (`Exempt (Unrestricted)` vs `Optimized (May throttle)`).
