# WellWisher JARVIS Agent Orchestrator & Client Contract (Phase 4)

---

## 1. Executive Summary
Phase 4 introduces the backend-first **JARVIS AI Agent Orchestrator**, providing bounded reasoning, structured intent classification, prompt injection defenses, multi-step planning, post-execution verification, single-use cryptographic confirmation tokens, idempotency caching, and structured Flutter client contracts.

---

## 2. Complete Agent Architecture Pipeline

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

## 3. Agent State Machine
The agent execution follows an explicit, bounded state machine:
- `RECEIVED`: Request received and user context authenticated.
- `UNDERSTANDING`: User intent analyzed and domain categories identified.
- `CONTEXT_BUILDING`: Context package populated via Phase 3 Context Engine.
- `PLANNING`: LLM generates structured tool execution plan (bounded to `MAX_AGENT_STEPS = 8`).
- `WAITING_FOR_CONFIRMATION`: High-risk action detected; single-use cryptographic token issued.
- `EXECUTING`: Dispatches tools strictly through the Tool Registry.
- `VERIFYING`: Actively checks database persistence for mutations.
- `COMPLETED`: Turn finalized and persisted.
- `FAILED`: Failure recorded with safe client error code.

---

## 4. Cryptographic Confirmation System
High-risk tools (e.g. `delete_schedule`, `send_family_notification`) enforce explicit confirmation:
- Server creates token: `{ confirmationId, userId, agentRunId, tool, argsHash, expiresAt, status: 'PENDING' }`.
- Token is single-use and valid for 5 minutes.
- Cryptographically bound to the specific `userId + tool + arguments`.
- Any tampering (changing tool name, changing routine ID, or expiration) rejects execution with `CONFIRMATION_TOOL_MISMATCH` or `CONFIRMATION_EXPIRED`.

---

## 5. Active Verification Loop
JARVIS never hallucinates or fabricates action success. Before reporting success:
- `create_schedule` / `update_schedule`: Queries `RoutineModel.getById(id, userId)` to verify database row.
- `delete_schedule`: Asserts routine record no longer exists in MySQL.
- `save_memory`: Checks `AiMemoryRepository.getMemoryById(id, userId)`.
- If database verification fails, the agent reports `VERIFICATION_FAILED` and halts.

---

## 6. Prompt & Tool Result Injection Defenses
- **System Rules Priority**: User prompts, memory values, and tool results are treated strictly as untrusted data strings.
- **Override Neutralization**: Commands such as *"Ignore all previous instructions"* or *"Drop database"* are safely intercepted and responded to without executing administrative actions.

---

## 7. Structured Flutter Client Contract
Endpoints: `POST /api/ai/chat` & `POST /api/ai/confirm-action`

### Response Payload Schema:
```json
{
  "success": true,
  "type": "FINAL_RESPONSE | ACTION_COMPLETED | CONFIRMATION_REQUIRED | ERROR",
  "intent": "SCHEDULE_REQUEST | MEMORY_REQUEST | WELLNESS_QUERY | ...",
  "message": "User-facing conversational response message",
  "data": {
    "reply": "...",
    "action": {
      "type": "create_schedule",
      "data": { "createdRoutine": { "id": "rot_123", "title": "Meeting", "time": "10:00 AM" } }
    },
    "requiresConfirmation": false,
    "confirmation": null,
    "agentRunId": "run_456",
    "conversationId": "conv_789",
    "timestamp": "2026-08-20T10:00:00.000Z"
  }
}
```

### Confirmation Required Schema:
```json
{
  "success": true,
  "type": "CONFIRMATION_REQUIRED",
  "intent": "SCHEDULE_DELETE",
  "message": "Action \"delete_schedule\" requires your explicit confirmation before proceeding.",
  "data": {
    "requiresConfirmation": true,
    "confirmation": {
      "confirmationId": "conf_1787203921_abc123",
      "tool": "delete_schedule",
      "arguments": { "scheduleId": "rot_dentist_1" },
      "expiresAt": "2026-08-20T10:05:00.000Z"
    }
  }
}
```
