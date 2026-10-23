/**
 * IntentConfidenceEngine
 * Evaluates intent, entity, and action confidence levels (HIGH, MEDIUM, LOW, AMBIGUOUS).
 */
class IntentConfidenceEngine {
  static evaluateConfidence(intent, entities = {}, context = {}) {
    if (!intent) {
      return { level: 'LOW', confidence: 0.2, requiresClarification: true };
    }

    if (entities.hasMultipleMatches) {
      return { level: 'AMBIGUOUS', confidence: 0.5, requiresClarification: true, prompt: entities.clarificationPrompt };
    }

    if (entities.missingRequiredParam) {
      return { level: 'MEDIUM', confidence: 0.7, requiresConfirmation: true };
    }

    return { level: 'HIGH', confidence: 0.95, requiresClarification: false };
  }
}

module.exports = IntentConfidenceEngine;
