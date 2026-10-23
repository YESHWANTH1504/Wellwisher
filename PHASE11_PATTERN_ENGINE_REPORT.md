# Phase 11 — Behavior Pattern Engine & Routine Learning Report

## 1. Overview
The Behavior Pattern Engine allows JARVIS to discover, track, and reinforce recurring user behaviors, habitual app usage, temporal routines, and contextual preferences without requiring the user to explicitly write automation scripts.

---

## 2. Storage & Schema
Patterns are durably stored in the MySQL table `jarvis_behavior_patterns`:

```sql
CREATE TABLE jarvis_behavior_patterns (
  pattern_id VARCHAR(64) NOT NULL PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  pattern_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  trigger_type VARCHAR(64) NULL,
  trigger_value VARCHAR(128) NULL,
  trigger_time VARCHAR(8) NULL,
  day_of_week VARCHAR(32) NULL,
  associated_app VARCHAR(128) NULL,
  target_action VARCHAR(128) NULL,
  capability_id VARCHAR(128) NULL,
  recurrence_count INT UNSIGNED NOT NULL DEFAULT 1,
  confidence_score DECIMAL(4,3) NOT NULL DEFAULT 0.500,
  last_observed_at TIMESTAMP NULL,
  evidence_provenance JSON NULL,
  context_metadata JSON NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bp_user_type (user_id, pattern_type),
  INDEX idx_bp_active_conf (is_active, confidence_score)
);
```

---

## 3. Pattern Types & Triggers

| Pattern Type | Trigger Type | Example Trigger | Associated Capability |
|---|---|---|---|
| `TEMPORAL_ROUTINE` | `TIME_OF_DAY` | 08:00 AM | `open_application` (Calendar) |
| `MORNING_APP_OPEN` | `TIME_OF_DAY` | 07:30 AM | `open_application` (News / WhatsApp) |
| `WORKOUT_ROUTINE` | `TIME_OF_DAY` | 18:00 PM | `control_media` (Workout Playlist) |
| `COMMUTE_ROUTINE` | `TIME_OF_DAY` | 08:45 AM | `navigate_to_location` (Office) |
| `APPLICATION_CONTEXT` | `APP_OPEN` | `com.google.android.apps.maps` | `search_location` |
| `DEVICE_OPTIMIZATION` | `BATTERY_DROP` | `<= 20%` | `open_settings` (Battery Saver) |

---

## 4. Reinforcement & Calibration Dynamics
- **Recurrence Tracking**: Every repeated observation of a behavior increments `recurrence_count` and updates `last_observed_at`.
- **Confidence Scaling**:
  $$\text{Confidence}_{\text{new}} = (\text{Confidence}_{\text{old}} \times 0.8) + (0.2 \times 0.95)$$
- **User Acceptance Reward**: When user accepts a suggestion, pattern confidence is credited:
  $$\Delta_{\text{confidence}} = +0.05$$
- **User Rejection Penalty**: When user rejects a suggestion, pattern confidence is penalized:
  $$\Delta_{\text{confidence}} = -0.10$$
- **Automatic Deactivation**: Patterns whose confidence drops below `0.20` or that remain stale for over 30 days are automatically deprioritized.
