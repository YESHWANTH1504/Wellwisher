# Phase 11 — Proactive Capability & Decision Matrix

## 1. Overview

The Proactive Capability Matrix establishes the authoritative mapping between proactive events, trigger conditions, required confidence bands, decision levels, safety levels, and user reversibility.

In accordance with the core design invariant:
> **PROACTIVE != UNAUTHORIZED AUTONOMY**
> Actions with side effects, external communication, or data mutation require explicit user confirmation regardless of confidence score.

---

## 2. Decision Level Hierarchy Reference

| Level | Code | Behavior | User Friction | Permitted In Modes |
|:---:|:---:|---|:---:|---|
| **A** | `OBSERVE` | Silent background logging & pattern accumulation | Zero | `OFF`, `ASSISTED`, `BALANCED`, `PROACTIVE` |
| **B** | `SUGGEST` | Non-intrusive informational card / subtle banner | Low | `ASSISTED`, `BALANCED`, `PROACTIVE` |
| **C** | `PREPARE` | Pre-stage workflow artifacts (drafts, routes, briefs) | Zero | `BALANCED`, `PROACTIVE` |
| **D** | `ASK` | Proactive prompt requiring explicit user confirmation | Moderate | `BALANCED`, `PROACTIVE` |
| **E** | `EXECUTE` | Autonomous background execution with notification | Zero | `PROACTIVE` (Low-risk, reversible only) |

---

## 3. Master Proactive Capability Matrix

| Capability Domain | Trigger Condition | Min Confidence Score | Policy Decision Level | Safety Level | Reversibility | Fallback Behavior |
|---|---|:---:|:---:|:---:|:---:|---|
| **Morning Briefing** | First phone unlock between 06:00–09:30 | 0.80 (`HIGH`) | **Level B** (`SUGGEST`) | Level 0 | N/A (Read-only) | Silent dashboard card |
| **Evening Recap** | Screen unlock between 20:00–22:00 | 0.75 (`HIGH`) | **Level B** (`SUGGEST`) | Level 0 | N/A (Read-only) | Silent dashboard card |
| **Pre-Meeting Brief** | Calendar meeting starting in 10–25 minutes | 0.85 (`HIGH`) | **Level C** (`PREPARE`) | Level 0 | N/A (In-memory staging) | Discard staging post-meeting |
| **Travel & Route Prep** | Meeting location requires commute (>20 min) | 0.85 (`HIGH`) | **Level C** (`PREPARE`) | Level 0 | N/A | Surface map card if user opens device |
| **Battery Saver Suggestion** | Battery drops below 20% while discharging | 0.90 (`VERY_HIGH`) | **Level B** (`SUGGEST`) | Level 1 | Fully reversible | Auto-dismiss if plugged into charger |
| **Silent Mode for Meeting** | Calendar event tagged *Busy* / *In Meeting* begins | 0.85 (`HIGH`) | **Level D** (`ASK`) | Level 1 | Fully reversible | Retain current ringer mode |
| **WhatsApp Message Suggestion** | Routine daily message time detected | 0.90 (`VERY_HIGH`) | **Level D** (`ASK`) | Level 2 | Irreversible once sent | Retain draft, never send automatically |
| **Phone Call Suggestion** | Pre-scheduled call or missed follow-up | 0.90 (`VERY_HIGH`) | **Level D** (`ASK`) | Level 2 | Irreversible | Discard prompt after 10 minutes |
| **Media Player Control** | Commute pattern / Bluetooth headphone connect | 0.85 (`HIGH`) | **Level B** (`SUGGEST`) | Level 1 | Fully reversible | Retain pause state |
| **Workflow DAG Pre-staging** | Detected multi-step routine with >0.90 confidence | 0.90 (`VERY_HIGH`) | **Level C** (`PREPARE`) | Level 1 | Fully cancellable | Discard unconfirmed staged DAG |
| **Auto-Execute Reversible Task** | High-confidence repetitive sync task in Mode PROACTIVE | 0.95 (`VERY_HIGH`) | **Level E** (`EXECUTE`) | Level 1 | 100% Reversible via audit log | Downgrade to Level D if mode is BALANCED |
| **Data Deletion / File Purge** | Storage low warning detected | N/A | **PROHIBITED** | Level 3 | Irreversible | NEVER PROACTIVE. Manual user action only |
| **Financial / Payment Action** | Bill due date detected | N/A | **PROHIBITED** | Level 3 | Irreversible | Informational reminder only (Level B) |

---

## 4. Multi-Layer Policy Gate Enforcements

```
[ Context Trigger Event ]
          │
          ▼
┌─────────────────────────────────┐
│ Confidence Evaluation Engine    │  Score: 0.00 - 1.00
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ Fatigue & Quiet Hours Guard     │  22:00–07:00 / Cooldown / Max 5/hr
└────────────────┬────────────────┘
                 │ (Passed)
                 ▼
┌─────────────────────────────────┐
│ Proactive Policy Mode Gate      │  OFF / ASSISTED / BALANCED / PROACTIVE
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ Safety Level Constraint Gate    │  Level 2 & 3 CANNOT exceed Level D (ASK)
└────────────────┬────────────────┘  Level 3 Autonomous Actions STRICTLY FORBIDDEN
                 │
                 ▼
┌─────────────────────────────────┐
│ Phase 10 Workflow Engine Bridge │  Durable DAG Execution & Verification
└─────────────────────────────────┘
```

---

## 5. User In-Flight Cancellation & Override Protocol

1. **Voice Override**: User uttering *"Stop"*, *"Cancel"*, or *"Not now"* halts any in-flight proactive prompt or workflow staging immediately.
2. **Preference Learning**: A negative feedback response (`DISMISSED` or `THUMBS_DOWN`) instantly adjusts pattern confidence downwards (-0.15) and enforces a 4-hour domain cooldown.
3. **Emergency Stop Button**: The Flutter Proactive Center screen provides a global toggle to instantly switch Mode to `OFF`, terminating all background proactive evaluation.
