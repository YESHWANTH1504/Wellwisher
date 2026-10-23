const RoutineModel = require('../../../models/routineModel');
const { defaultWorldModel } = require('./JarvisWorldModel');
const { defaultConversationState } = require('./JarvisConversationState');

/**
 * JarvisEntityResolver
 * Resolves conversational references and ambiguous natural language tokens into
 * stable semantic entities across active task context, the database, and the personal world model.
 */
class JarvisEntityResolver {
  constructor(options = {}) {
    this.worldModel = options.worldModel || defaultWorldModel;
  }

  /**
   * Universal resolution method
   * @param {number} userId
   * @param {string} query
   * @param {Object} context { sessionId, activeTask, workingMemory, recentEntities, screenContext }
   */
  async resolveEntity(userId, query = '', context = {}) {
    if (!userId) throw new Error('JarvisEntityResolver requires authenticated userId');
    const raw = (query || '').toLowerCase().trim();
    const activeTask = context.activeTask || null;
    const sessionId = context.sessionId || null;

    // Check conversation state cache if available
    let convState = null;
    if (sessionId) {
      convState = defaultConversationState._states.get(`${userId}:${sessionId}`);
    }

    // 1. Check Locked Active Entity from Conversation State (#1 Priority)
    const isPronoun = (
      raw === 'that' ||
      raw === 'it' ||
      raw === 'this' ||
      raw === 'this one' ||
      raw === 'that one' ||
      raw === 'cancel that' ||
      raw.startsWith('actually make that') ||
      raw.startsWith('actually make it') ||
      raw.startsWith('move that') ||
      raw.startsWith('move it') ||
      raw.includes('the reminder') ||
      raw.includes('the meeting') ||
      raw.includes('that event')
    );

    if (isPronoun && convState && convState.activeEntity) {
      const locked = convState.activeEntity;
      return {
        resolved: true,
        ambiguous: false,
        entity: {
          id: locked.id || locked.eventId,
          displayName: locked.title || locked.displayName,
          type: locked.entityType || 'CALENDAR_EVENT',
          time: locked.time,
          date: locked.date,
          source: 'CONVERSATION_STATE_LOCKED',
          confidence: 0.99
        }
      };
    }

    // 1b. Check Active Task Context
    if (isPronoun && activeTask && (activeTask.eventId || activeTask.reminderId || activeTask.entityId || activeTask.id)) {
      const targetId = activeTask.eventId || activeTask.reminderId || activeTask.entityId || activeTask.id;
      let routine = null;
      try {
        routine = await RoutineModel.getById(targetId, userId);
      } catch (_) {
        routine = null;
      }
      if (routine) {
        return {
          resolved: true,
          ambiguous: false,
          entity: {
            id: routine.id,
            displayName: routine.title,
            type: routine.event_type === 'routine' ? 'ROUTINE' : 'CALENDAR_EVENT',
            time: routine.time,
            date: routine.date,
            source: 'ACTIVE_TASK_DB',
            confidence: 0.98
          }
        };
      } else if (activeTask.title || activeTask.id) {
        return {
          resolved: true,
          ambiguous: false,
          entity: {
            id: targetId,
            displayName: activeTask.title || activeTask.id,
            type: activeTask.type || 'CALENDAR_EVENT',
            time: activeTask.time || activeTask.targetTime,
            date: activeTask.date,
            source: 'ACTIVE_TASK',
            confidence: 0.95
          }
        };
      }
    }

    // 2. Check Ordinal References ("the second one", "the first item", "the third meeting")
    const candidateList = (convState && convState.candidateEntities && convState.candidateEntities.length > 0)
      ? convState.candidateEntities
      : (activeTask && Array.isArray(activeTask.candidates) ? activeTask.candidates : []);

    const ordinalMatch = raw.match(/\b(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th)\b/i);
    if (ordinalMatch && candidateList.length > 0) {
      const ord = ordinalMatch[1].toLowerCase();
      let index = 0;
      if (ord === 'first' || ord === '1st') index = 0;
      else if (ord === 'second' || ord === '2nd') index = 1;
      else if (ord === 'third' || ord === '3rd') index = 2;
      else if (ord === 'fourth' || ord === '4th') index = 3;
      else if (ord === 'last') index = candidateList.length - 1;

      if (index >= 0 && index < candidateList.length) {
        const candidate = candidateList[index];
        return {
          resolved: true,
          ambiguous: false,
          entity: {
            id: candidate.eventId || candidate.entityId || candidate.id,
            displayName: candidate.title,
            type: candidate.eventType || 'CALENDAR_EVENT',
            time: candidate.time,
            date: candidate.date,
            source: 'ORDINAL_SELECTION',
            confidence: 0.95
          }
        };
      }
    }

    // 2b. Check Screen Entities ("shown here", "on screen", "this event")
    if ((raw.includes('shown here') || raw.includes('on screen') || raw.includes('this event') || raw.includes('this meeting')) && context.screenContext) {
      const sc = context.screenContext;
      const textLines = Array.isArray(sc.visibleText) ? sc.visibleText : [String(sc.visibleText || '')];
      let title = sc.screenTitle || 'Screen Event';
      let date = null;
      let time = null;

      for (const line of textLines) {
        if (/event:\s*(.+)/i.test(line)) title = line.match(/event:\s*(.+)/i)[1].trim();
        if (/date:\s*(\d{4}-\d{2}-\d{2})/i.test(line)) date = line.match(/date:\s*(\d{4}-\d{2}-\d{2})/i)[1].trim();
        if (/time:\s*(\d{1,2}:\d{2})/i.test(line)) time = line.match(/time:\s*(\d{1,2}:\d{2})/i)[1].trim();
      }

      if (date || time) {
        return {
          resolved: true,
          ambiguous: false,
          entity: {
            id: `screen_ent_${Date.now()}`,
            displayName: title,
            type: 'CALENDAR_EVENT',
            date: date || new Date().toISOString().split('T')[0],
            time: time || '12:00',
            source: 'SCREEN_CONTEXT',
            confidence: 0.95
          }
        };
      }
    }

    // 3. Check World Model Semantic Graph
    const worldEntities = await this.worldModel.findEntities(userId, raw);
    if (worldEntities.length === 1) {
      return {
        resolved: true,
        ambiguous: false,
        entity: {
          id: worldEntities[0].id,
          displayName: worldEntities[0].displayName,
          type: worldEntities[0].entityType,
          properties: worldEntities[0].properties,
          source: 'WORLD_MODEL',
          confidence: worldEntities[0].confidence
        }
      };
    } else if (worldEntities.length > 1) {
      return {
        resolved: true,
        ambiguous: true,
        candidates: worldEntities.map(e => ({
          id: e.id,
          displayName: e.displayName,
          type: e.entityType
        }))
      };
    }

    // 4. Check Calendar / Routines DB directly
    try {
      const today = new Date().toISOString().split('T')[0];
      const routines = await RoutineModel.getByDate(userId, today);
      const matches = routines.filter(r => (r.title || '').toLowerCase().includes(raw));
      if (matches.length === 1) {
        return {
          resolved: true,
          ambiguous: false,
          entity: {
            id: matches[0].id,
            displayName: matches[0].title,
            type: matches[0].event_type === 'routine' ? 'ROUTINE' : 'CALENDAR_EVENT',
            time: matches[0].time,
            date: matches[0].date,
            source: 'DATABASE_MATCH',
            confidence: 0.92
          }
        };
      }
    } catch (_) {}

    return {
      resolved: false,
      ambiguous: false,
      entity: null
    };
  }
}

const defaultEntityResolver = new JarvisEntityResolver();

module.exports = {
  JarvisEntityResolver,
  defaultEntityResolver
};
