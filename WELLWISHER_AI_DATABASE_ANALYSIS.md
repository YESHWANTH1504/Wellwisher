# WellWisher AI Database Analysis & Schema Plan

---

## 1. Existing Relevant Tables
The existing WellWisher schema contains 11 relational tables:

| Table | Entity Purpose | User Isolation Key | Existing Audit / Timestamps |
|---|---|---|---|
| `users` | Primary user identity & credentials | `id` (PK) | `created_at`, `updated_at` |
| `routines` | Authoritative schedule & routine reminders | `user_id -> users(id)` | `created_at`, `updated_at`, `deleted_at` |
| `screen_care_settings` | Workday 20-20-20 eye break preferences | `user_id -> users(id)` | `updated_at` |
| `family_members` | Linked family contacts & caregivers | `user_id -> users(id)` | `created_at` |
| `hydration_logs` | Water intake records in ml | `user_id -> users(id)` | `created_at` |
| `sleep_mood_logs` | Bedtime, wake time, sleep hours & mood scale | `user_id -> users(id)` | `created_at` |
| `medications` | Drug names, dosage, schedule time & pill counters | `user_id -> users(id)` | `created_at` |
| `family_nudges` | Interactive cheer, alert & reminder nudges | `from_user_name`, `to_user_name` | `created_at` |
| `vitals_logs` | Blood pressure, pulse, glucose, SpO2, weight | `user_id -> users(id)` | `created_at` |
| `journal_logs` | Daily emotional journal & sentiment analysis | `user_id -> users(id)` | `created_at` |
| `cognitive_game_scores` | Memory/brain match training scores | `user_id -> users(id)` | `created_at` |

---

## 2. Existing AI-Related Persistence
- `journal_logs`: Contains simple sentiment output (`sentiment`, `mood_score`, `caregiver_flag`, `ai_feedback`).
- `cognitive_game_scores`: Stores brain training metrics (`game_type`, `score`, `duration_seconds`).
- *Gap*: There is currently **zero** persistent storage for multi-turn conversational chat, user episodic memory, AI autonomy permissions, or agentic step tracking.

---

## 3. Existing User Preference Persistence
- `screen_care_settings`: Stores user-specific eye break intervals and screen time limits.
- *Gap*: There is currently no persistent entity storing AI voice style, language preferences, proactive assistance toggles, or per-action autonomy rules (`AUTO_APPROVE` vs `ASK_ALWAYS`).

---

## 4. Existing Conversation Persistence
- *Gap*: AI chat in the current system is purely ephemeral (request/response via HTTP POST `/api/ai/chat` with no conversation session tracking, message indexing, or tool call history).

---

## 5. Persistence Gaps Requiring New Tables

To establish a resilient, secure persistence foundation for JARVIS without altering existing systems, the following 6 modular tables are required:

1. **`ai_conversations`**: Groups chat turns into named sessions per user.
2. **`ai_conversation_messages`**: Stores individual conversation turns (`user`, `assistant`, `system`, `tool`) with structured content and tool call payloads.
3. **`ai_memories`**: Stores structured, categorized long-term memories with importance, source, and user ownership.
4. **`ai_preferences`**: Stores AI-specific user settings (assistant persona, voice output, proactive triggers, language preference).
5. **`ai_action_permissions`**: Stores per-action autonomy permissions (`ASK_ALWAYS`, `AUTO_APPROVE`, `DISABLED`) owned strictly by the authenticated user.
6. **`ai_agent_runs` & `ai_agent_steps`**: Tracks multi-step execution lifecycle, inputs, outputs, statuses (`PLANNED`, `RUNNING`, `WAITING_FOR_CONFIRMATION`, `COMPLETED`, `FAILED`), and verification audits.

---

## 6. Tables That Must NOT Be Duplicated
- **Schedules / Reminders**: `routines` remains the single source of truth. No separate "ai_schedules" or "ai_reminders" will be created.
- **Health / Vitals**: `vitals_logs`, `medications`, and `hydration_logs` remain the single source of truth.
- **Eye Care**: `screen_care_settings` remains the single source of truth.
- **Family Nudges**: `family_nudges` and `family_members` remain the single source of truth.

---

## 7. Proposed Schema Changes (Phase 1)
- Non-destructive `CREATE TABLE IF NOT EXISTS` migrations for the 6 new AI foundation tables.
- Addition of composite performance indexes on `(user_id, date)` for high-frequency logs.
- Strict `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` on all new tables.
