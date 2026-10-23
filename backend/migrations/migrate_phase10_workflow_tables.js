/**
 * Phase 10 Migration: Autonomous Workflow & Verified Agent Runtime Tables
 * Creates jarvis_workflows, jarvis_workflow_steps, jarvis_workflow_locks, jarvis_workflow_events
 */

const pool = require('../config/db');

async function migratePhase10Tables() {
  console.log('[MIGRATION] Starting Phase 10 Autonomous Workflow tables migration...');

  // 1. jarvis_workflows
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jarvis_workflows (
      workflow_id VARCHAR(100) PRIMARY KEY,
      user_id INT NOT NULL,
      session_id VARCHAR(100) NULL,
      goal TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'CREATED',
      priority VARCHAR(20) DEFAULT 'NORMAL',
      current_step_id VARCHAR(100) NULL,
      total_steps INT DEFAULT 0,
      completed_steps INT DEFAULT 0,
      context_snapshot JSON NULL,
      entity_locks JSON NULL,
      required_permissions JSON NULL,
      safety_level INT DEFAULT 1,
      privacy_level VARCHAR(50) DEFAULT 'LOCAL_ONLY',
      confirmation_policy JSON NULL,
      timeout_policy JSON NULL,
      retry_policy JSON NULL,
      recovery_policy JSON NULL,
      idempotency_key VARCHAR(100) NULL,
      provenance VARCHAR(100) DEFAULT 'USER_VOICE',
      final_result JSON NULL,
      failure_reason TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_wf_user_status (user_id, status),
      INDEX idx_wf_user_idemp (user_id, idempotency_key),
      INDEX idx_wf_session (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ Verified jarvis_workflows table.');

  // 2. jarvis_workflow_steps
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jarvis_workflow_steps (
      step_id VARCHAR(100) NOT NULL,
      workflow_id VARCHAR(100) NOT NULL,
      user_id INT NOT NULL,
      sequence INT NOT NULL,
      PRIMARY KEY (workflow_id, step_id),
      capability_id VARCHAR(100) NOT NULL,
      domain VARCHAR(50) NULL,
      target_app VARCHAR(100) NULL,
      target_entity JSON NULL,
      inputs JSON NULL,
      expected_outcome TEXT NULL,
      verification_strategy VARCHAR(100) NULL,
      dependencies JSON NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      attempt_count INT DEFAULT 0,
      max_attempts INT DEFAULT 3,
      failure_policy VARCHAR(50) DEFAULT 'RETRY',
      result JSON NULL,
      verification_result JSON NULL,
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_step_wf_seq (workflow_id, sequence),
      INDEX idx_step_user_status (user_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ Verified jarvis_workflow_steps table.');

  // 3. jarvis_workflow_locks
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jarvis_workflow_locks (
      lock_id VARCHAR(100) PRIMARY KEY,
      workflow_id VARCHAR(100) NOT NULL,
      user_id INT NOT NULL,
      resource_type VARCHAR(50) NOT NULL,
      resource_id VARCHAR(100) NOT NULL,
      lock_type VARCHAR(20) DEFAULT 'EXCLUSIVE',
      acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      INDEX idx_lock_user_res (user_id, resource_type, resource_id),
      INDEX idx_lock_wf (workflow_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ Verified jarvis_workflow_locks table.');

  // 4. jarvis_workflow_events
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jarvis_workflow_events (
      event_id VARCHAR(100) PRIMARY KEY,
      workflow_id VARCHAR(100) NOT NULL,
      step_id VARCHAR(100) NULL,
      user_id INT NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      event_data JSON NULL,
      latency_ms INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_evt_wf_created (workflow_id, created_at),
      INDEX idx_evt_user_type (user_id, event_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ Verified jarvis_workflow_events table.');

  console.log('[MIGRATION] Phase 10 Autonomous Workflow tables migration completed successfully.');
}

if (require.main === module) {
  migratePhase10Tables()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[MIGRATION] Migration error:', err);
      process.exit(1);
    });
}

module.exports = migratePhase10Tables;
