# PHASE 52: LIVEKIT REALTIME COMMUNICATION & AGENT RUNTIME ARCHITECTURE

## 1. Executive Summary
Phase 52 introduces LiveKit as the realtime WebRTC voice transport and agent runtime layer for WellWisher JARVIS.
Rather than replacing existing JARVIS safety, context, or tool registries, LiveKit operates as the low-latency audio transport bridge connecting the Android foreground service directly to the `JarvisSupervisorAgent`.

---

## 2. LiveKit Architecture Diagram

```
[Android OS (Screen-Off / Background)]
               │
               ▼
[JarvisVoiceService (Foreground Service: microphone|dataSync)]
               │
       ┌───────┴────────────────────────┐
       │ (1) Local Wake Word ("Hey Jarvis") │ (16kHz PCM, on-device)
       └───────┬────────────────────────┘
               │ (Wake word matched)
               ▼
       ┌────────────────────────────────┐
       │ (2) LiveKitVoiceClient (WebRTC) │ <═══ WebSocket / WebRTC RTP Audio Stream ═══>
       └───────┬────────────────────────┘
               │
               ▼
[LiveKit Realtime Gateway (Backend)]
       ├── LiveKitTokenService (Cryptographic Short-Lived Access Tokens)
       ├── LiveKitRoomManager (Room Lifecycle & Participant State)
       ├── LiveKitAudioSession (VAD Energy Thresholding & Silence Detection)
       ├── JarvisLiveKitAgent (Voice Agent Runtime)
       │       │
       │       ▼
       ├── JarvisSupervisorAgent (Central Orchestrator)
       │       ├── ConversationAgent (Multi-turn context & slot resolution)
       │       ├── TaskPlanningAgent (Structured tool planning)
       │       ├── SafetyAuthorizationAgent (Guardrails & confirmation tokens)
       │       ├── ToolExecutionAgent (ToolRegistry & ActionEvidenceEngine)
       │       ├── MemoryAgent (Working memory & user preferences)
       │       └── Domain Agents (Calendar, Reminder, Alarm, Wellness, Device)
       │
       ▼
[Gemini 2.5 Flash Reasoning (via LlmAdapter.js)]
       │
       ▼
[VoiceResponseFormatter (Sanitized Spoken TTS)]
       │
       ▼
[Streaming Audio Playback to Android Device]
```

---

## 3. Component Breakdown

### A. `LiveKitTokenService.js`
- Generates short-lived (10-minute default) access tokens using HMAC-SHA256 signed JWTs with standard LiveKit video grants:
  - `roomJoin: true`
  - `canPublish: true`
  - `canSubscribe: true`
  - `canPublishData: true`
  - `canPublishSources: ['microphone']`
- Nonce and timestamp validation provides replay protection against hijacked tokens.
- Server secrets (`LIVEKIT_API_SECRET`) are strictly maintained on the backend and never exposed to the frontend.

### B. `LiveKitRoomManager.js`
- Tracks active voice rooms, participant join/leave timestamps, audio mute states, and automatic garbage collection of stale empty rooms.

### C. `LiveKitAudioSession.js`
- Evaluates 16kHz PCM audio buffers with Root Mean Square (RMS) energy thresholding (`vadEnergyThreshold = 0.015`).
- Emits `speech_start`, `speech_end` (with 1.2s silence detection), and `barge_in` interruption events.

### D. `JarvisLiveKitAgent.js`
- Manages the end-to-end voice loop: receives audio streams, detects user turns, invokes the `JarvisSupervisorAgent`, generates spoken feedback, and coordinates immediate barge-in interruption.

### E. `LiveKitToolAdapter.js`
- Bridges LiveKit realtime agent tool requests to the authoritative `ToolRegistry`, enforcing idempotency keys, single-use confirmation tokens, and `ActionEvidenceEngine` verification.

---

## 4. Certification & Release Status
- **Architecture**: `IMPLEMENTED`
- **Automated Tests**: `AUTOMATED_VERIFIED` (529 tests passing)
- **LiveKit Server Cloud Testing**: `NOT_VERIFIED` (Mock transport used for automated unit suites)
- **Real Device Hardware**: `NOT_VERIFIED` (Awaiting physical hardware connection)
