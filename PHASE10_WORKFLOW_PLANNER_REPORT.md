# PHASE 10: WORKFLOW PLANNER ARCHITECTURE REPORT
**Autonomous Workflow & Verified Agent Runtime**
**Component:** `JarvisWorkflowPlanner` & `JarvisWorkflowValidator`  
**System:** JARVIS AI Operating System Layer (WellWisher OS)  
**Date:** 2026-10-06  
**Status:** COMPLETED & VERIFIED  

---

## 1. Overview & Scope

The `JarvisWorkflowPlanner` is responsible for translating high-level natural language user goals into structured Directed Acyclic Graphs (DAGs) without hallucinating unbacked capabilities or allowing freeform LLM code execution.

The `JarvisWorkflowValidator` deterministically validates the generated DAG prior to any execution, ensuring graph acyclicity (cycle detection), valid capability references, dependency satisfaction, and safety policy conformance.

---

## 2. Supported Canonical Patterns (Section 25)

The planner natively decomposes the 7 canonical multi-step real-world patterns required by Phase 10:

### Pattern A: "Open WhatsApp"
- **Goal Type:** Single-Step App Launch.
- **DAG Nodes:**
  - `step_1`: `open_application` (`com.whatsapp`)
- **Safety Level:** 0 (Read-only / Safe).
- **Verification:** WindowManager focus matches `com.whatsapp`.

### Pattern B: "Find RMK College in Maps and open directions"
- **Goal Type:** Search & Navigation DAG.
- **DAG Nodes:**
  - `step_1`: `search_location` (Query: "RMK College")
  - `step_2`: `android.app.maps.resolve` (Depends on `step_1`)
  - `step_3`: `navigate_to_location` (Depends on `step_2`, Destination: "RMK College")
- **State Transfer:** Resolved coordinate/address is piped into `navigate_to_location`.

### Pattern C: "Find the address of RMK College and prepare a message to Arun"
- **Goal Type:** Cross-App Content Aggregation & Composition.
- **DAG Nodes:**
  - `step_1`: `search_location` (Query: "RMK College")
  - `step_2`: `android.app.maps.resolve` (Depends on `step_1`)
  - `step_3`: `resolve_contact` (Target: "Arun")
  - `step_4`: `android.communication.message.compose` (Depends on `step_2`, `step_3`)
- **Safety Level:** 1 (Draft composition without auto-dispatch).

### Pattern D: "Find a restaurant near me, get address, and share it with Arun"
- **Goal Type:** Location Discovery & Social Sharing.
- **DAG Nodes:**
  - `step_1`: `search_location` (Query: "restaurant near me")
  - `step_2`: `android.app.maps.resolve` (Depends on `step_1`)
  - `step_3`: `resolve_contact` (Target: "Arun")
  - `step_4`: `share_content` (Depends on `step_2`, `step_3`)
- **Safety Level:** 2 (External communication requires explicit user confirmation).

### Pattern E: "Create a meeting tomorrow at 10 AM and remind me one hour before"
- **Goal Type:** Calendar & Linked Temporal Reminder DAG.
- **DAG Nodes:**
  - `step_1`: `calendar_create_event` (Title: "Meeting", Date: "tomorrow", Time: "10:00")
  - `step_2`: `create_reminder` (Depends on `step_1`, Time: "09:00", RelatedEventId: `step_1.result.id`)
- **Verification:** Authoritative MySQL `routines` verification for both calendar and reminder entries.

### Pattern F: "Move my second meeting to 4 PM and remind me 30 minutes before"
- **Goal Type:** Semantic Multi-Turn Entity Rescheduling.
- **Context Binding:** Queries `activeEntity` locked during previous turn ("second meeting").
- **DAG Nodes:**
  - `step_1`: `update_calendar_event` (TargetId: `activeEntity.id`, NewTime: "16:00")
  - `step_2`: `create_reminder` (Depends on `step_1`, Time: "15:30")
- **Preservation:** `activeEntity` lock remains strictly intact across the modification.

### Pattern G: "Open WhatsApp and message Arun that I will be late"
- **Goal Type:** Controlled App Launch with Handoff Compose.
- **DAG Nodes:**
  - `step_1`: `open_application` (`com.whatsapp`)
  - `step_2`: `resolve_contact` ("Arun")
  - `step_3`: `send_whatsapp_message` (Depends on `step_1`, `step_2`, Message: "I will be late")
- **Safety Level:** 2 (Pauses in `AWAITING_CONFIRMATION` before intent dispatch).

---

## 3. Deterministic DAG Validation Rules

The `JarvisWorkflowValidator` executes 6 strict deterministic verification checks before any workflow enters `READY` state:
1. **Registered Capability Validation:** Every step `capabilityId` must exist in `JarvisCapabilityRegistry` or have an active contract. Rejects hallucinated or arbitrary commands.
2. **Cycle Detection (Topological Sort / DFS):** Rejects any circular dependencies (e.g. `Step 1 -> Step 2 -> Step 1`).
3. **Missing Dependency Detection:** Rejects any step referencing an undeclared step ID.
4. **Target Entity Validation:** Verifies required target entities exist in World Model or current context.
5. **Safety Level Evaluation:** Sets workflow aggregate `safetyLevel = max(step.safetyLevel)`.
6. **Privacy Route Validation:** Propagates `LOCAL_ONLY` tags across steps to prevent cloud leaks.
