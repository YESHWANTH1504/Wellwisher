# PHASE 51: ALWAYS-ON VOICE ASSISTANT OPERATIONAL RUNBOOK

## 1. Executive Overview
- **System**: WellWisher JARVIS Always-On Voice Assistant
- **Target Journey**: Screen Off / Background → "Hey Jarvis" (Local Wake Word) → Speech Recognition (STT) → JARVIS Voice Gateway → Gemini 2.5 Flash → Intent/Safety/Tools → Verified Execution → Natural Speech (TTS) → Return to Wake Word Listening.
- **Release Status**: `GO_LIVE_APPROVED_WITH_LIMITATIONS`
- **Software Test Status**: `SOFTWARE_VERIFIED = true` (492 automated tests passing)
- **Physical Device Status**: `PHYSICAL_DEVICE_VERIFIED = NOT_VERIFIED` (Hardware not physically attached during test execution)

---

## 2. Voice Architecture & Subsystems

```
[Android OS (Screen-Off/Background)]
               │
               ▼
   [JarvisVoiceService (Foreground Service: microphone)]
               │
       ┌───────┴──────────────────────┐
       │ (1) Local Wake Word Engine   │ <── "Hey Jarvis" (On-Device PCM 16kHz)
       └───────┬──────────────────────┘
               ▼
       ┌──────────────────────────────┐
       │ (2) SpeechRecognizerManager  │ <── Android SpeechRecognizer (User Command)
       └───────┬──────────────────────┘
               ▼
       ┌──────────────────────────────┐
       │ (3) JarvisApiClient (Secure) │ <── POST /api/jarvis/voice/command
       └───────┬──────────────────────┘
               ▼
[JARVIS Backend & Gemini 2.5 Flash]
  - voiceCommandRouter.js
  - voiceSessionManager.js
  - jarvisAgent.js & llmAdapter.js (Gemini 2.5 Flash)
  - Tool Execution & Verification
               │
               ▼
       ┌──────────────────────────────┐
       │ (4) JarvisTtsManager (TTS)   │ <── Android TextToSpeech Output
       └───────┬──────────────────────┘
               │
               ▼
[Return to (1) Passive Wake Word Listening]
```

---

## 3. Operational State Machine

| State | Role | Next Permitted States |
|---|---|---|
| `IDLE` | Service stopped / dormant | `STARTING`, `PERMISSION_ERROR` |
| `STARTING` | Initializing audio & engines | `LISTENING_FOR_WAKE_WORD`, `WAKE_WORD_ERROR` |
| `LISTENING_FOR_WAKE_WORD` | Passive local keyword spotting | `WAKE_WORD_DETECTED`, `IDLE` |
| `WAKE_WORD_DETECTED` | Keyword matched ("Hey Jarvis") | `LISTENING_FOR_COMMAND`, `STT_ERROR` |
| `LISTENING_FOR_COMMAND` | Recording user speech command | `TRANSCRIBING`, `STT_ERROR`, `RECOVERY` |
| `TRANSCRIBING` | Producing final transcript | `UNDERSTANDING`, `STT_ERROR` |
| `UNDERSTANDING` | LLM planning (Gemini 2.5 Flash) | `AUTHORIZING`, `EXECUTING`, `SPEAKING` |
| `AUTHORIZING` | Safety & permission validation | `EXECUTING`, `WAITING_CONFIRMATION` |
| `EXECUTING` | Tool mutation execution | `VERIFYING`, `BACKEND_ERROR` |
| `VERIFYING` | Database & provider check | `SPEAKING`, `RECOVERY` |
| `SPEAKING` | Spoken TTS output | `LISTENING_FOR_WAKE_WORD`, `RECOVERY` |
| `RECOVERY` | Safe failure recovery | `LISTENING_FOR_WAKE_WORD`, `IDLE` |

---

## 4. End-to-End Voice Journey Verification Matrix

| Journey | Description | Automated Status | Real Device Status |
|---|---|---|---|
| **Journey A** | Basic Voice (2+2 Conversational) | `AUTOMATED_VERIFIED` | `NOT_VERIFIED` |
| **Journey B** | Calendar Management & Queries | `AUTOMATED_VERIFIED` | `NOT_VERIFIED` |
| **Journey C** | Reminder Creation & Verification | `AUTOMATED_VERIFIED` | `NOT_VERIFIED` |
| **Journey D** | Alarm / Exact Timing Scheduling | `AUTOMATED_VERIFIED` | `NOT_VERIFIED` |
| **Journey E** | Barge-In & Cancellation ("Cancel that") | `AUTOMATED_VERIFIED` | `NOT_VERIFIED` |
| **Journey F** | Multi-Turn Conversational Follow-Up | `AUTOMATED_VERIFIED` | `NOT_VERIFIED` |
| **Journey G** | Failure Recovery (Network/STT/TTS) | `AUTOMATED_VERIFIED` | `NOT_VERIFIED` |

---

## 5. Security & Privacy Guardrails
1. **Zero Raw-Audio Persistence**: Neither the Android service nor the backend database stores ambient or raw microphone buffers.
2. **Replay & Idempotency Protection**: Nonces and timestamp freshness checks prevent command replication attacks.
3. **Medical Safety Guardrail**: Prohibits altering prescription drug doses or providing clinical diagnoses.
4. **Prompt Injection Defense**: Filters overt system instruction overrides.
