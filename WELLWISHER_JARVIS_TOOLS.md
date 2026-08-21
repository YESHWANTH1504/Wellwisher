# WellWisher JARVIS Tool Registry & Safety System (Phase 2)

---

## 1. Architecture Overview
The JARVIS Tool Registry acts as the deterministic execution boundary between future LLM agents and the WellWisher backend services.

```
JARVIS Agent (Future LLM)
      ↓
Tool Registry (Registration, Discovery, Schema Validation)
      ↓
Permission Check (ai_action_permissions: ASK_ALWAYS / AUTO_APPROVE / DISABLED)
      ↓
Confirmation Engine (WAITING_FOR_CONFIRMATION State for High-Risk Actions)
      ↓
Existing WellWisher Services (RoutineModel, AiMemoryRepository, AiPreferenceRepository)
      ↓
MySQL (Sole Production Source of Truth)
```

---

## 2. Tool Registry Standards
- **No Direct SQL or Arbitrary Code**: The LLM agent is strictly forbidden from executing raw SQL, executing shell commands, or calling unregistered functions.
- **Trusted Context**: Every execution requires an authenticated `context` containing `{ userId, requestCorrelationId, conversationId, agentRunId, isConfirmed }`.
- **User Scoping**: User identification is derived strictly from `context.userId` and never from user/agent input.
- **Discovery Sanitization**: `listAvailableTools()` exposes only the names, descriptions, input schemas, permission keys, and risk levels without leaking backend code or internal database schemas.

---

## 3. Registered Tool Catalog (23 Tools)

| Tool Name | Category | Risk Level | Permission Key | Requires Confirmation | Description |
|---|---|---|---|---|---|
| `get_today_schedule` | `schedule` | `LOW` | `get_schedule` | No | Retrieves scheduled routines and reminders for a date. |
| `get_schedule` | `schedule` | `LOW` | `get_schedule` | No | Retrieves details of a specific routine by ID. |
| `create_schedule` | `schedule` | `MEDIUM` | `create_schedule` | No | Creates a new routine/reminder in the `routines` table. |
| `update_schedule` | `schedule` | `MEDIUM` | `update_schedule` | No | Updates routine time, title, status, or description. |
| `delete_schedule` | `schedule` | `HIGH` | `delete_schedule` | **Yes (`ASK_ALWAYS`)** | Soft-deletes an existing scheduled routine. |
| `find_free_time` | `schedule` | `LOW` | `get_schedule` | No | Identifies open time gaps between scheduled routines. |
| `detect_schedule_conflicts` | `schedule` | `LOW` | `get_schedule` | No | Detects overlaps with existing tasks for a proposed time. |
| `get_medications` | `medication` | `LOW` | `get_medications` | No | Reads prescribed medications and pill counts. |
| `mark_medication_taken` | `medication` | `MEDIUM` | `mark_medication_taken` | No | Records pill intake and decrements remaining pill counter. |
| `get_vitals` | `wellness` | `LOW` | `get_vitals` | No | Reads recent blood pressure, glucose, heart rate, SpO2. |
| `get_hydration` | `wellness` | `LOW` | `get_hydration` | No | Reads daily water intake volume and goal progress. |
| `log_hydration` | `wellness` | `MEDIUM` | `log_hydration` | No | Records water volume in ml (1–5000ml validated). |
| `get_sleep_mood` | `wellness` | `LOW` | `get_sleep_mood` | No | Reads sleep duration, bedtime, wake time, mood rating. |
| `get_wellness_summary` | `wellness` | `LOW` | `get_wellness_summary` | No | Aggregated daily overview of hydration, vitals, sleep, and routine progress. |
| `get_recent_journal` | `journal` | `LOW` | `get_journal` | No | Reads recent emotional and symptom journal reflections. |
| `create_journal_entry` | `journal` | `MEDIUM` | `create_journal` | No | Logs a new mood reflection entry. |
| `save_memory` | `memory` | `MEDIUM` | `save_memory` | No | Stores categorized long-term memory with importance score. |
| `search_memory` | `memory` | `LOW` | `save_memory` | No | Searches long-term memory statements by keyword. |
| `update_memory` | `memory` | `MEDIUM` | `save_memory` | No | Updates memory text or importance score. |
| `delete_memory` | `memory` | `MEDIUM` | `save_memory` | No | Permanently removes a memory record. |
| `get_ai_preferences` | `preference` | `LOW` | `get_ai_preferences` | No | Reads assistant persona settings, voice, language. |
| `update_ai_preferences` | `preference` | `MEDIUM` | `update_ai_preferences` | No | Updates persona name, style, voice (cannot alter security). |
| `get_family_members` | `family` | `LOW` | `get_family` | No | Reads linked caregivers and connection statuses. |
| `send_family_notification` | `family` | `HIGH` | `send_family_notification` | **Yes (`ASK_ALWAYS`)** | Dispatches care nudges/alerts to designated contacts. |

---

## 4. Confirmation Flow Protocol

When an action is classified as `HIGH` risk or the user's permission is set to `ASK_ALWAYS`, the registry returns:
```json
{
  "success": true,
  "status": "WAITING_FOR_CONFIRMATION",
  "toolName": "delete_schedule",
  "requiresConfirmation": true,
  "riskLevel": "HIGH",
  "confirmationDetails": {
    "action": "delete_schedule",
    "description": "Delete/cancel an existing scheduled routine...",
    "proposedInput": { "scheduleId": "rot_123" }
  },
  "message": "Action \"delete_schedule\" requires explicit user approval before execution."
}
```

Execution only proceeds once the client or caller re-invokes with `isConfirmed: true`.

---

## 5. Security & Safety Guardrails
1. **Medical & Health Data Guardrail**: The tool suite provides read-only vitals and hydration access. No autonomous medical diagnosis or prescription modification tools exist.
2. **Emergency / SOS Safety Guardrail**: Emergency/SOS actions remain strictly deterministic and are never exposed as autonomous agent tools.
3. **Immutable Security Permissions**: `update_ai_preferences` cannot alter autonomy permission states or bypass confirmation policies.
4. **SQL Parameterization**: All tool inputs pass through parameterized queries, completely neutralizing injection attempts.
