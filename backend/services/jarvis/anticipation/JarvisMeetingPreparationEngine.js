/**
 * JarvisMeetingPreparationEngine
 * Phase 11 Pre-Meeting Context Preparation & Travel Anticipation.
 * Assembles meeting briefs, participant context, and navigation routes
 * before user asks, packaging them as verified workflow proposals.
 */

class JarvisMeetingPreparationEngine {
  /**
   * Evaluate upcoming calendar events and generate meeting preparation or travel proposals
   * @param {number} userId
   * @param {Object} event
   * @param {Object} options { userPreferences, currentContext }
   * @returns {Object|null} Proactive meeting candidate
   */
  static evaluateMeeting(userId, event = {}, options = {}) {
    if (!event || !event.title) return null;

    const diffMinutes = event.diffMinutes !== undefined ? event.diffMinutes : 15;
    const title = event.title;
    const time = event.time || '10:00';
    const location = event.location || null;
    const isPhysicalLocation = location && (
      location.toLowerCase().includes('nagar') ||
      location.toLowerCase().includes('college') ||
      location.toLowerCase().includes('hospital') ||
      location.toLowerCase().includes('road') ||
      location.toLowerCase().includes('street') ||
      location.toLowerCase().includes('office') ||
      location.toLowerCase().includes('campus')
    );

    // 1. Travel Anticipation Candidate (Event has physical location and is in 30-60 min window)
    if (isPhysicalLocation && diffMinutes >= 20 && diffMinutes <= 60) {
      return {
        candidateType: 'TRAVEL_ANTICIPATION',
        priority: 'HIGH',
        title: `Travel to ${title}`,
        speechText: `Your meeting "${title}" is at ${location} in ${diffMinutes} minutes. Would you like directions?`,
        displayMessage: `Travel Alert: "${title}" at ${location} starts in ${diffMinutes}m.`,
        dedupKey: `travel_prep_${event.id || title}_${event.date || 'today'}`,
        relatedEvent: event,
        workflowProposal: {
          goal: `Navigate to ${title} at ${location}`,
          steps: [
            {
              stepId: 'step_nav_search',
              sequence: 1,
              capabilityId: 'search_location',
              inputs: { query: location }
            },
            {
              stepId: 'step_nav_route',
              sequence: 2,
              capabilityId: 'navigate_to_location',
              inputs: { destination: location },
              dependencies: ['step_nav_search']
            }
          ]
        }
      };
    }

    // 2. Pre-Meeting Context Preparation (10 to 25 mins before meeting)
    if (diffMinutes >= 5 && diffMinutes <= 25) {
      return {
        candidateType: 'MEETING_PREPARATION',
        priority: 'HIGH',
        title: `Prepare for ${title}`,
        speechText: `Your meeting "${title}" starts in ${diffMinutes} minutes. Would you like me to prepare your briefing?`,
        displayMessage: `Upcoming Meeting: "${title}" at ${time}.`,
        dedupKey: `meeting_prep_${event.id || title}_${event.date || 'today'}`,
        relatedEvent: event,
        workflowProposal: {
          goal: `Prepare briefing for ${title}`,
          steps: [
            {
              stepId: 'step_prep_notes',
              sequence: 1,
              capabilityId: 'calendar_create_event', // or context assembly
              inputs: { title: `Briefing: ${title}`, date: event.date || 'today', time }
            }
          ]
        }
      };
    }

    return null;
  }
}

module.exports = JarvisMeetingPreparationEngine;
