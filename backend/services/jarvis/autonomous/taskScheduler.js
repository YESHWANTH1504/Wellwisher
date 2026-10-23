const AiAutonomousRepository = require('../../../repositories/ai/aiAutonomousRepository');
const ProactiveNotifier = require('./proactiveNotifier');
const { defaultAgent } = require('../agent/jarvisAgent');

class TaskScheduler {
  /**
   * Schedule a one-time reminder / command execution
   */
  static async scheduleOneTimeTask({
    userId,
    title,
    scheduleTime,
    commandText = null,
    payload = {}
  }) {
    return await AiAutonomousRepository.createTask({
      userId,
      title,
      taskType: commandText ? 'SCHEDULED_COMMAND' : 'REMINDER',
      scheduleTime,
      payload: { ...payload, commandText },
      status: 'PENDING'
    });
  }

  /**
   * Schedule a recurring automation
   */
  static async scheduleRecurringTask({
    userId,
    title,
    cronExpression,
    taskType = 'BRIEFING',
    payload = {}
  }) {
    return await AiAutonomousRepository.createTask({
      userId,
      title,
      taskType,
      cronExpression,
      scheduleTime: new Date().toISOString(),
      payload,
      status: 'PENDING'
    });
  }

  /**
   * Execute pending due tasks autonomously
   */
  static async processDueTasks(dueBefore = new Date().toISOString()) {
    const dueTasks = await AiAutonomousRepository.getPendingTasksDue(dueBefore);
    const results = [];

    for (const task of dueTasks) {
      try {
        let executionResult = null;

        if (task.task_type === 'SCHEDULED_COMMAND' && task.payload?.commandText) {
          executionResult = await defaultAgent.processRequest(task.user_id, task.payload.commandText, {
            source: 'AUTONOMOUS_TASK'
          });
        } else if (task.task_type === 'REMINDER') {
          await ProactiveNotifier.sendActionableNotification({
            userId: task.user_id,
            title: 'JARVIS Reminder',
            body: task.title,
            notificationType: 'REMINDER'
          });
          executionResult = { reminderSent: true, title: task.title };
        } else if (task.task_type === 'BRIEFING') {
          executionResult = await defaultAgent.processRequest(task.user_id, "What's happening today?", {
            source: 'AUTONOMOUS_TASK'
          });
          await ProactiveNotifier.sendActionableNotification({
            userId: task.user_id,
            title: 'JARVIS: Daily Focus Briefing',
            body: executionResult.message,
            notificationType: 'MORNING_FOCUS'
          });
        }

        const updated = await AiAutonomousRepository.updateTaskStatus(
          task.user_id,
          task.id,
          'COMPLETED',
          executionResult
        );
        results.push({ taskId: task.id, status: 'COMPLETED', result: executionResult });
      } catch (err) {
        await AiAutonomousRepository.updateTaskStatus(
          task.user_id,
          task.id,
          'FAILED',
          { error: err.message }
        );
        results.push({ taskId: task.id, status: 'FAILED', error: err.message });
      }
    }

    return results;
  }
}

module.exports = TaskScheduler;
