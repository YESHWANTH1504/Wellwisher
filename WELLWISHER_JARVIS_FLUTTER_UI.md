# WellWisher Flutter JARVIS Client, Voice Pipeline & Interactive UI (Phase 5)

---

## 1. Executive Summary
Phase 5 integrates the **Flutter JARVIS AI Companion Interface** directly into WellWisher:
- **Backend-Driven Voice & Conversational Client**: Flutter acts strictly as the presentation, voice STT/TTS, and confirmation UI layer. All reasoning, tool executions, and security checks remain on the Node.js backend agent.
- **Dynamic Animated JARVIS Orb**: Reacts to 7 distinct AI states (`idle`, `listening`, `thinking`, `executing`, `speaking`, `waitingForConfirmation`, `error`) with breathing pulses and orbital particle animations.
- **Interactive Single-Use Confirmation Cards**: Renders high-risk operations requiring user consent (`delete_schedule`, `send_family_notification`) with structured metadata and dedicated Confirm / Cancel actions wired to `POST /api/ai/confirm-action`.
- **Integrated Voice Pipeline with Interruptibility**:
  - **Speech-to-Text (STT)**: `VoiceInputService` handles microphone capture and Indian English locale (`en_IN`).
  - **Text-to-Speech (TTS)**: `JarvisTtsService` reads out responses smoothly and immediately halts when the microphone is tapped to enable natural interruption.
  - **Wake-Word Extension Point**: `WakeWordService` abstraction is prepared for future on-device keyword spotting.
- **State Invalidation & Synchronization**: Successful JARVIS actions automatically trigger state invalidation callbacks to refresh active screens (such as `ScheduleScreen` or `HydrationService`) without manual reload.
- **Full Accessibility**: Microphone and UI elements include semantic labels (`Talk to JARVIS`, `JARVIS Central AI Core`).

---

## 2. Directory Structure Implemented

```
frontend/lib/features/jarvis/
├── models/
│   └── jarvis_models.dart          # Strongly-typed models (JarvisResponse, JarvisAction, JarvisConfirmation, JarvisMessage, JarvisOrbState)
├── services/
│   ├── jarvis_api_service.dart     # HTTP client communicating with /api/ai/chat and /api/ai/confirm-action
│   ├── voice_input_service.dart    # Speech-to-Text service wrapper
│   ├── jarvis_tts_service.dart     # Text-to-Speech audio synthesizer with interruption
│   └── wake_word_service.dart      # Future wake-word extension point
├── controller/
│   └── jarvis_controller.dart      # StateNotifier managing speech, turn history, confirmation states, and UI sync
├── widgets/
│   ├── jarvis_orb.dart             # Animated state-reactive canvas Orb
│   ├── confirmation_card.dart      # Interactive confirmation widget
│   ├── action_card.dart            # Visual cards for schedules, hydration, and memories
│   └── jarvis_chat_bubble.dart     # Message bubbles rendering turns and attached action cards
└── screens/
    └── jarvis_screen.dart          # Full futuristic AI companion screen
```

---

## 3. Interaction & Confirmation Flow

```
USER
  │  (Taps mic: "Delete my dentist appointment")
  ▼
STT / Speech-To-Text
  │  (Captures transcript)
  ▼
POST /api/ai/chat
  │  (Backend JARVIS evaluates delete_schedule -> ASK_ALWAYS)
  ▼
{ "type": "CONFIRMATION_REQUIRED", "confirmation": { "confirmationId": "conf_...", "tool": "delete_schedule" } }
  │
  ▼
Flutter renders ConfirmationCard
  │
  ├─► [Cancel] ──► Dismisses confirmation, leaves database untouched.
  │
  └─► [Confirm]
        │
        ▼
      POST /api/ai/confirm-action
        │  (Backend validates token -> deletes routine -> verifies DB)
        ▼
      { "type": "ACTION_COMPLETED", "message": "Successfully deleted routine." }
        │
        ▼
      1. Renders ActionCard ("Deleted")
      2. Invokes onStateInvalidationRequired (refreshes schedule list)
      3. Speaks response via TTS
```
