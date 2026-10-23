/**
 * CorrectionLearningEngine
 * Learns from explicit user corrections and generates preference proposals after repeated evidence.
 */
class CorrectionLearningEngine {
  constructor() {
    this.corrections = new Map();
  }

  recordCorrection(userId, correctionType, correctionValue) {
    const key = `${userId}_${correctionType}`;
    if (!this.corrections.has(key)) {
      this.corrections.set(key, {
        userId,
        correctionType,
        history: [],
        proposalGenerated: false
      });
    }

    const entry = this.corrections.get(key);
    entry.history.push({
      value: correctionValue,
      timestamp: new Date().toISOString()
    });

    // Propose preference if corrected 3 or more times
    if (entry.history.length >= 3 && !entry.proposalGenerated) {
      entry.proposalGenerated = true;
      return {
        shouldPropose: true,
        proposal: {
          correctionType,
          value: correctionValue,
          prompt: `You've corrected ${correctionType.toLowerCase().replace(/_/g, ' ')} to ${correctionValue} several times. Should I remember this as your default?`
        }
      };
    }

    return { shouldPropose: false, count: entry.history.length };
  }
}

module.exports = new CorrectionLearningEngine();
