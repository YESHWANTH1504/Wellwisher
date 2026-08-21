class AgentResponseBuilder {
  /**
   * Build successful conversational final response
   */
  static conversational({ message, intent = 'GENERAL_CONVERSATION', agentRunId, conversationId, metadata = {} }) {
    return {
      success: true,
      type: 'FINAL_RESPONSE',
      intent,
      message,
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
  static confirmationRequired({ confirmationToken, intent = 'SCHEDULE_DELETE', message, agentRunId, conversationId }) {
    return {
      success: true,
      type: 'CONFIRMATION_REQUIRED',
      intent,
      message: message || `Action "${confirmationToken.tool}" requires explicit user confirmation before execution.`,
      requiresConfirmation: true,
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
  static actionCompleted({ message, actionType, actionData, intent, agentRunId, conversationId, metadata = {} }) {
    return {
      success: true,
      type: 'ACTION_COMPLETED',
      intent: intent || 'ACTION_EXECUTION',
      message,
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
  static error({ errorCode = 'INTERNAL_AGENT_ERROR', message = 'An error occurred during agent processing.', agentRunId, conversationId, details = null }) {
    return {
      success: false,
      type: 'ERROR',
      errorCode,
      message,
      requiresConfirmation: false,
      agentRunId: agentRunId || null,
      conversationId: conversationId || null,
      details: details || null,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = AgentResponseBuilder;
