# PHASE 9 — UNIVERSAL ANDROID APP CAPABILITY REGISTRY SPECIFICATION

## 1. Registry Architecture Overview

The `JarvisAndroidAppRegistry` and `JarvisAppCapabilityContract` transform WellWisher / JARVIS from an application assistant into a universal Android operating capability registry. Rather than relying on hardcoded app launchers or blind LLM execution, JARVIS registers, discovers, categorizes, and validates applications visible under Android package visibility rules.

```
                    ┌─────────────────────────────────┐
                    │ Android OS Package Visibility   │
                    │   (PackageManager / Intent)     │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │   JarvisAndroidAppRegistry      │
                    │ - Package Metadata              │
                    │ - Semantic Alias Engine         │
                    │ - Capability Mapping            │
                    │ - Availability Lifecycle        │
                    └────────────────┬────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│ Supported Apps      │   │ System Capabilities │   │ Controlled Bridge   │
│ - WhatsApp          │   │ - Wi-Fi Settings    │   │ - Explicit Intents  │
│ - Chrome            │   │ - Bluetooth         │   │ - Action Dispatch   │
│ - Maps              │   │ - Battery / Display │   │ - Controlled A11y   │
│ - Camera / Files    │   │ - Dial / SMS        │   │ - State Verification│
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘
```

---

## 2. Capability Availability States

Every capability registered or evaluated in JARVIS OS transitions through strict deterministic availability states:

| Availability State | Description | Resolution Strategy |
|---|---|---|
| `AVAILABLE` | The application is installed, launchable, and capability contract is active. | Proceed directly to execution planning. |
| `REQUIRES_PERMISSION` | The capability is supported, but one or more Android runtime permissions are missing. | Halt execution honestly and inform the user of the exact missing permission. |
| `REQUIRES_USER_ACTION` | Action cannot be completed automatically without physical user interaction (e.g., in-app biometric authentication). | Prompt user to complete on-screen interaction. |
| `UNSUPPORTED` | Requested capability is not exposed or the application is uninstalled. | Disclose limitation truthfully without hallucination. |
| `BLOCKED` | Action violates safety policy, privacy boundary, or cross-user isolation. | Deny action and log security telemetry. |
| `UNKNOWN` | Target application state cannot be authoritatively queried. | Fail safely; do not guess or execute. |

---

## 3. Registered Application Capability Contracts

### 3.1 Communication & Messaging

#### WhatsApp (`com.whatsapp`)
- **`app.open`**:
  - *Invocation*: Explicit package launch (`android.intent.category.LAUNCHER`)
  - *Risk Level*: 1 (Low-impact)
  - *Verification*: `FOREGROUND_PACKAGE_CHECK` (`mCurrentFocus` matches `com.whatsapp`)
  - *Confirmation Required*: No
- **`communication.contact`**:
  - *Invocation*: Explicit deep link / Contact intent (`content://com.android.contacts/contacts`)
  - *Risk Level*: 1
  - *Verification*: Activity transition verified
  - *Confirmation Required*: No
- **`communication.send_whatsapp`**:
  - *Invocation*: Intent dispatch `android.intent.action.SEND` with target package `com.whatsapp`
  - *Risk Level*: 2 (External side effects)
  - *Privacy Level*: `PRIVATE_DEVICE`
  - *Verification*: `INTENT_DISPATCH_CONFIRMED`
  - *Confirmation Required*: Yes

#### Messages / SMS (`com.google.android.apps.messaging`)
- **`communication.send_sms`**:
  - *Invocation*: `android.intent.action.SENDTO` (`smsto:<phone>`)
  - *Risk Level*: 2
  - *Privacy Level*: `PRIVATE_DEVICE`
  - *Verification*: Intent accepted / bridge dispatch confirmed
  - *Confirmation Required*: Yes

#### Phone Dialer (`com.google.android.dialer`)
- **`communication.make_call`**:
  - *Invocation*: `android.intent.action.CALL` (if `CALL_PHONE` granted) or `android.intent.action.DIAL`
  - *Required Permission*: `android.permission.CALL_PHONE`
  - *Risk Level*: 2
  - *Confirmation Required*: Yes

---

### 3.2 Navigation & Travel

#### Google Maps (`com.google.android.apps.maps`)
- **`navigation.search`**:
  - *Invocation*: `android.intent.action.VIEW` (`geo:0,0?q=<query>`)
  - *Risk Level*: 1
  - *Verification*: `FOREGROUND_PACKAGE_CHECK`
  - *Confirmation Required*: No
- **`navigation.get_directions`**:
  - *Invocation*: `android.intent.action.VIEW` (`google.navigation:q=<destination>`)
  - *Risk Level*: 1
  - *Verification*: Navigation intent dispatched and Google Maps foreground verified
  - *Confirmation Required*: No

---

### 3.3 Media & Content Transfer

#### Media Playback
- **`media.control`**:
  - *Invocation*: Android Media Keyevents (`KEYCODE_MEDIA_PLAY`, `KEYCODE_MEDIA_PAUSE`, `KEYCODE_MEDIA_NEXT`, `KEYCODE_MEDIA_PREVIOUS`)
  - *Risk Level*: 1
  - *Verification*: Keyevent successfully emitted to audio service
  - *Confirmation Required*: No

#### Content Sharing
- **`system.share_content`**:
  - *Invocation*: `android.intent.action.SEND`
  - *Risk Level*: 2
  - *Privacy Level*: `PRIVATE_DEVICE`
  - *Verification*: System share sheet activity brought to foreground
  - *Confirmation Required*: Yes

---

### 3.4 Android System Settings

#### System Settings (`com.android.settings`)
- **`system.open_settings`**:
  - *Supported Setting Types*: `wifi`, `bluetooth`, `battery`, `display`, `apps`, `sound`, `notifications`, `main`
  - *Invocations*:
    - Wi-Fi: `android.settings.WIFI_SETTINGS`
    - Bluetooth: `android.settings.BLUETOOTH_SETTINGS`
    - Battery: `android.settings.BATTERY_SAVER_SETTINGS`
    - Display: `android.settings.DISPLAY_SETTINGS`
    - Applications: `android.settings.APPLICATION_SETTINGS`
  - *Risk Level*: 1
  - *Verification*: `SETTINGS_ACTIVITY_CHECK` (`com.android.settings` foreground confirmed)
  - *Confirmation Required*: No

---

## 4. Semantic Alias Matrix

To prevent rigid command matching and enable fluid natural conversation, the registry maps conversational terms to explicit package targets while enforcing word boundary rules:

| Application Target | Semantic Aliases | Matching Rule |
|---|---|---|
| `com.whatsapp` | "WhatsApp", "Whats App", "my messages", "messaging", "chat" | Word boundary exact/fuzzy (alias length >= 3) |
| `com.android.chrome` | "Chrome", "browser", "web", "internet", "google chrome" | Exact / alias match |
| `com.google.android.apps.maps` | "Google Maps", "Maps", "navigation", "directions" | Exact / alias match |
| `com.android.settings` | "Settings", "phone settings", "system settings", "device settings" | Exact / setting type match |
| `com.google.android.youtube` | "YouTube", "videos", "yt" | Exact match |
| `com.instagram.android` | "Instagram", "insta", "ig" | Exact match only for "ig" (never matches substring inside "signal") |
| `com.google.android.calendar` | "Calendar", "my calendar", "google calendar", "schedule" | Exact / alias match |

---

## 5. Persistence Schema

All discovered and cataloged applications, capabilities, and actions are persisted in MySQL:

- **`jarvis_applications`**: `(package_name, user_id, application_label, version_name, version_code, is_launchable, is_system_app, permissions, confidence, provenance, created_at, updated_at)`
- **`jarvis_app_capabilities`**: `(capability_id, package_name, domain, action, description, invocation_method, risk_level, confirmation_required, verification_strategy, privacy_level, input_schema, output_schema)`
- **`jarvis_app_actions`**: `(action_id, user_id, session_id, capability_id, package_name, invocation_method, status, parameters, verification_status, execution_latency_ms, created_at, completed_at)`
