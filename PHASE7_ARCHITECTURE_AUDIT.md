# Phase 7 Architecture Audit: WellWisher / JARVIS

**Date**: 2026-10-05  
**Target**: Transform JARVIS into a Unified Android AI Operating-System Layer  
**Device Context**: Connected Physical Realme RMX3840 (Android 16 / SDK 36, Device ID `bdbf8c9b`)

---

## Executive Summary
This audit provides a comprehensive, ground-truth inventory of the existing WellWisher/JARVIS codebase across the backend Node.js services, native Android Kotlin services, Flutter presentation layer, MySQL database schema, and test infrastructure.

The purpose of Phase 7 is **not** to create another conversational bot or parallel pipeline, but to consolidate the rich, multi-phase systems built in Phases 1–6 into a coherent **AI Operating-System Layer (JARVIS OS)** modeled on universal intelligence fabric principles:
`SENSE → KNOW → REASON → PLAN → AUTHORIZE → ACT → OBSERVE → VERIFY → REMEMBER → RESPOND`.

---

## A. Current Architecture Map

The system currently runs across three tiers:
1. **Native Android 16 Host Layer** (`frontend/android/app/src/main/kotlin/com/example/wellwisher/`)
   - `JarvisVoiceInteractionService` & `JarvisVoiceInteractionSession`: Android Voice Interaction System Assistant integration.
   - `JarvisVoiceService`: Background Foreground Service (`microphone|dataSync`) maintaining wake-word recognition, LiveKit WebRTC, and local audio recording.
   - `JarvisReminderService`, `JarvisReminderManager`, `JarvisBootReceiver`: Exact alarm scheduling (`AlarmManager`) and persistence across device reboots.
   - `HealthConnectManager`: Direct integration with Android Health Connect framework (steps, heart rate, calories, blood pressure, sleep, workouts).
   - `MainActivity.kt`: MethodChannel (`com.example.wellwisher/jarvis_native`) handling app execution, screen capture, camera capture, calendar queries/mutations, phone calls, SMS intents, system settings, and diagnostic probes.

2. **Frontend Flutter Application** (`frontend/lib/features/jarvis/`)
   - Presentation layer providing voice HUD, diagnostic center, proactive cards, memory inspection, and permission management.
   - Delegates all system operations to `jarvis_native_bridge.dart` and backend HTTP/WebSocket endpoints.

3. **Backend Intelligence Pipeline** (`backend/services/jarvis/`)
   - **Entrypoint**: `backend/routes/jarvisVoiceRoutes.js` and `backend/routes/jarvisRoutes.js`.
   - **Gateway**: `backend/services/jarvis/communication/voiceController.js` and `voiceCommandRouter.js`.
   - **Orchestration**: `backend/services/jarvis/orchestrator/JarvisMasterOrchestrator.js` dispatching to `JarvisSupervisorAgent.js`.
   - **Legacy Pipeline**: `backend/services/jarvis/agent/jarvisAgent.js` (Phase 4 multi-step runner using `AgentPlanner` and `AgentExecutor`).
   - **Provider Engine**: `AIModelRouter.js` and `AIProviderRegistry.js` supporting Gemini 3.5, OpenAI, ElevenLabs, and LiveKit.
   - **Context Engine**: `ContextEngine.js`, `PersonalContextAgent.js`, `temporalContext.js`, and category-specific retrievers.
   - **Memory & Tasks**: `ActiveTaskManager.js` (backed by `ai_active_tasks`), `MemoryAgent.js` (backed by `ai_memories`), `VisualMemoryManager.js`.
   - **Safety & Verification**: `SafetyAuthorizationAgent.js`, `RiskClassifier.js`, `PermissionManager.js`, `WorkflowVerifier.js`, `actionVerifier.js`.

---

## B. Existing JARVIS Agents

| Agent Name | Location | Primary Responsibility | Audit Decision |
|---|---|---|---|
| `JarvisMasterOrchestrator` | `services/jarvis/orchestrator/JarvisMasterOrchestrator.js` | Top-level dispatcher for voice sessions & requests | **MERGE** into `JarvisOSCore` |
| `JarvisSupervisorAgent` | `services/jarvis/agent/JarvisSupervisorAgent.js` | 1000+ line coordinator handling state transitions, visual memory, follow-ups, and tool synthesis | **REFACTOR & MOVE** into `JarvisSystemOrchestrator` |
| `JarvisAgent` | `services/jarvis/agent/jarvisAgent.js` | Early Phase 4 orchestration pipeline with state machine | **DEPRECATE** in favor of OS Core; preserve compatibility wrapper |
| `JarvisLiveKitAgent` | `services/jarvis/agent/JarvisLiveKitAgent.js` | Realtime voice streaming agent over LiveKit | **KEEP & INTEGRATE** with Perception Fabric |
| `RequestClassifierAgent` | `services/jarvis/agent/RequestClassifierAgent.js` | Intent classification & capability routing | **MERGE** into `JarvisIntentFabric` |
| `TaskPlanningAgent` | `services/jarvis/agent/specialized/TaskPlanningAgent.js` | Multi-step task planner | **REFACTOR** into `JarvisExecutionRuntime` / Planner |
| `ToolExecutionAgent` | `services/jarvis/agent/specialized/ToolExecutionAgent.js` | Dispatches tools from registry | **MERGE** into `JarvisActionEngine` |
| `SafetyAuthorizationAgent` | `services/jarvis/agent/specialized/SafetyAuthorizationAgent.js` | Medical safety, prompt injection checks, risk checks | **MERGE** into `JarvisPermissionManager` |
| `MemoryAgent` | `services/jarvis/agent/specialized/MemoryAgent.js` | Working session memory + durable user memories | **REFACTOR & MERGE** into `JarvisContextFabric` & Memory |
| `PersonalContextAgent` | `services/jarvis/agent/specialized/PersonalContextAgent.js` | Personal context snapshot, morning briefing, memory commands | **MERGE** into `JarvisContextFabric` |
| `FollowUpResolutionAgent` | `services/jarvis/agent/specialized/FollowUpResolutionAgent.js` | Resolves "actually make that 9", "cancel that", active task follow-ups | **MERGE** into `JarvisReferenceResolver` |
| `ConversationAgent` | `services/jarvis/agent/specialized/ConversationAgent.js` | Multi-turn slot filling and conversation turns | **MERGE** into `JarvisEntityResolver` & OS Core |
| `KnowledgeAgent` | `services/jarvis/agent/specialized/KnowledgeAgent.js` | General Q&A fallback using Gemini | **KEEP** as fallback capability in `ModelFabric` |
| `CalendarAgent` | `services/jarvis/agent/specialized/CalendarAgent.js` | Calendar-specific scheduling | **MERGE** into `AppCapability` (Calendar domain) |
| `ReminderAgent` | `services/jarvis/agent/specialized/ReminderAgent.js` | Reminder operations | **MERGE** into `AppCapability` (Reminders domain) |
| `AlarmAgent` | `services/jarvis/agent/specialized/AlarmAgent.js` | Native device alarm controls | **MERGE** into `AppCapability` (Clock/Alarm domain) |
| `DeviceAgent` | `services/jarvis/agent/specialized/DeviceAgent.js` | Application launch, settings, device status | **MERGE** into `AppCapability` (Device domain) |
| `WellnessAgent` | `services/jarvis/agent/specialized/WellnessAgent.js` | Health connect, vitals, mood summary | **MERGE** into `AppCapability` (Health domain) |
| `ProactiveAgent` | `services/jarvis/agent/specialized/ProactiveAgent.js` | Proactive life recommendations & briefings | **KEEP & INTEGRATE** with Context Fabric |

---

## C. Existing Provider Architecture

- **`AIModelRouter.js`**: Role-based model abstraction (`FAST_MODEL`, `STRONG_REASONING_MODEL`, `REALTIME_MODEL`, `VISION_MODEL`, `TTS_MODEL`, `DOCUMENT_MODEL`, `SCREEN_MODEL`, etc.).
- **`AIProviderRegistry.js`**: Multi-provider registry tracking health, latency, failure recovery.
- **Providers**: `GeminiProvider.js` (Google GenAI SDK), `OpenAIProvider.js`, `ElevenLabsProvider.js`, `LiveKitProvider.js`.
- **Vision Providers**: `googleVisionProvider.js`, `localOCRProvider.js`, `visionProviderFactory.js`.
- **Audit Decision**: **REFACTOR** into `JarvisModelFabric` which wraps `AIModelRouter` and introduces local model detection (`isLocalModelAvailable()`), privacy-aware routing (`JarvisPrivacyRouter`), and on-device capability detection.

---

## D. Existing Memory & Context Architecture

- **`ActiveTaskManager.js`**: Tracks active tasks in memory with MySQL persistence in `ai_active_tasks`. Supports entity references, timestamps, expiry, and multi-turn mutations.
- **`ContextEngine.js`**: Assembles 10 parallel context sources (Schedule, Memory, Conversation, Wellness, Medication, Family, Documents, Health Trends, Workflows).
- **`personalKnowledgeGraph.js`**: In-memory Map of entity relationships (unpersisted, single-tenant Map).
- **`VisualMemoryManager.js`**: Persists visual descriptions in `ai_memories` with `VISUAL_MEMORY` tag.
- **`MultimodalContextManager.js`**: In-memory active visual cache (TTL 5 minutes).
- **Audit Decision**: **MERGE** into `JarvisContextFabric` and `JarvisWorldModel`. The unpersisted `personalKnowledgeGraph` must be backed by persistent user-isolated entities and relationships.

---

## E. Existing Action & Tool Architecture

- **`toolRegistry.js`**: Singleton registry with 50+ tools across schedule, medication, wellness, journal, memory, preferences, family, documents, health, device, current information, workflows, multimodal.
- **`actions/`**:
  - `ActionPlan.js`: Plan structure.
  - `AgentExecutionEngine.js`: Step executor.
  - `EntityResolver.js`: Matches entities (events/reminders) against active task and database.
  - `PermissionManager.js`: Checks user permission state (`ai_action_permissions`).
  - `RiskClassifier.js`: 4-level risk matrix (`LEVEL_0_READ_ONLY`, `LEVEL_1_LOW_RISK_REVERSIBLE`, `LEVEL_2_MODIFICATION`, `LEVEL_3_DESTRUCTIVE_SENSITIVE`).
- **Audit Decision**: **REFACTOR & MOVE** into `JarvisCapabilityRegistry`, `JarvisIntentFabric`, `JarvisActionEngine`, and `JarvisPermissionManager`.

---

## F. Existing Android Integration

- **`MainActivity.kt`**: 1289 lines of Kotlin handling MethodChannel `com.example.wellwisher/jarvis_native`.
- Features supported:
  - App launch with dynamic package resolution & foreground verification.
  - Device alarm creation via `android.provider.AlarmClock`.
  - Calendar CRUD via `CalendarContract.Events`.
  - Phone dialing (`Intent.ACTION_DIAL`) and SMS (`Intent.ACTION_SENDTO`).
  - Screen capture via `decorView.rootView.draw`.
  - Camera photo capture via `ACTION_IMAGE_CAPTURE`.
  - Exact reminder alarms via `JarvisReminderManager` & `AlarmManager`.
  - Health Connect daily snapshots, steps, heart rate, calories, blood pressure, sleep, workouts.
  - System settings navigation (Wi-Fi, Bluetooth, Apps, Display, Battery).
  - RoleManager Assistant verification (`ROLE_ASSISTANT`).
- **Audit Decision**: **KEEP & EXPAND** with typed bridge interface (`JarvisAndroidSystemBridge`), supporting structured operation responses and accessibility action fallback.

---

## G. Existing VoiceInteractionService

- **`JarvisVoiceInteractionService.kt`**: Android system VoiceInteractionService declaration.
- **`JarvisVoiceInteractionSession.kt`**: Manages invocation events (`onShow`, `onHide`, `onDestroy`) and triggers `JarvisVoiceService` or `MainActivity`.
- **`JarvisVoiceInteractionSessionService.kt`**: Service lifecycle for session.
- **`JarvisAssistantService.kt`**: Standalone foreground assistant service.
- **Audit Decision**: **KEEP**. Expand `JarvisVoiceInteractionSession.kt` to handle `onHandleScreenshot` and `onHandleAssist` for native Android screen awareness.

---

## H. Existing Wake-Word Implementation

- **`WakeWordManager.kt`**: On-device keyword recognizer using Android `SpeechRecognizer` + `AudioRecord` VAD.
- Wake phrase: `"hey jarvis"` / `"jarvis"`.
- Runs inside `JarvisVoiceService` foreground service with `FOREGROUND_SERVICE_MICROPHONE`.
- Audio focus management with barge-in support.
- **Audit Decision**: **KEEP**. Seamlessly route wake-word activation events into `JarvisPerceptionFabric`.

---

## I. Existing Screen & Vision Implementation

- **`MultimodalInput.js`**: Validates MIME types, byte limits (10MB image, 20MB doc).
- **`MultimodalPromptGuard.js`**: Sanitizes OCR and screen text to prevent prompt injection attacks.
- **`HealthVisualSafetyGuard.js`**: Protects against unauthorized clinical conclusions or medical dosages from vision.
- **`VisualMemoryManager.js`**: Semantic storage of visual observations.
- **`MainActivity.kt:captureScreenContext`**: Takes in-app window bitmap and converts to base64.
- **Audit Decision**: **KEEP & EXPAND** into `JarvisScreenContext` and `JarvisPerceptionFabric`.

---

## J. Existing Proactive Intelligence

- **`backend/services/jarvis/proactive/`**:
  - `proactiveEngine.js`: Generates morning briefings, evening summaries, health nudges, task deadlines.
  - Respects quiet hours (`ai_preferences`), notification frequency, and deduplication.
- **Audit Decision**: **KEEP**. Feed proactive events through the OS Core context snapshot.

---

## K. Existing Workflows

- **`appointmentWorkflowEngine.js`**, **`doctorVisitWorkflowEngine.js`**, **`medicationWorkflowEngine.js`**, **`workflowSupervisor.js`**.
- Multi-step state machines persisted in `ai_workflow_actions` and `ai_appointments`.
- **Audit Decision**: **KEEP & MERGE** into `AppCapability` (Workflow domain).

---

## L. Existing Verification

- **`WorkflowVerifier.js`** (agent), **`workflowVerifier.js`** (workflow), **`actionVerifier.js`**, **`agentVerifier.js`**, **`DeviceVerificationService.js`**.
- Overlapping verification logic exists across 5 different files.
- **Audit Decision**: **MERGE & UNIFY** into `JarvisVerificationEngine.js` in `backend/services/jarvis/os/`.

---

## M. Existing Security

- JWT Authentication middleware (`verifyToken`).
- User Isolation (`user_id` enforced on all database queries and repository methods).
- Replay Protection (Nonce validation and 5-minute timestamp skew in `VoiceCommandRouter`).
- Prompt Injection Defense (`MultimodalPromptGuard` neutralizing instructional text from external documents/screens).
- Clinical Safety Guard (`HealthVisualSafetyGuard`).
- 4-Level Action Risk Matrix with mandatory user confirmation on Level 3 mutations.
- **Audit Decision**: **KEEP & STRENGTHEN** in `JarvisPermissionManager` and `JarvisPrivacyRouter`.

---

## N. Existing Database Tables

The database contains 36 tables in `schema.sql`:
- **Core**: `users`, `routine_templates`, `routines`, `screen_care_settings`, `family_members`, `hydration_logs`, `sleep_mood_logs`, `medications`, `vitals_logs`, `journal_logs`.
- **JARVIS AI**: `ai_conversations`, `ai_conversation_messages`, `ai_memories`, `ai_preferences`, `ai_action_permissions`, `ai_agent_runs`, `ai_agent_steps`, `ai_proactive_events`, `ai_behavior_patterns`, `ai_personal_profiles`.
- **Multimodal & Docs**: `ai_documents`, `ai_document_pages`, `ai_document_extractions`, `ai_document_summaries`, `ai_health_trends`, `ai_health_alerts`, `ai_doctor_briefings`, `ai_appointments`, `ai_workflow_actions`.
- **Active Tasks & Devices**: `ai_active_tasks`, `ai_idempotency_keys`, `jarvis_devices`, `jarvis_tasks`, `jarvis_execution_runs`, `jarvis_notifications`.
- **Phase 7 OS Additions**: Add `jarvis_entities` and `jarvis_entity_relations` for persistent semantic entities and world modeling.

---

## O. Existing Flutter UI

- Voice HUD with Orb animations (`jarvis_orb.dart`, `jarvis_waveform.dart`).
- Diagnostic and capability status screen (`jarvis_voice_diagnostics_screen.dart`).
- Personal memory inspector (`jarvis_memories_screen.dart`).
- Proactive intelligence feed (`jarvis_proactive_screen.dart`).
- Health dashboard (`jarvis_health_dashboard_screen.dart`).
- Permissions center (`jarvis_permission_center_screen.dart`).
- **Audit Decision**: **KEEP** presentation layer; add **JARVIS OS Capability Center** diagnostic dashboard reflecting live Android OS capabilities.

---

## P. Existing Duplicated Responsibilities

1. **Orchestrators**:
   - `JarvisMasterOrchestrator` vs `JarvisSupervisorAgent` vs `JarvisAgent`.
   - *Fix*: `JarvisOSCore` becomes the single high-level operating layer; `JarvisMasterOrchestrator` delegates directly to `JarvisOSCore`.
2. **Verifiers**:
   - `WorkflowVerifier.js` vs `actionVerifier.js` vs `DeviceVerificationService.js` vs `workflowVerifier.js`.
   - *Fix*: Merge into unified `JarvisVerificationEngine`.
3. **Entity Resolvers**:
   - `EntityResolver.js` (actions) vs `FollowUpResolutionAgent.js` (agent) vs `ConversationAgent.js` (multi-turn).
   - *Fix*: Unify under `JarvisEntityResolver` and `JarvisReferenceResolver`.
4. **Tool Execution vs Action Execution**:
   - `ToolExecutionAgent.js` vs `AgentExecutionEngine.js` vs `AgentExecutor.js`.
   - *Fix*: Unify under `JarvisActionEngine` and `JarvisCapabilityRegistry`.

---

## Q. Existing Mocks / Fallbacks

1. `calendarProvider.js`: Contains `defaultMockCalendarProvider` and `GoogleCalendarProvider` delegating to in-memory mock.
   - *Action*: Deprecate mock provider; wire calendar domain exclusively to authoritative MySQL `routines` / `CalendarService` and Android `CalendarContract`.
2. In-memory `personalKnowledgeGraph.js`: Single-tenant Map without persistence.
   - *Action*: Refactor to back relations with MySQL persistence (`jarvis_entities`, `jarvis_entity_relations`).

---

## R. Technical Debt & Safety Invariants

- Ensure `dev_token` never bypasses production authentication (only permitted in explicit negative security tests).
- Ensure `userId` is never hardcoded to `1` in production execution paths.
- Ensure that if an Android native capability is unsupported or unavailable on the physical device (e.g. Health Connect without permissions, dialer without telephony), it returns `PERMISSION_REQUIRED` or `UNSUPPORTED` rather than pretending success.

---

## S. Component Migration Matrix

| Component | Current Path | Decision | Target Path / Destination | Migration Strategy |
|---|---|---|---|---|
| `JarvisMasterOrchestrator` | `services/jarvis/orchestrator/JarvisMasterOrchestrator.js` | **MERGE** | `services/jarvis/os/JarvisOSCore.js` | Wraps OS Core; preserves API signature |
| `JarvisSupervisorAgent` | `services/jarvis/agent/JarvisSupervisorAgent.js` | **REFACTOR** | `services/jarvis/os/JarvisSystemOrchestrator.js` | Delegates to IntentFabric, ContextFabric, CapabilityRegistry |
| `JarvisAgent` | `services/jarvis/agent/jarvisAgent.js` | **DEPRECATE** | `services/jarvis/os/JarvisOSCore.js` | Kept as legacy facade routing to OS Core |
| `AIModelRouter` | `services/jarvis/providers/AIModelRouter.js` | **REFACTOR** | `services/jarvis/os/JarvisModelFabric.js` | Encapsulated within ModelFabric |
| `AIProviderRegistry` | `services/jarvis/providers/AIProviderRegistry.js` | **KEEP** | `services/jarvis/providers/AIProviderRegistry.js` | Maintained as underlying provider registry |
| `ContextEngine` | `services/jarvis/context/contextEngine.js` | **MERGE** | `services/jarvis/os/JarvisContextFabric.js` | Enhanced with unified `JarvisContextSnapshot` |
| `personalKnowledgeGraph` | `services/jarvis/context/personalKnowledgeGraph.js` | **REFACTOR** | `services/jarvis/os/JarvisWorldModel.js` | Backed by persistent relational entities |
| `EntityResolver` | `services/jarvis/actions/EntityResolver.js` | **MERGE** | `services/jarvis/os/JarvisEntityResolver.js` | Contextual entity resolver with confidence & provenance |
| `FollowUpResolutionAgent` | `services/jarvis/agent/specialized/FollowUpResolutionAgent.js` | **MERGE** | `services/jarvis/os/JarvisReferenceResolver.js` | Resolves pronouns, relative times, ordinal references |
| `RiskClassifier` | `services/jarvis/actions/RiskClassifier.js` | **MOVE** | `services/jarvis/os/JarvisPermissionManager.js` | Integrated with 4-level safety policies |
| `PermissionManager` | `services/jarvis/actions/PermissionManager.js` | **MERGE** | `services/jarvis/os/JarvisPermissionManager.js` | Enforces dynamic permissions & risk authorization |
| `WorkflowVerifier` & `actionVerifier` | `services/jarvis/agent/` & `services/jarvis/workflow/` | **MERGE** | `services/jarvis/os/JarvisVerificationEngine.js` | Single authoritative verifier |
| `toolRegistry` & `deviceTools` | `services/jarvis/tools/` | **REFACTOR** | `services/jarvis/os/JarvisCapabilityRegistry.js` | Universal capability registry across 20+ domains |
| `ApplicationResolver` | `services/jarvis/platform/ApplicationResolver.js` | **MOVE** | `services/jarvis/apps/AppResolver.js` | Integrated into App Capability Framework |
| `defaultMockCalendarProvider` | `services/jarvis/integrations/calendarProvider.js` | **DEPRECATE** | `services/jarvis/integrations/calendarService.js` | Replaced by authoritative DB & Android Calendar |
