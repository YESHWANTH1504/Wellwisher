const RoutineModel = require('../../../../models/routineModel');
const { AiMemoryRepository } = require('../../../../repositories/ai/aiMemoryRepository');
const { AiPreferenceRepository } = require('../../../../repositories/ai/aiPreferenceRepository');
const { AiProactiveEventRepository } = require('../../../../repositories/ai/aiProactiveEventRepository');
const healthConnectRepository = require('../../../../repositories/ai/healthConnectRepository');
const { activeTaskManager } = require('../../tasks/ActiveTaskManager');
const aiWorkflowRepository = require('../../../../repositories/ai/aiWorkflowRepository');
const pool = require('../../../../config/db');

/**
 * PersonalContextAgent (Phase 5 & 5.1 Hardened)
 * Central intelligence for personal context normalization, durable long-term memory governance,
 * unified context snapshots, deterministic schedule conflict awareness, and morning briefings.
 * 
 * Strict Zero-Fabrication Invariant:
 * Never invents health values or schedule entries. Missing data is explicitly marked NO_DATA and null.
 */
class PersonalContextAgent {
  constructor(memoryAgent = null) {
    this.memoryAgent = memoryAgent;
    this.userPreferences = new Map(); // L1 memory cache: userId -> { key: value }
  }

  /**
   * Helper to derive memory key and cleaned fact from utterance
   */
  _extractMemoryKeyAndFact(raw) {
    const lower = raw.toLowerCase();
    let fact = raw.replace(/^remember\s+that\s+/i, '')
                  .replace(/^remember\s+/i, '')
                  .replace(/^i\s+prefer\s+/i, '')
                  .trim();
    let key = 'user_preference';

    if (lower.includes('24-hour') || lower.includes('24 hour') || lower.includes('12-hour') || lower.includes('12 hour') || lower.includes('time format')) {
      key = 'time_format';
      fact = (lower.includes('24-hour') || lower.includes('24 hour')) ? '24-hour time' : '12-hour time';
    } else if (lower.includes('remind') || lower.includes('reminder')) {
      key = 'reminder_preference';
      if (lower.includes('after 8 pm') || lower.includes('after 8pm') || lower.includes('after 8')) {
        fact = 'reminders after 8 PM';
      }
    } else if (lower.includes('coffee') || lower.includes('tea') || lower.includes('beverage')) {
      key = 'coffee_preference';
    } else if (lower.includes('morning meeting') || lower.includes('meetings in the morning') || lower.includes('meeting')) {
      key = 'meeting_preference';
    } else if (lower.includes('wake up') || lower.includes('sleep') || lower.includes('bed')) {
      key = 'sleep_preference';
    } else if (lower.includes('workout') || lower.includes('exercise') || lower.includes('gym')) {
      key = 'workout_preference';
    } else {
      // Slugify first 3 words of fact as fallback key
      const words = fact.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).slice(0, 3);
      key = words.length > 0 ? `${words.join('_')}_preference` : 'user_preference';
    }

    return { key, fact };
  }

  /**
   * Handle natural language memory requests (Store, Forget, Recall, Preference query)
   */
  async handleMemoryRequest(userId, requestText) {
    if (!userId) {
      return { success: false, error: 'USER_ID_REQUIRED', speech: 'User authentication is required.' };
    }

    const raw = (requestText || '').trim();
    const lower = raw.toLowerCase();

    // ==========================================
    // 1. FORGET MEMORY COMMANDS
    // ==========================================
    if (
      lower.startsWith('forget that') ||
      lower.startsWith('forget preference') ||
      lower.startsWith('forget my preference') ||
      lower.startsWith('delete that memory') ||
      lower.startsWith('don\'t remember this') ||
      lower.startsWith('dont remember this') ||
      lower.includes('forget that i prefer') ||
      lower.includes('forget my') ||
      lower.startsWith('forget ')
    ) {
      try {
        const { key: extractedKey } = this._extractMemoryKeyAndFact(raw.replace(/^forget\s+(that\s+)?/i, ''));
        
        let targetTerms = [];
        if (lower.includes('reminder') || lower.includes('remind')) targetTerms.push('reminder', '8 pm', '8pm');
        if (lower.includes('time') || lower.includes('hour')) targetTerms.push('time_format', '24-hour', '12-hour', 'time');
        if (lower.includes('coffee')) targetTerms.push('coffee');
        if (lower.includes('meeting')) targetTerms.push('meeting');
        if (lower.includes('sleep') || lower.includes('wake')) targetTerms.push('sleep', 'wake');
        if (lower.includes('workout') || lower.includes('exercise')) targetTerms.push('workout', 'exercise');

        // Fetch user memories
        const memories = await AiMemoryRepository.getMemoriesByUser(userId);
        let deletedMemory = null;

        for (const mem of memories) {
          const mKey = (mem.memory_key || '').toLowerCase();
          const mVal = (mem.memory_value || '').toLowerCase();

          // Check if memory matches extracted key
          if (extractedKey && extractedKey !== 'user_preference' && mKey === extractedKey) {
            deletedMemory = mem;
            break;
          }

          // Check target keywords
          const matchesTerm = targetTerms.some(term => mKey.includes(term) || mVal.includes(term));
          if (matchesTerm) {
            deletedMemory = mem;
            break;
          }
        }

        if (deletedMemory) {
          await AiMemoryRepository.deleteMemory(deletedMemory.id, userId);

          // Clean up L1 cache
          if (this.userPreferences.has(userId)) {
            const userCache = this.userPreferences.get(userId);
            delete userCache[deletedMemory.memory_key];
          }

          return {
            success: true,
            action: 'FORGOTTEN',
            key: deletedMemory.memory_key,
            deletedId: deletedMemory.id,
            speech: 'Understood. I have forgotten that preference.',
            message: `Preference "${deletedMemory.memory_key}" removed from durable storage.`
          };
        } else {
          return {
            success: true,
            action: 'NOT_FOUND',
            speech: 'I could not find a matching preference in my memory to forget.',
            message: 'No matching preference found for deletion.'
          };
        }
      } catch (err) {
        console.error('[PersonalContextAgent] Error forgetting memory:', err.message);
        return {
          success: false,
          error: err.message,
          speech: 'I encountered an error trying to update my memory.'
        };
      }
    }

    // ==========================================
    // 2. STORE MEMORY / PREFERENCE COMMANDS
    // ==========================================
    if (lower.startsWith('remember that') || lower.startsWith('remember ')) {
      const { key, fact } = this._extractMemoryKeyAndFact(raw);
      const memoryType = 'USER_PREFERENCE';

      // 1. Update L1 Cache
      if (!this.userPreferences.has(userId)) {
        this.userPreferences.set(userId, {});
      }
      this.userPreferences.get(userId)[key] = fact;

      // 2. Persist to durable MySQL ai_memories (Deduplicated)
      let storedMemory = null;
      try {
        storedMemory = await AiMemoryRepository.createMemory(userId, {
          memoryType,
          memoryKey: key,
          memoryValue: fact,
          source: 'USER_EXPLICIT',
          importance: 4,
          confidenceScore: 1.0,
          metadata: { storedAt: new Date().toISOString() }
        });
      } catch (err) {
        console.warn('[PersonalContextAgent] Durable memory save warning:', err.message);
      }

      const spokenFact = fact.replace(/^i\s+prefer\s+/i, '').replace(/^i\s+/i, 'you ');
      return {
        success: true,
        action: 'STORED',
        key,
        fact,
        memoryId: storedMemory?.id,
        source: 'USER_EXPLICIT',
        speech: `Got it. I'll remember that you prefer ${spokenFact}.`,
        message: `Saved preference: ${key} = "${fact}"`
      };
    }

    // ==========================================
    // 3. RECALL SPECIFIC PREFERENCES
    // ==========================================
    // 3.1 Reminder preference query
    if (
      lower.includes('reminder preference') ||
      lower.includes('my reminder') ||
      (lower.includes('remember') && lower.includes('reminder'))
    ) {
      try {
        const memories = await AiMemoryRepository.searchMemories(userId, 'reminder');
        if (memories && memories.length > 0) {
          const val = memories[0].memory_value;
          return {
            success: true,
            action: 'RECALLED',
            key: 'reminder_preference',
            speech: `You prefer ${val.replace(/^i\s+prefer\s+/i, '')}.`,
            message: `Retrieved preference: ${val}`
          };
        }
      } catch (_) {}

      const prefs = this.userPreferences.get(userId) || {};
      if (prefs['reminder_preference']) {
        return {
          success: true,
          action: 'RECALLED',
          key: 'reminder_preference',
          speech: `You prefer ${prefs['reminder_preference'].replace(/^i\s+prefer\s+/i, '')}.`,
          message: `Retrieved preference: ${prefs['reminder_preference']}`
        };
      }

      return {
        success: true,
        action: 'NO_PREFERENCE',
        speech: 'You haven\'t told me a reminder preference yet. You can say: Remember that I prefer reminders after 8 PM.',
        message: 'No reminder preference set.'
      };
    }

    // 3.2 Time format query
    if (
      lower.includes('what time format do i prefer') ||
      lower.includes('do i prefer 24') ||
      lower.includes('what time format')
    ) {
      try {
        const memories = await AiMemoryRepository.searchMemories(userId, 'time_format');
        if (memories && memories.length > 0) {
          const val = memories[0].memory_value || '24-hour time';
          return {
            success: true,
            action: 'RECALLED',
            key: 'time_format',
            speech: `You prefer ${val}.`,
            message: `Retrieved preference: ${val}`
          };
        }
      } catch (_) {}

      const prefs = this.userPreferences.get(userId) || {};
      if (prefs['time_format']) {
        return {
          success: true,
          action: 'RECALLED',
          key: 'time_format',
          speech: `You prefer ${prefs['time_format']}.`,
          message: `Retrieved preference: ${prefs['time_format']}`
        };
      }

      return {
        success: true,
        action: 'NO_PREFERENCE',
        speech: 'You haven\'t told me your time format preference yet. You can say: Remember that I prefer 24-hour time.',
        message: 'No time format preference set.'
      };
    }

    // 3.3 Coffee preference query
    if (lower.includes('what coffee do i like') || (lower.includes('coffee') && lower.includes('prefer'))) {
      try {
        const memories = await AiMemoryRepository.searchMemories(userId, 'coffee');
        if (memories && memories.length > 0) {
          return {
            success: true,
            action: 'RECALLED',
            speech: `You prefer ${memories[0].memory_value.replace(/^i\s+prefer\s+/i, '')}.`
          };
        }
      } catch (_) {}

      const prefs = this.userPreferences.get(userId) || {};
      if (prefs['coffee_preference']) {
        return {
          success: true,
          action: 'RECALLED',
          speech: `You prefer ${prefs['coffee_preference'].replace(/^i\s+prefer\s+/i, '')}.`
        };
      }

      return {
        success: true,
        action: 'NO_PREFERENCE',
        speech: 'You haven\'t told me your coffee preference yet.',
        message: 'No coffee preference set.'
      };
    }

    // ==========================================
    // 4. RETRIEVE ACTIVE REMINDERS
    // ==========================================
    if (
      lower.includes('what did i ask you to remind') ||
      lower.includes('what did you remind me') ||
      lower.includes('what are my reminders') ||
      lower.includes('what reminders do i have') ||
      lower.includes('what am i forgetting')
    ) {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const routines = await RoutineModel.getByDate(userId, todayStr);
        const reminders = (routines || []).filter(r => r.reminder_enabled || (r.title && r.time));
        if (reminders.length > 0) {
          const listStr = reminders.map(r => `to ${r.title} at ${r.time}`).join(', and ');
          return {
            success: true,
            action: 'RECALLED_REMINDERS',
            speech: `You asked me to remind you ${listStr}.`,
            message: `Active reminders: ${listStr}.`
          };
        } else {
          return {
            success: true,
            action: 'RECALLED_REMINDERS',
            speech: "You don't have any reminders scheduled right now.",
            message: "No active reminders."
          };
        }
      } catch (err) {
        console.error('[PersonalContextAgent] Error fetching reminders:', err.message);
      }
    }

    // ==========================================
    // 5. GENERAL RECALL ("what do you remember about me?")
    // ==========================================
    if (
      lower.includes('what do you remember') ||
      lower.includes('what do i prefer') ||
      lower.includes('my preferences')
    ) {
      try {
        const durableMemories = await AiMemoryRepository.getMemoriesByUser(userId, { limit: 10 });
        if (durableMemories && durableMemories.length > 0) {
          const list = durableMemories.map(m => m.memory_value).join('. Also, ');
          return {
            success: true,
            action: 'RECALLED',
            memories: durableMemories,
            speech: `Here is what I remember: you prefer ${list}.`,
            message: `Recalled ${durableMemories.length} preferences.`
          };
        }
      } catch (_) {}

      const prefs = this.userPreferences.get(userId) || {};
      const keys = Object.keys(prefs);
      if (keys.length > 0) {
        const allPrefs = keys.map(k => prefs[k]).join(', ');
        return {
          success: true,
          action: 'RECALLED',
          speech: `Here is what I remember: ${allPrefs}.`
        };
      }

      return {
        success: true,
        action: 'RECALLED',
        speech: "I don't have any specific preferences saved yet. Tell me what you'd like me to remember."
      };
    }

    return null;
  }

  /**
   * Build unified, rich personal context snapshot with strict provenance and freshness tags
   */
  async buildContextSnapshot(userId, options = {}) {
    if (!userId) throw new Error('userId is required for context snapshot');

    const now = new Date();
    const timezone = options.timezone || 'UTC';
    const currentDate = now.toISOString().split('T')[0];
    const hours = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    const currentTime = options.currentTime || `${hours}:${mins}`;

    // Quiet hours: default 22:00 -> 07:00
    const quietStart = options.quietHoursStart || '22:00';
    const quietEnd = options.quietHoursEnd || '07:00';
    const isQuietHours = (currentTime >= quietStart || currentTime < quietEnd);

    // 1. Fetch user identity with strict source
    let identity = {
      userId,
      name: options.userName || 'User',
      email: '',
      source: 'MySQL_users_table'
    };
    try {
      const [uRows] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [userId]);
      if (uRows && uRows[0]) {
        identity = {
          userId: uRows[0].id,
          name: options.userName || uRows[0].name || 'User',
          email: uRows[0].email,
          source: 'MySQL_users_table'
        };
      }
    } catch (_) {}

    // 2. Schedule context from authoritative database
    let upcomingSchedule = [];
    try {
      const routines = await RoutineModel.getByDate(userId, currentDate);
      upcomingSchedule = (routines || []).map(r => ({
        id: r.id,
        title: r.title,
        time: r.time,
        status: r.status,
        reminderEnabled: Boolean(r.reminder_enabled),
        source: 'MySQL_Authoritative_Schedule',
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      console.warn('[PersonalContextAgent] Schedule query warning:', err.message);
    }

    // 3. Active task from ActiveTaskManager (loaded from durable store if needed)
    let activeTask = null;
    try {
      activeTask = options.sessionId
        ? await activeTaskManager.loadActiveTask(options.sessionId, userId)
        : activeTaskManager.getActiveTask(null, userId);
    } catch (_) {}

    // 4. Stored user preferences & memories from MySQL
    let relevantMemories = [];
    try {
      relevantMemories = await AiMemoryRepository.getMemoriesByUser(userId, { limit: 10 });
    } catch (_) {}

    // 5. Health context with strict zero-fabrication provenance
    let healthSummary = {
      steps: { status: 'NO_DATA', value: null, unit: 'steps', source: 'Android Health Connect', timestamp: null },
      heartRate: { status: 'NO_DATA', value: null, unit: 'bpm', source: 'Android Health Connect', timestamp: null },
      sleep: { status: 'NO_DATA', value: null, unit: 'hours', source: 'Android Health Connect', timestamp: null },
      bloodPressure: { status: 'NO_DATA', value: null, unit: 'mmHg', source: 'Android Health Connect', timestamp: null },
      weight: { status: 'NO_DATA', value: null, unit: 'kg', source: 'Android Health Connect', timestamp: null },
      calories: { status: 'NO_DATA', value: null, unit: 'kcal', source: 'Android Health Connect', timestamp: null },
      distance: { status: 'NO_DATA', value: null, unit: 'km', source: 'Android Health Connect', timestamp: null },
      workouts: { status: 'NO_DATA', value: null, unit: 'sessions', source: 'Android Health Connect', timestamp: null }
    };

    try {
      const devHealth = healthConnectRepository.getTodayMetrics(userId) || healthConnectRepository.getLatestMetrics(userId);
      if (devHealth && devHealth.steps !== undefined && devHealth.steps !== null) {
        healthSummary.steps = {
          status: 'AVAILABLE',
          value: Number(devHealth.steps),
          unit: 'steps',
          source: 'Android Health Connect',
          timestamp: devHealth.lastSyncedAt ? new Date(devHealth.lastSyncedAt).toISOString() : new Date().toISOString()
        };
      }
      if (devHealth && devHealth.heartRate) {
        healthSummary.heartRate = {
          status: 'AVAILABLE',
          value: Number(devHealth.heartRate),
          unit: 'bpm',
          source: 'Android Health Connect',
          timestamp: new Date().toISOString()
        };
      }
      if (devHealth && devHealth.sleepHours) {
        healthSummary.sleep = {
          status: 'AVAILABLE',
          value: Number(devHealth.sleepHours),
          unit: 'hours',
          source: 'Android Health Connect',
          timestamp: new Date().toISOString()
        };
      }
    } catch (_) {}

    // 6. Device Context with real source provenance
    const hasBattery = options.batteryLevel !== undefined && options.batteryLevel !== null;
    const hasScreen = options.screenState && options.screenState !== 'UNKNOWN';
    const deviceState = {
      battery: {
        source: 'Android BatteryManager',
        status: hasBattery ? 'AVAILABLE' : 'NO_DATA',
        level: hasBattery ? Number(options.batteryLevel) : null,
        isCharging: Boolean(options.isCharging)
      },
      screen: {
        source: 'Android DisplayManager',
        status: hasScreen ? 'AVAILABLE' : 'NO_DATA',
        state: options.screenState || 'UNKNOWN',
        isLocked: Boolean(options.isLocked)
      },
      network: {
        source: 'Android ConnectivityManager',
        status: options.network ? 'AVAILABLE' : 'NO_DATA',
        state: options.network || 'CONNECTED'
      },
      audioFocus: {
        source: 'Android AudioManager',
        status: 'AVAILABLE',
        state: options.audioFocus || 'IDLE'
      }
    };

    // 7. Preferences
    let preferences = {
      timeFormat: '12h',
      assistantName: 'JARVIS',
      proactiveAssistance: true,
      quietHours: `${quietStart}-${quietEnd}`,
      healthInsights: true
    };
    try {
      const storedPrefs = await AiPreferenceRepository.getPreferences(userId);
      if (storedPrefs) {
        preferences = { ...preferences, ...storedPrefs };
      }
    } catch (_) {}

    // 8. Pending Actions
    let pendingActions = [];
    try {
      pendingActions = await aiWorkflowRepository.getPendingActions(userId);
    } catch (_) {}

    return {
      currentTime,
      currentDate,
      timezone,
      isQuietHours,
      identity,
      upcomingSchedule,
      activeTasks: activeTask ? [activeTask] : [],
      relevantMemories,
      healthSummary,
      healthSignals: healthSummary,
      deviceState,
      preferences,
      pendingActions: pendingActions || [],
      freshness: {
        schedule: 'fresh',
        tasks: activeTask ? 'fresh' : 'no_data',
        memory: relevantMemories.length > 0 ? 'fresh' : 'no_data',
        health: healthSummary.steps.status === 'AVAILABLE' ? 'fresh' : 'no_data',
        device: hasBattery ? 'fresh' : 'no_data'
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Schedule overlap and conflict detector
   */
  async evaluateScheduleConflicts(userId, dateStr) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const routines = await RoutineModel.getByDate(userId, targetDate);
    const conflicts = [];

    const timeMap = new Map();
    for (const r of routines) {
      if (!r.time) continue;
      const cleanTime = r.time.trim();
      if (timeMap.has(cleanTime)) {
        conflicts.push({
          time: cleanTime,
          event1: timeMap.get(cleanTime),
          event2: r
        });
      } else {
        timeMap.set(cleanTime, r);
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      targetDate,
      conflictCount: conflicts.length,
      conflicts
    };
  }

  /**
   * Factual Daily Morning Briefing with strict deduplication and quiet hours deferral
   */
  async generateMorningBriefing(userId, options = {}) {
    const targetDate = options.date || new Date().toISOString().split('T')[0];
    const dedupKey = `morning_briefing_${targetDate}`;

    // 1. Check Deduplication in ai_proactive_events (MySQL-backed)
    const [existing] = await pool.query(
      `SELECT * FROM ai_proactive_events 
       WHERE user_id = ? AND event_type = 'DAILY_BRIEFING' 
       AND (deduplication_key = ? OR metadata->>'$.deduplicationKey' = ? OR DATE(created_at) = ?)
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, dedupKey, dedupKey, targetDate]
    );

    if (existing && existing.length > 0 && !options.force) {
      const prev = existing[0];
      return {
        alreadyDelivered: true,
        deduplicationKey: dedupKey,
        eventId: prev.id,
        status: prev.status,
        speech: prev.message,
        message: prev.message,
        deliveredAt: prev.delivered_at
      };
    }

    // 2. Build snapshot
    const snapshot = await this.buildContextSnapshot(userId, options);

    // 3. Quiet Hours Check (22:00 -> 07:00)
    if (snapshot.isQuietHours && options.respectQuietHours !== false && !options.force) {
      // Persist as DEFERRED so it is not lost and is not duplicated
      await pool.query(
        `INSERT INTO ai_proactive_events 
         (id, user_id, event_type, priority, title, message, source, scheduled_for, status, deduplication_key, metadata)
         VALUES (?, ?, 'DAILY_BRIEFING', 'MEDIUM', ?, ?, 'PROACTIVE_AGENT', NOW(), 'DEFERRED', ?, ?)
         ON DUPLICATE KEY UPDATE status = 'DEFERRED', updated_at = CURRENT_TIMESTAMP`,
        [
          `briefing_def_${Date.now()}`,
          userId,
          `Morning Briefing — ${snapshot.currentDate}`,
          'Briefing prepared and deferred during quiet hours.',
          dedupKey,
          JSON.stringify({ deduplicationKey: dedupKey, deferred: true, quietHours: true })
        ]
      );

      return {
        success: true,
        deferred: true,
        suppressed: true,
        status: 'DEFERRED',
        deduplicationKey: dedupKey,
        reason: 'QUIET_HOURS_ACTIVE',
        speech: 'It is currently quiet hours. Your briefing is prepared and ready when you wake up.',
        message: 'Morning briefing deferred due to quiet hours (22:00 - 07:00).'
      };
    }

    // 4. Construct factual speech text from real items
    const scheduleCount = snapshot.upcomingSchedule.length;
    let speech = 'Good morning. ';

    if (scheduleCount === 0) {
      speech += 'Your schedule is clear today.';
    } else {
      const first = snapshot.upcomingSchedule[0];
      speech += `You have ${scheduleCount} scheduled event${scheduleCount > 1 ? 's' : ''} today. Your first activity is "${first.title}" at ${first.time}.`;
    }

    // Reminders
    const reminders = snapshot.upcomingSchedule.filter(s => s.reminderEnabled);
    if (reminders.length > 0) {
      speech += ` You also have a reminder for "${reminders[0].title}".`;
    }

    // Health: ONLY speak if real data is available
    if (snapshot.healthSummary.steps.status === 'AVAILABLE') {
      speech += ` Your Health Connect records show ${snapshot.healthSummary.steps.value} steps.`;
    }

    // 5. Persist delivered event with deduplication key
    const event = await AiProactiveEventRepository.createEvent(userId, {
      eventType: 'DAILY_BRIEFING',
      priority: 'MEDIUM',
      title: `Morning Briefing — ${snapshot.currentDate}`,
      message: speech,
      status: 'DELIVERED',
      deduplicationKey: dedupKey,
      metadata: {
        deduplicationKey: dedupKey,
        scheduleCount,
        hasHealthData: snapshot.healthSummary.steps.status === 'AVAILABLE'
      }
    });

    return {
      success: true,
      alreadyDelivered: false,
      status: 'DELIVERED',
      deduplicationKey: dedupKey,
      eventId: event?.id,
      speech,
      message: speech,
      briefingText: speech,
      context: snapshot
    };
  }
}

module.exports = PersonalContextAgent;
