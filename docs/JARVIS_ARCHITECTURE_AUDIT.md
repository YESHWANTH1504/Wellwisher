# WellWisher → JARVIS: Complete Architecture Audit (Phase 0)

**Date**: 2026-09-11  
**Author**: Lead System Architect & Engineering Team  
**Scope**: Full-stack audit across Frontend (Flutter), Backend (Node.js/Express/MySQL), Android Native (Kotlin), Database schema, and AI Orchestration.

---

## 1. Executive Summary

This architecture audit establishes the structural baseline for transforming the existing WellWisher application into a real, standalone, voice-first JARVIS personal AI operating system for Android. The repository contains extensive foundational capabilities across multi-agent orchestration, Health Connect aggregation, local wake-word monitoring, and schedule synchronization. However, several critical architectural gaps, unsafe authentication fallbacks, duplicate routes, timeout mismatches, and execution-vs-state conflations must be eliminated.

---

## 2. Layer-by-Layer Architectural Audit

### 2.1 Frontend (Flutter)
- **Architecture & Navigation**:
  - Entry point: `lib/main.dart` initializing `LocalStorageService`, `AppConfig`, notifications, and `MainShell`.
  - Primary UI: Currently `MainShell` hosts indexed navigation with bottom navigation bars for screens (Schedule, Screen Care, Hydration, Sleep/Mood, Medication, Family, Health).
  - Target Transformation: JARVIS (`JarvisHomeScreen`) must become the **primary application experience** featuring the central AI orb, state indicator, and natural conversation stream, rather than a nested secondary tab.
- **State Management & Dependency Injection**:
  - Service Locator: `AppServiceLocator` manages singletons for `ScheduleRepository`, `ScheduleController`, `JarvisHomeController`, `JarvisHealthController`.
  - Controllers: `ScheduleController` uses `ChangeNotifier` and listens to `ScheduleEventBus`. `JarvisHealthController` monitors app lifecycle and periodically refreshes Health Connect metrics.
- **Schedule UI & Repository**:
  - `ScheduleRepository` in `frontend/lib/features/schedule/repositories/schedule_repository.dart` contains local caching, storage persistence via SharedPreferences, and server synchronization via `ScheduleService`.
  - **Identified Flaw**: Earlier code relied on optimistic local insertions (`_populateDefaultMockData`, `_localItems.add(item)`) without waiting for authoritative backend ID generation.
- **Health UI**:
  - `JarvisHealthDashboardScreen` displays cards for Steps, Calories, Heart Rate, Blood Pressure, Sleep, Distance, Workouts, Weight.
  - Zero-fabrication rules already defined, but model lacked explicit `measurementType` (`MEASURED`, `SYNCED`, `ESTIMATED`, `MANUAL`).
- **Voice & Communication**:
  - `JarvisApiService` communicates via HTTP with backend.
  - **Identified Flaw**: `ApiClient` enforced a 4-second timeout on AI routes (`aiTimeout = Duration(seconds: 4)`), causing complex LLM reasoning to abort and fall back prematurely.

---

### 2.2 Backend (Node.js, Express, MySQL)
- **Routes & Controllers**:
  - Mounted routes in `backend/server.js`: `/api/auth`, `/api/schedule`, `/api/ai`, `/api/jarvis`, `/api/jarvis/voice`, `/api/jarvis/calendar`, `/api/health`.
  - Duplicate legacy paths: `/api/ai/chat` duplicates functionality with `/api/jarvis/message`.
- **Authentication**:
  - Handled in `backend/middleware/authMiddleware.js`.
  - **Identified Vulnerability**: Line 44 permitted `demo_user_token` or `dev_token` to default requests to `userId = 1`. In production, missing or invalid tokens must be strictly rejected with HTTP 401; user scoping must be strictly enforced.
- **AI Orchestration**:
  - `JarvisMasterOrchestrator`: Canonical request normalization, session handling, durable command history.
  - `JarvisSupervisorAgent`: Coordinates subagents (`ConversationAgent`, `TaskPlanningAgent`, `SafetyAuthorizationAgent`, `ToolExecutionAgent`, `MemoryAgent`, `CalendarAgent`, `ReminderAgent`, `WellnessAgent`, `DeviceAgent`).
  - `ActiveTaskManager`: Tracks in-flight tasks and entity memory for follow-ups.
- **Tool Registry**:
  - Domain tools: `scheduleTools.js`, `healthTools.js`, `deviceTools.js`, `memoryTools.js`, `preferenceTools.js`.
  - Multi-match clarification logic exists in `calendar_delete_event` but needs strict follow-up resolution guarantees.

---

### 2.3 Android Native (Kotlin)
- **Core Activity & Bridge**:
  - `MainActivity.kt`: Hosts Flutter engine and registers MethodChannels (`com.example.wellwisher/jarvis_native`, `com.example.wellwisher/health_connect`).
- **Voice & Wake-Word Architecture**:
  - `JarvisVoiceService.kt`: Foreground service managing always-on background voice assistant, notification, and partial wake lock.
  - `WakeWordManager.kt`: Local two-stage keyword spotter using `AudioRecord` + VAD energy gate followed by on-device `SpeechRecognizer`. Does not stream ambient microphone audio to cloud servers.
  - `JarvisVoiceInteractionService.kt` & `JarvisVoiceInteractionSessionService.kt`: Implements Android OS VoiceInteractionService to serve as default digital assistant.
- **Health Connect Integration**:
  - `HealthConnectManager.kt`: Directly interacts with `androidx.health.connect.client.HealthConnectClient`. Uses `AggregateRequest` for cumulative metrics (steps, calories, distance) and handles raw records.
  - `JarvisWorkoutTracker.kt`: On-device workout tracker that writes `ExerciseSessionRecord` upon completion.
  - **Identified Flaw**: MethodChannel methods for `startWorkout`, `stopWorkout`, and `getWorkoutStatus` were not yet wired through `MainActivity.kt` to Flutter.
- **Alarm & Reminder Execution Layer**:
  - `JarvisReminderManager.kt`: Schedules exact alarms via `AlarmManager.setExactAndAllowWhileIdle()`.
  - `JarvisBootReceiver.kt`: Listens for `BOOT_COMPLETED` and `MY_PACKAGE_REPLACED` to restore alarms.

---

### 2.4 Database (MySQL)
- Relational schema defined in `WELLWISHER_AI_DATABASE.md`:
  - `users`: User identity and credentials.
  - `routines`: Authoritative schedule events and routines (owned by `user_id`).
  - `ai_conversations` & `ai_conversation_messages`: Multi-turn conversational history.
  - `ai_memories`: Scoped episodic, entity, and semantic memories with `importance` and `memory_type`.
  - `ai_preferences`: Voice, language, response style, and assistant preferences.
  - `ai_agent_runs` & `ai_agent_steps`: Execution telemetry and audit logs.

---

## 3. Vulnerabilities, Flaws & Anti-Patterns Identified

| # | Component | Issue | Severity | Impact | Required Remediation |
|---|---|---|---|---|---|
| 1 | Backend Auth | `dev_token` & `demo_user_token` fallback to `userId: 1` | High | Cross-user data leakage risk | Reject unauthenticated requests; require authentic user tokens |
| 2 | Schedule Authority | UI cache could drift from MySQL truth on failed mutations | High | Stale schedule / ghost reminders | Reconcile authoritative MySQL ID immediately after mutation; invalidate cache |
| 3 | Reminder Sync | Alarms treated as separate without authoritative tie to event ID | High | Orphaned alarms on rescheduled events | Tie Android alarm ID strictly to canonical event ID |
| 4 | Flutter API Client | 4-second timeout (`aiTimeout = Duration(seconds: 4)`) | Medium | Premature timeouts during multi-step reasoning | Increase AI request timeout to 15s |
| 5 | Health Connect | Missing `measurementType` tag on health metrics | Medium | Ambiguity over phone vs wearable origin | Add explicit `MEASURED`, `SYNCED`, `ESTIMATED`, `MANUAL` typing |
| 6 | Workout Tracking | `JarvisWorkoutTracker` not exposed over MethodChannel | Medium | Flutter unable to trigger on-device workout | Wire `startWorkout`/`stopWorkout` in `MainActivity.kt` and `JarvisNativeBridge` |
| 7 | Wake-Word Scope | False assumption of universal background capability | Medium | Platform restrictions on Android 14-16 | Implement strict Verification Matrix: Foreground, Background, Screen Locked, Default Assistant |
| 8 | Multi-Turn Schedule | Follow-up cancellation could fail if event ID lost | Medium | Deleting wrong event or failing to resolve | Ensure `ActiveTaskManager` preserves exact `eventId` and candidate list |

---

## 4. Architectural Invariants Enforced Going Forward

1. **Schedule Truth Invariant**: MySQL is the ONLY schedule truth. Android AlarmManager is the execution layer. Flutter is the UI cache.
2. **Time Format Invariant**: `12h` vs `24h` is strictly a presentation-layer transform via `TimeFormatHelper`. Database events never store formatted display strings.
3. **Health Authenticity Invariant**: No metric is ever fabricated. `NO_DATA` is never converted to 0. Metrics are explicitly typed (`MEASURED`, `SYNCED`, `ESTIMATED`, `MANUAL`).
4. **Workout Invariant**: Workout tracking is an on-device operation writing real `ExerciseSessionRecord`s to Health Connect.
5. **Wake-Word Privacy Invariant**: Local on-device detection only. Zero ambient audio uploaded to cloud providers.

---

## 5. Audit Sign-Off
Phase 0 Architecture Audit is complete. The system architecture is validated and ready for phased execution according to the Master Specification.
