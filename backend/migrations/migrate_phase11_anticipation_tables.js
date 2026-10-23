/**
 * Migration: Phase 11 Anticipatory Execution & Proactive Intelligence Tables
 *
 * Tables:
 * 1. jarvis_proactive_preferences - User proactive configuration, modes, quiet hours, category permissions
 * 2. jarvis_behavior_patterns     - Discovered recurring user routines & temporal patterns with evidence provenance
 * 3. jarvis_predictions           - Generated predictions with confidence scores and source metadata
 * 4. jarvis_proactive_suggestions - User-facing suggestions with Decision Levels (Observe/Suggest/Prepare/Ask/Execute)
 * 5. jarvis_proactive_events      - Log of context changes and triggered event deduplication keys
 * 6. jarvis_proactive_feedback    - User feedback signals (Accepted, Rejected, Ignored, Modified, Cancelled)
 */

const pool = require('../config/db');

async function migratePhase11Tables() {
  console.log('--- Starting Phase 11 Anticipatory Intelligence Database Migration ---');

  try {
    // 1. jarvis_proactive_preferences
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jarvis_proactive_preferences (
        user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
        proactive_mode ENUM('OFF', 'ASSISTED', 'BALANCED', 'PROACTIVE') NOT NULL DEFAULT 'BALANCED',
        quiet_hours_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        quiet_hours_start VARCHAR(8) NOT NULL DEFAULT '22:00',
        quiet_hours_end VARCHAR(8) NOT NULL DEFAULT '07:00',
        notification_frequency ENUM('LOW', 'BALANCED', 'HIGH') NOT NULL DEFAULT 'BALANCED',
        daily_briefing_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        meeting_prep_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        travel_anticipation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        routine_learning_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        device_intelligence_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        health_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        authorized_categories JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_proactive_mode (proactive_mode)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[Phase 11 Migration] Verified table: jarvis_proactive_preferences');

    // 2. jarvis_behavior_patterns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jarvis_behavior_patterns (
        pattern_id VARCHAR(64) NOT NULL PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        pattern_type ENUM('TEMPORAL', 'ROUTINE', 'APPLICATION', 'CALENDAR', 'COMMUNICATION', 'DEVICE', 'WORKFLOW') NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        trigger_time VARCHAR(8) NULL,
        day_of_week VARCHAR(32) NULL,
        associated_app VARCHAR(128) NULL,
        recurrence_count INT UNSIGNED NOT NULL DEFAULT 1,
        confidence_score DECIMAL(4,3) NOT NULL DEFAULT 0.500,
        last_observed_at TIMESTAMP NULL,
        evidence_provenance JSON NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_bp_user_type (user_id, pattern_type),
        INDEX idx_bp_active_conf (is_active, confidence_score)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[Phase 11 Migration] Verified table: jarvis_behavior_patterns');

    // 3. jarvis_predictions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jarvis_predictions (
        prediction_id VARCHAR(64) NOT NULL PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        prediction_type VARCHAR(64) NOT NULL,
        predicted_intent VARCHAR(128) NOT NULL,
        predicted_action VARCHAR(128) NOT NULL,
        target_entity_id VARCHAR(128) NULL,
        target_app VARCHAR(128) NULL,
        confidence_score DECIMAL(4,3) NOT NULL,
        confidence_band ENUM('LOW', 'MODERATE', 'HIGH', 'VERY_HIGH') NOT NULL DEFAULT 'MODERATE',
        reasoning TEXT NULL,
        source_signals JSON NULL,
        status ENUM('PENDING', 'ACTED', 'DISMISSED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pred_user_status (user_id, status),
        INDEX idx_pred_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[Phase 11 Migration] Verified table: jarvis_predictions');

    // 4. jarvis_proactive_suggestions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jarvis_proactive_suggestions (
        suggestion_id VARCHAR(64) NOT NULL PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        prediction_id VARCHAR(64) NULL,
        decision_level ENUM('OBSERVE', 'SUGGEST', 'PREPARE', 'ASK', 'EXECUTE') NOT NULL DEFAULT 'SUGGEST',
        title VARCHAR(255) NOT NULL,
        speech_text TEXT NOT NULL,
        display_message TEXT NOT NULL,
        priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
        risk_level ENUM('ZERO_RISK', 'LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'LOW',
        privacy_level VARCHAR(32) NOT NULL DEFAULT 'LOCAL_ONLY',
        workflow_proposal JSON NULL,
        resulting_workflow_id VARCHAR(64) NULL,
        dedup_key VARCHAR(191) NOT NULL,
        status ENUM('PENDING', 'PRESENTED', 'ACCEPTED', 'REJECTED', 'IGNORED', 'EXECUTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sugg_user_status (user_id, status),
        UNIQUE KEY uq_sugg_dedup (user_id, dedup_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[Phase 11 Migration] Verified table: jarvis_proactive_suggestions');

    // 5. jarvis_proactive_events
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jarvis_proactive_events (
        event_id VARCHAR(64) NOT NULL PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        event_type VARCHAR(64) NOT NULL,
        source VARCHAR(64) NOT NULL DEFAULT 'CONTEXT_DETECTOR',
        event_payload JSON NULL,
        dedup_key VARCHAR(191) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_event_user_type (user_id, event_type),
        INDEX idx_event_dedup (dedup_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[Phase 11 Migration] Verified table: jarvis_proactive_events');

    // 6. jarvis_proactive_feedback
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jarvis_proactive_feedback (
        feedback_id VARCHAR(64) NOT NULL PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        suggestion_id VARCHAR(64) NULL,
        pattern_id VARCHAR(64) NULL,
        action_type ENUM('ACCEPTED', 'REJECTED', 'IGNORED', 'MODIFIED', 'CANCELLED') NOT NULL,
        user_comment TEXT NULL,
        resulting_confidence_adjustment DECIMAL(4,3) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fb_user_action (user_id, action_type),
        INDEX idx_fb_suggestion (suggestion_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('--- Phase 11 Anticipatory Database Migration Successfully Committed ---');
    return { success: true };
  } catch (err) {
    console.error('--- Phase 11 Migration Error ---:', err.message);
    throw err;
  }
}

if (require.main === module) {
  migratePhase11Tables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migratePhase11Tables };
