# PHASE 7: JARVIS OS UNIVERSAL CAPABILITY MATRIX

This matrix catalogs the capabilities registered in `JarvisCapabilityRegistry` across domains, detailing platform, risk level, required permissions, confirmation requirements, and verification mechanisms.

| Domain | Capability Name | Platform | Risk Level | Required Permissions | Confirmation Policy | Verification Mechanism |
|---|---|---|---|---|---|---|
| **SYSTEM** | `get_device_telemetry` | ANDROID | Level 0 | None | NEVER | State observation via dumpsys / battery manager |
| **SYSTEM** | `open_application` | ANDROID | Level 1 | `open_app` | NEVER | WindowManager foreground focus check (`mCurrentFocus`) |
| **SYSTEM** | `open_settings` | ANDROID | Level 1 | None | NEVER | Intent launch & ActivityRecord verification |
| **DEVICE** | `set_alarm` | ANDROID | Level 1 | `SET_ALARM` | NEVER | AlarmManager registration query |
| **DEVICE** | `cancel_alarm` | ANDROID | Level 1 | `SET_ALARM` | NEVER | AlarmManager cancellation query |
| **COMMUNICATION** | `phone_call` | ANDROID | Level 2 | `CALL_PHONE` | ALWAYS_REQUIRED | TelephonyManager call state / dialer intent |
| **COMMUNICATION** | `send_sms` | ANDROID | Level 2 | `SEND_SMS` | ALWAYS_REQUIRED | Telephony SMS provider delivery verification |
| **CALENDAR** | `calendar_get_today` | BACKEND | Level 0 | `READ_CALENDAR` / `get_schedule` | NEVER | MySQL read query validation |
| **CALENDAR** | `create_event` | BACKEND | Level 1 | `WRITE_CALENDAR` / `create_event` | NEVER | MySQL row insert query verification |
| **CALENDAR** | `reschedule_event` | BACKEND | Level 1 | `WRITE_CALENDAR` / `reschedule_event` | NEVER | MySQL updated timestamp verification |
| **CALENDAR** | `cancel_event` | BACKEND | Level 2 | `WRITE_CALENDAR` / `cancel_event` | CONFIRM_IF_SENSITIVE | MySQL deleted / soft-deleted verification |
| **CALENDAR** | `delete_all_events` | BACKEND | Level 3 | `WRITE_CALENDAR` | ALWAYS_REQUIRED | Strict multi-stage confirmation token |
| **REMINDERS** | `create_reminder` | BACKEND / ANDROID | Level 1 | `SET_ALARM` / `notification` | NEVER | Database record + NotificationManager query |
| **REMINDERS** | `cancel_reminder` | BACKEND / ANDROID | Level 1 | `SET_ALARM` | NEVER | Active task target cancellation check |
| **HEALTH** | `log_vital_sign` | BACKEND | Level 1 | `health_metrics` | NEVER | MySQL health log query |
| **HEALTH** | `get_vital_trends` | BACKEND | Level 0 | `health_metrics` | NEVER | Read-only aggregation query |
| **HEALTH** | `sync_health_connect` | ANDROID | Level 0 | `health_connect` | NEVER | Health Connect API client response check |
| **VISION** | `capture_screen` | ANDROID | Level 0 | `media_projection` | NEVER | Non-empty bitmap byte stream |
| **VISION** | `analyze_image` | CLOUD | Level 0 | None | NEVER | Structured observation JSON output |
| **VISION** | `ocr_document` | BACKEND / LOCAL | Level 0 | None | NEVER | Extracted text bounding boxes |
| **DOCUMENTS** | `summarize_document` | CLOUD | Level 0 | None | NEVER | Document token length and summary presence |
| **WORKFLOW** | `execute_workflow` | BACKEND | Level 1 | `workflow_execution` | CONFIRM_IF_SENSITIVE | Workflow engine step completion check |
| **ACCESSIBILITY** | `interact_ui_element` | ANDROID | Level 2 | `accessibility_service` | ALWAYS_REQUIRED | Post-action UI tree node state diff |

---

## Safety & Permission Classifications
- **Level 0 (Read-Only)**: Pure observation or information lookup. Never alters state or triggers external transmissions.
- **Level 1 (Reversible Mutation)**: Low-risk creation or modification (e.g. creating a calendar event, opening an application). Automatic rollback capability provided.
- **Level 2 (Sensitive Action)**: Operations that initiate external communications, modify existing third-party states, or alter user routine definitions. Requires confirmation unless pre-authorized.
- **Level 3 (Destructive / Financial / Irreversible)**: Mass deletions, financial transactions, or critical system setting modifications. Requires explicit confirmation token; cannot be bypassed by LLM or prompt injection.
