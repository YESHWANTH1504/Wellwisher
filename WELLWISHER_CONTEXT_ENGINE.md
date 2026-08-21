# WellWisher JARVIS Context Engine & Hybrid Retrieval (Phase 3)

---

## 1. Architecture & Execution Flow
The Context Engine is the bounded retrieval and ranking system providing the future JARVIS agent with user-scoped, relevant, and privacy-safe context.

```
USER REQUEST
      ↓
ContextRouter (Domain relevance classification)
      ↓
Parallel Safe Source Retrieval (with timing & error isolation)
  ├── TemporalContext (Timezone math, relative dates & diurnal periods)
  ├── ScheduleRetriever (Today + upcoming routines within bounded window)
  ├── MemoryRetriever & ContextRanker (Importance, keyword match, recency scoring)
  ├── ConversationRetriever (Bounded recent turn history)
  ├── WellnessRetriever (Hydration, vitals, sleep - selective)
  └── Medication / Family Retrievers (Selective)
      ↓
Standardized Bounded Context Package
      ↓
FUTURE JARVIS AGENT
```

---

## 2. Standardized Context Package Structure

```json
{
  "user": {
    "userId": 101,
    "name": "Alex",
    "email": "alex@wellwisher.health",
    "assistantName": "JARVIS",
    "preferredResponseStyle": "CONCISE",
    "languagePreference": "en-US",
    "timezone": "America/New_York"
  },
  "temporalContext": {
    "currentDate": "2026-08-20",
    "currentTime": "08:30 AM",
    "dayOfWeek": "Thursday",
    "timezone": "America/New_York",
    "period": "morning",
    "resolvedDates": {
      "yesterday": "2026-08-19",
      "today": "2026-08-20",
      "tomorrow": "2026-08-21",
      "dayAfterTomorrow": "2026-08-22",
      "nextWeek": "2026-08-27"
    }
  },
  "categories": ["SCHEDULE", "MEMORY"],
  "todaySchedule": [...],
  "upcomingSchedule": [...],
  "relevantMemories": [...],
  "recentConversation": [...],
  "wellnessSummary": { ... },
  "medicationContext": null,
  "familyContext": null,
  "sources": {
    "schedule": { "status": "AVAILABLE", "data": { ... } },
    "memory": { "status": "AVAILABLE", "data": { ... } },
    "wellness": { "status": "NOT_RELEVANT", "data": null },
    "medication": { "status": "NOT_RELEVANT", "data": null },
    "family": { "status": "NOT_RELEVANT", "data": null }
  },
  "metadata": {
    "userId": 101,
    "requestText": "Plan my morning workout tomorrow",
    "totalGenerationTimeMs": 14,
    "sourceTimingsMs": {
      "schedule": 4,
      "memory": 3,
      "conversation": 2
    },
    "budgets": {
      "MAX_MEMORIES": 5,
      "MAX_CONVERSATION_TURNS": 10,
      "MAX_TODAY_ROUTINES": 20,
      "MAX_UPCOMING_ROUTINES": 15
    }
  }
}
```

---

## 3. Context Ranking Algorithm
The `ContextRanker` uses deterministic multi-factor scoring:
- **Importance Weight**: `importance (1-5) * 10` (10 to 50 pts).
- **Keyword Overlap Ratio**: Token overlap between request text and memory statement (up to 60 pts).
- **Exact Substring Match**: +30 pts.
- **Recency Bonus**: Created within 7 days gives +10 pts.
- **Budget Enforced**: Strictly bounded to top 5 memories to prevent token explosion.

---

## 4. Privacy & Safety Guardrails
1. **Zero Autonomous Action Execution**: The Context Engine is strictly read-only and never executes mutations or tools.
2. **Selective Health Retrieval**: Sensitive clinical vitals and hydration logs are marked `NOT_RELEVANT` and omitted unless explicitly requested.
3. **Selective Family Retrieval**: Caregiver contacts are marked `NOT_RELEVANT` unless a family/messaging intent is detected.
4. **Tenant Isolation**: Every query mandates `WHERE user_id = ?` derived from authenticated context.
5. **Partial Failure Tolerance**: If one database table times out, its status is marked `UNAVAILABLE` with an error message while remaining context sources complete safely.
