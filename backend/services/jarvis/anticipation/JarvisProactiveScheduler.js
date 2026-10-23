/**
 * JarvisProactiveScheduler
 * 
 * Manages deterministic, idempotent scheduling of proactive intelligence triggers:
 * - Pre-meeting preparations (15-30m before)
 * - Morning briefing triggers
 * - Evening recap triggers
 * - Routine habit reminders
 * - Contextual follow-up checks
 * 
 * Strict Idempotency: Every scheduled job or candidate carries a deterministic `dedup_key`.
 * If a suggestion/workflow with this dedup_key already exists within the deduplication window,
 * it is safely bypassed without duplication.
 */

const pool = require('../../../config/db');
const { defaultFatigueManager } = require('./JarvisProactiveFatigueManager');

class JarvisProactiveScheduler {
    constructor(options = {}) {
        this.pollIntervalMs = options.pollIntervalMs || 60000;
        this.timer = null;
        this.scheduledJobs = new Map(); // key -> job details
    }

    /**
     * Generate deterministic deduplication key
     */
    static generateDedupKey(category, userId, entityId, dateStr) {
        const cleanDate = dateStr || new Date().toISOString().slice(0, 10);
        return `${category}_${userId}_${entityId || 'general'}_${cleanDate}`.slice(0, 191);
    }

    /**
     * Schedule a one-time anticipation check for a specific event
     */
    scheduleEventAnticipation(userId, eventId, triggerTime, metadata = {}) {
        const dateStr = new Date(triggerTime).toISOString().slice(0, 10);
        const dedupKey = JarvisProactiveScheduler.generateDedupKey('event_anticipation', userId, eventId, dateStr);

        this.scheduledJobs.set(dedupKey, {
            userId,
            eventId,
            triggerTime: new Date(triggerTime).getTime(),
            category: 'CALENDAR_MEETING',
            metadata,
            status: 'SCHEDULED'
        });

        return { dedupKey, scheduled: true, triggerTime };
    }

    /**
     * Check if a dedupKey has already fired or is active in MySQL
     */
    async isKeyDuplicate(userId, dedupKey) {
        if (!dedupKey) return false;
        try {
            const [rows] = await pool.query(
                `SELECT suggestion_id, status, created_at FROM jarvis_proactive_suggestions 
                 WHERE user_id = ? AND dedup_key = ? 
                 AND created_at >= DATE_SUB(NOW(), INTERVAL 12 HOUR)
                 LIMIT 1`,
                [userId, dedupKey]
            );
            return rows.length > 0;
        } catch (err) {
            console.error('[PROACTIVE_SCHEDULER] Error checking dedup key:', err.message);
            return false;
        }
    }

    /**
     * Evaluate upcoming calendar events for proactive anticipation
     */
    async evaluateUpcomingEvents(userId, windowMinutes = 30) {
        try {
            const now = new Date();
            const future = new Date(now.getTime() + windowMinutes * 60000);

            // Fetch active routines / calendar events in window
            const [events] = await pool.query(
                `SELECT routine_id, title, target_time, routine_type, context_triggers 
                 FROM jarvis_personal_routines 
                 WHERE user_id = ? AND is_active = 1`,
                [userId]
            );

            const actionable = [];
            for (const ev of events) {
                // Parse target_time (HH:MM or full datetime)
                const dedupKey = JarvisProactiveScheduler.generateDedupKey(
                    'meeting_prep',
                    userId,
                    ev.routine_id,
                    now.toISOString().slice(0, 10)
                );

                const isDup = await this.isKeyDuplicate(userId, dedupKey);
                if (!isDup) {
                    actionable.push({
                        ...ev,
                        dedupKey,
                        leadTimeMinutes: windowMinutes
                    });
                }
            }

            return actionable;
        } catch (err) {
            console.error('[PROACTIVE_SCHEDULER] evaluateUpcomingEvents error:', err.message);
            return [];
        }
    }

    /**
     * Check morning briefing eligibility
     */
    async checkMorningBriefingEligibility(userId) {
        const now = new Date();
        const hour = now.getHours();
        
        // Window: 07:00 - 10:00
        if (hour < 7 || hour > 10) return { eligible: false, reason: 'OUTSIDE_MORNING_WINDOW' };

        const dedupKey = JarvisProactiveScheduler.generateDedupKey('morning_briefing', userId, 'daily', now.toISOString().slice(0, 10));
        const isDup = await this.isKeyDuplicate(userId, dedupKey);
        if (isDup) return { eligible: false, reason: 'ALREADY_GENERATED_TODAY' };

        return {
            eligible: true,
            dedupKey,
            category: 'DAILY_BRIEFING'
        };
    }

    /**
     * Check evening recap eligibility
     */
    async checkEveningRecapEligibility(userId) {
        const now = new Date();
        const hour = now.getHours();

        // Window: 20:00 - 22:00
        if (hour < 20 || hour > 22) return { eligible: false, reason: 'OUTSIDE_EVENING_WINDOW' };

        const dedupKey = JarvisProactiveScheduler.generateDedupKey('evening_recap', userId, 'daily', now.toISOString().slice(0, 10));
        const isDup = await this.isKeyDuplicate(userId, dedupKey);
        if (isDup) return { eligible: false, reason: 'ALREADY_GENERATED_TODAY' };

        return {
            eligible: true,
            dedupKey,
            category: 'EVENING_RECAP'
        };
    }

    /**
     * Clear memory scheduler
     */
    clear() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.scheduledJobs.clear();
    }
}

const defaultProactiveScheduler = new JarvisProactiveScheduler();

module.exports = {
    JarvisProactiveScheduler,
    defaultProactiveScheduler
};
