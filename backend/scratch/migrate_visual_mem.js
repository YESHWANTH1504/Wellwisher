const pool = require('../config/db');

async function migrate() {
  const sql = "ALTER TABLE ai_memories MODIFY COLUMN memory_type ENUM('USER_PREFERENCE','ROUTINE_PREFERENCE','COMMUNICATION_PREFERENCE','SCHEDULE_PREFERENCE','ASSISTANT_PREFERENCE','TEMPORARY_CONTEXT','IMPORTANT_CONTEXT','VISUAL_MEMORY') NOT NULL DEFAULT 'USER_PREFERENCE'";
  await pool.query(sql);
  console.log('ALTER TABLE SUCCESS: VISUAL_MEMORY added to ai_memories enum');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
