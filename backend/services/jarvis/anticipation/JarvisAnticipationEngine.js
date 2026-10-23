/**
 * JarvisAnticipationEngine
 * 
 * Master Orchestrator for Phase 11 Anticipatory Execution & Proactive Intelligence:
 * PERCEPTION -> CONTEXT FABRIC -> WORLD MODEL -> BEHAVIOR PATTERNS -> ANTICIPATION ENGINE ->
 * INTENT PREDICTION -> CONFIDENCE ENGINE -> POLICY / SAFETY -> PROACTIVE DECISION (A-E) ->
 * PHASE 10 WORKFLOW ENGINE -> FEEDBACK / LEARNING.
 * 
 * Zero unauthorized execution:
 * Autonomous execution (Level E) requires PROACTIVE mode, high confidence (>=0.85),
 * reversible action, and non-destructive Safety Level <= 1.
 */

const pool = require('../../../config/db');
const { JarvisAnticipationConfidence, CONFIDENCE_BANDS } = require('./JarvisAnticipationConfidence');
const { 
  JarvisProactivePolicyEngine, 
  PROACTIVE_DECISION_LEVELS, 
  PROACTIVE_MODES, 
  PROACTIVE_RISK_LEVELS 
} = require('./JarvisProactivePolicyEngine');
const { defaultFatigueManager } = require('./JarvisProactiveFatigueManager');
const JarvisMeetingPreparationEngine = require('./JarvisMeetingPreparationEngine');
const { defaultAnticipatoryExecutor } = require('./JarvisAnticipatoryExecutor');
const { JarvisProactiveScheduler } = require('./JarvisProactiveScheduler');

class JarvisAnticipationEngine {
  constructor(options = {}) {
    this.fatigueManager = options.fatigueManager || defaultFatigueManager;
    this.anticipatoryExecutor = options.anticipatoryExecutor || defaultAnticipatoryExecutor;
  }

  /**
   * Load user's proactive preferences
   */
  async getUserPreferences(userId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM jarvis_proactive_preferences WHERE user_id = ? LIMIT 1',
        [userId]
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        let authCats = ['LOCAL_REMINDERS', 'BRIEFING_PREP', 'MEETING_PREP'];
        if (r.authorized_categories) {
          try {
            authCats = typeof r.authorized_categories === 'string'
              ? JSON.parse(r.authorized_categories)
              : r.authorized_categories;
          } catch (_) {}
        }
        return {
          userId: r.user_id,
          proactiveMode: r.proactive_mode || PROACTIVE_MODES.BALANCED,
          quietHoursEnabled: r.quiet_hours_enabled === 1 || r.quiet_hours_enabled === true,
          quietHoursStart: r.quiet_hours_start || '22:00',
          quietHoursEnd: r.quiet_hours_end || '07:00',
          maxSuggestionsPerDay: r.max_suggestions_per_day || 12,
          notificationFrequency: r.notification_frequency || 'BALANCED',
          authorizedCategories: authCats,
          batteryThreshold: r.battery_threshold || 20,
          travelAnticipationLeadMins: r.travel_anticipation_lead_mins || 45
        };
      }
    } catch (err) {
      console.error('[ANTICIPATION_ENGINE] Error reading preferences:', err.message);
    }

    // Default Fallback
    return {
      userId,
      proactiveMode: PROACTIVE_MODES.BALANCED,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      maxSuggestionsPerDay: 12,
      notificationFrequency: 'BALANCED',
      authorizedCategories: ['LOCAL_REMINDERS', 'BRIEFING_PREP', 'MEETING_PREP'],
      batteryThreshold: 20,
      travelAnticipationLeadMins: 45
    };
  }

  /**
   * Update user proactive preferences
   */
  async setUserPreferences(userId, prefs = {}) {
    const pMode = prefs.proactiveMode || PROACTIVE_MODES.BALANCED;
    const qEnabled = prefs.quietHoursEnabled !== false ? 1 : 0;
    const qStart = prefs.quietHoursStart || '22:00';
    const qEnd = prefs.quietHoursEnd || '07:00';
    const maxDay = prefs.maxSuggestionsPerDay || 12;
    const notifFreq = prefs.notificationFrequency || 'BALANCED';
    const authCats = JSON.stringify(prefs.authorizedCategories || ['LOCAL_REMINDERS', 'BRIEFING_PREP', 'MEETING_PREP']);
    const battThresh = prefs.batteryThreshold || 20;
    const leadMins = prefs.travelAnticipationLeadMins || 45;

    await pool.query(`
      INSERT INTO jarvis_proactive_preferences
        (user_id, proactive_mode, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
         max_suggestions_per_day, notification_frequency, authorized_categories, battery_threshold, travel_anticipation_lead_mins)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        proactive_mode = VALUES(proactive_mode),
        quiet_hours_enabled = VALUES(quiet_hours_enabled),
        quiet_hours_start = VALUES(quiet_hours_start),
        quiet_hours_end = VALUES(quiet_hours_end),
        max_suggestions_per_day = VALUES(max_suggestions_per_day),
        notification_frequency = VALUES(notification_frequency),
        authorized_categories = VALUES(authorized_categories),
        battery_threshold = VALUES(battery_threshold),
        travel_anticipation_lead_mins = VALUES(travel_anticipation_lead_mins)
    `, [userId, pMode, qEnabled, qStart, qEnd, maxDay, notifFreq, authCats, battThresh, leadMins]);

    return this.getUserPreferences(userId);
  }

  /**
   * Record or update a behavior pattern
   */
  async recordBehaviorPattern(userId, pattern = {}) {
    const patternType = pattern.patternType || 'TEMPORAL_ROUTINE';
    const title = pattern.title || pattern.targetAction || 'User Habit';
    const triggerEvent = pattern.triggerEvent || 'TIME_TRIGGER';
    const triggerType = pattern.triggerType || 'TIME_OF_DAY';
    const triggerValue = pattern.triggerValue || '09:00';
    const targetAction = pattern.targetAction || 'open_app';
    const capabilityId = pattern.capabilityId || null;
    const contextMetadata = JSON.stringify(pattern.contextMetadata || {});
    const initialConfidence = pattern.confidenceScore || 0.60;

    const [existing] = await pool.query(`
      SELECT pattern_id, recurrence_count, confidence_score 
      FROM jarvis_behavior_patterns 
      WHERE user_id = ? AND pattern_type = ? AND trigger_value = ? AND target_action = ?
      LIMIT 1
    `, [userId, patternType, triggerValue, targetAction]);

    if (existing && existing.length > 0) {
      const p = existing[0];
      const newRecurrence = p.recurrence_count + 1;
      const newConfidence = Math.min(0.95, (p.confidence_score * 0.8) + (0.2 * 0.95));
      await pool.query(`
        UPDATE jarvis_behavior_patterns
        SET recurrence_count = ?, confidence_score = ?, last_observed_at = NOW()
        WHERE pattern_id = ?
      `, [newRecurrence, newConfidence, p.pattern_id]);
      return { patternId: p.pattern_id, recurrenceCount: newRecurrence, confidenceScore: newConfidence };
    }

    const patternId = `bp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await pool.query(`
      INSERT INTO jarvis_behavior_patterns
        (pattern_id, user_id, pattern_type, title, trigger_type, trigger_value, target_action, capability_id, recurrence_count, confidence_score, context_metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [patternId, userId, patternType, title, triggerType, triggerValue, targetAction, capabilityId, initialConfidence, contextMetadata]);

    return { patternId, recurrenceCount: 1, confidenceScore: initialConfidence };
  }

  /**
   * Evaluate context against anticipation rules, patterns, and calendar
   */
  async evaluateContext(userId, currentContext = {}) {
    const preferences = await this.getUserPreferences(userId);
    const now = new Date();
    const timeStr = currentContext.currentTime || now.toTimeString().substring(0, 5);
    const dateStr = currentContext.currentDate || now.toISOString().substring(0, 10);

    const candidates = [];

    // 1. Device Low Battery Candidate
    const batteryLevel = currentContext.batteryLevel !== undefined ? currentContext.batteryLevel : 100;
    const isCharging = currentContext.isCharging === true;
    if (batteryLevel <= (preferences.batteryThreshold || 20) && !isCharging) {
      candidates.push({
        candidateType: 'DEVICE_OPTIMIZATION',
        priority: 'HIGH',
        title: 'Low Battery Optimization',
        speechText: `Your battery is at ${batteryLevel}%. Would you like me to open Battery settings to enable Power Saving?`,
        displayMessage: `Battery at ${batteryLevel}%. Power Saving recommended.`,
        dedupKey: `battery_low_${userId}_${dateStr}_${Math.floor(now.getHours() / 2)}`,
        safetyLevel: 1,
        riskLevel: PROACTIVE_RISK_LEVELS.LOW,
        isReversible: true,
        workflowProposal: {
          goal: 'Open Battery Settings',
          steps: [
            {
              stepId: 'step_open_battery',
              sequence: 1,
              capabilityId: 'open_settings',
              inputs: { subpage: 'battery' }
            }
          ]
        }
      });
    }

    // 2. Calendar / Meeting Preparation Evaluation
    if (Array.isArray(currentContext.upcomingEvents)) {
      for (const ev of currentContext.upcomingEvents) {
        const prepCandidate = JarvisMeetingPreparationEngine.evaluateMeeting(userId, ev);
        if (prepCandidate) {
          candidates.push(prepCandidate);
        }
      }
    }

    // 3. Behavior Patterns Evaluation
    try {
      const [patterns] = await pool.query(`
        SELECT * FROM jarvis_behavior_patterns 
        WHERE user_id = ? AND is_active = 1
      `, [userId]);

      for (const p of patterns) {
        let matches = false;
        if (p.trigger_type === 'TIME_OF_DAY' && p.trigger_value === timeStr) {
          matches = true;
        } else if (p.trigger_type === 'APP_OPEN' && p.trigger_value === currentContext.foregroundApp) {
          matches = true;
        }

        if (matches) {
          const dedupKey = `pattern_${p.pattern_id}_${userId}_${dateStr}`;
          candidates.push({
            candidateType: p.pattern_type || 'BEHAVIORAL_ROUTINE',
            priority: 'NORMAL',
            title: `Routine: ${p.target_action || p.title}`,
            speechText: `It's time for your usual routine: ${p.target_action || p.title}. Would you like to proceed?`,
            displayMessage: `Routine suggested: ${p.target_action || p.title}`,
            dedupKey,
            safetyLevel: 1,
            riskLevel: PROACTIVE_RISK_LEVELS.LOW,
            recurrenceCount: p.recurrence_count,
            patternId: p.pattern_id,
            workflowProposal: p.capability_id ? {
              goal: p.target_action || p.title,
              steps: [
                {
                  stepId: 'step_routine_1',
                  sequence: 1,
                  capabilityId: p.capability_id,
                  inputs: {}
                }
              ]
            } : null
          });
        }
      }
    } catch (_) {}

    // Process each candidate through Confidence -> Policy -> Fatigue -> Dispatch
    const results = [];
    for (const cand of candidates) {
      // 1. Calculate Confidence
      const confResult = JarvisAnticipationConfidence.calculate({
        recurrenceCount: cand.recurrenceCount || 1,
        lastObservedHoursAgo: 12,
        timeConsistency: 0.85,
        dayOfWeekMatch: true,
        contextRelevance: 0.90,
        sourceDataConfidence: 0.95
      });

      cand.confidenceScore = confResult.confidenceScore;
      cand.confidenceBand = confResult.confidenceBand;

      // Record prediction in jarvis_predictions
      const predictionId = `pred_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        await pool.query(`
          INSERT INTO jarvis_predictions 
            (prediction_id, user_id, prediction_type, predicted_intent, predicted_action, 
             confidence_score, confidence_band, source_signals, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `, [
          predictionId,
          userId, 
          cand.candidateType, 
          cand.title, 
          cand.title,
          cand.confidenceScore, 
          cand.confidenceBand, 
          JSON.stringify(currentContext)
        ]);
      } catch (err) {
        console.error('[ANTICIPATION_ENGINE] Prediction insert error:', err.message);
      }

      // 2. Evaluate Policy
      const policyDecision = JarvisProactivePolicyEngine.evaluatePolicy(cand, preferences);

      // If mode is OFF or decision level is OBSERVE, log and skip delivery
      if (policyDecision.decisionLevel === PROACTIVE_DECISION_LEVELS.OBSERVE) {
        results.push({
          candidate: cand,
          policyDecision,
          delivered: false,
          reason: policyDecision.reason
        });
        continue;
      }

      // 3. Fatigue & Quiet Hours Check
      const fatigueCheck = await this.fatigueManager.canDeliver(userId, cand, {
        currentTime: timeStr,
        preferences,
        activeConversation: currentContext.activeConversation,
        activeWorkflow: currentContext.activeWorkflow
      });

      if (!fatigueCheck.allowed) {
        results.push({
          candidate: cand,
          policyDecision,
          delivered: false,
          reason: fatigueCheck.reason
        });
        continue;
      }

      // 4. Persist suggestion into jarvis_proactive_suggestions
      const suggestionId = `sugg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        await pool.query(`
          INSERT INTO jarvis_proactive_suggestions
            (suggestion_id, user_id, prediction_id, candidate_type, decision_level, confidence_score,
             title, speech_text, display_message, priority, risk_level, dedup_key, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
          ON DUPLICATE KEY UPDATE status = 'PENDING', updated_at = NOW()
        `, [
          suggestionId,
          userId,
          predictionId,
          cand.candidateType,
          policyDecision.decisionLevel,
          cand.confidenceScore,
          cand.title,
          cand.speechText,
          cand.displayMessage,
          cand.priority || 'NORMAL',
          cand.riskLevel || 'LOW',
          cand.dedupKey
        ]);
      } catch (err) {
        console.error('[ANTICIPATION_ENGINE] Suggestion insert error:', err.message);
      }

      // 5. Dispatch or Stage via JarvisAnticipatoryExecutor
      const execResult = await this.anticipatoryExecutor.handleProposal(
        userId, 
        cand, 
        policyDecision, 
        currentContext.executionOptions || {}
      );

      // 6. Record delivery in Fatigue Manager
      this.fatigueManager.recordDelivery(userId, cand);

      // 7. Log Proactive Event
      const eventId = `pevt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        await pool.query(`
          INSERT INTO jarvis_proactive_events
            (event_id, user_id, event_type, source, event_payload, dedup_key)
          VALUES (?, ?, 'DELIVERED', 'CONTEXT_DETECTOR', ?, ?)
        `, [eventId, userId, JSON.stringify(execResult), cand.dedupKey]);
      } catch (err) {
        console.error('[ANTICIPATION_ENGINE] Event insert error:', err.message);
      }

      results.push({
        candidate: cand,
        suggestionId,
        predictionId,
        policyDecision,
        execResult,
        delivered: true
      });
    }

    return results;
  }

  /**
   * Generate Morning Briefing
   */
  async generateMorningBriefing(userId, options = {}) {
    const preferences = await this.getUserPreferences(userId);
    const dateStr = options.date || new Date().toISOString().substring(0, 10);
    const dedupKey = `morning_briefing_${userId}_${dateStr}`;

    let scheduleItems = [];
    try {
      const [rows] = await pool.query(`
        SELECT title, target_time, routine_type FROM jarvis_personal_routines
        WHERE user_id = ? AND is_active = 1
        ORDER BY target_time ASC
      `, [userId]);
      scheduleItems = rows;
    } catch (_) {}

    const count = scheduleItems.length;
    const firstMeeting = scheduleItems[0] ? `First up is "${scheduleItems[0].title}" at ${scheduleItems[0].target_time}.` : 'You have a clear morning schedule.';
    const speechText = `Good morning! You have ${count} scheduled event${count === 1 ? '' : 's'} today. ${firstMeeting} Have a productive day!`;
    const displayMessage = `Morning Briefing: ${count} event${count === 1 ? '' : 's'} scheduled for today.`;

    const candidate = {
      candidateType: 'DAILY_BRIEFING',
      priority: 'NORMAL',
      title: 'Morning Briefing',
      speechText,
      displayMessage,
      dedupKey,
      safetyLevel: 0,
      riskLevel: PROACTIVE_RISK_LEVELS.ZERO_RISK,
      confidenceScore: 0.95
    };

    const policyDecision = JarvisProactivePolicyEngine.evaluatePolicy(candidate, preferences);
    return {
      candidate,
      policyDecision,
      scheduleItems,
      speechText,
      displayMessage
    };
  }

  /**
   * Generate Evening Recap
   */
  async generateEveningRecap(userId, options = {}) {
    const preferences = await this.getUserPreferences(userId);
    const dateStr = options.date || new Date().toISOString().substring(0, 10);
    const dedupKey = `evening_recap_${userId}_${dateStr}`;

    let totalRoutines = 0;
    try {
      const [rows] = await pool.query(`
        SELECT COUNT(*) as cnt FROM jarvis_personal_routines
        WHERE user_id = ? AND is_active = 1
      `, [userId]);
      totalRoutines = rows[0]?.cnt || 0;
    } catch (_) {}

    const speechText = `Good evening. You had ${totalRoutines} active routine${totalRoutines === 1 ? '' : 's'} tracked today. Rest well tonight.`;
    const displayMessage = `Evening Recap: ${totalRoutines} routines tracked today.`;

    const candidate = {
      candidateType: 'EVENING_RECAP',
      priority: 'NORMAL',
      title: 'Evening Recap',
      speechText,
      displayMessage,
      dedupKey,
      safetyLevel: 0,
      riskLevel: PROACTIVE_RISK_LEVELS.ZERO_RISK,
      confidenceScore: 0.95
    };

    const policyDecision = JarvisProactivePolicyEngine.evaluatePolicy(candidate, preferences);
    return {
      candidate,
      policyDecision,
      speechText,
      displayMessage
    };
  }

  /**
   * Explain why a suggestion was made (Transparent Rationale)
   */
  async explainSuggestion(userId, suggestionId) {
    try {
      const [rows] = await pool.query(`
        SELECT s.*, p.prediction_type, p.confidence_score as pred_conf, p.confidence_band
        FROM jarvis_proactive_suggestions s
        LEFT JOIN jarvis_predictions p ON s.prediction_id = p.prediction_id
        WHERE s.suggestion_id = ? AND s.user_id = ?
        LIMIT 1
      `, [suggestionId, userId]);

      if (!rows || rows.length === 0) {
        return {
          success: false,
          error: 'SUGGESTION_NOT_FOUND',
          explanation: 'No suggestion found matching this ID.'
        };
      }

      const s = rows[0];
      const band = s.confidence_band || 'HIGH';
      const score = s.pred_conf || s.confidence_score || 0.85;

      const explanation = `I suggested "${s.title}" because I detected an active ${s.candidate_type || 'context'} with ${band} confidence (${(score * 100).toFixed(0)}%). Under your current proactive policy (${s.decision_level}), this was evaluated as safe and helpful.`;

      return {
        success: true,
        suggestionId,
        title: s.title,
        candidateType: s.candidate_type,
        decisionLevel: s.decision_level,
        confidenceScore: score,
        confidenceBand: band,
        explanation
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        explanation: 'Could not generate explanation due to a database error.'
      };
    }
  }

  /**
   * Record User Feedback (Accepted, Dismissed, Snoozed, Rejected)
   */
  async recordFeedback(userId, suggestionId, feedbackType, feedbackReason = null) {
    const validTypes = ['ACCEPTED', 'DISMISSED', 'SNOOZED', 'REJECTED'];
    const normType = (feedbackType || '').toUpperCase();
    if (!validTypes.includes(normType)) {
      return { success: false, error: 'INVALID_FEEDBACK_TYPE' };
    }

    try {
      // 1. Fetch suggestion
      const [suggs] = await pool.query(`
        SELECT * FROM jarvis_proactive_suggestions 
        WHERE suggestion_id = ? AND user_id = ?
        LIMIT 1
      `, [suggestionId, userId]);

      if (!suggs || suggs.length === 0) {
        return { success: false, error: 'SUGGESTION_NOT_FOUND' };
      }

      const sugg = suggs[0];

      // 2. Update suggestion status
      const newStatus = normType === 'ACCEPTED' ? 'ACCEPTED' : (normType === 'REJECTED' ? 'REJECTED' : 'PRESENTED');
      await pool.query(`
        UPDATE jarvis_proactive_suggestions
        SET status = ?
        WHERE suggestion_id = ?
      `, [newStatus, suggestionId]);

      // 3. Map action_type to table ENUM ('ACCEPTED','REJECTED','IGNORED','MODIFIED','CANCELLED')
      let actionType = 'ACCEPTED';
      if (normType === 'REJECTED') actionType = 'REJECTED';
      else if (normType === 'DISMISSED' || normType === 'SNOOZED') actionType = 'IGNORED';

      const feedbackId = `fdbk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const confAdj = normType === 'ACCEPTED' ? 0.05 : (normType === 'REJECTED' ? -0.10 : -0.02);

      await pool.query(`
        INSERT INTO jarvis_proactive_feedback
          (feedback_id, user_id, suggestion_id, pattern_id, action_type, user_comment, resulting_confidence_adjustment)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [feedbackId, userId, suggestionId, null, actionType, feedbackReason, confAdj]);

      // 4. Update behavior pattern confidence if linked
      if (sugg.candidate_type) {
        await pool.query(`
          UPDATE jarvis_behavior_patterns
          SET confidence_score = GREATEST(0.1, LEAST(0.99, confidence_score + ?))
          WHERE user_id = ? AND pattern_type = ?
        `, [confAdj, userId, sugg.candidate_type]);
      }

      return {
        success: true,
        suggestionId,
        feedbackType: normType,
        newStatus: normType === 'ACCEPTED' ? 'ACCEPTED' : (normType === 'REJECTED' ? 'REJECTED' : 'DISMISSED')
      };
    } catch (err) {
      console.error('[ANTICIPATION_ENGINE] Error recording feedback:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get active proactive suggestions feed for user
   */
  async getProactiveFeed(userId, limit = 10) {
    try {
      const [rows] = await pool.query(`
        SELECT suggestion_id, candidate_type, title, speech_text, display_message,
               decision_level, confidence_score, status, created_at
        FROM jarvis_proactive_suggestions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `, [userId, limit]);
      return rows;
    } catch (err) {
      console.error('[ANTICIPATION_ENGINE] getProactiveFeed error:', err.message);
      return [];
    }
  }
}

const defaultAnticipationEngine = new JarvisAnticipationEngine();

module.exports = {
  JarvisAnticipationEngine,
  defaultAnticipationEngine
};
