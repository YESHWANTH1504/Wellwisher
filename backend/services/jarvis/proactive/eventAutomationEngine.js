const CalendarService = require('../integrations/calendarService');
const ProactiveNotifier = require('../autonomous/proactiveNotifier');
const TaskScheduler = require('../autonomous/taskScheduler');

/**
 * Event-Driven Automation Engine
 * Monitors event timelines and dispatches automated proactive notifications
 */
class EventAutomationEngine {
  /**
   * Evaluates user context and triggers real automations
   */
  static async evaluateAutomations(userId, timezone = 'UTC') {
    const todayStr = new Date().toISOString().split('T')[0];
    const events = await CalendarService.getEvents(userId, todayStr);
    const nowMinutes = CalendarService.parseTimeToMinutes(
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: timezone })
    );

    const triggeredAutomations = [];

    for (const ev of events) {
      if (ev.status === 'completed') continue;
      const evMinutes = CalendarService.parseTimeToMinutes(ev.time);
      const minutesUntil = evMinutes - nowMinutes;

      // 1. 15-Minute Pre-Meeting Reminder
      if (minutesUntil >= 10 && minutesUntil <= 20) {
        const notif = {
          userId,
          title: `JARVIS: ${ev.title} in 15 minutes`,
          message: `Your scheduled ${ev.category || 'event'} starts at ${ev.time}.`,
          type: 'UPCOMING_EVENT_REMINDER',
          actionButtons: [
            { actionId: 'dismiss', label: 'Done' },
            { actionId: 'snooze_15', label: 'Snooze 15m' },
            { actionId: 'ask_jarvis', label: 'Ask JARVIS' }
          ]
        };
        triggeredAutomations.push(notif);
      }

      // 2. Doctor Appointment Briefing Preparation
      if (ev.category === 'medical' || ev.source === 'APPOINTMENT') {
        const notif = await ProactiveNotifier.notifyPreAppointment({
          userId,
          appointmentTitle: ev.title,
          appointmentTime: ev.time,
          appointmentId: ev.id
        });
        triggeredAutomations.push(notif);
      }
    }

    return {
      evaluatedCount: events.length,
      triggeredCount: triggeredAutomations.length,
      triggeredAutomations
    };
  }

  /**
   * Schedule a persistent user-requested reminder
   */
  static async createPersistentReminder(userId, { title, time, date }) {
    const scheduleTime = date ? `${date}T${time || '12:00:00'}` : new Date(Date.now() + 3600000).toISOString();
    const task = await TaskScheduler.scheduleOneTimeTask({
      userId,
      title: `Reminder: ${title}`,
      scheduleTime
    });

    return {
      taskId: task.id,
      title,
      scheduledTime: scheduleTime,
      message: `I've set a reminder for "${title}" at ${time || 'scheduled time'}.`
    };
  }
}

module.exports = EventAutomationEngine;
