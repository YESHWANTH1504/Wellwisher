# PHASE 10: WORKFLOW CAPABILITY COMPOSITION MATRIX
**Autonomous Workflow & Verified Agent Runtime**
**System:** JARVIS AI Operating System Layer (WellWisher OS)  
**Date:** 2026-10-06  
**Status:** COMPLETED & VERIFIED  

---

## 1. Overview & Reusable Composability (Section 24)

Phase 10 transforms Phase 9 atomic Android capabilities into composable, reusable building blocks for multi-step autonomous workflows.

Instead of creating ad-hoc, hardcoded workflows for specific sentences, JARVIS defines modular capability nodes that can be assembled into arbitrary valid Directed Acyclic Graphs (DAGs) under strict safety contracts.

---

## 2. Composable Capability Matrix

| Capability Identifier | Domain | Invocation Mechanism | Safety Level | Privacy Level | Rollback Support | Verification Strategy | Composable In Workflows |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **`open_application`** | `SYSTEM` | Android Launch Intent (`am start -p`) | 0 | `LOCAL_ONLY` | ❌ No | WindowManager Focus | Pre-step, Standalone, Handoff |
| **`open_system_settings`** | `SYSTEM` | `ACTION_SETTINGS` intent | 0 | `LOCAL_ONLY` | ❌ No | Foreground Package Inspection | Troubleshooting, Handoff |
| **`navigate_to_location`** | `NAVIGATION` | Google Maps `ACTION_VIEW geo:` | 1 | `CLOUD_ALLOWED` | ❌ No | Foreground Maps Window | Downstream of Search / Resolve |
| **`search_location`** | `NAVIGATION` | Maps / Local POI Provider | 0 | `CLOUD_ALLOWED` | ❌ No | Location Entity Presence | Upstream of Directions, Share |
| **`android.app.maps.resolve`** | `NAVIGATION` | Geocoding & Address Parser | 0 | `LOCAL_ONLY` | ❌ No | Structured Address Validation | Intermediary between Search & Send |
| **`calendar_create_event`** | `CALENDAR` | MySQL Routines / Calendar Provider | 1 | `LOCAL_ONLY` | ✔ Yes (`DELETE`) | Authoritative DB Query | Standalone, Linked Reminder DAG |
| **`update_calendar_event`** | `CALENDAR` | MySQL Routines / Calendar Provider | 1 | `LOCAL_ONLY` | ✔ Yes (Revert) | Authoritative DB Query | Multi-Turn Reschedule, DAG |
| **`delete_calendar_event`** | `CALENDAR` | MySQL Routines / Calendar Provider | 3 | `LOCAL_ONLY` | ❌ No | Authoritative DB Row Absence | Standalone (Confirmation Required) |
| **`create_reminder`** | `REMINDERS` | ActiveTaskManager / MySQL Routines | 1 | `LOCAL_ONLY` | ✔ Yes (`DELETE`) | System Reminder Verification | Downstream of Meeting Create/Move |
| **`resolve_contact`** | `COMMUNICATION`| Android Contacts Provider Bridge | 0 | `LOCAL_ONLY` | ❌ No | Phone/Contact Record Presence | Upstream of WhatsApp, SMS, Call |
| **`send_whatsapp_message`** | `COMMUNICATION`| WhatsApp `ACTION_SEND` Intent | 2 | `PRIVATE_DEVICE` | ❌ No | Activity Window & User Handoff | Downstream of Contact & Content |
| **`android.communication.message.compose`** | `COMMUNICATION`| Safe Compose Buffer | 1 | `LOCAL_ONLY` | ✔ Yes (Clear) | Buffer Verification | Pre-dispatch staging |
| **`send_sms`** | `COMMUNICATION`| Telephony `ACTION_SENDTO smsto:` | 2 | `PRIVATE_DEVICE` | ❌ No | Intent Dispatch & SmsManager | Downstream of Contact & Compose |
| **`make_phone_call`** | `COMMUNICATION`| Telephony `ACTION_CALL` | 2 | `LOCAL_ONLY` | ❌ No | Call State Listener | Standalone, Post-search |
| **`share_content`** | `COMMUNICATION`| Android Sharesheet (`ACTION_SEND`) | 1 | `LOCAL_ONLY` | ❌ No | Sharesheet Foreground Focus | Downstream of Map/Address Resolve |

---

## 3. Workflow Composition Chains (Section 25)

### Location Sharing Pipeline:
```
search_location ──▶ android.app.maps.resolve ──▶ resolve_contact ──▶ send_whatsapp_message
    (Step 1)                  (Step 2)                 (Step 3)                  (Step 4)
```

### Calendar + Linked Reminder Pipeline:
```
calendar_create_event ──(Pipes eventId & time)──▶ create_reminder (offset: -1 hr)
       (Step 1)                                                (Step 2)
```

### Multi-Turn Reschedule Pipeline:
```
resolve_entity("second meeting") ──▶ update_calendar_event ──▶ create_reminder (offset: -30 min)
         (Step 1)                               (Step 2)                        (Step 3)
```
