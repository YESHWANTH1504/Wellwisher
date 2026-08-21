const { AiMemoryRepository } = require('../../../repositories/ai/aiMemoryRepository');
const { AiPreferenceRepository } = require('../../../repositories/ai/aiPreferenceRepository');
const { AiBehaviorPatternRepository } = require('../../../repositories/ai/aiBehaviorPatternRepository');
const { AiPersonalProfileRepository } = require('../../../repositories/ai/aiPersonalProfileRepository');
const RoutineModel = require('../../../models/routineModel');

class PersonalIntelligenceEngine {
  /**
   * Build complete normalized Personal Intelligence Profile for a user
   */
  static async buildProfile(userId, { forceRefresh = false } = {}) {
    if (!userId) throw new Error('userId is required');

    // 1. Check cached profile if not forcing refresh
    if (!forceRefresh) {
      const cached = await AiPersonalProfileRepository.getProfile(userId);
      if (cached && cached.profileData) {
        return cached.profileData;
      }
    }

    // 2. Fetch explicit preferences
    const preferences = await AiPreferenceRepository.getPreferences(userId);

    // 3. Fetch structured memories (ordered by explicit -> inferred)
    const memories = await AiMemoryRepository.getMemoriesByUser(userId, { limit: 50 });
    const explicitMemories = memories.filter(m => m.source === 'USER_EXPLICIT');
    const inferredMemories = memories.filter(m => m.source === 'AGENT_INFERRED');

    // 4. Fetch active behavior patterns
    const patterns = await AiBehaviorPatternRepository.getActivePatterns(userId);

    // 5. Synthesize normalized profile
    const profile = {
      userId,
      personality: {
        assistantName: preferences.assistantName || 'JARVIS',
        responseStyle: preferences.preferredResponseStyle || 'CONCISE',
        tone: preferences.tone || 'FRIENDLY',
        voiceEnabled: preferences.voiceEnabled !== false,
        proactiveEnabled: preferences.proactiveAssistanceEnabled !== false
      },
      habits: {
        preferredWorkoutTime: this._resolveTrait(explicitMemories, inferredMemories, patterns, 'preferred_workout_time', 'EVENING'),
        preferredFocusHours: this._resolveTrait(explicitMemories, inferredMemories, patterns, 'preferred_focus_hours', 'MORNING'),
        preferredWakeTime: this._resolveTrait(explicitMemories, inferredMemories, patterns, 'preferred_wake_time', '07:00 AM'),
        reminderStyle: this._resolveTrait(explicitMemories, inferredMemories, patterns, 'reminder_style', 'CONCISE')
      },
      stats: {
        explicitMemoriesCount: explicitMemories.length,
        inferredMemoriesCount: inferredMemories.length,
        activePatternsCount: patterns.length
      },
      explicitPreferences: explicitMemories.map(m => ({
        key: m.memory_key,
        value: m.memory_value,
        importance: m.importance
      })),
      inferredHabits: inferredMemories.map(m => ({
        key: m.memory_key,
        value: m.memory_value,
        confidence: m.confidence_score || 0.8,
        evidenceCount: m.evidence_count || 1
      })),
      updatedAt: new Date().toISOString()
    };

    // Save profile persistently
    await AiPersonalProfileRepository.saveProfile(userId, profile);

    return profile;
  }

  /**
   * Helper to resolve a trait strictly respecting: USER_EXPLICIT > AGENT_INFERRED > PATTERN > DEFAULT
   */
  static _resolveTrait(explicitMems, inferredMems, patterns, key, fallback) {
    // 1. Explicit Memory
    const exp = explicitMems.find(m => m.memory_key === key);
    if (exp) {
      return { value: exp.memory_value, source: 'USER_EXPLICIT', confidence: 1.0 };
    }

    // 2. Inferred Memory
    const inf = inferredMems.find(m => m.memory_key === key);
    if (inf) {
      return { value: inf.memory_value, source: 'AGENT_INFERRED', confidence: inf.confidence_score || 0.85 };
    }

    // 3. Behavior Pattern
    const pat = patterns.find(p => p.pattern_key === key);
    if (pat) {
      return { value: pat.pattern_value, source: 'SYSTEM_DERIVED', confidence: parseFloat(pat.confidence_score) || 0.75 };
    }

    // 4. Default Fallback
    return { value: fallback, source: 'DEFAULT', confidence: 0.5 };
  }
}

module.exports = PersonalIntelligenceEngine;
