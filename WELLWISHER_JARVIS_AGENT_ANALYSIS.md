# WellWisher JARVIS Agent Orchestrator Architecture Analysis (Phase 4)

---

## 1. Existing AI & Foundation Architecture
- **Phase 1 (AI Persistence)**:
  - `AiConversationRepository`: Manages session lifecycles, messages across roles (`user`, `assistant`, `tool`), and timestamps.
  - `AiMemoryRepository`: Stores categorized user memories (`USER_PREFERENCE`, `ROUTINE_PREFERENCE`, etc.) with 1-5 importance ratings.
  - `AiPreferenceRepository`: Stores assistant persona settings, voice, language, and response style (`CONCISE`, `DETAILED`, `ELDERLY_AFFECTIONATE`, `PROFESSIONAL`).
  - `AiPermissionRepository`: Manages user-configured action permissions (`ASK_ALWAYS`, `AUTO_APPROVE`, `DISABLED`).
  - `AiAgentRunRepository`: Tracks multi-step execution lifecycle (`PLANNED`, `RUNNING`, `WAITING_FOR_CONFIRMATION`, `COMPLETED`, `FAILED`) and step audits.
- **Phase 2 (Tool Registry & Safety)**:
  - Central `ToolRegistry` containing 24 registered, validated tools.
  - Strict server-side context validation (`context.userId`).
  - Built-in `WAITING_FOR_CONFIRMATION` flow for high-risk actions (`delete_schedule`, `send_family_notification`).
- **Phase 3 (Context Engine & Hybrid Retrieval)**:
  - `TemporalContext`: Timezone-aware date math and diurnal periods.
  - `ContextRouter`: Domain relevance routing.
  - `ContextRanker`: Multi-factor deterministic scoring and budget capping.
  - Bounded retrievers for schedules, memories, conversations, wellness, medications, and family.

---

## 2. Phase 4 Orchestration Pipeline

```
USER REQUEST + JWT TOKEN
          ↓
  verifyToken Middleware (Derives authenticated req.userId)
          ↓
  JARVIS Agent Orchestrator (JarvisAgent.processRequest)
          ↓
  State Machine (RECEIVED → UNDERSTANDING → CONTEXT_BUILDING → PLANNING)
          ↓
  Phase 3 ContextEngine.buildContext(userId, requestText)
          ↓
  LLM Provider / Adapter (Structured Decision & Intent Formulation)
          ↓
  Plan Validator & Injection Defense (Guarantees tool is in registry & arguments valid)
          ↓
  Phase 2 ToolRegistry.execute(toolName, context, arguments)
          ↓
  ┌───────────────────────────────────────────────┐
  │ IF REQUIRES CONFIRMATION:                     │
  │   Generate single-use Confirmation Token      │
  │   Agent State → WAITING_FOR_CONFIRMATION      │
  │                                               │
  │ IF AUTO_APPROVED / CONFIRMED:                 │
  │   Execute Tool → Tool Result                  │
  │   Agent Verifier (Verifies DB state mutation) │
  │   Agent State → COMPLETED                     │
  └───────────────────────────────────────────────┘
          ↓
  Persist Conversation Message (User turn, Assistant response, Tool calls)
          ↓
  Structured Agent Response Builder (Standardized JSON payload for Flutter)
```

---

## 3. Missing Components Implemented in Phase 4
1. **`LLMProvider` & `LLMAdapter`**: Abstraction over external LLM APIs (Gemini `@google/genai` or mock rule-based reasoning engine) with strict JSON output schemas, timeout bounds, and safe error fallbacks.
2. **`ConfirmationManager`**: Server-side cryptographic single-use confirmation token generator and validator (bound to `userId + agentRunId + tool + argumentsHash + expiresAt`).
3. **`IdempotencyManager`**: Action deduplication tracker preventing duplicate schedule creation on network retries.
4. **`AgentPlanner`**: Converts LLM outputs into bounded, ordered execution steps (`MAX_AGENT_STEPS = 8`).
5. **`AgentVerifier`**: Actively validates that database mutations took effect before claiming success.
6. **`AgentResponseBuilder`**: Structured Flutter contract generator.
