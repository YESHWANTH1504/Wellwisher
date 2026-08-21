# WellWisher Context Engine Analysis & Design Plan (Phase 3)

---

## 1. Existing Structured Data Sources
WellWisher contains the following authoritative structured data sources in MySQL:

| Source | Model / Table | Existing Access Patterns | Context Relevance Trigger |
|---|---|---|---|
| **Schedules / Routines** | `RoutineModel` / `routines` | Filter by `(user_id, date)`, ordered by time | Schedule inquiries, daily planning, "what's next", reminders |
| **Hydration** | `hydration_logs` | Aggregate `SUM(amount_ml)` by `(user_id, date)` | Water tracking, daily health summary |
| **Vitals** | `vitals_logs` | Latest records by `user_id` ordered by `created_at DESC` | Health reviews, vitals inquiries |
| **Sleep & Mood** | `sleep_mood_logs` | Latest log by `(user_id, date)` | Sleep analysis, wellness briefing |
| **Medications** | `medications` | Filter by `user_id`, ordered by schedule time | Pill tracking, reminder context |
| **Journal** | `journal_logs` | Recent entries by `user_id` ordered by `created_at DESC` | Reflection queries, mood context |
| **Family** | `family_members`, `family_nudges` | Filter by `user_id` | Caregiver messages, emergency contacts |

---

## 2. Existing AI Persistence Sources (Phase 1 Foundation)
- **`ai_conversations` & `ai_conversation_messages`**: Accessible via `AiConversationRepository`. Supports chronological turn retrieval and session metadata.
- **`ai_memories`**: Accessible via `AiMemoryRepository`. Stores classified statements (`USER_PREFERENCE`, `ROUTINE_PREFERENCE`, `COMMUNICATION_PREFERENCE`, etc.) with importance (1–5).
- **`ai_preferences`**: Accessible via `AiPreferenceRepository`. Holds persona name, voice, TTS, language, and response style.
- **`ai_action_permissions`**: Accessible via `AiPermissionRepository`. Maps action autonomy levels (`ASK_ALWAYS`, `AUTO_APPROVE`, `DISABLED`).

---

## 3. Existing Date & Time Handling
- **Date format standard**: `YYYY-MM-DD` (ISO string split).
- **Time format standard**: 12-hour format e.g. `08:30 AM`.
- **Gap**: There was previously no dynamic temporal reasoning for expressions like *"tomorrow morning"*, *"this weekend"*, *"after dinner"*, or timezone-aware day boundaries.
- **Solution**: The Context Engine will include a dedicated `TemporalContext` module that computes diurnal periods (Morning: 05:00-11:59, Afternoon: 12:00-16:59, Evening: 17:00-20:59, Night: 21:00-04:59) and relative date offsets based on the user's configured timezone.

---

## 4. Gaps in Retrieval & Context Assembly
1. **Unbounded Context Risk**: Without budget enforcement, querying months of chat or hundreds of routines could cause token overflow.
2. **Privacy & Data Spillage**: Sensitive medical or family records were at risk of being retrieved during irrelevant requests (e.g., retrieving blood glucose when asking for workout times).
3. **Partial Failure Vulnerability**: A database timeout on one table (e.g. hydration) should not abort the entire context payload.
4. **Lack of Memory Ranking**: Unranked retrieval would flood the agent with irrelevant preferences.

---

## 5. Proposed Context Engine Architecture

```
User Request + Authenticated User Context
                 ↓
      Request Relevance Router
  (Determines necessary context sources)
                 ↓
     Parallel Context Source Fetching
  (Isolated try/catch per registered source)
   ├── Temporal Context Resolver
   ├── User Profile & AI Preferences
   ├── Schedule Retriever (Today, Upcoming, Free Slots, Conflicts)
   ├── Memory Retriever & Ranker (Relevance, Recency, Importance)
   ├── Conversation Retriever (Bounded Recent Window)
   ├── Wellness Retriever (Hydration, Vitals, Sleep - Selective)
   └── Family / Medication Retriever (Selective)
                 ↓
      Context Ranker & Budget Limiter
                 ↓
    Standardized Bounded Context Package
```

---

## 6. Context Source Status Contract
Every context source in the package will explicitly indicate its retrieval status:
- **`AVAILABLE`**: Data successfully retrieved and populated.
- **`EMPTY`**: Successfully queried, but no matching records exist for this user.
- **`UNAVAILABLE`**: Query failed or timed out (preserves error without crashing the package).
- **`NOT_RELEVANT`**: Bypassed because the request does not require this category of data.
