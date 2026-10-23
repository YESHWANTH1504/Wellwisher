/**
 * JARVIS Voice Session Manager (Phase 51).
 * Tracks multi-turn voice interaction sessions, context continuity, follow-up slots,
 * cancellation states, and safe session expiration timeouts.
 */

class VoiceSessionManager {
    constructor(options = {}) {
        this.sessionTtlMs = options.sessionTtlMs || 60000; // 60-second voice session inactivity TTL
        this.sessions = new Map();
    }

    /**
     * Get or create a voice session for a user
     */
    getOrCreateSession(userId, sessionId = null, deviceId = null) {
        if (!userId) {
            throw new Error('userId is required for voice session creation.');
        }

        const now = Date.now();
        const activeKey = sessionId || `vs_${userId}_${now}`;

        let session = this.sessions.get(activeKey);

        if (session) {
            // Check session expiry
            if (now - session.lastActivityAt > this.sessionTtlMs) {
                this.sessions.delete(activeKey);
                session = null;
            }
        }

        if (!session) {
            session = {
                sessionId: activeKey,
                userId,
                deviceId: deviceId || 'android_unknown',
                createdAt: now,
                lastActivityAt: now,
                turnCount: 0,
                status: 'ACTIVE',
                pendingIntent: null,
                pendingSlots: {},
                context: {}
            };
            this.sessions.set(activeKey, session);
        } else {
            session.lastActivityAt = now;
            session.turnCount += 1;
        }

        return session;
    }

    /**
     * Retrieve an active session if valid and unexpired
     */
    getSession(sessionId, userId) {
        if (!sessionId) return null;
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        if (userId && session.userId !== userId) {
            return null; // Cross-user session isolation
        }

        if (Date.now() - session.lastActivityAt > this.sessionTtlMs) {
            this.sessions.delete(sessionId);
            return null;
        }

        return session;
    }

    /**
     * Update session pending slots / intent for follow-ups (e.g. "What time?")
     */
    updateSession(sessionId, updates = {}) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        session.lastActivityAt = Date.now();
        if (updates.pendingIntent !== undefined) session.pendingIntent = updates.pendingIntent;
        if (updates.pendingSlots) session.pendingSlots = { ...session.pendingSlots, ...updates.pendingSlots };
        if (updates.status) session.status = updates.status;
        if (updates.context) session.context = { ...session.context, ...updates.context };

        return session;
    }

    /**
     * Cancel and terminate a session (e.g. user says "Cancel that")
     */
    cancelSession(sessionId, userId) {
        const session = this.getSession(sessionId, userId);
        if (session) {
            session.status = 'CANCELLED';
            session.pendingIntent = null;
            session.pendingSlots = {};
            this.sessions.delete(sessionId);
            return true;
        }
        return false;
    }

    /**
     * Clear all sessions (for testing/cleanup)
     */
    clear() {
        this.sessions.clear();
    }
}

const defaultVoiceSessionManager = new VoiceSessionManager();

module.exports = {
    VoiceSessionManager,
    defaultVoiceSessionManager
};
