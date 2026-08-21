# WellWisher Proactive AI Architecture & Intelligence Specifications

---

## 1. Executive Overview
Phase 6 elevates JARVIS from a reactive request-response engine into an **Intelligent Proactive Wellness and Schedule Companion**. 
JARVIS continuously anticipates user needs, reminds users of upcoming/overdue tasks, composes daily morning briefings and evening accomplishment summaries, identifies free-time productivity windows, and learns behavioral habits—all while maintaining strict guardrails and user control.

---

## 2. Core Proactive Subsystems

### A. Proactive Context Builder (`proactiveContextBuilder.js`)
- Timezone-aware calculation of current date, day of week, and relative minutes to scheduled routines (`diffMinutes`).
- Breaks down today's timeline into `completed`, `upcoming`, `missed`, and `overdue` (>15m past without completion).
- Gathers hydration logs and recent user memories without side effects.

### B. Deterministic Priority Scorer (`proactiveScorer.js`)
- Formula:
  $$\text{Priority Score} = \text{Time Urgency} + \text{Importance} + \text{Relevance} + \text{Behavior Signal} - \text{Notification Fatigue Penalty}$$
- Bands:
  - **CRITICAL** ($\ge 75$): Due now / urgent medication / doctor appointment.
  - **HIGH** ($\ge 50$): Starts within 15–30m / important meeting.
  - **MEDIUM** ($\ge 25$): General routine / morning briefing.
  - **LOW** ($< 25$): Evening summary / wellness hydration check-in.

### C. Decision Policy & Notification Fatigue Protection (`proactiveDecisionEngine.js`)
- **Quiet Hours**: Mutes all non-critical events between user-configured window (default `22:00` to `07:00`).
- **Frequency Caps**:
  - `LOW`: Max 2 events/hour, max 6 events/day.
  - `BALANCED`: Max 4 events/hour, max 12 events/day.
  - `HIGH`: Max 8 events/hour, max 20 events/day.
- **Duplicate Suppression**: Rejects duplicate candidate events if an active pending event already exists for the same routine.
- **User Settings**: Honors individual toggles for reminders, briefings, summaries, and voice.

### D. Daily Briefings & Evening Summaries
- **Morning Briefing (`dailyBriefingEngine.js`)**: Real scheduled task count, first activity time, upcoming agenda, and morning hydration prompt.
- **Evening Summary (`eveningSummaryEngine.js`)**: Task completion rate percentage, missed/unfinished task count, and tomorrow preparation prompt.

### E. Smart Free-Time Planner (`smartPlanner.js`)
- Identifies unallocated time windows $\ge 30\text{ mins}$ in morning, afternoon, or evening.
- Proposes structured focus slots, breaks, and hydration pauses without overlapping existing routines.

### F. Behavior Pattern Learning (`behaviorPatternEngine.js`)
- Safely derives non-invasive routine preferences (e.g. `preferred_workout_time = 'User usually completes workouts in the evening'`).
- Persists into `ai_memories` with `source = 'AGENT_INFERRED'` and metadata confidence.

---

## 3. Database Schema Extension

### Table: `ai_proactive_events`
- `id` (VARCHAR 64, PK)
- `user_id` (INT, FK users)
- `event_type` (ENUM: UPCOMING_TASK, TASK_DUE, OVERDUE_TASK, MISSED_TASK, POSTPONED_TASK_PATTERN, DAILY_BRIEFING, EVENING_SUMMARY, FREE_TIME_SUGGESTION, HYDRATION_NUDGE, WELLNESS_INSIGHT, SMART_RESCHEDULE_SUGGESTION)
- `priority` (ENUM: LOW, MEDIUM, HIGH, CRITICAL)
- `title` (VARCHAR 255)
- `message` (TEXT)
- `source` (VARCHAR 50)
- `related_entity_type` (VARCHAR 50)
- `related_entity_id` (VARCHAR 64)
- `scheduled_for` (TIMESTAMP)
- `delivered_at` (TIMESTAMP)
- `status` (ENUM: PENDING, DELIVERED, DISMISSED, ACTED, EXPIRED, CANCELLED)
- `action_payload` (JSON)
- `metadata` (JSON)
- `expires_at` (TIMESTAMP)
- `created_at`, `updated_at`
