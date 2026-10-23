# PHASE 52: REALTIME VOICE OPERATIONAL RUNBOOK

## 1. System Overview
- **Service**: WellWisher JARVIS Realtime AI Voice Assistant
- **Target Journey**: Screen Off / Background → Local "Hey Jarvis" Wake Word → LiveKit Realtime Voice Session → Streaming STT & VAD → JarvisSupervisorAgent → Gemini 2.5 Flash → Intent/Safety/Tools → Verification → Android Text-To-Speech (TTS) → Immediate Interruption / Barge-in Support → Return to Passive Wake-Word Listening.
- **Release Status**: `GO_LIVE_APPROVED_WITH_LIMITATIONS`
- **Software Test Status**: `SOFTWARE_VERIFIED = true` (529 tests passing)
- **Physical Device Status**: `PHYSICAL_DEVICE_VERIFIED = NOT_VERIFIED`

---

## 2. Realtime Operational State Machine

| State | Description | Next Permitted States |
|---|---|---|
| `DISCONNECTED` | Voice session closed / dormant | `CONNECTING`, `FAILED` |
| `CONNECTING` | LiveKit token exchanged & room establishing | `CONNECTED`, `FAILED` |
| `CONNECTED` | Room active; waiting for user speech | `LISTENING`, `DISCONNECTED` |
| `LISTENING` | User speaking; streaming mic audio over WebRTC | `PROCESSING`, `INTERRUPTED` |
| `PROCESSING` | VAD turn ended; Supervisor reasoning & planning | `SPEAKING`, `FAILED` |
| `SPEAKING` | Spoken TTS audio streaming to device speaker | `CONNECTED`, `INTERRUPTED`, `DISCONNECTED` |
| `INTERRUPTED` | User barge-in detected; TTS stopped immediately | `LISTENING`, `PROCESSING` |
| `RECONNECTING` | Transient network drop; auto-reconnecting | `CONNECTED`, `FAILED` |
| `FAILED` | Fatal session error; safe recovery triggered | `DISCONNECTED`, `CONNECTING` |

---

## 3. Realtime Turn-Taking & Barge-In Protocol
1. User speaks: VAD detects energy > 0.015 RMS → transitions to `LISTENING`.
2. User pauses for 1,200ms: VAD triggers `speech_end` → transitions to `PROCESSING`.
3. Agent synthesizes response: Transitions to `SPEAKING` and begins audio playback.
4. User speaks during playback: `LiveKitAudioSession` detects energy during `SPEAKING` → triggers `barge_in` → TTS audio is halted instantly on native Android layer without waiting for speech completion.
5. Supervisor handles cancellation / correction and updates task state.
