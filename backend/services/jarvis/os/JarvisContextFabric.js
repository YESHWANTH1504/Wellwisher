const ContextEngine = require('../context/contextEngine');
const { activeTaskManager } = require('../tasks/ActiveTaskManager');
const { defaultConversationState } = require('./JarvisConversationState');
const { defaultWorldModel } = require('./JarvisWorldModel');
const MemoryAgent = require('../agent/specialized/MemoryAgent');
const PersonalContextAgent = require('../agent/specialized/PersonalContextAgent');
const CalendarService = require('../integrations/calendarService');
const JarvisContextSnapshot = require('./JarvisContextSnapshot');
const pool = require('../../../config/db');

/**
 * JarvisContextFabric
 * Coordinates all personal context sources into a unified, authenticated, bounded snapshot.
 * Integrates ConversationState, WorldModel, activeTask, screen, device, and memory context graph.
 */
class JarvisContextFabric {
  constructor() {
    this.memoryAgent = new MemoryAgent();
    this.personalContext = new PersonalContextAgent(this.memoryAgent);
    this.worldModel = defaultWorldModel;
  }

  /**
   * Build an authoritative context snapshot for a request
   * @param {number} userId
   * @param {string} requestText
   * @param {Object} options
   * @returns {Promise<JarvisContextSnapshot>}
   */
  async buildSnapshot(userId, requestText = '', options = {}) {
    if (!userId) throw new Error('JarvisContextFabric requires authenticated userId');
    const sessionId = options.sessionId || `session_${userId}_default`;
    const timezone = options.timezone || 'Asia/Kolkata';
    const snapshotTimestamp = Date.now();

    // 1. Fetch user profile
    let userRecord = { id: userId, name: options.userName || 'User' };
    try {
      const [uRows] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [userId]);
      if (uRows && uRows[0]) {
        userRecord = uRows[0];
        if (options.userName) userRecord.name = options.userName;
      }
    } catch (_) {}

    // 2. Hydrate active task (with cold-start restoration if needed)
    const activeTask = activeTaskManager.getActiveTask(sessionId, userId) ||
      await activeTaskManager.loadActiveTask(sessionId, userId);

    // 3. Hydrate conversation state (locked activeEntity, candidates, temporal context)
    const convState = await defaultConversationState.getOrCreate(sessionId, userId);

    // 4. Retrieve World Model relations for activeEntity if available
    let activeEntityRelations = [];
    if (convState.activeEntity && convState.activeEntity.id) {
      try {
        activeEntityRelations = await this.worldModel.getRelatedEntities(userId, convState.activeEntity.id);
      } catch (_) {}
    }

    // 5. Retrieve relevant context package via ContextEngine
    let contextPackage = {};
    try {
      contextPackage = await ContextEngine.buildContext(userId, requestText, {
        conversationId: sessionId,
        timezone,
        userName: userRecord.name
      });
    } catch (e) {
      console.warn('[CONTEXT_FABRIC] ContextEngine build error:', e.message);
    }

    // 6. Retrieve recent active calendar agenda
    let todayEvents = [];
    try {
      const todayStr = CalendarService.formatDateOnly(new Date());
      todayEvents = await CalendarService.getAgenda(userId, todayStr, timezone);
    } catch (_) {}

    // 7. Gather Health Connect telemetry if passed from client
    const healthState = options.healthSnapshot || options.healthContext || {};

    // 8. Gather active device state
    const deviceState = options.deviceState || options.deviceStatus || {
      batteryLevel: options.batteryLevel,
      networkConnected: options.networkConnected,
      networkType: options.networkType
    };

    // 9. Recent memories with provenance
    let memories = [];
    try {
      memories = await this.memoryAgent.getMemories(userId, 5);
    } catch (_) {}

    return new JarvisContextSnapshot({
      user: {
        userId: userRecord.id,
        name: userRecord.name,
        email: userRecord.email
      },
      time: new Date().toISOString(),
      timezone,
      location: options.location || null,
      deviceState,
      currentApplication: options.currentApplication || null,
      screenContext: options.screenContext || null,
      activeConversation: {
        sessionId,
        activeIntent: convState.activeIntent,
        activeEntity: convState.activeEntity,
        candidates: convState.candidateEntities,
        temporalContext: convState.temporalContext,
        lastResolvedReference: convState.lastResolvedReference
      },
      activeTask,
      calendar: todayEvents,
      reminders: contextPackage.sources?.schedule?.data?.reminders || [],
      healthState,
      memory: memories,
      worldModel: {
        activeEntityRelations
      },
      preferences: contextPackage.user || {},
      metadata: {
        version: '8.0.0',
        freshnessMs: Date.now() - snapshotTimestamp,
        provenance: 'JARVIS_CONTEXT_FABRIC_P8',
        privacyClassification: 'PRIVATE',
        confidenceScore: 0.98,
        authenticated: true
      }
    });
  }
}

const defaultContextFabric = new JarvisContextFabric();

module.exports = {
  JarvisContextFabric,
  defaultContextFabric
};
