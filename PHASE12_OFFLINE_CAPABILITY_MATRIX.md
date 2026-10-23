# PHASE 12 OFFLINE CAPABILITY MATRIX

**JARVIS AI Operating System (WellWisher)**  
**Classification Standard:** Honest Separation of Operating Modes  

---

## 1. Operating Mode Definitions

- **ONLINE:** Maximum intelligence. All cloud models (Gemini Pro, GPT-4o, Whisper, ElevenLabs, LiveKit) active.
- **HYBRID:** On-device intent routing + native device perception combined with cloud reasoning where privacy allows.
- **OFFLINE:** Completely disconnected from the internet. All local features execute deterministically.
- **DEGRADED:** Specific cloud or hardware components unavailable; system reports status transparently.

---

## 2. Universal Capability Matrix

| Capability / Feature | ONLINE Mode | HYBRID Mode | OFFLINE Mode | DEGRADED Mode | Implementation Engine |
|:---|:---:|:---:|:---:|:---:|:---|
| **Voice Greeting ("Hello")** | YES | YES | YES | YES | `JarvisOfflineIntentResolver` |
| **Current Time & Date** | YES | YES | YES | YES | Local Hardware Clock |
| **Battery & Telemetry Query** | YES | YES | YES | YES | Android `dumpsys battery` |
| **Open WhatsApp** | YES | YES | YES | YES | Android Intent Launcher |
| **Open System Settings** | YES | YES | YES | YES | Android Settings Provider |
| **Schedule / Agenda Lookup** | YES | YES | YES | YES | MySQL `ai_appointments` |
| **Create Reminder** | YES | YES | YES | YES | MySQL World Model |
| **Modify Reminder Time** | YES | YES | YES | YES | MySQL World Model |
| **Cancel Reminder** | YES | YES | YES | YES | MySQL World Model |
| **Pronoun Entity Locking ("Move it")**| YES | YES | YES | YES | `JarvisConversationState` |
| **Create Personal Memory** | YES | YES | YES | YES | MySQL `ai_memories` |
| **Read Personal Memory** | YES | YES | YES | YES | MySQL `ai_memories` |
| **Delete Personal Memory** | YES | YES | YES | YES | MySQL `ai_memories` |
| **Local DAG Workflow Execution** | YES | YES | YES | YES | `JarvisWorkflowEngine` |
| **Proactive Low-Battery Nudge** | YES | YES | YES | YES | `JarvisAnticipationEngine` |
| **Morning Briefing (Local Data)** | YES | YES | YES | YES | `JarvisAnticipationEngine` |
| **Local TTS Audio Output** | YES | YES | YES | YES | `JarvisLocalTTSProvider` |
| **Local STT Voice Input** | YES | YES | **NO** (Notice) | **NO** (Notice) | Android Recognizer (Needs Lang Pack) |
| **Real-time Live Weather** | YES | YES | **NO** (Notice) | **NO** (Notice) | Cloud Weather API |
| **Deep Reasoning (Quantum, Coding)** | YES | YES | **NO** (Notice) | **NO** (Notice) | Gemini Pro / OpenAI Cloud |
| **Live Web Search** | YES | YES | **NO** (Notice) | **NO** (Notice) | Google Search API |
| **Cloud TTS (ElevenLabs)** | YES | YES | **NO** (Fails over) | **NO** (Fails over) | ElevenLabs Cloud API |
| **LiveKit Realtime Voice** | YES | YES | **NO** (Notice) | **NO** (Notice) | LiveKit Cloud Server |
| **Offline Operation Enqueue** | N/A | N/A | YES | YES | `JarvisOfflineOperationQueue` |
| **Network Return Auto-Sync** | YES | YES | N/A | N/A | `JarvisOfflineSyncEngine` |
