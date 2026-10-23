# PHASE 10: WORKFLOW ENGINE ARCHITECTURE REPORT
**Autonomous Workflow & Verified Agent Runtime**
**System:** JARVIS AI Operating System Layer (WellWisher OS)  
**Date:** 2026-10-06  
**Status:** COMPLETED & VERIFIED  

---

## 1. Executive Summary

The `JarvisWorkflowEngine` transforms JARVIS from a single-intent command executor into a deterministic, permission-aware, observable, recoverable, and verified multi-step workflow runtime.

Unlike chatbot prompt-chains or fragile LLM command generators, the Phase 10 engine executes structured Directed Acyclic Graphs (DAGs) composed of discrete, contract-backed steps. Every step passes through authoritative security gates (Capability Resolver, Permission Manager, Privacy Router, Safety Policy) and must be authoritatively verified against real device/database state before the engine advances to downstream steps.

---

## 2. Core Engine Architecture

```
                  ┌─────────────────────────────────────────┐
                  │          USER GOAL / INTENT             │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │         JarvisWorkflowPlanner           │
                  │   Decompose into Multi-Step DAG         │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │        JarvisWorkflowValidator          │
                  │   Cycle Detection, Catalog Contracts    │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │          JarvisWorkflowEngine           │
                  │        Durable Runtime & FSM            │
                  └─────────┬────────────────────┬──────────┘
                            │                    │
              State Persist │                    │ Lock Mutual Exclusion
                            ▼                    ▼
                ┌──────────────────┐     ┌─────────────────────┐
                │ MySQL Database   │     │ WorkflowLockManager │
                │ jarvis_workflows │     │ (TTL Auto-Expire)   │
                └──────────────────┘     └─────────────────────┘
                            │
               Step Loop:   ▼
                ┌─────────────────────────────────────────┐
                │        Step Dependency Checking         │
                │        (Prerequisites Met?)             │
                └────────────────────┬────────────────────┘
                                     │
                                     ▼
                ┌─────────────────────────────────────────┐
                │      Safety / Privacy Re-evaluation     │
                │      (L2/L3 Pause for Confirmation)     │
                └────────────────────┬────────────────────┘
                                     │
                                     ▼
                ┌─────────────────────────────────────────┐
                │          Action Engine / Bridge         │
                │          Step Execution (ADB/DB)        │
                └────────────────────┬────────────────────┘
                                     │
                                     ▼
                ┌─────────────────────────────────────────┐
                │         Observation Loop                │
                │         (WindowManager, DB, Sensors)    │
                └────────────────────┬────────────────────┘
                                     │
                                     ▼
                ┌─────────────────────────────────────────┐
                │        JarvisVerificationEngine         │
                │        Authoritative Verification       │
                └─────────┬────────────────────┬──────────┘
                          │                    │
                 PASS     │                    │ FAIL
                          ▼                    ▼
                ┌──────────────────┐     ┌─────────────────────┐
                │ State Transfer & │     │ Recovery Engine     │
                │ World Model Upd  │     │ (Retry, Replan, Ask)│
                └──────────────────┘     └─────────────────────┘
```

---

## 3. Finite State Machine (FSM) Specifications

### Workflow States (`WORKFLOW_STATES`)
- `CREATED`: Workflow instantiated, awaiting validation.
- `PLANNING`: Planner generating step graph.
- `READY`: Validated and scheduled for execution.
- `AWAITING_PERMISSION`: Paused; requires Android runtime permission grant.
- `AWAITING_CONFIRMATION`: Paused; Safety Level 2/3 action requires explicit user voice/UI confirmation.
- `AWAITING_USER_INPUT`: Paused for disambiguation (e.g., multiple restaurants or contacts).
- `EXECUTING`: Currently running active step.
- `WAITING_FOR_OBSERVATION`: Action dispatched, awaiting perception feedback.
- `VERIFYING`: Evaluating post-action ground-truth verification.
- `PAUSED`: User requested temporary pause or background hold.
- `RECOVERING`: Error handler evaluating recovery strategy.
- `REPLANNING`: Regenerating alternative DAG following permanent step failure.
- `PARTIALLY_COMPLETED`: Some steps succeeded, but final objective could not be completed.
- `COMPLETED`: All steps verified and goal achieved.
- `FAILED`: Execution terminated with verified error.
- `CANCELLED`: User explicitly cancelled via voice ("Stop", "Cancel").
- `EXPIRED`: Workflow exceeded global timeout TTL.

### Step States (`STEP_STATES`)
`PENDING`, `READY`, `BLOCKED`, `AWAITING_PERMISSION`, `AWAITING_CONFIRMATION`, `AWAITING_USER_INPUT`, `EXECUTING`, `VERIFYING`, `SUCCEEDED`, `FAILED`, `SKIPPED`, `CANCELLED`.

---

## 4. Key Engineering Guarantees

1. **Zero False Completion:** JARVIS never reports "Done." or "Completed" unless every prerequisite step is verified by authoritative system state (WindowManager focus, package manager inspection, or SQL query).
2. **Crash & Reboot Durability:** All workflows and step DAGs persist directly into MySQL tables (`jarvis_workflows`, `jarvis_workflow_steps`, `jarvis_workflow_locks`, `jarvis_workflow_events`). On cold process restart, in-flight workflows are reconstructed faithfully.
3. **Strict State Separation:** The system maintains four strictly separated contextual layers:
   - `activeWorkflow`: In-flight goal & DAG step id.
   - `activeStep`: Active capability execution node.
   - `activeApplication`: Foreground Android package (`com.whatsapp`, etc.).
   - `activeEntity`: Locked semantic focus (`Executive Architecture Review`).
   Launching an application will never mutate or overwrite the active conversational entity.
4. **Mutual Exclusion Resource Locking:** `JarvisWorkflowLockManager` prevents conflicting concurrent workflows from mutating the same resource (e.g., updating a meeting while another flow attempts deletion) with automatic TTL lock expiration to prevent deadlocks.
