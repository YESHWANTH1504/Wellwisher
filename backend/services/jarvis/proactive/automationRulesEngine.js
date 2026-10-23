const pool = require('../../../config/db');
const CalendarService = require('../integrations/calendarService');
const DailyBrainState = require('./dailyBrainState');
const ProactiveNotifier = require('../autonomous/proactiveNotifier');

/**
 * JARVIS User Automation Rules Engine
 * Supports user-defined and system automation rules:
 * - "Every weekday at 7 AM, tell me what I have today."
 * - "If I have a doctor appointment tomorrow, prepare my briefing."
 * - "If two meetings conflict, alert me."
 * - "If I haven't completed my workout by 8 PM, remind me."
 * - "Every Sunday at 6 PM, prepare my week ahead."
 */
class AutomationRulesEngine {
  /**
   * Default built-in system rule templates
   */
  static get DEFAULT_RULES() {
    return [
      {
        id: 'rule_morning_briefing',
        name: 'Weekday Morning Briefing',
        triggerType: 'SCHEDULED_TIME',
        cronSchedule: '0 7 * * 1-5', // 7:00 AM Mon-Fri
        actionType: 'GENERATE_BRIEFING',
        enabled: true,
        description: 'Proactively summarizes today\'s schedule and focus items at 7 AM on weekdays'
      },
      {
        id: 'rule_pre_appointment_briefing',
        name: 'Doctor Appointment Preparation',
        triggerType: 'EVENT_TRIGGERED',
        eventCondition: 'APPOINTMENT_TOMORROW',
        actionType: 'PREPARE_DOCTOR_BRIEFING',
        enabled: true,
        description: 'Compiles lab reports and health trends 24 hours before a doctor consultation'
      },
      {
        id: 'rule_conflict_guard',
        name: 'Calendar Conflict Guard',
        triggerType: 'EVENT_TRIGGERED',
        eventCondition: 'CONFLICT_DETECTED',
        actionType: 'NOTIFY_CONFLICT',
        enabled: true,
        description: 'Immediately alerts the user when overlapping calendar events are detected'
      },
      {
        id: 'rule_workout_check',
        name: 'Evening Workout Completion Check',
        triggerType: 'SCHEDULED_TIME',
        cronSchedule: '0 20 * * *', // 8:00 PM daily
        actionType: 'CHECK_WORKOUT',
        enabled: true,
        description: 'Reminds the user at 8 PM if daily workout routine has not been completed'
      },
      {
        id: 'rule_sunday_planning',
        name: 'Sunday Week Ahead Planning',
        triggerType: 'SCHEDULED_TIME',
        cronSchedule: '0 18 * * 0', // 6:00 PM Sunday
        actionType: 'WEEK_PREVIEW',
        enabled: true,
        description: 'Summarizes the upcoming week\'s appointments and commitments'
      }
    ];
  }

  /**
   * Retrieve active rules for a user
   */
  static async getRules(userId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM ai_memories WHERE user_id = ? AND memory_type = ? AND memory_key LIKE ?',
        [userId, 'TEMPORARY_CONTEXT', 'rule_%']
      );
      if (rows && rows.length > 0) {
        return rows.map(r => {
          try {
            return JSON.parse(r.memory_value);
          } catch (_) {
            return { id: r.memory_key, name: r.memory_key, enabled: true };
          }
        });
      }
    } catch (_) {}

    return this.DEFAULT_RULES;
  }

  /**
   * Save / update a user automation rule
   */
  static async saveRule(userId, rule) {
    const ruleId = rule.id || `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ruleObj = { ...rule, id: ruleId, updatedAt: new Date().toISOString() };

    try {
      await pool.query(
        `INSERT INTO ai_memories (user_id, memory_type, memory_key, memory_value, source, importance)
         VALUES (?, 'TEMPORARY_CONTEXT', ?, ?, 'USER_EXPLICIT', 4)
         ON DUPLICATE KEY UPDATE memory_value = VALUES(memory_value), last_observed_at = NOW()`,
        [userId, ruleId, JSON.stringify(ruleObj)]
      );
    } catch (_) {}

    return ruleObj;
  }

  /**
   * Toggle a user automation rule enabled state
   */
  static async toggleRule(userId, ruleId, enabled) {
    const rules = await this.getRules(userId);
    const target = rules.find(r => r.id === ruleId);
    if (!target) {
      const defaultMatch = this.DEFAULT_RULES.find(r => r.id === ruleId);
      if (defaultMatch) {
        return this.saveRule(userId, { ...defaultMatch, enabled });
      }
      return null;
    }
    return this.saveRule(userId, { ...target, enabled });
  }

  /**
   * Delete a user automation rule
   */
  static async deleteRule(userId, ruleId) {
    try {
      await pool.query(
        'DELETE FROM ai_memories WHERE user_id = ? AND memory_type = ? AND memory_key = ?',
        [userId, 'TEMPORARY_CONTEXT', ruleId]
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Record execution history for a rule
   */
  static async recordExecution(userId, ruleId, result) {
    const executionEntry = {
      ruleId,
      executedAt: new Date().toISOString(),
      status: result.success !== false ? 'SUCCESS' : 'FAILURE',
      output: result.output || null
    };

    try {
      const memKey = `exec_${ruleId}_${Date.now()}`;
      await pool.query(
        `INSERT INTO ai_memories (user_id, memory_type, memory_key, memory_value, source, importance)
         VALUES (?, 'TEMPORARY_CONTEXT', ?, ?, 'SYSTEM_DERIVED', 2)`,
        [userId, memKey, JSON.stringify(executionEntry)]
      );
    } catch (e) {
      console.warn('recordExecution warning:', e.message);
    }

    return executionEntry;
  }

  /**
   * Retrieve automation execution history
   */
  static async getExecutionHistory(userId, limit = 20) {
    try {
      const sanitizedLimit = parseInt(limit, 10) || 20;
      const [rows] = await pool.query(
        `SELECT * FROM ai_memories WHERE user_id = ? AND memory_key LIKE 'exec_%' ORDER BY id DESC LIMIT ${sanitizedLimit}`,
        [userId]
      );
      if (rows && rows.length > 0) {
        return rows.map(r => {
          try {
            let parsed = r.memory_value;
            if (typeof parsed === 'string') {
              try { parsed = JSON.parse(parsed); } catch (_) {}
              if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (_) {}
              }
            }
            return parsed && typeof parsed === 'object' ? parsed : { ruleId: r.memory_key, executedAt: r.created_at };
          } catch (_) {
            return { ruleId: r.memory_key, executedAt: r.created_at };
          }
        });
      }
    } catch (e) {
      console.warn('getExecutionHistory warning:', e.message);
    }
    return [];
  }

  /**
   * Evaluate all active rules against current daily context
   */
  static async evaluateRules(userId, timezone = 'UTC') {
    const rules = await this.getRules(userId);
    const results = [];

    const dailyState = await DailyBrainState.getDailyState(userId, timezone);

    for (const rule of rules) {
      if (!rule.enabled) continue;

      let triggered = false;
      let actionOutput = null;

      switch (rule.actionType) {
        case 'GENERATE_BRIEFING': {
          if (dailyState.summary.overdueTasksCount > 0 || dailyState.summary.upcomingEventsCount > 0) {
            triggered = true;
            actionOutput = `Morning briefing ready: ${dailyState.summary.upcomingEventsCount} upcoming events, ${dailyState.summary.overdueTasksCount} overdue tasks.`;
          }
          break;
        }

        case 'NOTIFY_CONFLICT': {
          if (dailyState.summary.conflictsCount > 0) {
            triggered = true;
            actionOutput = `Calendar conflict detected: ${dailyState.summary.conflictsCount} overlapping events require review.`;
          }
          break;
        }

        case 'PREPARE_DOCTOR_BRIEFING': {
          const upcomingApts = dailyState.attentionFeed.filter(a => a.type === 'APPOINTMENT');
          if (upcomingApts.length > 0) {
            triggered = true;
            actionOutput = `Doctor briefing prepared for upcoming appointment: ${upcomingApts[0].title}.`;
          }
          break;
        }

        case 'CHECK_WORKOUT': {
          const routines = dailyState.attentionFeed.filter(a => a.type === 'ROUTINE');
          const workout = routines.find(r => (r.title || '').toLowerCase().includes('workout') || (r.title || '').toLowerCase().includes('exercise'));
          if (workout && workout.status !== 'completed') {
            triggered = true;
            actionOutput = `Evening reminder: ${workout.title} is not yet marked completed.`;
          }
          break;
        }

        default:
          break;
      }

      if (triggered) {
        const execution = {
          ruleId: rule.id,
          ruleName: rule.name,
          triggered: true,
          actionType: rule.actionType,
          output: actionOutput,
          success: true
        };
        await this.recordExecution(userId, rule.id, execution);
        results.push(execution);
      }
    }

    return {
      userId,
      evaluatedAt: new Date().toISOString(),
      triggeredCount: results.length,
      actions: results
    };
  }
}

module.exports = AutomationRulesEngine;
