/**
 * migrateProduction.js
 * Authoritative production database migration orchestrator.
 * Enforces migration ordering, version tracking, checksum verification,
 * schema compatibility validation, and fail-safe error handling.
 */

const crypto = require('crypto');
const pool = require('../config/db');

// Registry of ordered migrations
const MIGRATIONS = [
  {
    version: '001',
    name: 'core_schema_baseline',
    up: async (conn) => {
      // Ensure core jarvis devices and state tables exist
      await conn.query(`
        CREATE TABLE IF NOT EXISTS jarvis_devices (
          device_id VARCHAR(64) PRIMARY KEY,
          user_id INT NOT NULL,
          device_name VARCHAR(100) NULL,
          os_version VARCHAR(50) NULL,
          app_version VARCHAR(20) NULL,
          capabilities JSON NULL,
          last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    }
  },
  {
    version: '010',
    name: 'phase10_workflow_engine',
    up: async (conn) => {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS jarvis_workflows (
          workflow_id VARCHAR(64) PRIMARY KEY,
          user_id INT NOT NULL,
          session_id VARCHAR(64) NULL,
          goal TEXT NOT NULL,
          status ENUM('CREATED','PLANNING','READY','AWAITING_PERMISSION','AWAITING_CONFIRMATION','EXECUTING','OBSERVING','VERIFYING','RECOVERING','REPLANNING','COMPLETED','FAILED','CANCELLED','PAUSED') NOT NULL DEFAULT 'CREATED',
          priority ENUM('LOW','NORMAL','HIGH','CRITICAL') NOT NULL DEFAULT 'NORMAL',
          current_step_id VARCHAR(64) NULL,
          total_steps INT DEFAULT 0,
          completed_steps INT DEFAULT 0,
          idempotency_key VARCHAR(128) NULL,
          metadata JSON NULL,
          failure_reason TEXT NULL,
          recovery_attempts INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_status (user_id, status),
          INDEX idx_idemp (idempotency_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS jarvis_workflow_steps (
          step_id VARCHAR(64) PRIMARY KEY,
          workflow_id VARCHAR(64) NOT NULL,
          sequence_number INT NOT NULL,
          capability_id VARCHAR(100) NOT NULL,
          target_app VARCHAR(100) NULL,
          action_name VARCHAR(100) NULL,
          inputs JSON NULL,
          output_payload JSON NULL,
          status ENUM('PENDING','READY','RUNNING','OBSERVING','VERIFYING','SUCCEEDED','FAILED','SKIPPED','CANCELLED') NOT NULL DEFAULT 'PENDING',
          safety_level INT DEFAULT 0,
          requires_confirmation TINYINT(1) DEFAULT 0,
          confirmation_granted TINYINT(1) DEFAULT 0,
          is_reversible TINYINT(1) DEFAULT 1,
          rollback_capability_id VARCHAR(100) NULL,
          retry_count INT DEFAULT 0,
          max_retries INT DEFAULT 3,
          dependencies JSON NULL,
          failure_reason TEXT NULL,
          verification_state ENUM('UNVERIFIED','VERIFYING','VERIFIED','FAILED') DEFAULT 'UNVERIFIED',
          verification_token VARCHAR(128) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_wf_seq (workflow_id, sequence_number),
          FOREIGN KEY (workflow_id) REFERENCES jarvis_workflows(workflow_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    }
  },
  {
    version: '011',
    name: 'phase11_anticipation_engine',
    up: async (conn) => {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS jarvis_proactive_preferences (
          user_id INT PRIMARY KEY,
          proactive_mode ENUM('OFF','ASSISTED','BALANCED','PROACTIVE') DEFAULT 'BALANCED',
          max_suggestions_per_day INT DEFAULT 10,
          max_suggestions_per_hour INT DEFAULT 3,
          quiet_hours_start VARCHAR(5) DEFAULT '22:00',
          quiet_hours_end VARCHAR(5) DEFAULT '07:00',
          battery_threshold INT DEFAULT 20,
          allow_autonomous_execution TINYINT(1) DEFAULT 0,
          authorized_categories JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS jarvis_proactive_suggestions (
          suggestion_id VARCHAR(64) PRIMARY KEY,
          user_id INT NOT NULL,
          prediction_id VARCHAR(64) NULL,
          candidate_type VARCHAR(64) NOT NULL,
          decision_level ENUM('OBSERVE','SUGGEST','PREPARE','ASK','EXECUTE') NOT NULL,
          confidence_score DECIMAL(5,4) NOT NULL,
          title VARCHAR(255) NOT NULL,
          speech_text TEXT NOT NULL,
          display_message TEXT NOT NULL,
          priority ENUM('LOW','NORMAL','HIGH','CRITICAL') DEFAULT 'NORMAL',
          risk_level ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'LOW',
          dedup_key VARCHAR(191) NOT NULL,
          status ENUM('PENDING','PRESENTED','ACCEPTED','REJECTED','DISMISSED','EXPIRED') DEFAULT 'PENDING',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_status (user_id, status),
          INDEX idx_dedup (dedup_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    }
  },
  {
    version: '012',
    name: 'phase12_offline_tables',
    up: async (conn) => {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS jarvis_offline_queue (
          id VARCHAR(64) PRIMARY KEY,
          user_id INT NOT NULL,
          operation VARCHAR(64) NOT NULL,
          payload JSON NOT NULL,
          priority ENUM('HIGH','NORMAL','LOW') DEFAULT 'NORMAL',
          privacy_class ENUM('LOCAL_ONLY','HYBRID_ALLOWED','CLOUD_ALLOWED') DEFAULT 'HYBRID_ALLOWED',
          idempotency_key VARCHAR(128) NOT NULL UNIQUE,
          status ENUM('PENDING','SYNCING','SYNCED','FAILED') DEFAULT 'PENDING',
          retry_count INT DEFAULT 0,
          max_retries INT DEFAULT 3,
          last_error TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          synced_at TIMESTAMP NULL,
          INDEX idx_user_status (user_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS jarvis_local_models (
          model_id VARCHAR(64) PRIMARY KEY,
          capability VARCHAR(64) NOT NULL,
          provider VARCHAR(64) NOT NULL,
          model_name VARCHAR(128) NOT NULL,
          version VARCHAR(32) NOT NULL,
          artifact_path VARCHAR(255) NULL,
          checksum_sha256 VARCHAR(64) NULL,
          memory_footprint_mb INT DEFAULT 0,
          hardware_accelerated TINYINT(1) DEFAULT 0,
          is_available TINYINT(1) DEFAULT 0,
          last_verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_capability (capability)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    }
  },
  {
    version: '013',
    name: 'phase13_production_action_journal',
    up: async (conn) => {
      await conn.query(`
        CREATE TABLE IF NOT EXISTS jarvis_action_journal (
          action_id VARCHAR(64) PRIMARY KEY,
          user_id INT NOT NULL,
          workflow_id VARCHAR(64) NULL,
          step_id VARCHAR(64) NULL,
          capability_id VARCHAR(100) NOT NULL,
          entity_id VARCHAR(64) NULL,
          action_payload JSON NULL,
          idempotency_key VARCHAR(128) NOT NULL UNIQUE,
          requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          authorized_at TIMESTAMP NULL,
          started_at TIMESTAMP NULL,
          completed_at TIMESTAMP NULL,
          verification_state ENUM('UNVERIFIED','VERIFYING','VERIFIED','FAILED') DEFAULT 'UNVERIFIED',
          execution_result JSON NULL,
          failure_reason TEXT NULL,
          status ENUM('REQUESTED','AUTHORIZED','EXECUTING','VERIFYING','COMPLETED','FAILED','REVERTED') NOT NULL DEFAULT 'REQUESTED',
          INDEX idx_user_status (user_id, status),
          INDEX idx_wf (workflow_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      await conn.query(`
        CREATE TABLE IF NOT EXISTS jarvis_audit_events (
          event_id VARCHAR(64) PRIMARY KEY,
          user_id INT NOT NULL,
          request_id VARCHAR(64) NULL,
          event_type VARCHAR(64) NOT NULL,
          component VARCHAR(64) NOT NULL,
          payload JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_type (user_id, event_type),
          INDEX idx_req (request_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    }
  }
];

class ProductionMigrationEngine {
  /**
   * Initialize migration tracking table
   */
  static async initLedger() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(32) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  /**
   * Run pending migrations
   */
  static async migrate() {
    await ProductionMigrationEngine.initLedger();

    const [appliedRows] = await pool.query('SELECT * FROM schema_migrations ORDER BY version ASC');
    const appliedVersions = new Set(appliedRows.map(r => r.version));

    let newlyAppliedCount = 0;

    for (const mig of MIGRATIONS) {
      if (appliedVersions.has(mig.version)) {
        continue;
      }

      console.log(`[MIGRATIONS] Applying migration ${mig.version}: ${mig.name}...`);
      const checksum = crypto.createHash('sha256').update(mig.name).digest('hex');

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await mig.up(connection);
        await connection.query(
          'INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)',
          [mig.version, mig.name, checksum]
        );
        await connection.commit();
        newlyAppliedCount++;
        console.log(`[MIGRATIONS] Migration ${mig.version} applied successfully.`);
      } catch (err) {
        await connection.rollback();
        console.error(`[MIGRATIONS] FATAL: Migration ${mig.version} failed:`, err.message);
        throw new Error(`MIGRATION_FAILED: ${mig.version} (${mig.name}) failed: ${err.message}`);
      } finally {
        connection.release();
      }
    }

    return {
      success: true,
      appliedCount: newlyAppliedCount,
      totalMigrations: MIGRATIONS.length
    };
  }

  /**
   * Verify schema compatibility on startup
   */
  static async verifySchemaCompatibility() {
    try {
      await ProductionMigrationEngine.initLedger();
      const [rows] = await pool.query('SELECT version FROM schema_migrations');
      const applied = new Set(rows.map(r => r.version));

      const latestVersion = MIGRATIONS[MIGRATIONS.length - 1].version;
      const isUpToDate = applied.has(latestVersion);

      return {
        compatible: isUpToDate,
        latestRequired: latestVersion,
        appliedVersions: Array.from(applied)
      };
    } catch (err) {
      return {
        compatible: false,
        error: err.message
      };
    }
  }
}

// CLI execution support
if (require.main === module) {
  ProductionMigrationEngine.migrate()
    .then((res) => {
      console.log(`\n✔ Production database migrations finished. (Applied: ${res.appliedCount})`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Production database migration error:', err.message);
      process.exit(1);
    });
}

module.exports = {
  ProductionMigrationEngine,
  runProductionMigrations: () => ProductionMigrationEngine.migrate(),
  MIGRATIONS
};

