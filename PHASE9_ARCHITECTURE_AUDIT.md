# PHASE 9: ARCHITECTURE AUDIT & CAPABILITY ECOSYSTEM ANALYSIS
**Universal Android App Intent & Capability Ecosystem**
**Document Version:** 1.0.0  
**Date:** 2026-10-05  
**System Under Audit:** WellWisher → JARVIS AI Operating System Layer (Phase 7 / 7.1 / 8 Baseline)  
**Target Hardware:** Realme RMX3840 (Realme 12 Pro+ 5G, Android 16 / API 36, Device ID `bdbf8c9b`)

---

## 1. Executive Summary & Objective

This repository audit establishes the architectural baseline of the JARVIS OS Core following the successful completion and physical validation of Phase 7 (Universal Intelligence Fabric) and Phase 8 (Personal World Model & Conversational Memory).

The primary objective of Phase 9 is to evolve JARVIS from a personal conversational AI layer into a **Universal Android App Intent & Capability Ecosystem**. 
JARVIS must understand:
1. **WHAT** the user intends to achieve (Domain & Intent).
2. **WHICH** installed application or Android system capability can satisfy that goal (Package, Activity, Capability Contract).
3. **HOW** to invoke it safely using standard, supported Android mechanisms (Explicit Intents, `ACTION_VIEW`, `ACTION_SEND`, `ACTION_DIAL`, `ACTION_IMAGE_CAPTURE`, Settings intents, etc.).
4. **HOW** to authoritatively verify that the requested real-world state actually changed (WindowManager focus check, foreground verification, database/alarm verification) without false success claims.

---

## 2. Existing Architecture & Reusable Components

The existing Phase 7 and Phase 8 architecture provides a rock-solid foundation:

```
USER INPUT (Voice / Text / Screen / Camera)
    │
    ▼
[JarvisPerceptionFabric] ──────── Modality Normalization (Voice/Text/Vision)
    │
    ▼
[JarvisContextFabric] ────────── Multi-source Context Snapshot (Device, Screen, Task, Memory)
    │
    ▼
[JarvisConversationState] ────── Durable Multi-turn Entity Locking & Session Graph
    │
    ▼
[JarvisReferenceResolver] ────── Deterministic Ordinal/Pronoun/Follow-up Resolution
    │
    ▼
[JarvisIntentFabric] ─────────── 20+ Intent Domains, Risk Ratings (0–3), Policies
    │
    ▼
[JarvisCapabilityResolver] ───── (Currently a stub; targets enhancement in Phase 9)
    │
    ▼
[JarvisActionEngine] ─────────── Safety Authorization & Execution Runtime
    │
    ▼
[JarvisAndroidSystemBridge] ──── Native Android Intent & Telemetry Bridge
    │
    ▼
[JarvisVerificationEngine] ───── Direct MySQL & Native WindowManager State Verification
    │
    ▼
[JarvisWorldModel] ───────────── 17 Entity Types, 19 Relationship Types
    │
    ▼
[JarvisResponse] ─────────────── Natural Spoken / Visual Feedback
```

### Component Inventory & Phase 9 Roles

| Component | Location | Current State (Phase 8 Baseline) | Reusability in Phase 9 |
|---|---|---|---|
| `JarvisOSCore` | `backend/services/jarvis/os/JarvisOSCore.js` | Top-level facade receiving `JarvisRequest`, generating correlation ID, delegating to orchestrator, returning `JarvisExecutionResult`. | **100% Reusable**. Keep top-level contract intact. |
| `JarvisSystemOrchestrator` | `backend/services/jarvis/os/JarvisSystemOrchestrator.js` | Coordinates reference resolution, perception, context, action engine, and supervisor. | **Extend cleanly**: Hook capability resolution pipeline between intent and action engine. |
| `JarvisIntentFabric` | `backend/services/jarvis/os/JarvisIntentFabric.js` | Declares standardized intents across 20+ domains (`SYSTEM`, `DEVICE`, `COMMUNICATION`, `NAVIGATION`, etc.). | **100% Reusable**: Add new intent definitions for media, share, maps, and system settings. |
| `JarvisCapabilityRegistry` | `backend/services/jarvis/os/JarvisCapabilityRegistry.js` | Authoritative registry of executable actions, permissions, risks, and platform mapping (`ANDROID` vs `BACKEND`). | **Extend cleanly**: Ingest dynamic app capabilities from `JarvisAndroidAppRegistry`. |
| `JarvisCapabilityResolver` | `backend/services/jarvis/os/JarvisCapabilityResolver.js` | Stub resolving intent name to capability. | **Primary Extension Point**: Transform into full multi-candidate resolution engine. |
| `JarvisActionEngine` | `backend/services/jarvis/os/JarvisActionEngine.js` | Validates, authorizes via `PermissionManager`, checks risk, executes, and verifies actions. | **Extend cleanly**: Connect to `JarvisAndroidCapabilityBridge` for native execution. |
| `JarvisVerificationEngine` | `backend/services/jarvis/os/JarvisVerificationEngine.js` | Authoritatively verifies calendar mutations, deletions, and native app launches. | **Extend cleanly**: Add verification strategies for settings, calls, SMS, media, and navigation. |
| `JarvisConversationState` | `backend/services/jarvis/os/JarvisConversationState.js` | Durable in-memory + MySQL conversation state with entity locking. | **100% Reusable**: Add separate `activeApplication` tracking without disturbing `activeEntity`. |
| `JarvisReferenceResolver` | `backend/services/jarvis/os/JarvisReferenceResolver.js` | Deterministic resolution of ordinals, pronouns, relative reminders, and cancellations. | **100% Reusable**: Preserve Phase 8 regression fix without modification. |
| `JarvisWorldModel` | `backend/services/jarvis/os/JarvisWorldModel.js` | Graph model in MySQL `jarvis_entities` & `jarvis_entity_relations`. | **Extend cleanly**: Add entity types `APP_CAPABILITY`, `APP_ACTION`, `SCREEN`, `SCREEN_ELEMENT`, `DEVICE_STATE`. |
| `JarvisPrivacyRouter` | `backend/services/jarvis/os/JarvisPrivacyRouter.js` | Evaluates data sensitivity and routes computation. | **Extend cleanly**: Support `AUTHORIZED_APP`, `PRIVATE_DEVICE`, and content-transfer scrutiny. |
| `JarvisAndroidSystemBridge.kt` | `frontend/android/.../jarvis/JarvisAndroidSystemBridge.kt` | Native Kotlin bridge executing `openApplication`, `launchIntent`, `openSettings`, `setAlarm`, `makeCall`, `sendSms`. | **Extend cleanly**: Add package scanning, capability discovery, and foreground verification. |
| `JarvisVoiceInteractionSession.kt` | `frontend/android/.../JarvisVoiceInteractionSession.kt` | Native assistant session with `onHandleScreenshot` and `onHandleAssist`. | **100% Reusable**: Feeds assist package and screen context into perception. |

---

## 3. Current Capability & Verification Model

### 3.1 Existing App Resolution (`AppResolver.js`)
Currently, `AppResolver.js` relies on a static lookup table of 13 known packages (`whatsapp`, `youtube`, `maps`, `chrome`, `gmail`, `camera`, `settings`, `phone`, `messages`, `spotify`, `photos`, `clock`, `calculator`).
**Limitations:**
1. It does not scan installed packages dynamically via Android package-visibility rules.
2. It assumes that if an app is in the dictionary, it can perform any related action.
3. It lacks explicit capability contracts (e.g. distinguishing `APP.OPEN` from `COMMUNICATION.MESSAGE` or `NAVIGATION.DIRECTIONS`).
4. It does not track availability states (`AVAILABLE`, `REQUIRES_PERMISSION`, `REQUIRES_USER_ACTION`, `UNSUPPORTED`, `BLOCKED`, `UNKNOWN`).

### 3.2 Existing Verification Model (`JarvisVerificationEngine.js`)
Currently, `JarvisVerificationEngine.js` verifies:
- Calendar creation, update, and cancellation via direct MySQL queries to `routines`.
- App launch via `executionResult.verified === true` (checking `mCurrentFocus` / `topActivityPkg`).
**Limitations:**
- Does not yet verify settings launches (`android.settings.*`).
- Does not verify dialer or SMS intent dispatches (`ACTION_DIAL`, `ACTION_SENDTO`).
- Does not verify navigation launches (`geo:` / Google Maps intents).
- Does not distinguish between composed, sent, and delivered states for messages.

---

## 4. Current Android Bridge Architecture

The Android layer currently comprises:
1. `JarvisVoiceInteractionService.kt`: Registered as the default digital assistant service in Android Settings.
2. `JarvisVoiceInteractionSession.kt`: Captures assist structure, target activity component, and on-screen screenshots.
3. `JarvisAndroidSystemBridge.kt`: Contains explicit methods (`openApplication`, `launchIntent`, `openSettings`, `setAlarm`, `makeCall`, `sendSms`, `getDeviceState`).
4. `MainActivity.kt`: MethodChannel handler (`com.example.wellwisher/jarvis_native`) bridging Flutter to native Kotlin.

**Gaps Identified in Bridge:**
- The bridge has `openApplication` and `launchIntent` in `JarvisAndroidSystemBridge.kt`, but `MainActivity.kt`'s `MethodCallHandler` did not fully expose `openApplication`, `launchIntent`, or `getInstalledApplications` to Flutter!
- There is no dynamic package scanning method to return all installed apps matching launcher intent filters (`Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)`).

---

## 5. Missing Functionality to be Implemented in Phase 9

1. **Universal App Registry (`JarvisAndroidAppRegistry.js`)**:
   - Dynamic discovery of installed applications visible under Android package visibility rules.
   - Storage of application metadata (`packageName`, `applicationLabel`, `versionName`, `versionCode`, `launchable`, `systemApp`, `permissions`, `supportedCapabilities`, `confidence`, `provenance`).
   - Semantic alias resolution (e.g., "my messages" → Messages, "web" → Chrome, "navigation" → Maps) without overriding explicit intent.
   - Capability status tracking: `AVAILABLE`, `REQUIRES_PERMISSION`, `REQUIRES_USER_ACTION`, `UNSUPPORTED`, `BLOCKED`, `UNKNOWN`.

2. **App Capability Contract (`JarvisAppCapabilityContract.js`)**:
   - Formal typed contract for every app capability: `capabilityId`, `domain`, `appPackage`, `action`, `description`, `requiredPermissions`, `invocationMethod`, `inputSchema`, `outputSchema`, `confirmationRequired`, `riskLevel`, `verificationStrategy`, `privacyLevel`.

3. **Capability Resolution Engine (`JarvisCapabilityResolver.js`)**:
   - Deterministic engine resolving `Intent + Context + WorldModel + InstalledApps + Permissions + PrivacyPolicy + SafetyPolicy` into a concrete `CapabilityResolution`.
   - Disambiguation logic for multi-candidate queries (*"Send a message to Arun"* → Ask *"Which app should I use — WhatsApp or SMS?"*).
   - "Can you do this?" query evaluation (*"Can you send a WhatsApp message?"* → evaluates installed capabilities and reports truth).

4. **Android Capability Bridge (`JarvisAndroidCapabilityBridge.js`)**:
   - Backend adapter providing safe intent construction (`ACTION_VIEW`, `ACTION_SEND`, `ACTION_DIAL`, `ACTION_SENDTO`, `ACTION_IMAGE_CAPTURE`, settings intents, browser intents, navigation intents).
   - Native execution dispatcher via ADB or Flutter MethodChannel.
   - Strict controlled boundary for accessibility actions (no arbitrary LLM accessibility command execution).

5. **App-Aware Context & World Model Extension**:
   - `JarvisContextSnapshot`: add `currentApp`, `previousApp`, `recentApps`, `activeCapability`, `lastAppAction`.
   - Strictly decouple `activeApplication` from `activeEntity` so launching an app does NOT drop conversational entity locks (such as the second meeting).
   - `JarvisWorldModel`: add `APP_CAPABILITY`, `APP_ACTION`, `SCREEN`, `SCREEN_ELEMENT`, `DEVICE_STATE` and relations (`INSTALLED_APPLICATION`, `PROVIDES_CAPABILITY`, `CURRENTLY_ACTIVE`, `RECENTLY_USED`).

6. **Action Verification & Failure Handling**:
   - Verification strategies for every external action (foreground package check, settings activity, call intent, maps intent).
   - Honest failure responses (e.g., *"Telegram isn't installed on this device"*, *"I can make calls, but Phone permission is currently disabled"*).
   - Fast offline path for simple commands (*"Open WhatsApp"* executes in <25ms without cloud LLM).

7. **Flutter Diagnostic UI & Kotlin Bridge Enhancements**:
   - Wire `getInstalledApplications`, `openApplication`, `launchIntent` in `MainActivity.kt`.
   - Add `Jarvis Capability Center` screen in Flutter for developer/user diagnostics.

---

## 6. Proposed Integration Points

```
[Raw User Request]
        │
        ▼
1. JarvisReferenceResolver ──► Quick Checks ("stop", "actually make it 5", "cancel that")
        │
        ▼ (If not reference)
2. JarvisPerceptionFabric ──► Multimodal / Text Perception
        │
        ▼
3. JarvisContextFabric ──────► Bounded Context Graph (App, Screen, Device, Memory, Entities)
        │
        ▼
4. JarvisAndroidAppRegistry ─► Local Deterministic App/Alias Matcher (Fast Path: "Open WhatsApp")
        │                      If fast-path matched: bypass cloud LLM!
        ▼
5. JarvisIntentFabric ───────► Standardized Intent Classification
        │
        ▼
6. JarvisCapabilityResolver ─► Match Intent to App/System Capabilities (WhatsApp, SMS, Maps, Settings)
        │                      Check Permissions, Privacy, Multi-candidate Disambiguation
        ▼
7. JarvisPrivacyRouter & ────► Enforce Level 0/1/2/3 Risk Policies & Confirmation Tokens
   PermissionManager
        │
        ▼
8. JarvisActionEngine ───────► Dispatch via JarvisAndroidCapabilityBridge
        │                      (Explicit Intent / Launch / ADB / Native)
        ▼
9. JarvisVerificationEngine ─► Verify Foreground Focus / WindowManager / DB State
        │
        ▼
10. JarvisWorldModel & ──────► Update App State, Provenance, and Conversation Focus
    ConversationState          (activeApplication updated; activeEntity preserved!)
        │
        ▼
11. Natural Response Output
```

---

## 7. Audit Sign-off

- Existing Phase 7 & 8 systems are fully cataloged and preserved.
- Zero existing architectures will be replaced.
- The Phase 8 multi-turn entity lock fix (`second meeting -> 4 PM -> 5 PM -> remind -> cancel reminder`) will remain actively regression-tested.
- The audit is complete. Phase 9 implementation may proceed.
