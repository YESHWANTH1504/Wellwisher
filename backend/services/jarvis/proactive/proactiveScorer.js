class ProactiveScorer {
  /**
   * Calculate deterministic priority score and classify band
   * priorityScore = timeUrgency + importance + relevance + behaviorSignal - notificationFatigue
   */
  static calculateScore({
    timeUrgency = 0,      // 0 - 40 (based on minutes to start / overdue)
    importance = 20,      // 10 - 30 (based on task category/user priority)
    relevance = 15,       // 0 - 20 (context match)
    behaviorSignal = 10,  // 0 - 15 (user habit match)
    notificationFatigue = 0 // 0 - 30 (penalty for high recent notifications)
  } = {}) {
    const rawScore = timeUrgency + importance + relevance + behaviorSignal - notificationFatigue;
    const finalScore = Math.max(0, Math.min(100, rawScore));

    let priority = 'MEDIUM';
    if (finalScore >= 75) priority = 'CRITICAL';
    else if (finalScore >= 50) priority = 'HIGH';
    else if (finalScore >= 25) priority = 'MEDIUM';
    else priority = 'LOW';

    return {
      score: finalScore,
      priority,
      breakdown: {
        timeUrgency,
        importance,
        relevance,
        behaviorSignal,
        notificationFatiguePenalty: notificationFatigue
      }
    };
  }

  /**
   * Score an upcoming routine
   */
  static scoreUpcomingRoutine(routine, recentNotificationsCount = 0) {
    const diff = routine.diffMinutes;
    let timeUrgency = 10;
    if (diff <= 5 && diff >= -5) timeUrgency = 40; // Due right now
    else if (diff <= 15) timeUrgency = 35;         // Due in 15 mins
    else if (diff <= 30) timeUrgency = 25;         // Due in 30 mins
    else if (diff <= 60) timeUrgency = 15;

    let importance = 20;
    const cat = (routine.category || '').toLowerCase();
    if (cat.includes('med') || cat.includes('doctor') || cat.includes('urgent')) importance = 35;
    else if (cat.includes('office') || cat.includes('meeting')) importance = 25;

    const fatiguePenalty = Math.min(30, recentNotificationsCount * 8);

    return this.calculateScore({
      timeUrgency,
      importance,
      relevance: 20,
      behaviorSignal: 10,
      notificationFatigue: fatiguePenalty
    });
  }

  /**
   * Score an overdue routine
   */
  static scoreOverdueRoutine(routine, recentNotificationsCount = 0) {
    const fatiguePenalty = Math.min(30, recentNotificationsCount * 8);
    return this.calculateScore({
      timeUrgency: 35,
      importance: 25,
      relevance: 20,
      behaviorSignal: 10,
      notificationFatigue: fatiguePenalty
    });
  }
}

module.exports = ProactiveScorer;
