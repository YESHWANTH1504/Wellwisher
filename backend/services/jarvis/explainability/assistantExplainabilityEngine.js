/**
 * AssistantExplainabilityEngine
 * Generates transparent, human-language explanations for assistant decisions, triggers, and constraints.
 */
class AssistantExplainabilityEngine {
  static explainDecision(query, context = {}) {
    const lower = query.toLowerCase();

    if (lower.includes('why did you choose that time') || lower.includes('why that time')) {
      return 'I selected that time because your calendar showed an open window with no conflicting routines and adequate buffer.';
    }

    if (lower.includes("why can't you do that") || lower.includes('why cant you do that') || lower.includes('why blocked')) {
      return 'That operation requires explicit user confirmation under your configured autonomy policy.';
    }

    if (lower.includes('what are you waiting for')) {
      return 'I am waiting for your explicit confirmation before executing this external action.';
    }

    return 'This action was selected based on your configured preferences, schedule availability, and autonomy boundaries.';
  }
}

module.exports = AssistantExplainabilityEngine;
