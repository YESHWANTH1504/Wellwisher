const { AiMemoryRepository } = require('../../../repositories/ai/aiMemoryRepository');

class BehaviorPatternEngine {
  /**
   * Analyze routine completions and record safe behavioral memories
   */
  static async analyzeAndRecordPatterns(userId, routines = []) {
    if (!userId || routines.length === 0) return [];

    const insights = [];

    // 1. Detect Workout Completion Patterns
    const workouts = routines.filter(r => (r.title || '').toLowerCase().includes('workout') || (r.title || '').toLowerCase().includes('gym'));
    const completedWorkouts = workouts.filter(w => w.status === 'completed');

    if (completedWorkouts.length > 0) {
      const sample = completedWorkouts[0];
      const isEvening = (sample.time || '').toLowerCase().includes('pm');
      const memoryKey = 'preferred_workout_time';
      const memoryValue = isEvening ? 'User usually completes workouts in the evening' : 'User usually completes workouts in the morning';

      // Persist as safe inferred memory with confidence
      await AiMemoryRepository.createMemory(userId, {
        memoryType: 'ROUTINE_PREFERENCE',
        memoryKey,
        memoryValue,
        source: 'AGENT_INFERRED',
        importance: 3,
        metadata: { confidence: 0.85, pattern: 'WORKOUT_COMPLETION', detectedAt: new Date().toISOString() }
      });

      insights.push({ key: memoryKey, value: memoryValue });
    }

    return insights;
  }
}

module.exports = BehaviorPatternEngine;
