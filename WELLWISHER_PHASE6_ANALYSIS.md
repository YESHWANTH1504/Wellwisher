# WellWisher Phase 6 — Proactive AI Companion Analysis & Architectural Specification

---

## 1. Executive Summary & Existing Architecture Inspection
The WellWisher platform has verified foundations across Phases 0 through 5:
- **Phase 0**: Strict JWT security, user data isolation (`WHERE user_id = ?`), clinical validations, and MySQL source-of-truth.
- **Phase 1**: Structured AI persistence (`ai_conversations`, `ai_conversation_messages`, `ai_memories`, `ai_preferences`, `ai_action_permissions`, `ai_agent_runs`, `ai_agent_steps`).
- **Phase 2**: 24 registered, safe tools executed exclusively via `ToolRegistry` with permission checks and `WAITING_FOR_CONFIRMATION` flow.
- **Phase 3**: Read-only `ContextEngine` featuring timezone-aware `TemporalContext`, domain relevance routing, multi-factor memory ranking, and selective health/family data bounding.
- **Phase 4**: Central `JarvisAgent` orchestrator with bounded state machine (`MAX_AGENT_STEPS = 8`), single-use cryptographic confirmation tokens, database verifier, and structured client contracts.
- **Phase 5**: Flutter interactive JARVIS companion with dynamic animated Canvas Orb, interruptible STT/TTS voice pipeline, action cards, and confirmation dialogs.

---

## 2. Reusable Foundation Components

| Component | Location | Role in Phase 6 |
|---|---|---|
| **`TemporalContext`** | `backend/services/jarvis/context/temporalContext.js` | Provides timezone-aware date math, diurnal period calculation (`morning`, `afternoon`, `evening`, `night`), and relative day offsets for briefings and reminders. |
| **`ContextEngine`** | `backend/services/jarvis/context/contextEngine.js` | Extracts user schedules, memories, wellness metrics, and historical turns without action side-effects. |
| **`ToolRegistry`** | `backend/services/jarvis/tools/toolRegistry.js` | Executes all proactive schedule rescheduling, memory saving, and free time planning actions with permission gating. |
| **`JarvisAgent` & `AgentPlanner`** | `backend/services/jarvis/agent/` | Formulates structured execution steps and runs post-execution database verification (`AgentVerifier`). |
| **`RoutineModel`** | `backend/models/routineModel.js` | Authoritative schedule CRUD operations across `routines` table (`upcoming`, `completed`, `snoozed`, `missed`). |
| **`AiMemoryRepository`** | `backend/repositories/ai/aiMemoryRepository.js` | Stores learned behavioral patterns (`ROUTINE_PREFERENCE`, `COMMUNICATION_PREFERENCE`) with confidence levels. |
| **`AiPreferenceRepository`** | `backend/repositories/ai/aiPreferenceRepository.js` | Manages proactive settings, quiet hours, briefing preferences, and persona controls. |

---

## 3. What Must Be Added in Phase 6

1. **Database Schema Extension**:
   - `ai_proactive_events`: User-scoped persistence for generated reminders, suggestions, briefings, and summaries with lifecycle statuses (`PENDING`, `DELIVERED`, `DISMISSED`, `ACTED`, `EXPIRED`, `CANCELLED`).
   - `ai_preferences` extensions: `proactive_reminders_enabled`, `daily_briefing_enabled`, `evening_summary_enabled`, `quiet_hours_enabled`, `quiet_hours_start`, `quiet_hours_end`, `notification_frequency` (`LOW`, `BALANCED`, `HIGH`), `briefing_time`, `summary_time`.
2. **Proactive Intelligence Layer (`backend/services/jarvis/proactive/`)**:
   - `proactiveContextBuilder.js`: Gathers temporal context, today's schedule, completion patterns, overdue routines, and active preferences.
   - `proactiveScorer.js`: Deterministic scoring formula (`priorityScore = timeUrgency + importance + relevance + behaviorSignal - notificationFatigue`).
   - `proactiveRules.js`: Evaluates upcoming tasks (30m, 15m, due now), overdue tasks (>15m uncompleted), missed tasks, and postponement patterns.
   - `proactiveDecisionEngine.js`: Enforces quiet hours, cooldown periods, duplicate suppression, and hourly/daily rate caps.
   - `proactiveEngine.js`: Master orchestrator generating proactive feed and events.
   - `dailyBriefingEngine.js`: Constructs structured morning briefings from real user data.
   - `eveningSummaryEngine.js`: Constructs end-of-day accomplishment & consistency reports.
   - `smartPlanner.js`: Free-time window calculator with priority-based task placement and conflict detection.
   - `behaviorPatternEngine.js`: Safely derives user habits (e.g. workout time, study postponement) into structured `ai_memories`.
3. **Background Job Architecture (`backend/services/jarvis/proactive/jobs/`)**:
   - `proactiveSchedulerJob.js`, `reminderEvaluationJob.js`, `dailyBriefingJob.js`, `eveningSummaryJob.js`, `cleanupProactiveEventsJob.js`.
4. **Push Notification Abstraction (`backend/services/jarvis/proactive/notificationService.js`)**:
   - Clean provider interface ready for FCM / Local Push notifications.
5. **Backend APIs & Routing (`backend/controllers/proactiveController.js`, `backend/routes/proactiveRoutes.js`)**:
   - `GET /api/ai/proactive/feed`
   - `GET /api/ai/proactive/today`
   - `POST /api/ai/proactive/:id/dismiss`
   - `POST /api/ai/proactive/:id/act`
   - `POST /api/ai/proactive/evaluate`
   - `GET /api/ai/briefing/today`
   - `GET /api/ai/summary/today`
   - `GET /api/ai/preferences` & `PUT /api/ai/preferences`
6. **Flutter Proactive UI & Voice Extensions (`frontend/lib/features/jarvis/`)**:
   - `widgets/proactive_card.dart`
   - `widgets/daily_briefing_card.dart`
   - `widgets/upcoming_task_card.dart`
   - `widgets/smart_suggestion_card.dart`
   - `widgets/insight_card.dart`
   - `jarvis_screen.dart` proactive banner & quick actions
   - Optional proactive TTS voice announcements respecting quiet hours and user settings.

---

## 4. Safety Guardrails & What Must NOT Change
- **Zero Uncontrolled Autonomy**: JARVIS cannot autonomously delete schedules or send family alerts without explicit user confirmation.
- **Strict Execution Boundary**: All schedule and memory mutations must route through `JarvisAgent` -> `ToolRegistry` -> `AgentVerifier`.
- **User Data Isolation**: Every proactive query, calculation, and event MUST filter by `user_id = ?`.
- **No Direct MySQL Access from LLM**: No raw SQL execution or arbitrary code execution.
- **No Hallucinated Data**: Briefings and summaries must be composed strictly from active database records.
