# PHASE 8: PERSONAL WORLD MODEL & SEMANTIC GRAPH REPORT
**Personal Semantic Knowledge Graph, Entity Lifecycle & Memory Provenance**
**Document Version:** 1.0.0  
**Date:** 2026-10-05  
**System:** WellWisher → JARVIS AI Operating System Layer  

---

## 1. Architectural Overview

The `JarvisWorldModel` serves as the persistent, user-isolated knowledge graph representing the user's personal reality. It maintains structured entities, inter-entity relationships, provenance metadata, and lifecycle states.

```
                  ┌────────────────────────┐
                  │    JarvisWorldModel    │
                  └───────────┬────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  jarvis_entities │ │jarvis_entity_    │ │  jarvis_memory_  │
│  (17 Entity Types│ │ relations        │ │   provenance     │
│   + Lifecycle)   │ │(19 Relation Types│ │ (Audit Trails)   │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 2. Core Entity Types Supported (17 Types)

Every entity is isolated by `user_id` and tracked with strict lifecycle states:

1. `PERSON`: Individuals known to the user.
2. `CONTACT`: Address book entries, phone numbers, emails.
3. `CALENDAR_EVENT`: Meetings, appointments, routine schedules.
4. `REMINDER`: Time-triggered notifications and alarms.
5. `TASK`: Actionable to-do items and checklists.
6. `APPLICATION`: Installed Android packages, activities, aliases.
7. `DOCUMENT`: PDFs, health records, files, prescriptions.
8. `PHOTO`: Visual assets, camera captures, stored images.
9. `LOCATION`: Home, office, clinics, geographic coordinates.
10. `DEVICE`: Connected hardware (Realme RMX3840, accessories, sensors).
11. `HEALTH_RECORD`: Vitals, heart rate, blood pressure, lab reports.
12. `CONVERSATION`: Dialog sessions, message threads.
13. `MESSAGE`: SMS, WhatsApp messages, notifications.
14. `NOTIFICATION`: Android system notifications captured by listener.
15. `WORKFLOW`: Multi-step automation macros and routines.
16. `MEDIA_ITEM`: Music, podcasts, audio notes.
17. `MEMORY`: Facts, preferences, explicit notes.

---

## 3. Supported Relationship Types (19 Types)

All relations are persistent, queryable, timestamped, and user-isolated:

1. `KNOWS`: Person to Person relationship.
2. `CONTACT_OF`: Contact card linked to Person.
3. `INVOLVES`: Event or Task involving a Person.
4. `PARTICIPANT_OF`: Person participating in Event.
5. `BELONGS_TO`: Ownership relation.
6. `RELATED_TO`: General associative link.
7. `DEPENDS_ON`: Task or Workflow prerequisite.
8. `PRECEDES`: Temporal ordering (Event A occurs before Event B).
9. `FOLLOWS`: Temporal ordering (Event B occurs after Event A).
10. `OCCURS_AT`: Event/Reminder tied to Location.
11. `REMINDER_FOR`: Explicit link between Reminder and CalendarEvent.
12. `CREATED_BY`: Author/originator provenance.
13. `MENTIONED_IN`: Entity cited in Document or Conversation.
14. `ATTACHED_TO`: File or Photo attached to Task/Event.
15. `PREPARES_FOR`: Preparation task before a major meeting/trip.
16. `EXECUTED_IN`: Action executed in Application.
17. `USES`: Tool or Resource utilized by Workflow.
18. `LOCATED_AT`: Person or Device situated at Location.
19. `DERIVED_FROM`: Memory or Fact inferred from Document/Observation.

---

## 4. Entity Lifecycle Engine

The `JarvisEntityLifecycle` module tracks 9 lifecycle states:

- `CREATED`: Entity initially recorded in the database.
- `DISCOVERED`: Entity detected via screen context or perception.
- `SELECTED`: Entity explicitly referenced by the user (locks conversational focus).
- `REFERENCED`: Entity cited as context in conversation.
- `MODIFIED`: Entity properties, date, or time updated.
- `COMPLETED`: Task or reminder fulfilled.
- `CANCELLED`: Scheduled item or reminder revoked by user.
- `DELETED`: Explicitly expunged from database.
- `ARCHIVED`: Retained for historical context without active display.

### Duplicate Prevention Invariant
When a user modifies an existing entity (e.g., changing meeting time from 16:00 to 17:00), `JarvisWorldModel.upsertEntity()` detects the existing `id` and executes an `UPDATE` mutation rather than creating a duplicate row.

---

## 5. Memory Provenance & Correction System

Every memory entry in `ai_memories` is tracked by verifiable audit records in `jarvis_memory_provenance`.

### Provenance Classification
- `EXPLICIT_USER_FACT`: Directly stated by the user (*"My doctor is Dr. Ramesh"*).
- `OBSERVED_FACT`: Observed on-screen or captured via camera.
- `IMPORTED_FACT`: Ingested from external calendar or contacts.
- `SYSTEM_STATE`: Telemetry derived from device OS.
- `INFERRED_FACT`: AI-derived pattern (*"User typically exercises at 7 PM"*).
- `AI_DERIVED_FACT`: Summarized insight across multiple turns.

### Correction Audit Trail Example (Physical Device Verification)
```
Memory Key: cardio_prescription_1791201796835
User: "Remember my prescription is Take 20mg Atorvastatin once daily at night."
-> Created ID: 92
-> Provenance Audit:
   [1] Action: CREATED | Source: EXPLICIT_USER_FACT | New: "Take 20mg Atorvastatin..."

User: "That's wrong, the doctor increased it to 40mg."
-> Corrected ID: 92 (Zero new rows in ai_memories)
-> Provenance Audit:
   [2] Action: CORRECTED | Reason: "Doctor increased dosage" | Prev: "20mg..." | New: "40mg..."
```
