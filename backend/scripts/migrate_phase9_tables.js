const pool = require('../config/db');

async function migratePhase9Tables() {
  console.log('--- MIGRATING PHASE 9 DATABASE TABLES ---');

  // 1. jarvis_applications
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jarvis_applications (
      id VARCHAR(128) PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      package_name VARCHAR(255) NOT NULL,
      application_label VARCHAR(255) NOT NULL,
      version_name VARCHAR(64) DEFAULT NULL,
      version_code INT DEFAULT NULL,
      launchable TINYINT(1) DEFAULT 1,
      system_app TINYINT(1) DEFAULT 0,
      permissions JSON DEFAULT NULL,
      supported_capabilities JSON DEFAULT NULL,
      aliases JSON DEFAULT NULL,
      confidence FLOAT DEFAULT 1.0,
      provenance VARCHAR(64) DEFAULT 'SYSTEM_SCAN',
      last_scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_package (user_id, package_name),
      INDEX idx_app_user_pkg (user_id, package_name),
      INDEX idx_app_user_label (user_id, application_label)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ Verified jarvis_applications table.');

  // 2. jarvis_app_capabilities
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jarvis_app_capabilities (
      id VARCHAR(128) PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      capability_id VARCHAR(128) NOT NULL,
      app_package VARCHAR(255) NOT NULL,
      domain VARCHAR(64) NOT NULL,
      action VARCHAR(64) NOT NULL,
      description TEXT DEFAULT NULL,
      required_permissions JSON DEFAULT NULL,
      invocation_method VARCHAR(64) NOT NULL,
      risk_level INT DEFAULT 1,
      confirmation_required TINYINT(1) DEFAULT 0,
      verification_strategy VARCHAR(64) DEFAULT 'FOREGROUND_VERIFICATION',
      privacy_level VARCHAR(32) DEFAULT 'PROTECTED',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_cap_pkg (user_id, capability_id, app_package),
      INDEX idx_cap_user_domain (user_id, domain),
      INDEX idx_cap_user_action (user_id, action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ Verified jarvis_app_capabilities table.');

  // 3. jarvis_app_actions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jarvis_app_actions (
      id VARCHAR(128) PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      session_id VARCHAR(128) NOT NULL,
      capability_id VARCHAR(128) NOT NULL,
      app_package VARCHAR(255) NOT NULL,
      invocation_method VARCHAR(64) NOT NULL,
      arguments JSON DEFAULT NULL,
      execution_status VARCHAR(64) DEFAULT 'PROPOSED',
      verified TINYINT(1) DEFAULT 0,
      verification_details JSON DEFAULT NULL,
      duration_ms INT DEFAULT NULL,
      error TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_action_user_session (user_id, session_id),
      INDEX idx_action_pkg (app_package)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ Verified jarvis_app_actions table.');

  console.log('--- PHASE 9 DATABASE MIGRATION COMPLETE ---');
  await pool.end();
}

migratePhase9Tables().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
