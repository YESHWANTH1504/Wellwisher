# Phase 53: Android Always-On Architecture

## 1. Native Assistant Service
`JarvisVoiceService.kt` runs as an Android Foreground Service with explicit `FOREGROUND_SERVICE_MICROPHONE` permissions:
- Continues wake-word listening when the screen is locked or another application is active.
- Features persistent notification with live state indicator and quick mute toggle.
- Communicates with Flutter via method channels in `JarvisNativeBridge`.

## 2. Battery & Wake Lock Optimization
- Uses low-power audio buffers and duty-cycling when no speech energy is detected.
- Employs partial wake locks only during active voice capture sessions.
- Automatically handles Android battery optimization exemptions gracefully.
