const { ToolRegistry, registry, RISK_LEVELS, EXECUTION_STATUS } = require('./toolRegistry');

const scheduleTools = require('./scheduleTools');
const medicationTools = require('./medicationTools');
const wellnessTools = require('./wellnessTools');
const journalTools = require('./journalTools');
const memoryTools = require('./memoryTools');
const preferenceTools = require('./preferenceTools');
const familyTools = require('./familyTools');
const documentTools = require('./documentTools');
const healthTools = require('./healthTools');
const { workflowTools } = require('./workflowTools');

// Register all system tools into singleton registry
function initializeToolRegistry(targetRegistry = registry) {
  const allToolSets = [
    ...scheduleTools,
    ...medicationTools,
    ...wellnessTools,
    ...journalTools,
    ...memoryTools,
    ...preferenceTools,
    ...familyTools,
    ...documentTools,
    ...healthTools,
    ...workflowTools
  ];

  for (const tool of allToolSets) {
    if (!targetRegistry.has(tool.name)) {
      targetRegistry.register(tool);
    }
  }

  return targetRegistry;
}

// Initialize default singleton instance
initializeToolRegistry(registry);

module.exports = {
  ToolRegistry,
  registry,
  initializeToolRegistry,
  RISK_LEVELS,
  EXECUTION_STATUS,
  scheduleTools,
  medicationTools,
  wellnessTools,
  journalTools,
  memoryTools,
  preferenceTools,
  familyTools,
  documentTools,
  healthTools,
  workflowTools
};
