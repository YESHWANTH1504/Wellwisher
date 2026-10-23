/**
 * PatternLearningEngine
 * Detects non-sensitive repeated behavioral patterns and generates explicit consent proposals.
 */
class PatternLearningEngine {
  constructor() {
    this.detectedPatterns = new Map();
  }

  detectPattern(userId, patternType, observation) {
    const patternId = `pat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const pattern = {
      id: patternId,
      userId,
      patternType, // MORNING_WORKOUT, MEETING_TIME_PREFERENCE, TRAVEL_BUFFER_PREFERENCE
      observation,
      confidence: 0.92,
      userConsentRequired: true,
      proposalText: `I've noticed you usually ${observation}. Would you like me to remember that as your preference?`,
      status: 'PROPOSED', // PROPOSED, ACCEPTED, REJECTED
      createdAt: new Date().toISOString()
    };
    this.detectedPatterns.set(patternId, pattern);
    return pattern;
  }

  acceptPattern(patternId) {
    const pat = this.detectedPatterns.get(patternId);
    if (pat) {
      pat.status = 'ACCEPTED';
      pat.acceptedAt = new Date().toISOString();
      return pat;
    }
    return null;
  }

  rejectPattern(patternId) {
    const pat = this.detectedPatterns.get(patternId);
    if (pat) {
      pat.status = 'REJECTED';
      pat.rejectedAt = new Date().toISOString();
      return pat;
    }
    return null;
  }
}

module.exports = new PatternLearningEngine();
