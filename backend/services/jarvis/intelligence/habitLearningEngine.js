const { AiBehaviorPatternRepository } = require('../../../repositories/ai/aiBehaviorPatternRepository');
const { AiMemoryRepository } = require('../../../repositories/ai/aiMemoryRepository');

class HabitLearningEngine {
  /**
   * Observe a routine event and update habit confidence
   */
  static async observeRoutineAction(userId, { actionType = 'COMPLETED', routine = {} } = {}) {
    if (!userId || !routine.title) return null;

    const title = (routine.title || '').toLowerCase();
    const timeStr = (routine.time || '').toLowerCase();

    // 1. Workout / Fitness Completion Habit
    if (
      title.includes('workout') ||
      title.includes('gym') ||
      title.includes('exercise') ||
      title.includes('cardio') ||
      title.includes('jog') ||
      title.includes('running')
    ) {
      const isEvening = timeStr.includes('pm');
      const timeVal = isEvening ? 'EVENING (6:00 PM – 8:00 PM)' : 'MORNING (6:00 AM – 8:00 AM)';
      
      const pattern = await AiBehaviorPatternRepository.recordObservation(userId, {
        patternType: 'HABIT',
        patternKey: 'preferred_workout_time',
        patternValue: timeVal,
        confidence: 0.55,
        minObservationsToActivate: 5,
        minConfidenceToActivate: 0.75,
        source: 'HABIT_ENGINE',
        metadata: { routineTitle: routine.title, observedTime: routine.time }
      });

      // If promoted to ACTIVE, sync to ai_memories
      if (pattern.status === 'ACTIVE') {
        const existing = await AiMemoryRepository.getMemoriesByUser(userId, { memoryType: 'ROUTINE_PREFERENCE' });
        const alreadySaved = existing.some(m => m.memory_key === 'preferred_workout_time');
        if (!alreadySaved) {
          await AiMemoryRepository.createMemory(userId, {
            memoryType: 'ROUTINE_PREFERENCE',
            memoryKey: 'preferred_workout_time',
            memoryValue: `User usually completes workouts in the ${isEvening ? 'evening' : 'morning'}.`,
            source: 'AGENT_INFERRED',
            importance: 3,
            confidenceScore: pattern.confidence_score,
            evidenceCount: pattern.evidence_count,
            metadata: { activationSource: 'HABIT_ENGINE' }
          });
        }
      }

      return pattern;
    }

    // 2. Postponement Trend
    if (actionType === 'POSTPONED' || actionType === 'SNOOZED') {
      const pattern = await AiBehaviorPatternRepository.recordObservation(userId, {
        patternType: 'POSTPONEMENT_TREND',
        patternKey: `postponed_${title.replace(/\s+/g, '_')}`,
        patternValue: `Frequently postponed around ${routine.time}`,
        confidence: 0.50,
        minObservationsToActivate: 3,
        minConfidenceToActivate: 0.70,
        source: 'POSTPONEMENT_TRACKER'
      });
      return pattern;
    }

    return null;
  }
}

module.exports = HabitLearningEngine;
