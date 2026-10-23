/**
 * PersonalRoutineEngine
 * Coordinates predefined and custom daily routines (START_MY_DAY, LEAVE_FOR_WORK, PRE_MEETING, WRAP_UP_DAY, etc.)
 */
class PersonalRoutineEngine {
  constructor() {
    this.routineExecutions = new Map();
  }

  async executeRoutine(userId, routineType, context = {}) {
    const execId = `exec_${Date.now()}_${routineType.toLowerCase()}`;
    const execution = {
      execId,
      userId,
      routineType,
      status: 'COMPLETED',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      stepsExecuted: []
    };

    switch (routineType) {
      case 'START_MY_DAY':
        execution.stepsExecuted = [
          'FETCH_DAILY_CALENDAR',
          'EVALUATE_ATTENTION_FEED',
          'SYNTHESIZE_MORNING_BRIEFING'
        ];
        execution.summary = 'Morning briefing generated and delivered.';
        break;

      case 'LEAVE_FOR_WORK':
        execution.stepsExecuted = [
          'VERIFY_WORK_DESTINATION',
          'CHECK_TRAVEL_BUFFER',
          'PREPARE_NAVIGATION_INTENT',
          'SPEAK_DEPARTURE_CHECKLIST'
        ];
        execution.summary = 'Departure routine completed.';
        break;

      case 'WRAP_UP_DAY':
        execution.stepsExecuted = [
          'EVALUATE_COMPLETED_TASKS',
          'LIST_UNFINISHED_ITEMS',
          'PREVIEW_TOMORROW_CALENDAR'
        ];
        execution.summary = 'Evening summary generated.';
        break;

      case 'BEDTIME':
        execution.stepsExecuted = [
          'ACTIVATE_QUIET_HOURS',
          'SUPPRESS_NON_CRITICAL_NOTIFICATIONS',
          'SCHEDULE_WAKEUP_ALARM'
        ];
        execution.summary = 'Bedtime routine activated.';
        break;

      default:
        execution.stepsExecuted = ['CUSTOM_ROUTINE_EXECUTION'];
        execution.summary = `Custom routine ${routineType} executed.`;
    }

    this.routineExecutions.set(execId, execution);
    return execution;
  }

  getExecutionHistory(userId) {
    return Array.from(this.routineExecutions.values()).filter(e => e.userId === userId);
  }
}

module.exports = new PersonalRoutineEngine();
