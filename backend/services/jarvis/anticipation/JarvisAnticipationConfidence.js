/**
 * JarvisAnticipationConfidence
 * Phase 11 Confidence Engine for Anticipatory Execution & Proactive Intelligence.
 * Computes deterministic multi-factor confidence scores and evidence bands.
 */

const CONFIDENCE_BANDS = Object.freeze({
  VERY_HIGH: 'VERY_HIGH', // >= 0.90: Extremely strong, repeatable pattern
  HIGH: 'HIGH',           // >= 0.80: Consistent pattern, clear context
  MODERATE: 'MODERATE',   // >= 0.60: Noticeable pattern, potential interest
  LOW: 'LOW'              // < 0.60: Weak signal, do not act autonomously
});

class JarvisAnticipationConfidence {
  /**
   * Calculate multi-factor confidence score for a proposed proactive candidate
   * @param {Object} input
   * @returns {{ confidenceScore: number, confidenceBand: string, reasoning: string, factors: Object }}
   */
  static calculate(input = {}) {
    const {
      recurrenceCount = 1,
      lastObservedHoursAgo = 24,
      timeConsistency = 0.8,
      dayOfWeekMatch = true,
      contextRelevance = 0.8,
      sourceDataConfidence = 0.9,
      historicalFeedback = { accepted: 0, rejected: 0, ignored: 0 },
      activeWorkflowPresent = false,
      deviceStateScore = 1.0
    } = input;

    // 1. Recurrence Factor (Max weight 0.35)
    // 1 occurrence = 0.10, 3 = 0.20, 5 = 0.28, 7+ = 0.35
    let recurrenceWeight = 0.10;
    if (recurrenceCount >= 7) recurrenceWeight = 0.35;
    else if (recurrenceCount >= 5) recurrenceWeight = 0.28;
    else if (recurrenceCount >= 3) recurrenceWeight = 0.20;
    else if (recurrenceCount >= 2) recurrenceWeight = 0.15;

    // 2. Recency Factor (Max weight 0.20)
    // Observed within 24h: 0.20, 48h: 0.16, 7 days: 0.10, older: 0.05
    let recencyWeight = 0.05;
    if (lastObservedHoursAgo <= 24) recencyWeight = 0.20;
    else if (lastObservedHoursAgo <= 48) recencyWeight = 0.16;
    else if (lastObservedHoursAgo <= 168) recencyWeight = 0.10;

    // 3. Temporal Consistency Factor (Max weight 0.20)
    const temporalFactor = (timeConsistency * 0.7 + (dayOfWeekMatch ? 0.3 : 0.0)) * 0.20;

    // 4. Context & Source Factor (Max weight 0.15)
    const contextFactor = (contextRelevance * 0.5 + sourceDataConfidence * 0.5) * 0.15;

    // 5. User Feedback Adjustment (-0.25 to +0.10)
    let feedbackAdjustment = 0.0;
    const totalFeedback = historicalFeedback.accepted + historicalFeedback.rejected + historicalFeedback.ignored;
    if (totalFeedback > 0) {
      const acceptRatio = historicalFeedback.accepted / totalFeedback;
      const rejectRatio = historicalFeedback.rejected / totalFeedback;
      if (acceptRatio > 0.7) feedbackAdjustment = 0.10;
      else if (acceptRatio > 0.5) feedbackAdjustment = 0.05;
      else if (rejectRatio > 0.5) feedbackAdjustment = -0.20;
      else if (rejectRatio > 0.3) feedbackAdjustment = -0.10;
    }

    // Baseline calculation
    let rawScore = recurrenceWeight + recencyWeight + temporalFactor + contextFactor + feedbackAdjustment;

    // Penalty if user is actively engaged in an unrelated intensive workflow
    if (activeWorkflowPresent) {
      rawScore -= 0.15;
    }

    // Multiply by device health factor
    rawScore = rawScore * Math.max(0.5, deviceStateScore);

    // Clamp score strictly between 0.00 and 1.00
    const confidenceScore = Math.min(1.0, Math.max(0.0, Math.round(rawScore * 1000) / 1000));

    // Determine band
    let confidenceBand = CONFIDENCE_BANDS.LOW;
    if (confidenceScore >= 0.90) confidenceBand = CONFIDENCE_BANDS.VERY_HIGH;
    else if (confidenceScore >= 0.80) confidenceBand = CONFIDENCE_BANDS.HIGH;
    else if (confidenceScore >= 0.60) confidenceBand = CONFIDENCE_BANDS.MODERATE;

    const reasoning = `Confidence ${confidenceScore} (${confidenceBand}): Observed ${recurrenceCount} times (last ${lastObservedHoursAgo}h ago), temporal consistency ${(timeConsistency * 100).toFixed(0)}%, feedback ratio +${feedbackAdjustment >= 0 ? '+' : ''}${feedbackAdjustment}.`;

    return {
      confidenceScore,
      confidenceBand,
      reasoning,
      factors: {
        recurrenceWeight,
        recencyWeight,
        temporalFactor,
        contextFactor,
        feedbackAdjustment,
        deviceStateScore
      }
    };
  }
}

module.exports = {
  JarvisAnticipationConfidence,
  CONFIDENCE_BANDS
};
