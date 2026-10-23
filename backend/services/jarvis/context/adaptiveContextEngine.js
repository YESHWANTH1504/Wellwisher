/**
 * AdaptiveContextEngine 4.0
 * Continuously updated context model with confidence-aware resolution across People, Events, Tasks, and Workflows.
 */
class AdaptiveContextEngine {
  constructor() {
    this.contexts = new Map();
  }

  getContext(userId) {
    if (!this.contexts.has(userId)) {
      this.contexts.set(userId, {
        currentTime: new Date().toISOString(),
        currentDay: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        activeEvent: null,
        activeTask: null,
        activePerson: null,
        activeReminder: null,
        activeWorkflow: null,
        currentRoutine: null,
        upcomingCommitments: [],
        pendingObligations: [],
        attentionMode: 'BALANCED',
        quietHours: { enabled: true, startHour: 22, endHour: 7 },
        travelBufferMinutes: 30,
        userPreferences: {},
        explicitGoals: [],
        recentAssistantActions: [],
        failedWorkflows: [],
        lastUpdated: new Date().toISOString()
      });
    }
    return this.contexts.get(userId);
  }

  updateContext(userId, updates = {}) {
    const ctx = this.getContext(userId);
    Object.assign(ctx, updates, {
      currentTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });
    return ctx;
  }

  resolveAdaptiveReference(userId, query) {
    const ctx = this.getContext(userId);
    const lower = query.toLowerCase();

    if (lower.includes('move that') || lower.includes('cancel it') || lower.includes('that meeting')) {
      if (ctx.activeEvent) {
        return { type: 'EVENT', entity: ctx.activeEvent, confidence: 0.98 };
      }
    }

    if (lower.includes('tell him') || lower.includes('tell her') || lower.includes('call him')) {
      if (ctx.activePerson) {
        return { type: 'PERSON', entity: ctx.activePerson, confidence: 0.95 };
      }
    }

    if (lower.includes('do the same thing tomorrow') || lower.includes('do that again')) {
      if (ctx.activeWorkflow) {
        return { type: 'WORKFLOW_TEMPLATE', entity: ctx.activeWorkflow, confidence: 0.9 };
      }
    }

    return { type: 'UNKNOWN', entity: null, confidence: 0.0 };
  }
}

module.exports = new AdaptiveContextEngine();
