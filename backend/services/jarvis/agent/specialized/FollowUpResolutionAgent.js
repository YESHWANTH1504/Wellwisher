const { activeTaskManager } = require('../../tasks/ActiveTaskManager');
const ApplicationResolver = require('../../platform/ApplicationResolver');

/**
 * FollowUpResolutionAgent
 * Resolves context-dependent follow-up questions, status inquiries, retries,
 * and entity-grounded rescheduling or cancellation against active task memory.
 * Executes REAL tool actions (DB mutation + OS alarm update/cancel) rather than fake in-memory changes.
 */
class FollowUpResolutionAgent {
  /**
   * Resolve an utterance against active task state
   * @param {string} rawUtterance
   * @param {string} sessionId
   * @param {object} context
   * @returns {{ isFollowUp: boolean, intent?: string, speech?: string, message?: string, actionPlan?: object, clearTask?: boolean }}
   */
  static resolve(rawUtterance, sessionId, context = {}) {
    if (!rawUtterance || !sessionId) {
      return { isFollowUp: false };
    }

    const raw = rawUtterance.trim();
    const lower = raw.toLowerCase().replace(/[.,!?;:]+$/g, '').trim();
    const activeTask = context.activeTask || activeTaskManager.getActiveTask(sessionId, context.userId);

    // 1. Status queries ("What is taking so long?", "Why is it taking so long?", "What happened?", "Did it open?", "Is it done?")
    if (
      lower.includes('taking so long') ||
      lower.includes('what is taking') ||
      lower.includes("what's taking") ||
      lower.includes('are you still') ||
      lower.includes('what did you just do') ||
      lower.includes('what did you do') ||
      lower.includes('did it open') ||
      lower.includes('did you open') ||
      lower.includes('is it open') ||
      lower.includes('is it done') ||
      lower.includes('what happened') ||
      lower.includes('is it working') ||
      lower === 'status'
    ) {
      if (activeTask) {
        if (activeTask.type === 'OPEN_APPLICATION') {
          const appName = activeTask.application || 'WhatsApp';
          if (activeTask.status === 'FAILED') {
            const errDetail = activeTask.lastError === 'APPLICATION_NOT_INSTALLED'
              ? `I couldn't find ${appName} on this phone.`
              : `${appName} didn't open. Android returned an error.`;
            return {
              isFollowUp: true,
              intent: 'CURRENT_TASK_STATUS',
              speech: errDetail,
              message: errDetail
            };
          }

          if (activeTask.status === 'COMPLETED' && activeTask.verified) {
            return {
              isFollowUp: true,
              intent: 'CURRENT_TASK_STATUS',
              speech: `${appName} is already open.`,
              message: `${appName} is already open.`
            };
          }

          return {
            isFollowUp: true,
            intent: 'ACTION_STATUS_QUERY',
            speech: `I'm still trying to open ${appName}.`,
            message: `I'm still trying to open ${appName}.`
          };
        }

        if (activeTask.type === 'CREATE_REMINDER' || activeTask.type === 'REMINDER' || activeTask.type === 'CREATE_SCHEDULE' || activeTask.type === 'SCHEDULE') {
          const time = activeTask.time || activeTask.targetTime || 'your requested time';
          const title = activeTask.title || 'your item';
          if (lower.includes('what did you just do') || lower.includes('what did you do')) {
            const resp = `I set a reminder for "${title}" at ${time}.`;
            return {
              isFollowUp: true,
              intent: 'CURRENT_TASK_STATUS',
              speech: resp,
              message: resp
            };
          }
          if (activeTask.status === 'STARTED' || activeTask.status === 'EXECUTING' || activeTask.status === 'PLANNED') {
            return {
              isFollowUp: true,
              intent: 'CURRENT_TASK_STATUS',
              speech: `I'm still creating the reminder for "${title}". One moment.`,
              message: `I'm still creating the reminder for "${title}". One moment.`
            };
          }
          return {
            isFollowUp: true,
            intent: 'CURRENT_TASK_STATUS',
            speech: `Your reminder for "${title}" is scheduled for ${time}.`,
            message: `Your reminder for "${title}" is scheduled for ${time}.`
          };
        }

        return {
          isFollowUp: true,
          intent: 'CURRENT_TASK_STATUS',
          speech: `I'm taking care of your ${activeTask.type.toLowerCase().replace(/_/g, ' ')}. Status is ${activeTask.status}.`,
          message: `Active task: ${activeTask.type} (${activeTask.status})`
        };
      }

      if (lower.includes('what did you just do') || lower.includes('what did you do')) {
        return {
          isFollowUp: true,
          intent: 'CURRENT_TASK_STATUS',
          speech: 'I haven\'t performed any actions yet in this session.',
          message: 'No active task currently running.'
        };
      }

      return {
        isFollowUp: true,
        intent: 'ACTION_STATUS_QUERY',
        speech: 'Everything is up to date and ready for your next request.',
        message: 'No active task currently running.'
      };
    }

    // Helper to calculate minutes offset
    function shiftTimeString(timeStr, offsetMinutes) {
      if (!timeStr) return '08:00 PM';
      const match = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
      let hours = 20;
      let minutes = 0;
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        const ampm = match[3]?.toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
      } else {
        const hMatch = timeStr.match(/(\d{1,2})\s*(AM|PM)?/i);
        if (hMatch) {
          hours = parseInt(hMatch[1], 10);
          if (hMatch[2]?.toUpperCase() === 'PM' && hours < 12) hours += 12;
        }
      }
      let totalMins = (hours * 60 + minutes + offsetMinutes) % (24 * 60);
      if (totalMins < 0) totalMins += 24 * 60;
      const resH = Math.floor(totalMins / 60);
      const resM = totalMins % 60;
      const finalAmpm = resH >= 12 ? 'PM' : 'AM';
      const dispH = resH % 12 === 0 ? 12 : resH % 12;
      return `${dispH.toString().padStart(2, '0')}:${resM.toString().padStart(2, '0')} ${finalAmpm}`;
    }

    // 2. Real Entity Rescheduling ("Move that to 9", "Make that tomorrow", "Make it 30 minutes earlier", "Move the first meeting to 3 PM")
    if (
      lower.startsWith('actually make that ') ||
      lower.startsWith('actually make it ') ||
      lower.startsWith('change that to ') ||
      lower.startsWith('move that to ') ||
      lower.startsWith('reschedule that to ') ||
      lower.startsWith('make that ') ||
      lower.startsWith('make it ') ||
      lower.startsWith('push that ') ||
      lower.startsWith('push it ') ||
      lower.startsWith('move the first ') ||
      lower.startsWith('move the ') ||
      lower.startsWith('move first ') ||
      lower.startsWith('reschedule the first ') ||
      lower.startsWith('reschedule first ') ||
      lower.startsWith('reschedule the ')
    ) {
      let targetReminderId = activeTask?.eventId || activeTask?.entityId || activeTask?.scheduleId || activeTask?.reminderId || activeTask?.id;
      let targetTitle = activeTask?.title;
      let isReminder = activeTask?.type === 'CREATE_REMINDER' || activeTask?.type === 'REMINDER';

      // Disambiguate from candidates list if available (e.g. from previously retrieved schedule)
      if (activeTask?.candidates && activeTask.candidates.length > 0) {
        if (lower.includes('first') || lower.includes('1st')) {
          const matched = activeTask.candidates.find(c =>
            (c.title || '').toLowerCase().includes('meeting') ||
            (c.eventType || '').toLowerCase().includes('meeting') ||
            (c.category || '').toLowerCase().includes('meeting')
          ) || activeTask.candidates[0];
          if (matched) {
            targetReminderId = matched.eventId || matched.entityId || matched.id;
            targetTitle = matched.title;
            isReminder = false;
          }
        } else if (lower.includes('second') || lower.includes('2nd')) {
          const matched = activeTask.candidates[1] || activeTask.candidates[0];
          if (matched) {
            targetReminderId = matched.eventId || matched.entityId || matched.id;
            targetTitle = matched.title;
            isReminder = false;
          }
        } else {
          const queryPart = lower.replace(/^(move|reschedule|change|push)\s+(the\s+|that\s+)?/i, '').split(/\s+to\s+/)[0].trim();
          const matched = activeTask.candidates.find(c => (c.title || '').toLowerCase().includes(queryPart));
          if (matched) {
            targetReminderId = matched.eventId || matched.entityId || matched.id;
            targetTitle = matched.title;
            isReminder = false;
          }
        }
      }

      if (!targetReminderId && !targetTitle) {
        return {
          isFollowUp: true,
          intent: 'RESCHEDULE_LAST_ITEM',
          speech: "There is no active reminder or task to reschedule.",
          message: "No active task found to reschedule."
        };
      }

      let newTime = null;
      let newDate = null;

      // Check for minute shift: e.g. "30 minutes earlier", "15 minutes later"
      const offsetMatch = raw.match(/(\d+)\s*(?:minutes?|mins?|hours?|hrs?)\s*(earlier|later|before|after|ahead)/i);
      if (offsetMatch) {
        let amount = parseInt(offsetMatch[1], 10);
        if (offsetMatch[0].toLowerCase().includes('hour') || offsetMatch[0].toLowerCase().includes('hr')) {
          amount *= 60;
        }
        const isEarlier = offsetMatch[2].toLowerCase().includes('earlier') || offsetMatch[2].toLowerCase().includes('before');
        const delta = isEarlier ? -amount : amount;
        newTime = shiftTimeString(activeTask?.time || activeTask?.targetTime, delta);
      } else if (lower.includes('tomorrow') || lower.includes('next day')) {
        newDate = 'tomorrow';
      } else {
        const timeMatch = raw.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)|\d{1,2}\s*(?:am|pm|AM|PM)|\d{1,2})/i);
        if (timeMatch) {
          let t = timeMatch[0].trim().toUpperCase();
          if (!t.includes('AM') && !t.includes('PM')) {
            const num = parseInt(t, 10);
            const h = num.toString().padStart(2, '0');
            t = `${h}:00 PM`;
          }
          if (!t.includes(':')) {
            const parts = t.split(/\s+/);
            const h = parts[0].padStart(2, '0');
            t = `${h}:00 ${parts[1] || 'PM'}`;
          }
          newTime = t;
        }
      }

      const args = {
        reminderId: targetReminderId,
        eventId: targetReminderId,
        scheduleId: targetReminderId,
        titleQuery: activeTask?.title,
        query: activeTask?.title
      };
      if (newTime) {
        args.targetTime = newTime;
        args.newTime = newTime;
      }
      if (newDate) {
        args.targetDate = newDate;
        args.newDate = newDate;
      }

      return {
        isFollowUp: true,
        intent: 'RESCHEDULE_LAST_ITEM',
        actionPlan: {
          type: 'TOOL_EXECUTION_PLAN',
          intent: 'RESCHEDULE_LAST_ITEM',
          steps: [
            {
              stepNumber: 1,
              toolName: isReminder ? 'update_reminder' : 'calendar_update_event',
              arguments: args
            }
          ]
        }
      };
    }

    // 3. Real Entity Cancellation ("Cancel that", "Cancel it", "Actually don't do that", "Cancel that reminder")
    if (
      lower === 'cancel that' ||
      lower === 'cancel it' ||
      lower === 'cancel that reminder' ||
      lower === 'cancel that action' ||
      lower === 'cancel that event' ||
      lower === 'cancel that meeting' ||
      lower === 'delete that' ||
      lower === 'delete that reminder' ||
      lower === 'delete that event' ||
      lower === 'actually don\'t do that' ||
      lower === 'don\'t do that' ||
      lower.startsWith('actually cancel')
    ) {
      const targetReminderId = activeTask?.eventId || activeTask?.entityId || activeTask?.scheduleId || activeTask?.reminderId || activeTask?.id;
      const targetTitle = activeTask?.title;
      const isReminder = activeTask?.type === 'CREATE_REMINDER' || activeTask?.type === 'REMINDER';

      if (!targetReminderId && !targetTitle) {
        return {
          isFollowUp: true,
          intent: 'CANCEL_CURRENT_ACTION',
          speech: "There is no active reminder or task to cancel.",
          message: "No active task found to cancel."
        };
      }

      return {
        isFollowUp: true,
        intent: 'CANCEL_CURRENT_ACTION',
        clearTask: true,
        actionPlan: {
          type: 'TOOL_EXECUTION_PLAN',
          intent: 'CANCEL_CURRENT_ACTION',
          steps: [
            {
              stepNumber: 1,
              toolName: isReminder ? 'cancel_reminder' : 'calendar_delete_event',
              arguments: {
                reminderId: targetReminderId,
                scheduleId: targetReminderId,
                eventId: targetReminderId,
                titleQuery: activeTask?.title,
                query: activeTask?.title
              }
            }
          ]
        }
      };
    }

    // 4. Return to app ("Actually go back to WhatsApp", "Take me back to WhatsApp")
    if (
      lower.startsWith('actually, go back to') ||
      lower.startsWith('actually go back to') ||
      lower.startsWith('go back to') ||
      lower.startsWith('switch back to') ||
      lower.startsWith('take me back to')
    ) {
      const appResolution = ApplicationResolver.resolve(raw);
      const appName = appResolution.isAppRequest ? appResolution.appName : (activeTask?.application || 'WhatsApp');
      const packageName = appResolution.isAppRequest ? appResolution.packageName : (activeTask?.packageName || 'com.whatsapp');

      return {
        isFollowUp: true,
        intent: 'OPEN_APPLICATION',
        actionPlan: {
          type: 'TOOL_EXECUTION_PLAN',
          intent: 'OPEN_APPLICATION',
          steps: [
            {
              stepNumber: 1,
              toolName: 'open_application',
              arguments: { appName, packageName }
            }
          ]
        }
      };
    }

    // 5. Retry last action
    if (lower === 'try again' || lower === 'do it again' || lower === 'retry' || lower === 'retry that') {
      if (activeTask && activeTask.type === 'OPEN_APPLICATION') {
        const appName = activeTask.application || 'WhatsApp';
        return {
          isFollowUp: true,
          intent: 'RETRY_CURRENT_ACTION',
          speech: `Opening ${appName} again now.`,
          message: `Retrying launch of ${appName}.`,
          actionPlan: {
            type: 'TOOL_EXECUTION_PLAN',
            intent: 'OPEN_APPLICATION',
            steps: [
              {
                stepNumber: 1,
                toolName: 'open_application',
                arguments: { appName, packageName: activeTask.packageName }
              }
            ]
          }
        };
      }
    }

    return { isFollowUp: false };
  }
}

module.exports = FollowUpResolutionAgent;
