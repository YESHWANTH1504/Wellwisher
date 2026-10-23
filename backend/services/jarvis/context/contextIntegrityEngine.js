/**
 * ContextIntegrityEngine
 * Validates conversational context freshness and detects ambiguity.
 */
class ContextIntegrityEngine {
  static validateEntityFreshness(entity, maxAgeMinutes = 60) {
    if (!entity) return { valid: false, reason: 'NO_ACTIVE_ENTITY' };
    if (!entity.updatedAt && !entity.createdAt) return { valid: true, entity };

    const entityTime = new Date(entity.updatedAt || entity.createdAt).getTime();
    const ageMinutes = (Date.now() - entityTime) / (1000 * 60);

    if (ageMinutes > maxAgeMinutes) {
      return { valid: false, reason: 'STALE_CONTEXT', ageMinutes };
    }

    return { valid: true, entity };
  }

  static detectAmbiguity(matches = []) {
    if (matches.length > 1) {
      return {
        isAmbiguous: true,
        candidateCount: matches.length,
        clarificationPrompt: `I found multiple matching items: ${matches.map(m => m.name || m.title).join(', ')}. Which one did you mean?`
      };
    }
    return { isAmbiguous: false, match: matches[0] || null };
  }
}

module.exports = ContextIntegrityEngine;
