# Phase 11 — Proactive Policy & Decision Gate Report

## 1. Overview
The Proactive Policy Engine enforces explicit authorization tiers, proactive operational modes, strict safety boundaries, and fatigue constraints. It guarantees that JARVIS never acts autonomously beyond explicit user consent.

---

## 2. Decision Levels (A–E)

| Level | Code | Behavior | User Experience | Staging Mechanism |
|---|---|---|---|---|
| **Level A** | `OBSERVE` | Internal logging and pattern refinement | Completely silent. No banner or speech. | Logged in `jarvis_proactive_events`. |
| **Level B** | `SUGGEST` | Informational notification or spoken suggestion | Displays card in Proactive Center feed. | Persisted in `jarvis_proactive_suggestions`. |
| **Level C** | `PREPARE` | Pre-stages workflow without side effects | Silent preparation. Context cached in memory. | Workflow saved in `READY` state. |
| **Level D** | `ASK` | Interactive voice or prompt confirmation | Spoken prompt: *"Would you like me to...?"* | Paused in `AWAITING_CONFIRMATION`. |
| **Level E** | `EXECUTE` | Autonomous execution of authorized low-risk action | Transparent action executed with audit trail. | Dispatched to `JarvisWorkflowEngine`. |

---

## 3. Proactive Autonomy Modes

1. **`OFF`**:
   - Strictly forces Decision Level A (`OBSERVE`).
   - Zero proactive banners, suggestions, audio interruptions, or staged executions.
2. **`ASSISTED`**:
   - Caps decision level at Level B (`SUGGEST`).
   - Generates morning briefings and non-intrusive reminders.
3. **`BALANCED` (Default)**:
   - Permits Level C (`PREPARE`) for context staging and read-only preparation.
   - Demands Level D (`ASK`) before triggering any action with external side effects.
4. **`PROACTIVE`**:
   - Enables Level E (`EXECUTE`) **ONLY IF ALL OF THE FOLLOWING ARE MET**:
     - Mode is set to `PROACTIVE`.
     - Confidence Score is `>= 0.85`.
     - Action is reversible (`isReversible === true`).
     - Safety Level is `<= 1` (Read-only or low-risk local mutation).
     - Category is explicitly listed in `authorized_categories`.
     - Risk level is `ZERO_RISK` or `LOW`.

---

## 4. Absolute Prohibitions (Zero Autonomous Execution)
Under **NO MODE**, regardless of 100% confidence, will JARVIS autonomously execute:
- **Safety Level 2 / 3 Actions**: Forced to Level D (`ASK`) or B (`SUGGEST`).
- **External Communications**: WhatsApp messages, SMS, emails.
- **Voice / Cellular Calls**: Phone calls, VoIP dialing.
- **Destructive File / Entity Deletion**: Calendar event deletion, file removal.
- **Financial Transactions**: Payments, transfers, bank app interactions.
- **Credential Exchanges**: Password entry, OTP reading or autofill.

---

## 5. Fatigue Management & Throttling
- **Quiet Hours**: 22:00 to 07:00 (configurable) suppresses all non-critical suggestions.
- **Midnight Crossover**: Correctly evaluates wraps around 00:00.
- **Interruption Guard**: Suppresses delivery when conversational audio playback is active.
- **Rate Limits**:
  - Hourly Limit: Max 4 suggestions/hr in BALANCED mode.
  - Daily Limit: Max 12 suggestions/day.
- **Deduplication Cooldown**: Identical `dedup_key` blocked for 30 minutes.
- **Critical Priority Override**: Urgent security or system emergency alerts bypass quiet hours and limits.
