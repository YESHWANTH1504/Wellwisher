/**
 * Migration: Phase 12 On-Device & Offline Intelligence Fabric Tables
 *
 * Tables:
 * 1. jarvis_offline_queue     - Durable queue of safe operations executed or deferred offline
 * 2. jarvis_local_models      - Discovered local models, on-device AI runtimes and their capability status
 * 3. jarvis_offline_telemetry - Real device network, battery, and thermal reachability snapshots
 */

const pool = require('../config/db');

async function migratePhase12Tables() {
  console.log('--- Starting Phase 12 Offline Intelligence Database Migration ---');

  try {
    // 1. jarvis_offline_queue
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jarvis_offline_queue (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        operation VARCHAR(128) NOT NULL,
        payload JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        retry_count INT UNSIGNED NOT NULL DEFAULT 0,
        priority VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
        privacy_class VARCHAR(64) NOT NULL DEFAULT 'LOCAL_ONLY',
        idempotency_key VARCHAR(128) NOT NULL UNIQUE,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        synced_at TIMESTAMP NULL,
        last_error TEXT NULL,
        INDEX idx_queue_user_status (user_id, status),
        INDEX idx_queue_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[Phase 12 Migration] Verified table: jarvis_offline_queue');

    // 2. jarvis_local_models
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jarvis_local_models (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        capability VARCHAR(64) NOT NULL,
        provider VARCHAR(64) NOT NULL,
        model_name VARCHAR(128) NOT NULL,
        version VARCHAR(64) NULL,
        available BOOLEAN NOT NULL DEFAULT FALSE,
        hardware_accelerated BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSON NULL,
        last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_model_capability (capability, available)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[Phase 12 Migration] Verified table: jarvis_local_models');

    // 3. jarvis_offline_telemetry
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jarvis_offline_telemetry (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        network_state VARCHAR(32) NOT NULL DEFAULT 'ONLINE',
        battery_level INT NULL,
        is_charging BOOLEAN NULL,
        thermal_status VARCHAR(32) NULL,
        reachability_json JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_telemetry_user (user_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[Phase 12 Migration] Verified table: jarvis_offline_telemetry');

    console.log('--- Phase 12 Database Migration COMPLETED Successfully ---');
    return true;
  } catch (error) {
    console.error('[Phase 12 Migration ERROR]:', error);
    throw error;
  }
}

if (require.main === module) {
  migratePhase12Tables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migratePhase12Tables };
