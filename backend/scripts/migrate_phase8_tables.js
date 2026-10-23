const pool = require('../config/db');

async function migratePhase8Tables() {
  console.log('[PHASE8_MIGRATION] Starting Phase 8 schema migration...');

  // 1. jarvis_conversation_states
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jarvis_conversation_states (
      session_id VARCHAR(128) NOT NULL,
      user_id INT NOT NULL,
      active_intent VARCHAR(64) NULL,
      active_entity JSON NULL,
      candidate_entities JSON NULL,
      candidate_ordering JSON NULL,
      last_resolved_reference JSON NULL,
      last_action JSON NULL,
      last_action_result JSON NULL,
      last_created_entity JSON NULL,
      last_modified_entity JSON NULL,
      last_queried_entities JSON NULL,
      pending_confirmation JSON NULL,
      pending_clarification JSON NULL,
      temporal_context JSON NULL,
      unresolved_references JSON NULL,
      metadata JSON NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (session_id, user_id),
      INDEX idx_conversation_user_updated (user_id, updated_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[PHASE8_MIGRATION] jarvis_conversation_states table verified.');

  // 2. jarvis_semantic_index
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jarvis_semantic_index (
      id VARCHAR(64) PRIMARY KEY,
      user_id INT NOT NULL,
      item_type VARCHAR(32) NOT NULL,
      item_id VARCHAR(128) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NULL,
      tokens JSON NULL,
      tags JSON NULL,
      privacy_level VARCHAR(32) NOT NULL DEFAULT 'PRIVATE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_semantic_user_type (user_id, item_type),
      INDEX idx_semantic_item (user_id, item_id),
      FULLTEXT KEY ft_semantic_search (title, content),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[PHASE8_MIGRATION] jarvis_semantic_index table verified.');

  // 3. jarvis_memory_provenance
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jarvis_memory_provenance (
      id VARCHAR(64) PRIMARY KEY,
      user_id INT NOT NULL,
      memory_id VARCHAR(64) NOT NULL,
      source VARCHAR(64) NOT NULL,
      source_type VARCHAR(64) NOT NULL,
      confidence DECIMAL(3,2) NOT NULL DEFAULT 1.00,
      privacy_level VARCHAR(32) NOT NULL DEFAULT 'PRIVATE',
      user_confirmed TINYINT(1) NOT NULL DEFAULT 0,
      derived_from JSON NULL,
      audit_action VARCHAR(32) NOT NULL DEFAULT 'CREATED',
      previous_value TEXT NULL,
      new_value TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_provenance_user (user_id),
      INDEX idx_provenance_memory (user_id, memory_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[PHASE8_MIGRATION] jarvis_memory_provenance table verified.');

  console.log('[PHASE8_MIGRATION] Phase 8 migration completed successfully.');
  process.exit(0);
}

migratePhase8Tables().catch(err => {
  console.error('[PHASE8_MIGRATION] Migration error:', err);
  process.exit(1);
});
