const TOOL_LABELS = {
  get_today_schedule: "Checking today's schedule & routines",
  get_schedule: "Retrieving schedule timeline",
  create_schedule: "Adding routine to schedule",
  delete_schedule: "Removing routine from schedule",
  update_schedule: "Updating routine parameters",
  get_medications: "Checking medication adherence & dosages",
  log_medication: "Logging medication intake",
  get_hydration: "Retrieving hydration telemetry",
  log_hydration: "Logging water intake",
  get_wellness: "Checking wellness scores & mood",
  log_wellness: "Recording wellness assessment",
  analyze_journal: "Analyzing AI journal entry",
  save_memory: "Saving semantic preference to memory",
  search_memory: "Querying semantic memory matrix",
  delete_memory: "Forgetting memory vector",
  get_profile: "Accessing personalization profile",
  update_preferences: "Updating neural settings",
  get_family_feed: "Checking caregiver family activity",
  get_documents: "Listing multi-modal medical documents",
  get_document_summary: "Reading document clinical summary",
  get_document_extraction: "Extracting biomarker parameters from document",
  compare_documents: "Calculating biomarker differentials across reports",
  get_health_trends: "Analyzing longitudinal health trends",
  get_health_alerts: "Scanning proactive health alerts",
  check_medication_conflicts: "Reconciling medication interactions",
  generate_doctor_briefing: "Synthesizing 1-page clinician briefing",
  get_upcoming_appointments: "Checking upcoming medical appointments",
  create_appointment: "Scheduling clinician appointment",
  get_calendar_events: "Checking calendar events & schedule slots",
  find_calendar_availability: "Finding free calendar slots",
  get_pending_workflow_actions: "Checking Action Center pending tasks",
  confirm_workflow_action: "Confirming workflow task",
  dismiss_workflow_action: "Dismissing workflow task",
  prepare_doctor_visit: "Preparing consultation briefing & discussion items",
  find_free_time: "Analyzing calendar for optimal time slot",
  create_calendar_event: "Adding calendar event",
  reschedule_event: "Rescheduling event with conflict checking"
};

function formatToolLabel(toolName) {
  if (!toolName) return 'Executing JARVIS operation';
  return TOOL_LABELS[toolName] || `Executing ${toolName.replace(/_/g, ' ')}`;
}

function normalizeSteps(steps = []) {
  if (!Array.isArray(steps)) return [];
  return steps.map((s, idx) => {
    let status = s.status || (s.success === false ? 'FAILED' : 'SUCCESS');
    if (status === 'COMPLETED') status = 'SUCCESS';
    return {
      id: s.id || `step_${idx + 1}`,
      toolName: s.toolName || s.tool || '',
      label: s.label || formatToolLabel(s.toolName || s.tool),
      status: status,
      data: s.data || {},
      startedAt: s.startedAt || new Date().toISOString(),
      completedAt: s.completedAt || new Date().toISOString()
    };
  });
}

class AgentResponseBuilder {
  /**
   * Build successful conversational final response
   */
  static conversational({ message, intent = 'GENERAL_CONVERSATION', agentRunId, conversationId, steps = [], metadata = {} }) {
    const normalizedSteps = normalizeSteps(steps);
    return {
      success: true,
      type: 'FINAL_RESPONSE',
      intent,
      message,
      steps: normalizedSteps,
      executionSteps: normalizedSteps,
      agentRunId: agentRunId || null,
      conversationId: conversationId || null,
      requiresConfirmation: false,
      timestamp: new Date().toISOString(),
      metadata
    };
  }

  /**
   * Build confirmation required response
   */
  static confirmationRequired({ confirmationToken, intent = 'SCHEDULE_DELETE', message, agentRunId, conversationId, steps = [] }) {
    const normalizedSteps = normalizeSteps(
      steps.length > 0
        ? steps
        : [
            {
              toolName: confirmationToken.tool,
              label: formatToolLabel(confirmationToken.tool),
              status: 'WAITING_CONFIRMATION',
              data: confirmationToken.arguments
            }
          ]
    );

    return {
      success: true,
      type: 'CONFIRMATION_REQUIRED',
      intent,
      message: message || `Action "${confirmationToken.tool}" requires explicit user confirmation before execution.`,
      requiresConfirmation: true,
      steps: normalizedSteps,
      executionSteps: normalizedSteps,
      confirmation: {
        confirmationId: confirmationToken.confirmationId,
        tool: confirmationToken.tool,
        arguments: confirmationToken.arguments,
        expiresAt: new Date(confirmationToken.expiresAt).toISOString()
      },
      agentRunId: agentRunId || null,
      conversationId: conversationId || null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Build action completed response
   */
  static actionCompleted({ message, actionType, actionData, intent, agentRunId, conversationId, steps = [], metadata = {} }) {
    const normalizedSteps = normalizeSteps(
      steps.length > 0
        ? steps
        : [
            {
              toolName: actionType,
              label: formatToolLabel(actionType),
              status: 'SUCCESS',
              data: actionData || {}
            }
          ]
    );

    return {
      success: true,
      type: 'ACTION_COMPLETED',
      intent: intent || 'ACTION_EXECUTION',
      message,
      steps: normalizedSteps,
      executionSteps: normalizedSteps,
      action: {
        type: actionType,
        data: actionData || {}
      },
      requiresConfirmation: false,
      agentRunId: agentRunId || null,
      conversationId: conversationId || null,
      timestamp: new Date().toISOString(),
      metadata
    };
  }

  /**
   * Build safe error response
   */
  static error({ errorCode = 'INTERNAL_AGENT_ERROR', message = 'An error occurred during agent processing.', agentRunId, conversationId, steps = [], details = null }) {
    const normalizedSteps = normalizeSteps(steps);
    return {
      success: false,
      type: 'ERROR',
      errorCode,
      message,
      steps: normalizedSteps,
      requiresConfirmation: false,
      agentRunId: agentRunId || null,
      conversationId: conversationId || null,
      details: details || null,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = AgentResponseBuilder;
