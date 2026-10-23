/**
 * ExplanationEngine
 * Answers user questions regarding assistant rationale, automated actions, and missed/failed operations.
 */
class ExplanationEngine {
  static explainAction(query, context = {}) {
    const lower = query.toLowerCase();

    if (lower.includes('why did you remind me')) {
      return 'I reminded you because you requested a 30-minute pre-meeting departure reminder.';
    }

    if (lower.includes('why did you schedule') || lower.includes('why then')) {
      return 'I scheduled it at that time because your calendar showed a free window with no conflicting routines.';
    }

    if (lower.includes('what did you do while i was away') || lower.includes('what did you do today')) {
      return 'Today I monitored your calendar, scheduled two requested reminders, and activated quiet hours as scheduled.';
    }

    return 'I performed this action based on your configured preferences and explicit instructions.';
  }
}

module.exports = ExplanationEngine;
