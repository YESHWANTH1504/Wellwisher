class ContextRouter {
  /**
   * Determine relevant context categories based on request text
   */
  static analyzeRelevance(request = '') {
    const text = (request || '').toLowerCase();
    const categories = new Set();

    // 1. Schedule triggers
    if (
      /\b(schedule|routine|plan|meeting|appointment|reminder|calendar|free|busy|tomorrow|today|yesterday|what'?s next|todo|task|walk|gym|workout|breakfast|lunch|dinner|slot|conflict)\b/i.test(text)
    ) {
      categories.add('SCHEDULE');
    }

    // 2. Memory triggers
    if (
      /\b(remember|memory|prefer|preference|habit|usual|like|dislike|favorite|my usual|always|never|told you)\b/i.test(text)
    ) {
      categories.add('MEMORY');
    }

    // 3. Wellness & Health triggers
    if (
      /\b(water|hydration|drink|drank|vitals|blood pressure|bp|glucose|heart rate|pulse|spo2|oxygen|weight|sleep|slept|mood|wellness|health|feeling|tired|energetic|summary)\b/i.test(text)
    ) {
      categories.add('WELLNESS');
    }

    // 4. Medication triggers
    if (
      /\b(medicine|pill|medication|dose|dosage|prescription|tablet|capsule|take my pill)\b/i.test(text)
    ) {
      categories.add('MEDICATION');
    }

    // 5. Journal triggers
    if (
      /\b(journal|diary|reflect|reflection|entry|symptom|thought|emotion|feeling down|anxious|happy)\b/i.test(text)
    ) {
      categories.add('JOURNAL');
    }

    // 6. Family triggers
    if (
      /\b(family|daughter|son|wife|husband|mother|father|mom|dad|caregiver|nudge|notify|tell)\b/i.test(text)
    ) {
      categories.add('FAMILY');
    }

    // 7. Clinical Document & Report triggers
    if (
      /\b(report|lab|blood report|blood test|hemoglobin|cbc|lipid|cholesterol|creatinine|tsh|glucose|hba1c|prescription|document|scan|medical report|test result|test value|compare reports?|discharge summary|doctor note)\b/i.test(text)
    ) {
      categories.add('DOCUMENT');
    }

    // 8. Health Trends, Alerts & Doctor Visit Briefing triggers (Phase 9)
    if (
      /\b(trend|trends|health trend|alert|alerts|health alert|doctor briefing|briefing for doctor|doctor visit|prepare for doctor|what changed|biomarker|persistent|out of range)\b/i.test(text)
    ) {
      categories.add('HEALTH_TRENDS');
      categories.add('DOCUMENT');
    }

    // 9. Calendar & Appointments & Life Workflows (Phase 10)
    if (
      /\b(calendar|event|events|google calendar|outlook|appointment|appointments|doctor appointment|consultation|follow-up|followup|clinic|action center|actions|pending actions|free time|free slot|availability)\b/i.test(text)
    ) {
      categories.add('WORKFLOW');
      categories.add('CALENDAR');
    }

    // 10. General inquiries (always include schedule, memory, workflow by default for broad prompts)
    if (categories.size === 0 || /\b(overview|briefing|status|how am i doing|dashboard|update|start my day)\b/i.test(text)) {
      categories.add('SCHEDULE');
      categories.add('MEMORY');
      categories.add('WELLNESS');
      categories.add('HEALTH_TRENDS');
      categories.add('WORKFLOW');
    }

    return Array.from(categories);
  }
}

module.exports = ContextRouter;
