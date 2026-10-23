const pool = require('../../../config/db');
const { activeTaskManager } = require('../tasks/ActiveTaskManager');

/**
 * JarvisConversationState
 * Durable, user-isolated conversational state engine.
 * Maintains persistent activeEntity locks, candidate sets, temporal context,
 * provenance, and multi-turn reference resolution state across turns and process restarts.
 */
class JarvisConversationState {
  constructor() {
    this._states = new Map(); // Key: `${userId}:${sessionId}`
  }

  _getKey(sessionId, userId) {
    return `${userId}:${sessionId}`;
  }

  static async loadOrCreate(userId, sessionId) {
    const state = await defaultConversationState.getOrCreate(sessionId, userId);
    state.persist = async () => {
      await defaultConversationState.persist(sessionId, userId);
    };
    return state;
  }

  /**
   * Get existing state from cache or database, or initialize fresh state
   */
  async getOrCreate(sessionId, userId) {
    if (!userId) throw new Error('JarvisConversationState requires authenticated userId');
    const key = this._getKey(sessionId, userId);
    if (this._states.has(key)) {
      return this._states.get(key);
    }

    // Try loading from database
    const loaded = await this.restore(sessionId, userId);
    if (loaded) {
      this._states.set(key, loaded);
      return loaded;
    }

    const freshState = {
      sessionId,
      userId,
      activeIntent: null,
      activeEntity: null,
      activeApplication: null,
      previousApplication: null,
      recentApplications: [],
      activeCapability: null,
      activeWorkflow: null,
      activeStep: null,
      candidateEntities: [],
      candidateOrdering: [],
      lastResolvedReference: null,
      lastAction: null,
      lastActionResult: null,
      lastCreatedEntity: null,
      lastModifiedEntity: null,
      lastQueriedEntities: [],
      pendingConfirmation: null,
      pendingClarification: null,
      temporalContext: {
        anchorDate: new Date().toISOString().split('T')[0],
        timezone: 'Asia/Kolkata',
        timezoneOffset: '+05:30'
      },
      unresolvedReferences: [],
      conversationTimestamp: Date.now(),
      confidence: 1.0,
      provenance: 'USER_INTERACTION'
    };

    this._states.set(key, freshState);
    return freshState;
  }

  /**
   * Lock an entity as the active conversational focus (Multi-Turn Entity Lock)
   */
  async lockEntity(sessionId, userId, entity, options = {}) {
    const state = await this.getOrCreate(sessionId, userId);
    if (!entity) return null;

    const lockedEntity = {
      id: entity.id || entity.eventId || entity.reminderId || entity.entityId,
      entityType: entity.entityType || entity.type || (entity.reminderId ? 'REMINDER' : 'CALENDAR_EVENT'),
      title: entity.title || entity.displayName || 'Event',
      displayName: entity.displayName || entity.title || 'Event',
      time: entity.time || entity.targetTime,
      date: entity.date || entity.targetDate || state.temporalContext.anchorDate,
      ordinal: entity.ordinal !== undefined ? entity.ordinal : null,
      properties: entity.properties || {},
      locked: true,
      lockedAt: Date.now(),
      source: options.source || 'ORDINAL_LOCK',
      confidence: options.confidence || 0.98
    };

    state.activeEntity = lockedEntity;
    state.lastResolvedReference = {
      rawQuery: options.rawQuery || null,
      entityId: lockedEntity.id,
      entityTitle: lockedEntity.title,
      timestamp: Date.now()
    };
    state.conversationTimestamp = Date.now();

    // Synchronize with activeTaskManager for compatibility
    activeTaskManager.setActiveTask(sessionId, {
      userId,
      id: lockedEntity.id,
      eventId: lockedEntity.id,
      reminderId: lockedEntity.entityType === 'REMINDER' ? lockedEntity.id : null,
      entityId: lockedEntity.id,
      title: lockedEntity.title,
      time: lockedEntity.time,
      date: lockedEntity.date,
      type: lockedEntity.entityType,
      status: 'LOCKED',
      candidates: state.candidateEntities
    });

    await this.persist(sessionId, userId);
    return lockedEntity;
  }

  /**
   * Unlock or clear active entity focus
   */
  async unlockEntity(sessionId, userId) {
    const state = await this.getOrCreate(sessionId, userId);
    state.activeEntity = null;
    await this.persist(sessionId, userId);
  }

  /**
   * Get active locked entity if present
   */
  async getActiveEntity(sessionId, userId) {
    const state = await this.getOrCreate(sessionId, userId);
    return state.activeEntity || null;
  }

  /**
   * Set active application context without dropping active entity
   */
  async setActiveApplication(sessionId, userId, appInfo) {
    const state = await this.getOrCreate(sessionId, userId);
    if (!appInfo) return null;

    if (state.activeApplication && state.activeApplication.packageName !== appInfo.packageName) {
      state.previousApplication = state.activeApplication;
      if (!Array.isArray(state.recentApplications)) state.recentApplications = [];
      state.recentApplications.unshift(state.activeApplication);
      if (state.recentApplications.length > 5) state.recentApplications.pop();
    }

    state.activeApplication = {
      packageName: appInfo.packageName,
      applicationLabel: appInfo.appName || appInfo.applicationLabel || appInfo.packageName,
      timestamp: Date.now(),
      confidence: appInfo.confidence || 0.98,
      source: appInfo.source || 'APPLICATION_LAUNCH'
    };

    await this.persist(sessionId, userId);
    return state.activeApplication;
  }

  /**
   * Get active application context
   */
  async getActiveApplication(sessionId, userId) {
    const state = await this.getOrCreate(sessionId, userId);
    return state.activeApplication || null;
  }

  /**
   * Set active workflow and active step (maintains separation from activeEntity & activeApplication)
   */
  async setActiveWorkflow(sessionId, userId, workflowInfo) {
    const state = await this.getOrCreate(sessionId, userId);
    if (!workflowInfo) {
      state.activeWorkflow = null;
      state.activeStep = null;
    } else {
      state.activeWorkflow = {
        workflowId: workflowInfo.workflowId,
        goal: workflowInfo.goal,
        status: workflowInfo.status,
        updatedAt: Date.now()
      };
      state.activeStep = workflowInfo.currentStepId || null;
    }
    await this.persist(sessionId, userId);
    return state.activeWorkflow;
  }

  /**
   * Get active workflow
   */
  async getActiveWorkflow(sessionId, userId) {
    const state = await this.getOrCreate(sessionId, userId);
    if (!state.activeWorkflow) return null;
    if (typeof state.activeWorkflow === 'object') return state.activeWorkflow;
    const { defaultWorkflowEngine } = require('../workflow/JarvisWorkflowEngine');
    return defaultWorkflowEngine.getWorkflow(state.activeWorkflow) || (await defaultWorkflowEngine.loadWorkflow(state.activeWorkflow, userId));
  }

  /**
   * Clear active workflow
   */
  async clearActiveWorkflow(sessionId, userId) {
    const state = await this.getOrCreate(sessionId, userId);
    state.activeWorkflow = null;
    state.activeStep = null;
    await this.persist(sessionId, userId);
  }

  /**
   * Set candidate entities from retrieved query (preserving explicit ordinals)
   */
  async setCandidates(sessionId, userId, candidates = [], options = {}) {
    const state = await this.getOrCreate(sessionId, userId);
    state.candidateEntities = (candidates || []).map((c, idx) => ({
      id: c.id || c.eventId || c.reminderId || c.entityId,
      eventId: c.eventId || c.id,
      entityId: c.entityId || c.id,
      reminderId: c.reminderId || null,
      title: c.title || c.displayName || `Item ${idx + 1}`,
      displayName: c.displayName || c.title || `Item ${idx + 1}`,
      time: c.time || c.formattedTime,
      formattedTime: c.formattedTime || c.time,
      date: c.date || state.temporalContext.anchorDate,
      category: c.category || 'general',
      eventType: c.eventType || 'routine',
      ordinal: idx + 1
    }));

    state.candidateOrdering = state.candidateEntities.map(c => c.id);
    state.lastQueriedEntities = [...state.candidateEntities];
    state.conversationTimestamp = Date.now();

    // Do NOT overwrite activeEntity to candidate[0] automatically!
    // ActiveTaskManager candidates array updated, but eventId left null or explicit
    activeTaskManager.setActiveTask(sessionId, {
      userId,
      type: options.queryType || 'SCHEDULE_QUERY',
      candidates: state.candidateEntities,
      status: 'QUERY_COMPLETED'
    });

    await this.persist(sessionId, userId);
    return state.candidateEntities;
  }

  /**
   * Get candidate entities
   */
  async getCandidates(sessionId, userId) {
    const state = await this.getOrCreate(sessionId, userId);
    return state.candidateEntities || [];
  }

  /**
   * Resolve ordinal candidate (e.g. 1st = index 0, 2nd = index 1)
   */
  async resolveOrdinalCandidate(sessionId, userId, ordinalIndex, categoryFilter = null) {
    const state = await this.getOrCreate(sessionId, userId);
    let list = state.candidateEntities || [];

    if (categoryFilter) {
      const filterLower = categoryFilter.toLowerCase();
      const filtered = list.filter(c =>
        (c.title || '').toLowerCase().includes(filterLower) ||
        (c.eventType || '').toLowerCase().includes(filterLower) ||
        (c.category || '').toLowerCase().includes(filterLower)
      );
      if (filtered.length > 0) {
        list = filtered;
      }
    }

    if (ordinalIndex >= 0 && ordinalIndex < list.length) {
      return list[ordinalIndex];
    }
    return null;
  }

  /**
   * Record action execution into conversation history
   */
  async recordAction(sessionId, userId, toolName, args = {}, result = {}) {
    const state = await this.getOrCreate(sessionId, userId);
    state.lastAction = { toolName, arguments: args, timestamp: Date.now() };
    state.lastActionResult = result;

    const resData = result.data || result;
    const targetId = resData.id || resData.eventId || resData.reminderId || args.id || args.eventId || args.reminderId;
    const targetTitle = resData.title || resData.updatedEvent?.title || args.title || state.activeEntity?.title || 'Item';
    const targetTime = resData.time || resData.updatedEvent?.time || args.time || args.newTime || state.activeEntity?.time;
    const targetDate = resData.date || resData.updatedEvent?.date || args.date || args.newDate || state.activeEntity?.date;

    if (toolName.includes('create')) {
      state.lastCreatedEntity = {
        id: targetId,
        type: toolName.includes('reminder') ? 'REMINDER' : 'CALENDAR_EVENT',
        title: targetTitle,
        time: targetTime,
        date: targetDate,
        createdAt: Date.now()
      };
      // If a reminder was created, lock it as activeEntity or link to last modified event
      if (toolName.includes('reminder') && state.activeEntity) {
        state.activeEntity.linkedReminderId = targetId;
      }
    } else if (toolName.includes('update') || toolName.includes('reschedule')) {
      state.lastModifiedEntity = {
        id: targetId,
        type: toolName.includes('reminder') ? 'REMINDER' : 'CALENDAR_EVENT',
        title: targetTitle,
        time: targetTime,
        date: targetDate,
        modifiedAt: Date.now()
      };
      // Keep activeEntity synchronized with updated time/date
      if (state.activeEntity && state.activeEntity.id === targetId) {
        state.activeEntity.time = targetTime;
        state.activeEntity.date = targetDate;
      }
    } else if (toolName.includes('cancel') || toolName.includes('delete')) {
      if (state.activeEntity && state.activeEntity.id === targetId) {
        state.activeEntity = null;
      }
    }

    state.conversationTimestamp = Date.now();
    await this.persist(sessionId, userId);
  }

  /**
   * Update temporal context
   */
  async updateTemporalContext(sessionId, userId, temporalUpdates = {}) {
    const state = await this.getOrCreate(sessionId, userId);
    state.temporalContext = {
      ...state.temporalContext,
      ...temporalUpdates
    };
    await this.persist(sessionId, userId);
  }

  /**
   * Persist state to MySQL jarvis_conversation_states
   */
  async persist(sessionId, userId) {
    const key = this._getKey(sessionId, userId);
    const state = this._states.get(key);
    if (!state) return;

    try {
      await pool.query(`
        INSERT INTO jarvis_conversation_states (
          session_id, user_id, active_intent, active_entity, candidate_entities,
          candidate_ordering, last_resolved_reference, last_action, last_action_result,
          last_created_entity, last_modified_entity, last_queried_entities,
          pending_confirmation, pending_clarification, temporal_context,
          unresolved_references, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          active_intent = VALUES(active_intent),
          active_entity = VALUES(active_entity),
          candidate_entities = VALUES(candidate_entities),
          candidate_ordering = VALUES(candidate_ordering),
          last_resolved_reference = VALUES(last_resolved_reference),
          last_action = VALUES(last_action),
          last_action_result = VALUES(last_action_result),
          last_created_entity = VALUES(last_created_entity),
          last_modified_entity = VALUES(last_modified_entity),
          last_queried_entities = VALUES(last_queried_entities),
          pending_confirmation = VALUES(pending_confirmation),
          pending_clarification = VALUES(pending_clarification),
          temporal_context = VALUES(temporal_context),
          unresolved_references = VALUES(unresolved_references),
          metadata = VALUES(metadata),
          updated_at = CURRENT_TIMESTAMP
      `, [
        sessionId,
        userId,
        state.activeIntent || null,
        state.activeEntity ? JSON.stringify(state.activeEntity) : null,
        JSON.stringify(state.candidateEntities || []),
        JSON.stringify(state.candidateOrdering || []),
        state.lastResolvedReference ? JSON.stringify(state.lastResolvedReference) : null,
        state.lastAction ? JSON.stringify(state.lastAction) : null,
        state.lastActionResult ? JSON.stringify(state.lastActionResult) : null,
        state.lastCreatedEntity ? JSON.stringify(state.lastCreatedEntity) : null,
        state.lastModifiedEntity ? JSON.stringify(state.lastModifiedEntity) : null,
        JSON.stringify(state.lastQueriedEntities || []),
        state.pendingConfirmation ? JSON.stringify(state.pendingConfirmation) : null,
        state.pendingClarification ? JSON.stringify(state.pendingClarification) : null,
        JSON.stringify(state.temporalContext || {}),
        JSON.stringify(state.unresolvedReferences || []),
        JSON.stringify({
          confidence: state.confidence,
          provenance: state.provenance,
          activeApplication: state.activeApplication,
          previousApplication: state.previousApplication,
          recentApplications: state.recentApplications,
          activeCapability: state.activeCapability,
          activeWorkflow: state.activeWorkflow,
          activeStep: state.activeStep
        })
      ]);
    } catch (err) {
      console.warn('[JarvisConversationState] Persist warning:', err.message);
    }
  }

  /**
   * Restore state from MySQL jarvis_conversation_states
   */
  async restore(sessionId, userId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM jarvis_conversation_states WHERE session_id = ? AND user_id = ?',
        [sessionId, userId]
      );
      if (!rows || rows.length === 0) return null;

      const r = rows[0];
      const parseJson = (val, fallback = null) => {
        if (!val) return fallback;
        if (typeof val === 'object') return val;
        try { return JSON.parse(val); } catch (_) { return fallback; }
      };

      const meta = parseJson(r.metadata, {});
      return {
        sessionId: r.session_id,
        userId: r.user_id,
        activeIntent: r.active_intent,
        activeEntity: parseJson(r.active_entity, null),
        activeApplication: meta.activeApplication || null,
        previousApplication: meta.previousApplication || null,
        recentApplications: meta.recentApplications || [],
        activeCapability: meta.activeCapability || null,
        activeWorkflow: meta.activeWorkflow || null,
        activeStep: meta.activeStep || null,
        candidateEntities: parseJson(r.candidate_entities, []),
        candidateOrdering: parseJson(r.candidate_ordering, []),
        lastResolvedReference: parseJson(r.last_resolved_reference, null),
        lastAction: parseJson(r.last_action, null),
        lastActionResult: parseJson(r.last_action_result, null),
        lastCreatedEntity: parseJson(r.last_created_entity, null),
        lastModifiedEntity: parseJson(r.last_modified_entity, null),
        lastQueriedEntities: parseJson(r.last_queried_entities, []),
        pendingConfirmation: parseJson(r.pending_confirmation, null),
        pendingClarification: parseJson(r.pending_clarification, null),
        temporalContext: parseJson(r.temporal_context, {
          anchorDate: new Date().toISOString().split('T')[0],
          timezone: 'Asia/Kolkata',
          timezoneOffset: '+05:30'
        }),
        unresolvedReferences: parseJson(r.unresolved_references, []),
        conversationTimestamp: new Date(r.updated_at).getTime(),
        confidence: meta.confidence || 1.0,
        provenance: meta.provenance || 'RESTORED_FROM_DB'
      };
    } catch (err) {
      console.warn('[JarvisConversationState] Restore warning:', err.message);
      return null;
    }
  }

  /**
   * Clear state in memory and database
   */
  async clear(sessionId, userId) {
    const key = this._getKey(sessionId, userId);
    this._states.delete(key);
    activeTaskManager.clearActiveTask(sessionId);
    try {
      await pool.query('DELETE FROM jarvis_conversation_states WHERE session_id = ? AND user_id = ?', [sessionId, userId]);
    } catch (_) {}
  }
}

const defaultConversationState = new JarvisConversationState();

module.exports = {
  JarvisConversationState,
  defaultConversationState
};
