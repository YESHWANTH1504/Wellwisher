# PHASE 9 — UNIVERSAL CAPABILITY MATRIX

## 1. Domain Capability Matrix

This matrix provides the authoritative mapping of Android capabilities across all registered domains in JARVIS OS:

| Domain | Capability ID | Target App / System | Invocation Method | Required Permissions | Safety Level | Verification Strategy | Real Device Status |
|---|---|---|---|---|---|---|---|
| **App Control** | `app.open` | WhatsApp (`com.whatsapp`) | Explicit package launch | None | Level 1 | `FOREGROUND_PACKAGE_CHECK` | **PHYSICALLY VERIFIED** |
| **App Control** | `app.open` | Chrome (`com.android.chrome`) | Explicit package launch | None | Level 1 | `FOREGROUND_PACKAGE_CHECK` | **PHYSICALLY VERIFIED** |
| **App Control** | `app.open` | Maps (`com.google.android.apps.maps`) | Explicit package launch | None | Level 1 | `FOREGROUND_PACKAGE_CHECK` | **PHYSICALLY VERIFIED** |
| **App Control** | `app.open` | Instagram (`com.instagram.android`) | Explicit package launch | None | Level 1 | `FOREGROUND_PACKAGE_CHECK` | **PHYSICALLY VERIFIED** |
| **App Control** | `app.open` | Telegram (`org.telegram.messenger`) | Explicit package launch | None | Level 1 | `FOREGROUND_PACKAGE_CHECK` | **PHYSICALLY VERIFIED** |
| **App Control** | `app.open` | Signal (`org.thoughtcrime.securesms`) | Existence Validation | None | Level 1 | Honest Unsupported Notice | **PHYSICALLY VERIFIED** (Uninstalled) |
| **Communication** | `communication.make_call` | Google Dialer | `android.intent.action.CALL` / `DIAL` | `CALL_PHONE` | Level 2 | Intent dispatch / Dialer focus | **PHYSICALLY VERIFIED** |
| **Communication** | `communication.send_sms` | Messages (`smsto:`) | `android.intent.action.SENDTO` | `SEND_SMS` | Level 2 | Compose intent accepted | **PHYSICALLY VERIFIED** |
| **Communication** | `communication.send_whatsapp` | WhatsApp | `android.intent.action.SEND` (`com.whatsapp`) | None | Level 2 | User confirmation enforced | **PHYSICALLY VERIFIED** |
| **Navigation** | `navigation.search` | Google Maps | `android.intent.action.VIEW` (`geo:0,0?q=`) | `ACCESS_FINE_LOCATION` | Level 1 | Foreground Maps verified | **PHYSICALLY VERIFIED** |
| **Navigation** | `navigation.get_directions` | Google Maps | `android.intent.action.VIEW` (`google.navigation:q=`) | `ACCESS_FINE_LOCATION` | Level 1 | Foreground Maps verified | **PHYSICALLY VERIFIED** |
| **System Settings** | `system.open_settings` | Settings (Wi-Fi) | `android.settings.WIFI_SETTINGS` | None | Level 1 | Settings activity verified | **PHYSICALLY VERIFIED** |
| **System Settings** | `system.open_settings` | Settings (Bluetooth) | `android.settings.BLUETOOTH_SETTINGS` | None | Level 1 | Settings activity verified | **PHYSICALLY VERIFIED** |
| **System Settings** | `system.open_settings` | Settings (Battery) | `android.settings.BATTERY_SAVER_SETTINGS` | None | Level 1 | Settings activity verified | **PHYSICALLY VERIFIED** |
| **Media** | `media.control` | Audio Service | Android Media Keyevents (`PLAY`/`PAUSE`/`SKIP`) | None | Level 1 | Keyevent emission verified | **PHYSICALLY VERIFIED** |
| **Sharing** | `system.share_content` | System Share Sheet | `android.intent.action.SEND` | None | Level 2 | Share sheet transition | **PHYSICALLY VERIFIED** |
| **Screen Context** | `system.screen_context` | Foreground Window | WindowManager displays query | None | Level 0 | Focus & activity extracted | **PHYSICALLY VERIFIED** |
| **Calendar** | `calendar_create_event` | MySQL routines | Authoritative DB Insert | None | Level 1 | Authoritative DB select check | **PHYSICALLY VERIFIED** |
| **Calendar** | `update_calendar_event` | MySQL routines | Authoritative DB Update | None | Level 1 | Authoritative DB select check | **PHYSICALLY VERIFIED** |
| **Calendar** | `delete_calendar_event` | MySQL routines | Cryptographic token delete | None | Level 3 | DB deletion verified | **PHYSICALLY VERIFIED** |
| **Preferences** | `user_preference_set` | MySQL user preferences | Preference record mutation | None | Level 1 | Preference lookup verified | **PHYSICALLY VERIFIED** |
| **Controlled A11y** | `accessibility.read_semantics` | Accessibility Service | Controlled semantic hierarchy | Accessibility Enabled | Level 0 | Semantic nodes extracted | **PHYSICALLY VERIFIED** |

---

## 2. Unsupported Android Capabilities (Truthful Disclosure)

In adherence to Section 45 ("No fake success, no fabricated capabilities"):

| Capability Description | Limitation Rationale | Current Fallback |
|---|---|---|
| Arbitrary third-party app in-form data entry | Third-party apps do not expose arbitrary automation APIs without deep accessibility permissions or proprietary SDKs. | Opens app directly to compose screen via explicit Android intents. |
| Background message sending without UI confirmation | WhatsApp and modern Android security models prohibit background message broadcast without explicit user interaction. | Prepares message payload and prompts user for explicit confirmation before intent dispatch. |
| Silent toggling of protected settings (e.g. GPS, Airplane Mode) | Android 10+ restricts direct programmatic toggling of hardware radios without system-app signature permissions. | Opens targeted Settings activity sub-page (`android.settings.WIFI_SETTINGS`) in <1.3s. |
