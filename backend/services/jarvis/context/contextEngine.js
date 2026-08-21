const TemporalContext = require('./temporalContext');
const ContextRouter = require('./contextRouter');
const { SOURCE_STATUS, CONTEXT_BUDGETS } = require('./contextSources');

const ScheduleRetriever = require('./retrievers/scheduleRetriever');
const MemoryRetriever = require('./retrievers/memoryRetriever');
const ConversationRetriever = require('./retrievers/conversationRetriever');
const WellnessRetriever = require('./retrievers/wellnessRetriever');
const MedicationRetriever = require('./retrievers/medicationRetriever');
const FamilyRetriever = require('./retrievers/familyRetriever');
const DocumentRetriever = require('./retrievers/documentRetriever');
const HealthTrendRetriever = require('./retrievers/healthTrendRetriever');

const { AiPreferenceRepository } = require('../../../repositories/ai/aiPreferenceRepository');
const pool = require('../../../config/db');

class ContextEngine {
  /**
   * Build a structured, user-scoped, bounded context package for an incoming request
   */
  static async buildContext(userId, request = '', options = {}) {
    if (!userId) {
      throw new Error('Authenticated userId is required to build context.');
    }

    const startTime = Date.now();
    const sourceTimings = {};
    const sources = {};

    // 1. Fetch User Profile & Preferences
    let userContext = { userId };
    let aiPreferences = null;

    try {
      const [uRows] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [userId]);
      if (uRows && uRows[0]) {
        userContext = {
          userId: uRows[0].id,
          name: uRows[0].name,
          email: uRows[0].email
        };
      }
      aiPreferences = await AiPreferenceRepository.getPreferences(userId);
      userContext.assistantName = aiPreferences.assistantName;
      userContext.preferredResponseStyle = aiPreferences.preferredResponseStyle;
      userContext.languagePreference = aiPreferences.languagePreference;
      userContext.timezone = options.timezone || 'UTC';
    } catch (err) {
      console.warn('ContextEngine: User profile fetch warning:', err.message);
    }

    // 2. Resolve Temporal Context
    const temporal = TemporalContext.resolve(userContext.timezone, options.baseDate || new Date());

    // 3. Relevance Routing
    const categories = ContextRouter.analyzeRelevance(request);

    // 4. Parallel Safe Source Retrieval
    const tasks = [];

    // --- Schedule Source ---
    tasks.push(
      (async () => {
        const sStart = Date.now();
        if (!categories.includes('SCHEDULE') && !options.forceAllSources) {
          sources.schedule = { status: SOURCE_STATUS.NOT_RELEVANT, data: null };
          sourceTimings.schedule = 0;
          return;
        }
        try {
          const res = await ScheduleRetriever.retrieve(userId, temporal, {
            upcomingDays: 2
          });
          const status = res.todayCount + res.upcomingCount > 0 ? SOURCE_STATUS.AVAILABLE : SOURCE_STATUS.EMPTY;
          sources.schedule = { status, data: res };
        } catch (err) {
          sources.schedule = { status: SOURCE_STATUS.UNAVAILABLE, error: err.message, data: null };
        } finally {
          sourceTimings.schedule = Date.now() - sStart;
        }
      })()
    );

    // --- Memory Source ---
    tasks.push(
      (async () => {
        const sStart = Date.now();
        try {
          const res = await MemoryRetriever.retrieve(userId, request, {
            limit: CONTEXT_BUDGETS.MAX_MEMORIES
          });
          const status = res.count > 0 ? SOURCE_STATUS.AVAILABLE : SOURCE_STATUS.EMPTY;
          sources.memory = { status, data: res };
        } catch (err) {
          sources.memory = { status: SOURCE_STATUS.UNAVAILABLE, error: err.message, data: null };
        } finally {
          sourceTimings.memory = Date.now() - sStart;
        }
      })()
    );

    // --- Conversation History Source ---
    tasks.push(
      (async () => {
        const sStart = Date.now();
        try {
          const res = await ConversationRetriever.retrieve(userId, options.conversationId, {
            limit: CONTEXT_BUDGETS.MAX_CONVERSATION_TURNS
          });
          const status = res.retrievedCount > 0 ? SOURCE_STATUS.AVAILABLE : SOURCE_STATUS.EMPTY;
          sources.conversation = { status, data: res };
        } catch (err) {
          sources.conversation = { status: SOURCE_STATUS.UNAVAILABLE, error: err.message, data: null };
        } finally {
          sourceTimings.conversation = Date.now() - sStart;
        }
      })()
    );

    // --- Wellness Source (Selective) ---
    tasks.push(
      (async () => {
        const sStart = Date.now();
        if (!categories.includes('WELLNESS') && !options.forceAllSources) {
          sources.wellness = { status: SOURCE_STATUS.NOT_RELEVANT, data: null };
          sourceTimings.wellness = 0;
          return;
        }
        try {
          const res = await WellnessRetriever.retrieve(userId, temporal.currentDate);
          sources.wellness = { status: SOURCE_STATUS.AVAILABLE, data: res };
        } catch (err) {
          sources.wellness = { status: SOURCE_STATUS.UNAVAILABLE, error: err.message, data: null };
        } finally {
          sourceTimings.wellness = Date.now() - sStart;
        }
      })()
    );

    // --- Medication Source (Selective) ---
    tasks.push(
      (async () => {
        const sStart = Date.now();
        if (!categories.includes('MEDICATION') && !options.forceAllSources) {
          sources.medication = { status: SOURCE_STATUS.NOT_RELEVANT, data: null };
          sourceTimings.medication = 0;
          return;
        }
        try {
          const res = await MedicationRetriever.retrieve(userId);
          const status = res.count > 0 ? SOURCE_STATUS.AVAILABLE : SOURCE_STATUS.EMPTY;
          sources.medication = { status, data: res };
        } catch (err) {
          sources.medication = { status: SOURCE_STATUS.UNAVAILABLE, error: err.message, data: null };
        } finally {
          sourceTimings.medication = Date.now() - sStart;
        }
      })()
    );

    // --- Family Source (Selective) ---
    tasks.push(
      (async () => {
        const sStart = Date.now();
        if (!categories.includes('FAMILY') && !options.forceAllSources) {
          sources.family = { status: SOURCE_STATUS.NOT_RELEVANT, data: null };
          sourceTimings.family = 0;
          return;
        }
        try {
          const res = await FamilyRetriever.retrieve(userId);
          const status = res.count > 0 ? SOURCE_STATUS.AVAILABLE : SOURCE_STATUS.EMPTY;
          sources.family = { status, data: res };
        } catch (err) {
          sources.family = { status: SOURCE_STATUS.UNAVAILABLE, error: err.message, data: null };
        } finally {
          sourceTimings.family = Date.now() - sStart;
        }
      })()
    );

    // --- Clinical Document Source ---
    tasks.push(
      (async () => {
        const sStart = Date.now();
        if (!categories.includes('DOCUMENT') && !options.forceAllSources) {
          sources.document = { status: SOURCE_STATUS.NOT_RELEVANT, data: null };
          sourceTimings.document = 0;
          return;
        }
        try {
          const res = await DocumentRetriever.retrieve(userId, request);
          const status = res.documentCount > 0 ? SOURCE_STATUS.AVAILABLE : SOURCE_STATUS.EMPTY;
          sources.document = { status, data: res };
        } catch (err) {
          sources.document = { status: SOURCE_STATUS.UNAVAILABLE, error: err.message, data: null };
        } finally {
          sourceTimings.document = Date.now() - sStart;
        }
      })()
    );

    // --- Health Trends & Alerts Source (Phase 9) ---
    tasks.push(
      (async () => {
        const sStart = Date.now();
        if (!categories.includes('HEALTH_TRENDS') && !categories.includes('DOCUMENT') && !options.forceAllSources) {
          sources.healthTrends = { status: SOURCE_STATUS.NOT_RELEVANT, data: null };
          sourceTimings.healthTrends = 0;
          return;
        }
        try {
          const res = await HealthTrendRetriever.retrieve(userId, options);
          const status = res.hasHealthTrends ? SOURCE_STATUS.AVAILABLE : SOURCE_STATUS.EMPTY;
          sources.healthTrends = { status, data: res };
        } catch (err) {
          sources.healthTrends = { status: SOURCE_STATUS.UNAVAILABLE, error: err.message, data: null };
        } finally {
          sourceTimings.healthTrends = Date.now() - sStart;
        }
      })()
    );

    // Execute parallel retrievals
    await Promise.all(tasks);

    const totalGenerationTimeMs = Date.now() - startTime;

    // 5. Build Standardized Context Package
    return {
      user: userContext,
      preferences: aiPreferences,
      temporalContext: temporal,
      categories,
      todaySchedule: sources.schedule?.data?.todayRoutines || [],
      upcomingSchedule: sources.schedule?.data?.upcomingRoutines || [],
      relevantMemories: sources.memory?.data?.memories || [],
      recentConversation: sources.conversation?.data?.messages || [],
      wellnessSummary: sources.wellness?.data || null,
      medicationContext: sources.medication?.data || null,
      familyContext: sources.family?.data || null,
      documentContext: sources.document?.data || null,
      healthTrendContext: sources.healthTrends?.data || null,
      sources,
      metadata: {
        userId,
        requestText: request,
        categories,
        totalGenerationTimeMs,
        sourceTimingsMs: sourceTimings,
        budgets: CONTEXT_BUDGETS
      }
    };
  }
}

module.exports = ContextEngine;
