const pool = require('../config/db');

async function migratePhase7Tables() {
  console.log('[PHASE7_MIGRATION] Starting Phase 7 schema migration...');

  // 1. jarvis_entities
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jarvis_entities (
      id VARCHAR(64) PRIMARY KEY,
      user_id INT NOT NULL,
      entity_type VARCHAR(64) NOT NULL,
      display_name VARCHAR(255) NOT NULL,
      aliases JSON NULL,
      properties JSON NULL,
      confidence DECIMAL(3,2) NOT NULL DEFAULT 1.00,
      privacy_level VARCHAR(32) NOT NULL DEFAULT 'PRIVATE',
      provenance JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_jarvis_entities_user_type (user_id, entity_type),
      INDEX idx_jarvis_entities_name (user_id, display_name),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('[PHASE7_MIGRATION] jarvis_entities table verified.');

  // 2. jarvis_entity_relations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jarvis_entity_relations (
      id VARCHAR(64) PRIMARY KEY,
      user_id INT NOT NULL,
      source_entity_id VARCHAR(64) NOT NULL,
      target_entity_id VARCHAR(64) NOT NULL,
      relation_type VARCHAR(64) NOT NULL,
      metadata JSON NULL,
      confidence DECIMAL(3,2) NOT NULL DEFAULT 1.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_entity_relations_user (user_id),
      INDEX idx_entity_relations_source (user_id, source_entity_id),
      INDEX idx_entity_relations_target (user_id, target_entity_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('[PHASE7_MIGRATION] jarvis_entity_relations table verified.');

  // 3. Ensure routine table has taken column if referenced by any senior care query
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM medications LIKE 'taken'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE medications ADD COLUMN taken TINYINT(1) DEFAULT 0");
      console.log('[PHASE7_MIGRATION] Added missing taken column to medications table.');
    }
  } catch (err) {
    console.warn('[PHASE7_MIGRATION] Warning checking medications.taken:', err.message);
  }

  console.log('[PHASE7_MIGRATION] Phase 7 migration successfully completed.');
  process.exit(0);
}

migratePhase7Tables().catch(err => {
  console.error('[PHASE7_MIGRATION] Error running migration:', err);
  process.exit(1);
});
