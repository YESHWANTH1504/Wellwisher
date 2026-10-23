const pool = require('../config/db');

async function migrate() {
  console.log('[Phase 5.1 Migration] Starting database schema verification and migration...');

  // 1. ai_proactive_events: Add deduplication_key and expand status enum
  const [cols] = await pool.query("SHOW COLUMNS FROM ai_proactive_events LIKE 'deduplication_key'");
  if (cols.length === 0) {
    console.log('[Migration] Adding deduplication_key column to ai_proactive_events...');
    await pool.query('ALTER TABLE ai_proactive_events ADD COLUMN deduplication_key VARCHAR(128) NULL AFTER status');
    await pool.query('ALTER TABLE ai_proactive_events ADD INDEX idx_user_dedup (user_id, deduplication_key)');
    console.log('[Migration] deduplication_key column added.');
  } else {
    console.log('[Migration] deduplication_key column already exists in ai_proactive_events.');
  }

  console.log('[Migration] Updating status enum on ai_proactive_events to full lifecycle...');
  await pool.query(`ALTER TABLE ai_proactive_events MODIFY COLUMN status ENUM(
    'CREATED','ELIGIBLE','DEFERRED','DELIVERING','DELIVERED','ACKNOWLEDGED','EXECUTING','VERIFIED','FAILED','EXPIRED','CANCELLED','PENDING','DISMISSED','ACTED'
  ) NOT NULL DEFAULT 'CREATED'`);
  console.log('[Migration] ai_proactive_events status enum updated.');

  // 2. ai_memories: Ensure composite index on (user_id, memory_key) exists
  const [memIndexes] = await pool.query("SHOW INDEX FROM ai_memories WHERE Key_name = 'idx_user_memkey'");
  if (memIndexes.length === 0) {
    console.log('[Migration] Adding index on ai_memories (user_id, memory_key)...');
    await pool.query('ALTER TABLE ai_memories ADD INDEX idx_user_memkey (user_id, memory_key)');
    console.log('[Migration] idx_user_memkey index added.');
  }

  // 3. ai_workflow_actions: Ensure status enum supports all states
  console.log('[Migration] Updating status enum on ai_workflow_actions...');
  await pool.query(`ALTER TABLE ai_workflow_actions MODIFY COLUMN status ENUM(
    'PENDING','CONFIRMED','DISMISSED','COMPLETED','EXPIRED','FAILED','CANCELLED','EXECUTING'
  ) NOT NULL DEFAULT 'PENDING'`);
  console.log('[Migration] ai_workflow_actions status enum updated.');

  console.log('[Phase 5.1 Migration] Completed successfully.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('[Phase 5.1 Migration Error]:', err);
  process.exit(1);
});
