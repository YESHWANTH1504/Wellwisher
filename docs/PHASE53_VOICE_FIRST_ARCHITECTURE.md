# Phase 53: Voice-First Architecture

## 1. Voice Pipeline Overview
```
Microphone Ingress (Android Native AudioRecord / Flutter VoiceInputService)
       │
       ▼
Local / Ephemeral Wake-Word Detection ("Hey Jarvis")
       │
       ▼
Realtime WebRTC Audio Streaming (LiveKit Server / STT Engine)
       │
       ▼
Supervisor Agent Orchestration (Multi-turn Context + Task Planning)
       │
       ▼
Spoken Output Formatting (VoiceResponseFormatter)
       │
       ▼
Synthesized Audio Delivery (Android TTS / LiveKit WebRTC Egress)
```

## 2. Barge-In & Interruption Handling
Users can interrupt JARVIS at any time while the assistant is speaking:
1. Tap on the glowing core or mic button triggers an immediate `stopSpeaking()` / `interruptSpeech()` signal.
2. Voice activity detection (VAD) automatically pauses audio output if user speech is detected mid-response.
3. System state transitions instantly from `SPEAKING` to `LISTENING_FOR_COMMAND`.

## 3. Natural Spoken Language vs. Automation Jargon
To ensure an organic, premium assistant persona:
- Prohibited: "Executing task 104", "DB write successful", "JSON formatted output", "Here are your steps: 1. ... 2. ...".
- Enforced: "Done. I've scheduled 'Call Mom' for 7 PM.", "You have 2 items on your schedule today.", "Logged 300 ml of water. Stay hydrated!".
- Implementation: `backend/services/jarvis/agent/VoiceResponseFormatter.js` sanitizes and filters all output text before delivery to TTS engines.
