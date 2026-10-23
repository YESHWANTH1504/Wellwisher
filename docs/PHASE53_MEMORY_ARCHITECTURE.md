# Phase 53: Memory Architecture

## 1. Multi-Tiered Memory System
JARVIS operates across three distinct memory horizons:
1. **Working Memory (Session-scoped, Ephemeral)**:
   - Tracks active multi-turn conversation slots, unresolved pronouns, and last executed actions (`lastAction`, `lastUserQuery`).
   - Managed in-memory via `MemoryAgent` and cleared upon session teardown.
2. **Short-Term Memory (Daily / Workflow)**:
   - Tracks active day routine, hydration intake, pending appointments, and current reminders.
3. **Long-Term Memory (Persistent, Vector / Relational)**:
   - Stores user preferences ("I drink black coffee without sugar"), habits, medical restrictions, and relationship context.
   - Fully searchable via `search_memory` tool and manageable via `JarvisMemoriesScreen`.

## 2. Privacy & User Control
Users retain full sovereignty over stored memories:
- Delete individual memories via voice ("forget my coffee preference") or via the memory management UI.
- All stored facts are isolated per `userId` with cryptographic tenancy isolation.
