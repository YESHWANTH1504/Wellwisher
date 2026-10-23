/**
 * PersonalContextEngine 3.0
 * Persistent Context Graph & Confidence-Aware Reference Resolution
 */
class PersonalContextEngine {
  constructor() {
    this.userContexts = new Map();
  }

  getContext(userId) {
    if (!this.userContexts.has(userId)) {
      this.userContexts.set(userId, {
        activeEvent: null,
        activeTask: null,
        activePerson: null,
        activeReminder: null,
        activeWorkflow: null,
        activeLocation: null,
        activeApplication: null,
        activeConversation: null,
        activeGoal: null,
        activeRoutine: null,
        recentCommands: [],
        unfinishedActions: [],
        recentAssistantActions: [],
        failedActions: [],
        pendingConfirmations: [],
        quietHours: { enabled: true, startHour: 22, endHour: 7 },
        travelBufferMinutes: 30,
        attentionMode: 'BALANCED',
        lastUpdated: new Date().toISOString()
      });
    }
    return this.userContexts.get(userId);
  }

  updateContext(userId, updates = {}) {
    const ctx = this.getContext(userId);
    Object.assign(ctx, updates, { lastUpdated: new Date().toISOString() });
    return ctx;
  }

  resolveReference(userId, query) {
    const ctx = this.getContext(userId);
    const lower = query.toLowerCase();

    // Event references
    if (lower.includes('that meeting') || lower.includes('the meeting') || lower.includes('it') || lower.includes('that') || lower.includes('move it') || lower.includes('cancel it')) {
      if (ctx.activeEvent) {
        return { type: 'EVENT', entity: ctx.activeEvent, confidence: 0.95 };
      }
    }

    // Person references
    if (lower.includes('tell him') || lower.includes('tell her') || lower.includes('call him') || lower.includes('call her')) {
      if (ctx.activePerson) {
        return { type: 'PERSON', entity: ctx.activePerson, confidence: 0.9 };
      }
    }

    // Task references
    if (lower.includes('that task') || lower.includes('the task') || lower.includes('finish it')) {
      if (ctx.activeTask) {
        return { type: 'TASK', entity: ctx.activeTask, confidence: 0.9 };
      }
    }

    return { type: 'UNKNOWN', entity: null, confidence: 0.0 };
  }

  recordAction(userId, action) {
    const ctx = this.getContext(userId);
    ctx.recentAssistantActions.unshift({
      ...action,
      timestamp: new Date().toISOString()
    });
    if (ctx.recentAssistantActions.length > 50) {
      ctx.recentAssistantActions.pop();
    }
  }

  clearContext(userId) {
    this.userContexts.delete(userId);
  }
}

module.exports = new PersonalContextEngine();
