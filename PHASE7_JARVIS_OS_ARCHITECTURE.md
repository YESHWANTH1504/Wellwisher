# PHASE 7: JARVIS OS CORE & UNIVERSAL INTELLIGENCE FABRIC ARCHITECTURE

## 1. Executive Architectural Overview

JARVIS is transformed from an application-level conversational assistant into an authoritative **Android AI Operating-System Layer**. Inspired by the architectural principles of modern on-device and cloud foundation intelligence (such as Apple Intelligence / Siri), this architecture achieves unified intelligence across multimodal perception, persistent world-model knowledge, privacy-first model routing, universal intent registration, trusted capability execution, and anti-fabrication verification on Android.

```
                    USER
                      |
          Voice / Text / Vision / Touch
                      |
                      v
             JARVIS PERCEPTION
                      |
        +-------------+-------------+
        |             |             |
      Voice         Vision        Screen
        |             |             |
        +-------------+-------------+
                      |
                      v
              CONTEXT FABRIC
                      |
        +-------------+-------------+
        |             |             |
     Memory        World Model    Current State
        |             |             |
        +-------------+-------------+
                      |
                      v
               MODEL FABRIC
                      |
        +-------------+-------------+
        |             |             |
     On-device      Cloud        Realtime
        |             |             |
        +-------------+-------------+
                      |
                      v
             JARVIS OS CORE
                      |
        +-------------+-------------+
        |             |             |
      Intent       Capability      Planner
      Fabric       Registry
        |             |             |
        +-------------+-------------+
                      |
                      v
               ACTION ENGINE
                      |
       +------+------+------+------+------+
       |      |      |      |      |      |
     Android Apps Calendar Health Device Web
       |      |      |      |      |      |
       +------+------+------+------+------+
                      |
                      v
                 VERIFIER
                      |
                      v
              REAL WORLD STATE
                      |
                      v
                  MEMORY
                      |
                      v
                  RESPONSE
```

---

## 2. Core OS Components

### 2.1 JarvisOSCore (`backend/services/jarvis/os/JarvisOSCore.js`)
The authoritative high-level operating layer for all incoming requests (`JarvisRequest`).
- **Input**: `JarvisRequest` (userId, sessionId, text, modality, screenContext, visualInputs, telemetry)
- **Lifecycle Pipeline**:
  1. Receive request & validate authenticated user.
  2. Identify input modality (`VOICE`, `TEXT`, `VISION`, `SCREEN`, `SYSTEM`).
  3. Gather bounded personal context snapshot via `ContextFabric`.
  4. Contextual reference & entity resolution via `ReferenceResolver` & `EntityResolver`.
  5. Intent classification via `IntentFabric`.
  6. Privacy routing via `PrivacyRouter` (`LOCAL_ONLY`, `LOCAL_PREFERRED`, `CLOUD_ALLOWED`, `USER_CONFIRMATION_REQUIRED`).
  7. Model selection via `ModelFabric` based on task complexity, privacy tier, network state, and multimodal requirements.
  8. Safety & authorization check via `PermissionManager` (4-level risk matrix).
  9. Execution runtime tracking via `ExecutionRuntime` & `ActionEngine`.
  10. Observation and strict verification via `VerificationEngine`.
  11. State persistence to `WorldModel` knowledge graph & active task state.
  12. Natural speech & structured response generation (`JarvisExecutionResult`).

### 2.2 Universal Intent Fabric (`backend/services/jarvis/os/JarvisIntentFabric.js`)
Standardized intent schema across 20+ functional domains:
- Domains: `SYSTEM`, `DEVICE`, `COMMUNICATION`, `CALENDAR`, `REMINDERS`, `HEALTH`, `VISION`, `SCREEN`, `MEDIA`, `LOCATION`, `NAVIGATION`, `DOCUMENTS`, `FILES`, `WEB`, `PRODUCTIVITY`, `WORKFLOW`, `NOTIFICATIONS`, `CONTACTS`, `CAMERA`, `AUDIO`, `ACCESSIBILITY`.
- Every intent declares:
  - `id`, `name`, `description`, `domain`
  - `parameters` schema
  - `entities` extracted
  - `riskLevel` (0 = Read-only, 1 = Low-risk reversible, 2 = Sensitive modifying, 3 = Destructive/financial)
  - `confirmationPolicy` (`NEVER`, `CONFIRM_IF_SENSITIVE`, `ALWAYS_REQUIRED`)
  - `requiredPermissions`
  - `executionCapability`, `verificationCapability`, `rollbackCapability`
  - `timeoutMs`, `idempotent`

### 2.3 Universal Capability Registry & Resolver
- **`JarvisCapabilityRegistry.js`**: Universal catalog registering all 50+ existing Phase 1-6 tools and Android native capabilities.
  - Dynamically evaluates availability (`AVAILABLE`, `UNSUPPORTED`, `PERMISSION_REQUIRED`, `DEVICE_LIMITATION`, `NETWORK_REQUIRED`, `PROVIDER_UNAVAILABLE`).
  - Supports permission aliasing between Android runtime permissions (`READ_CALENDAR`, `READ_CONTACTS`, `CALL_PHONE`, `SEND_SMS`) and internal capability keys.
- **`JarvisCapabilityResolver.js`**: Deterministically resolves model proposed intents to trusted capabilities. The LLM is strictly prohibited from invoking arbitrary code or APIs directly.

### 2.4 Personal Context Fabric (`backend/services/jarvis/os/JarvisContextFabric.js`)
Unified aggregation of:
- Personal context & active conversational history
- Working memory and long-term memory facts
- Authoritative daily agenda and routines from MySQL
- Health metrics and vital trends
- Device telemetry (battery, network, wakefulness)
- On-screen context snapshot
- Provenance and freshness timestamps on every datum

### 2.5 Personal World Model (`backend/services/jarvis/os/JarvisWorldModel.js`)
Persistent semantic knowledge graph backed by dedicated relational tables:
- `jarvis_entities`: Stable ID, user isolation, type (`PERSON`, `CONTACT`, `CALENDAR_EVENT`, `APPLICATION`, `DOCUMENT`, `DEVICE`, `HEALTH_RECORD`), display name, aliases, properties, privacy level, confidence.
- `jarvis_entity_relations`: Directed relations (`USER -> PERSON`, `PERSON -> CONTACT`, `TASK -> EVENT`, `EVENT -> PARTICIPANT`) with confidence and properties.

### 2.6 Entity & Reference Resolvers
- **`JarvisEntityResolver.js`**: Contextual resolution of pronouns ("that", "it"), ordinals ("the second one", "the first item"), and named individuals via relational lookup rather than naive regex matching.
- **`JarvisReferenceResolver.js`**: Fast-path conversational reference shifts ("actually make that 9 PM", "cancel that", "stop").

### 2.7 Model Fabric & Privacy Router
- **`JarvisModelFabric.js`**: Provider abstraction covering `LOCAL_FAST` (Android AICore/Nano), `LOCAL_REASONING`, `CLOUD_FAST`, `CLOUD_REASONING` (Gemini), `VISION`, `REALTIME`, `TRANSCRIPTION`, `TTS`, and `EMBEDDING`.
- **`JarvisPrivacyRouter.js`**: Enforces zero unconsented data leakage. Sensitive credentials, local sensor payloads, and medical vitals are governed by strict classification tiers.

### 2.8 Action Engine & Verification Engine
- **`JarvisActionEngine.js`**: Enforces the 14-stage execution lifecycle (`PROPOSED -> VALIDATING -> AWAITING_PERMISSION -> AWAITING_CONFIRMATION -> AUTHORIZED -> EXECUTING -> OBSERVING -> VERIFYING -> SUCCEEDED / FAILED / ROLLED_BACK`).
- **`JarvisVerificationEngine.js`**: Verifies mutations against real world state. Validates database row insertion/updates, Android package foreground transitions, and device telemetry. Strictly rejects zero-fabrication.

### 2.9 Native Android System Bridge (`JarvisAndroidSystemBridge.kt`)
Typed Kotlin bridge exposing:
- `openApplication(packageName, appName)` with foreground focus verification
- `getDeviceState()` (battery, charging, network, orientation, assistant role)
- `launchIntent(action, uri, extras)`
- `getCurrentApplication()`
- Voice interaction assist window hooks (`onHandleScreenshot`, `onHandleAssist`) in `JarvisVoiceInteractionSession.kt`.

---

## 3. Strict Safety & Anti-Fabrication Guarantees
1. **No Code Execution by LLM**: Models propose structured intent JSON; only verified capability executors run.
2. **Deterministic Confirmation Tokens**: Risk Level 2 & 3 operations require explicit user approval tokens.
3. **Prompt Injection Defense**: Untrusted external inputs (OCR, documents, screen text) are encapsulated in untrusted data delimiters and prohibited from overriding system policies.
4. **Physical Device Grounding**: Capabilities report accurate statuses (`PERMISSION_REQUIRED`, `UNSUPPORTED`) rather than simulated success.
