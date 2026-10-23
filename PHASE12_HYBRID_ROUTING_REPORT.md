# PHASE 12 HYBRID ROUTING POLICY REPORT

**JARVIS AI Operating System (WellWisher)**  
**Module:** `JarvisHybridRoutingPolicy` & `JarvisHybridIntelligenceFabric`  
**Evaluation Standard:** 14-Factor Multi-Attribute Decision Architecture  

---

## 1. Routing Decision Architecture

Every incoming user intent or system action undergoes routing evaluation against 14 composite parameters:
1. **User Intent:** Greeting, Device Control, Calendar, Memory, Weather, Deep Reasoning.
2. **Privacy Classification:** `LOCAL_ONLY`, `HYBRID_ALLOWED`, `CLOUD_ALLOWED`.
3. **Required Capability:** `LOCAL_FAST`, `LOCAL_TTS`, `CLOUD_REASONING`, `CLOUD_VISION`, etc.
4. **Local Runtime Availability:** Verified state from `JarvisLocalModelRegistry`.
5. **Network Connectivity State:** `ONLINE`, `HYBRID`, `OFFLINE`, `DEGRADED`.
6. **Model Quality & Confidence:** NLU classification confidence score.
7. **Latency Target:** Estimated round-trip latency (Cloud vs Local).
8. **Battery Level:** Current hardware percentage and charging state.
9. **Thermal Throttle Status:** Android thermal level (`NORMAL`, `MODERATE`, `SEVERE`, `CRITICAL`).
10. **User Preferences:** Explicit user overrides (e.g. "prefer on-device").
11. **Conversational Entity Lock:** Presence of active entity in `JarvisConversationState`.
12. **Safety Level:** Safety Level 0 (Read), 1 (Reversible), 2 (User Confirm), 3 (Destructive).
13. **Proactive Mode:** `OFF`, `ASSISTED`, `BALANCED`, `PROACTIVE`.
14. **Provider Health:** Reachability of Gemini, OpenAI, ElevenLabs, LiveKit.

---

## 2. Dynamic Routing Decision Matrix

| Scenario / Utterance | Network State | Device State | Selected Route | Model Provider | Decision Rationale |
|:---|:---:|:---:|:---:|:---:|:---|
| *"What time is it?"* | ONLINE | 100% Bat, Normal | **LOCAL** | `RULE_NLU` | Fast device query fulfilled locally without wasting network |
| *"What time is it?"* | OFFLINE | 100% Bat, Normal | **LOCAL** | `RULE_NLU` | Deterministic local clock fulfillment |
| *"Open WhatsApp"* | ONLINE | 100% Bat, Normal | **LOCAL** | `ANDROID_INTENT` | Native Android application launch |
| *"Open WhatsApp"* | OFFLINE | 100% Bat, Normal | **LOCAL** | `ANDROID_INTENT` | Native Android capability works offline |
| *"What is my password?"* | ONLINE | 100% Bat, Normal | **LOCAL** | `LOCAL_ONLY` | Privacy Router forces credentials to stay on-device |
| *"Compare 5 quantum algorithms"* | ONLINE | 100% Bat, Normal | **CLOUD** | `GEMINI_PRO` / `OPENAI` | Deep reasoning query permitted on cloud |
| *"Compare 5 quantum algorithms"* | OFFLINE | 100% Bat, Normal | **DEGRADED** | `EXPLICIT_NOTICE` | Local reasoning unavailable on target device |
| *"Compare 5 quantum algorithms"* | ONLINE | Bat < 15%, Discharging | **CLOUD** | `OPENAI` | Cloud execution saves battery vs heavy local compute |
| *"Synthesize audio response"* | ONLINE (ElevenLabs Failed) | Normal | **LOCAL** | `ANDROID_TTS` | Dynamic failover to native Android TTS |
| *"What is the weather?"* | ONLINE | Normal | **CLOUD** | `WEATHER_SERVICE` | Real-time weather lookup |
| *"What is the weather?"* | OFFLINE | Normal | **DEGRADED** | `EXPLICIT_NOTICE` | Non-fabrication rule prohibits synthetic forecasts |

---

## 3. Dynamic Provider Failover Pipeline

```
                              REQUEST REQUIRING REASONING
                                           │
                                           ▼
                                IS NETWORK ONLINE?
                                ├── No ──► LOCAL REASONING AVAILABLE?
                                │             ├── Yes ──► EXECUTE LOCAL REASONING
                                │             └── No  ──► EXPLICIT DEGRADED NOTICE
                                │
                                └── Yes
                                     │
                                     ▼
                            IS GEMINI HEALTHY?
                            ├── Yes ──► EXECUTE GEMINI
                            └── No
                                 │
                                 ▼
                        IS OPENAI HEALTHY?
                        ├── Yes ──► EXECUTE OPENAI
                        └── No
                             │
                             ▼
                    IS LOCAL REASONING AVAILABLE?
                    ├── Yes ──► FALLBACK TO LOCAL REASONING
                    └── No  ──► DETERMINISTIC LOCAL CAPABILITY OR DEGRADED
```

This deterministic pipeline ensures that a cloud provider outage never halts core device assistant capabilities.
