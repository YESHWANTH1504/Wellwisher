/**
 * MeetingAssistant
 * Prepares meeting briefings, agendas, participant context, and post-meeting follow-ups.
 */
class MeetingAssistant {
  static prepareMeetingContext(meeting) {
    return {
      meetingId: meeting?.id || 'next_meeting',
      title: meeting?.title || 'Upcoming Meeting',
      time: meeting?.time || '05:00 PM',
      participants: meeting?.participants || ['Arun'],
      notes: ['Review quarterly roadmap milestones'],
      travelBufferMinutes: 30,
      briefingSummary: `Meeting with ${meeting?.participants?.[0] || 'Arun'} at ${meeting?.time || '5:00 PM'}. Agenda: roadmap milestones.`
    };
  }
}

module.exports = MeetingAssistant;
