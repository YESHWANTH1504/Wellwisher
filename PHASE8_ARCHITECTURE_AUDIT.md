# PHASE 8 ARCHITECTURE AUDIT & EXECUTION TRACE
**Document Version:** 1.0.0  
**Date:** 2026-10-05  
**System Under Audit:** WellWisher → JARVIS AI Operating System (Phase 7 / 7.1 Baseline)  
**Target Hardware:** Realme RMX3840 (Realme 12 Pro+ 5G, Android 16 / API 36, Device ID `bdbf8c9b`)  

---

## 1. Executive Summary & Objective

This repository audit establishes the architectural baseline of the WellWisher/JARVIS OS Core following the physical acceptance of Phase 7 and Phase 7.1. 

The primary objective of Phase 8 is to evolve JARVIS from an assistant responding to individual commands into a **Personal World Model & Semantic Intelligence OS layer** capable of understanding persistent entities, relationships, temporal context, memory provenance, and multi-turn conversational locks.

Before introducing new intelligence, this audit documents the exact line-by-line cause of the critical conversational failure discovered during Phase 7.1:
```
User: "What is the second meeting?"
JARVIS: Returns schedule overview.
User: "Move it to 4 PM."
Observed: Mutated "Wake Up" (07:00 AM / eventsList[0]) instead of "Product Architecture Review" (14:00 PM / candidate[1]).
```

---

## 2. Inventory of Existing Phase 7 & 7.1 Components

The existing architecture consists of the following components in `backend/services/jarvis/`:

| Component | File Path | Role in Phase 7 | Phase 8 Evaluation |
|---|---|---|---|
| **OS Core Entrypoint** | `os/JarvisOSCore.js` | Top-level facade receiving `JarvisRequest`, generating correlation ID, delegating to orchestrator, returning `JarvisExecutionResult`. | Sound; keep unchanged. |
| **System Orchestrator** | `os/JarvisSystemOrchestrator.js` | Coordinates reference resolution, perception, context fabric, model fabric, capability execution, verification, and supervisor. | Needs multi-turn entity lock integration before delegating. |
| **Intent Fabric** | `os/JarvisIntentFabric.js` | Declares system intents across 6 domains with risk ratings (0–3), policies, and capabilities. | Sound; extend with semantic search, entity correction, and temporal intents. |
| **Capability Registry** | `os/JarvisCapabilityRegistry.js` | Registers 50+ executable tools, required permissions, and rollback mechanisms. | Sound; keep intact. |
| **Action Engine** | `os/JarvisActionEngine.js` | Executes registered capabilities with timeout and permission checks. | Sound; preserve safety guarantees. |
| **Verification Engine** | `os/JarvisVerificationEngine.js` | Directly queries MySQL tables (`routines`, `jarvis_entities`) to prevent simulated/fake success. | Sound; keep intact. |
| **Context Fabric** | `os/JarvisContextFabric.js` | Gathers dynamic system context (device state, screen context, active task, routines, memories). | Needs rich Context Graph with freshness, confidence, and world model links. |
| **Entity Resolver** | `os/JarvisEntityResolver.js` | Resolves pronouns and ordinals against `activeTask`. | Flawed: only checks `activeTask` if already present; does not lock entities across subsequent turns. |
| **Reference Resolver** | `os/JarvisReferenceResolver.js` | Fast-path handler for `"stop"`, `"cancel that"`, `"move it to X"`. | Flawed: blindly grabs `activeTask.eventId` (which defaults to first schedule item). |
| **World Model** | `os/JarvisWorldModel.js` | User-isolated graph in MySQL `jarvis_entities` & `jarvis_entity_relations`. | Sound foundation; needs expansion to support 17 entity types and 19 relation types. |
| **Model Fabric & Router** | `os/JarvisModelFabric.js`, `providers/AIModelRouter.js` | Routes tasks across deterministic, local Gemini Nano, cloud Gemini Pro/Flash, and LiveKit. | Sound; preserve privacy routing. |
| **Active Task Manager** | `tasks/ActiveTaskManager.js` | In-memory session task store with fallback to MySQL `ai_active_tasks`. | Lacks persistent semantic entity locking and candidate index durability. |
| **Supervisor Agent** | `agent/JarvisSupervisorAgent.js` | Decomposes complex multi-step user prompts into execution plans. | Hardcodes `activeTask.eventId = eventsList[0].id` upon schedule retrieval. |
| **Follow-Up Agent** | `agent/specialized/FollowUpResolutionAgent.js` | Rule-based resolution for follow-up phrases. | Only handles `move the second meeting`, completely ignores queries like `what is the second meeting`. |

---

## 3. Current State of Storage & Schemas

### 3.1 MySQL Schemas Inspected
- `jarvis_entities`: Columns `id`, `user_id`, `entity_type`, `display_name`, `aliases` (JSON), `properties` (JSON), `confidence`, `privacy_level`, `provenance` (JSON), `created_at`, `updated_at`.
- `jarvis_entity_relations`: Columns `id`, `user_id`, `source_entity_id`, `target_entity_id`, `relation_type`, `metadata` (JSON), `confidence`, `created_at`, `updated_at`.
- `ai_memories`: Columns `id`, `user_id`, `memory_type`, `memory_key`, `memory_value`, `source`, `importance`, `confidence_score`, `evidence_count`, `last_observed_at`, `expires_at`, `source_reference`, `last_accessed_at`, `metadata` (JSON), `created_at`, `updated_at`.
- `ai_active_tasks`: Columns `id`, `user_id`, `session_id`, `task_id`, `task_type`, `status`, `referenced_entity_id`, `referenced_entity_type`, `candidate_entities` (JSON), `current_step`, `original_request`, `latest_request`, `context_metadata`, `version`, `expires_at`.
- `routines`: Columns `id`, `user_id`, `title`, `time`, `date`, `event_type`, `status`, `reminder_enabled`, `trigger_at_millis`, `updated_at`.

### 3.2 Flutter and Android Baseline
- **Android Default Assistant**: `com.example.wellwisher/.JarvisVoiceInteractionService` is active and registered on device `bdbf8c9b`.
- **Flutter State**: Voice-first companion with active LiveKit session management and screen capture bridge.

---

## 4. Root Cause Analysis: The "Second Meeting → Wake Up" Failure

### 4.1 Chronological Execution Path in Phase 7.1

#### TURN 2: User: "What's on my schedule?"
1. Request enters `JarvisSystemOrchestrator.orchestrate`.
2. Reference resolution returns `isReference: false`.
3. Orchestrator calls `JarvisSupervisorAgent.processRequest`.
4. `llmAdapter.js` matches `isScheduleReadQuery` and emits `calendar_get_today`.
5. Capability `calendar_get_today` queries MySQL `routines` for user `9580` for today.
6. The database returns an ordered list of 20 routines:
   - Index 0: `inst_tmpl_9580_wk_0700_wakeup_2026-10-05` ("Wake Up" at 07:00 AM)
   - Index 1: `inst_tmpl_9580_wk_0900_breakfast_2026-10-05` ("Breakfast" at 09:00 AM)
   - ...
   - Index 8: `Product Architecture Review` at 14:00 PM.
7. In `JarvisSupervisorAgent.js` (lines 730–752):
   ```javascript
   const eventsList = resData.events || resData.routines || [];
   if (eventsList.length > 0) {
     activeTaskManager.setActiveTask(sessionId, {
       userId,
       type: 'RETRIEVED_SCHEDULE',
       title: eventsList[0].title, // <--- SETS title to "Wake Up"
       eventId: eventsList[0].id,  // <--- SETS eventId to "inst_tmpl_...wakeup"
       entityId: eventsList[0].id,
       time: eventsList[0].time,
       candidates: eventsList.map(...)
     });
   }
   ```
   **Observation**: Even though this was a query over 20 events, `activeTaskManager` arbitrarily designated the first item (`eventsList[0]`, "Wake Up") as the active task entity!

#### TURN 3: User: "What is the second meeting?"
1. Request enters `JarvisSystemOrchestrator.orchestrate`.
2. `JarvisReferenceResolver.resolve` is called. It checks for exact commands ("stop", "cancel that", "move it to X"). It does NOT recognize "What is the second meeting?" as a reference query. Returns `isReference: false`.
3. `JarvisSupervisorAgent.processRequest` is called.
4. `FollowUpResolutionAgent.resolve` is checked. It has regex for `move the second meeting`, but NO logic for queries asking *what* the second meeting is. Returns `isFollowUp: false`.
5. `llmAdapter.js` receives "What is the second meeting?". Because it contains "meeting", it falls into the generic schedule reader:
   ```javascript
   if (isScheduleReadQuery) {
     return { toolName: 'calendar_get_today' };
   }
   ```
6. `calendar_get_today` runs AGAIN.
7. Lines 730–752 in `JarvisSupervisorAgent.js` run AGAIN:
   ```javascript
   activeTaskManager.setActiveTask(sessionId, {
     title: eventsList[0].title, // "Wake Up"
     eventId: eventsList[0].id,  // "inst_tmpl_...wakeup"
     ...
   });
   ```
8. **Result**: JARVIS reads out the schedule, but fails to isolate candidate #2 ("Product Architecture Review"), and `activeTask.eventId` remains "Wake Up".

#### TURN 4: User: "Move it to 4 PM."
1. Request enters `JarvisSystemOrchestrator.orchestrate`.
2. `JarvisReferenceResolver.resolve` is called with utterance `"Move it to 4 PM."`.
3. Regex matches: `shiftMatch = raw.match(/move\s+(?:it|that)\s+to\s+(\d{1,2}...)/i)`.
4. Line 74 in `JarvisReferenceResolver.js`:
   ```javascript
   const targetId = activeTask.reminderId || activeTask.eventId || activeTask.scheduleId || activeTask.id;
   ```
5. `activeTask.eventId` is retrieved. What is it?
   **`inst_tmpl_9580_wk_0700_wakeup_2026-10-05` ("Wake Up")!**
6. Action plan is generated:
   ```javascript
   toolName: 'calendar_update_event',
   arguments: { eventId: 'inst_tmpl_...wakeup', time: '16:00' }
   ```
7. Action Engine mutates "Wake Up" to 16:00 PM!
8. Output: *"Updated! 'Wake Up' moved to 4:00 PM."*
9. `Product Architecture Review` remains untouched at 14:00.

---

## 5. Architectural Flaws Identified

1. **Absence of Dedicated Semantic Conversation State (`JarvisConversationState`)**:
   - In Phase 7, state was weakly inferred from `ActiveTaskManager` (which only tracked the last tool executed) and `MemoryAgent.workingMemory`.
   - There was no concept of a persistent `activeEntity` or `entityLock` that survives across turns.

2. **No Query-Time Ordinal Entity Resolution**:
   - `JarvisEntityResolver` was only called during screen actions or explicit pronoun tests, not during general conversational turns.
   - When a user asks "What is the second meeting?", the system must intercept the ordinal query against active candidate entities, resolve candidate index 1, speak its details, and **lock candidate[1] as the active entity**.

3. **Schedule Query Destroys Entity Focus**:
   - In `JarvisSupervisorAgent.js`, running `calendar_get_today` unconditionally set `activeTask.eventId = eventsList[0].id`.
   - A list retrieval is a *collection* of candidates, not a single active entity. Setting `eventId` to `eventsList[0]` was a design defect.

4. **Reference Resolver Lacks Deterministic Priority Order**:
   - `JarvisReferenceResolver` inspected `activeTask.eventId` directly without consulting:
     1. Explicit Entity Lock
     2. Active Entity in Conversation State
     3. Selected Candidate
     4. Last Action Target

---

## 6. Phase 8 Remediation Architecture

To permanently resolve this issue and fulfill Section 2, 3, and 4 requirements:

1. **`JarvisConversationState`**:
   - Maintains durable state per `(userId, sessionId)`:
     - `activeEntity`: `{ id, type, title, time, date, ordinal, locked: true, lockedAt }`
     - `candidateEntities`: Array of candidates with preserved ordinals (0, 1, 2...).
     - `lastResolvedReference`: Details of the last resolved pronoun/ordinal.
     - `temporalContext`: Current anchored date/time.
     - `pendingConfirmation` / `pendingClarification`.
   - Persists in-memory for microsecond fast-path and syncs to MySQL (`ai_active_tasks` / `jarvis_conversation_states`).

2. **Deterministic Multi-Turn Entity Lock**:
   - When the user asks "What is the second meeting?":
     - Match ordinal pattern `\b(first|second|third|fourth|fifth|last|1st|2nd|3rd)\b`.
     - Filter candidates for type matching ("meeting" -> filter by title/type, or direct index).
     - Lock candidate[1] as `activeEntity`:
       `{ id: 'ev_e2e_review_...', title: 'Product Architecture Review', time: '14:00', ordinal: 2 }`.
     - Respond: *"The second meeting is Product Architecture Review at 2:00 PM."*
   - When the user says "Move it to 4 PM":
     - "it" checks `activeEntity`. Found locked entity: `ev_e2e_review_...`.
     - Deterministically mutates `Product Architecture Review` to 16:00!
   - When the user says "Actually make it 5":
     - Entity lock is retained. Mutates `Product Architecture Review` to 17:00!
   - When the user says "Remind me one hour before":
     - Resolves against locked entity time (17:00) -> 16:00 reminder for `Product Architecture Review`.
   - When the user says "Cancel that reminder":
     - Targets the newly created reminder, leaving `Product Architecture Review` intact.

---

## 7. Audit Conclusion & Next Steps

The failure has been traced to exact source lines:
- `JarvisSupervisorAgent.js` line 735 (`title: eventsList[0].title, eventId: eventsList[0].id`)
- `FollowUpResolutionAgent.js` line 191 (missing question-handling branch)
- `JarvisReferenceResolver.js` line 74 (`targetId = activeTask.eventId`)
- `JarvisEntityResolver.js` line 26 (lack of conversation state entity lock)

With the root cause fully documented and proven, implementation proceeds immediately to:
1. `JarvisConversationState.js` (Section 2 & 4: Durable Conversation State & Entity Lock)
2. Semantic Reference Resolution & Temporal Intelligence (Section 3 & 7)
3. Expanded Personal World Model & Semantic Index (Section 5, 6, 8, 9, 10)
4. Comprehensive 30-Test Automated Suite (`phase8PersonalWorldModel.test.js`)
5. Physical Realme Device Validation.
