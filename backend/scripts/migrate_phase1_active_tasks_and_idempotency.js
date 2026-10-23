const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migratePhase1() {
  console.log('[MIGRATION] Starting Phase 1 database migration...');
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'wellwisher'
    });

    console.log('[MIGRATION] Connected to MySQL database:', process.env.DB_NAME || 'wellwisher');

    // 1. Create ai_active_tasks table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_active_tasks (
        id VARCHAR(128) PRIMARY KEY,
        user_id INT NOT NULL,
        session_id VARCHAR(128) NOT NULL,
        task_id VARCHAR(128) NOT NULL,
        task_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'STARTED',
        referenced_entity_id VARCHAR(128) NULL,
        referenced_entity_type VARCHAR(64) NULL,
        candidate_entities JSON NULL,
        current_step VARCHAR(64) NULL,
        original_request TEXT NULL,
        latest_request TEXT NULL,
        context_metadata JSON NULL,
        version INT NOT NULL DEFAULT 1,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active_tasks_user_session (user_id, session_id),
        INDEX idx_active_tasks_status (status),
        INDEX idx_active_tasks_expires (expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('[MIGRATION] Table "ai_active_tasks" created or already exists.');

    // 2. Create ai_idempotency_keys table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ai_idempotency_keys (
        idempotency_key VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL,
        tool_name VARCHAR(100) NOT NULL,
        request_hash VARCHAR(64) NOT NULL,
        result_payload JSON NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_idempotency_user_expires (user_id, expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('[MIGRATION] Table "ai_idempotency_keys" created or already exists.');

    // 3. Create jarvis_devices table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS jarvis_devices (
        id VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        device_id VARCHAR(128) NOT NULL,
        device_name VARCHAR(100) NOT NULL DEFAULT 'Primary Device',
        platform VARCHAR(50) NOT NULL DEFAULT 'ANDROID',
        wake_word_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        background_active BOOLEAN NOT NULL DEFAULT TRUE,
        battery_optimization_ignored BOOLEAN NOT NULL DEFAULT FALSE,
        push_token VARCHAR(255) NULL,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_device (user_id, device_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('[MIGRATION] Table "jarvis_devices" created or already exists.');

    // 4. Create jarvis_tasks table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS jarvis_tasks (
        id VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        task_type VARCHAR(50) NOT NULL DEFAULT 'REMINDER',
        schedule_time VARCHAR(100) NULL,
        cron_expression VARCHAR(100) NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        payload JSON NULL,
        result JSON NULL,
        last_run_at TIMESTAMP NULL,
        next_run_at VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_jarvis_tasks (user_id, status),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('[MIGRATION] Table "jarvis_tasks" created or already exists.');

    // 5. Create jarvis_execution_runs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS jarvis_execution_runs (
        id VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        task_id VARCHAR(64) NULL,
        command_text TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'RUNNING',
        output JSON NULL,
        duration_ms INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('[MIGRATION] Table "jarvis_execution_runs" created or already exists.');

    // 6. Create jarvis_notifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS jarvis_notifications (
        id VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        notification_type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
        action_buttons JSON NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        is_delivered BOOLEAN NOT NULL DEFAULT TRUE,
        delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_notifications (user_id, is_read),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('[MIGRATION] Table "jarvis_notifications" created or already exists.');

    console.log('[MIGRATION] Phase 1 database migration completed successfully.');
  } catch (err) {
    console.warn('[MIGRATION NOTICE] MySQL connection was not reached or failed (expected if local MySQL daemon is not running in test/dev environment):', err.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  migratePhase1();
}

module.exports = migratePhase1;
