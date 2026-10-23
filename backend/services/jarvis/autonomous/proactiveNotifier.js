const AiAutonomousRepository = require('../../../repositories/ai/aiAutonomousRepository');

class ProactiveNotifier {
  /**
   * Dispatch an actionable system notification
   */
  static async sendActionableNotification({
    userId,
    title,
    body,
    notificationType = 'ACTIONABLE_REMINDER',
    actionButtons = []
  }) {
    const defaultActions = actionButtons.length > 0 ? actionButtons : [
      { label: 'Open JARVIS', actionId: 'open_jarvis', payload: {} },
      { label: 'Reschedule', actionId: 'reschedule', payload: {} },
      { label: 'Dismiss', actionId: 'dismiss', payload: {} }
    ];

    const notification = await AiAutonomousRepository.createNotification({
      userId,
      title,
      body,
      notificationType,
      actionButtons: defaultActions
    });

    return notification;
  }

  /**
   * Generate contextual pre-appointment notification
   */
  static async notifyPreAppointment({
    userId,
    appointmentTitle,
    appointmentTime,
    appointmentId
  }) {
    return await this.sendActionableNotification({
      userId,
      title: `JARVIS: Upcoming Appointment`,
      body: `Your appointment "${appointmentTitle}" starts in 30 minutes (${appointmentTime}). Would you like me to prepare your briefing?`,
      notificationType: 'PRE_APPOINTMENT',
      actionButtons: [
        { label: 'Prepare Briefing', actionId: 'prepare_briefing', payload: { appointmentId } },
        { label: 'Reschedule', actionId: 'reschedule_appointment', payload: { appointmentId } },
        { label: 'Dismiss', actionId: 'dismiss', payload: { appointmentId } }
      ]
    });
  }

  /**
   * Generate morning daily focus notification
   */
  static async notifyMorningFocus({
    userId,
    itemCount,
    firstItemTime
  }) {
    const summary = itemCount > 0
      ? `Good morning. You have ${itemCount} items scheduled today. Your first activity starts at ${firstItemTime}.`
      : `Good morning. Your schedule is clear today with no urgent actions pending.`;

    return await this.sendActionableNotification({
      userId,
      title: `JARVIS: Morning Briefing`,
      body: summary,
      notificationType: 'MORNING_FOCUS',
      actionButtons: [
        { label: 'View Schedule', actionId: 'view_schedule', payload: {} },
        { label: 'Dismiss', actionId: 'dismiss', payload: {} }
      ]
    });
  }
}

module.exports = ProactiveNotifier;
