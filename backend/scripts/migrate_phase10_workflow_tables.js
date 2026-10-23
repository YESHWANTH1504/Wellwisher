/**
 * Phase 10 Migration: Autonomous Workflow & Verified Agent Runtime Tables
 * Creates jarvis_workflows, jarvis_workflow_steps, jarvis_workflow_locks, jarvis_workflow_events
 */

const migratePhase10Tables = require('../migrations/migrate_phase10_workflow_tables');

if (require.main === module) {
  migratePhase10Tables()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[MIGRATION] Migration error:', err);
      process.exit(1);
    });
}

module.exports = migratePhase10Tables;
