const VoiceResponseFormatter = require('./VoiceResponseFormatter');
const { VERIFICATION_STATUS } = require('./WorkflowVerifier');

class ResponseAgent {
  /**
   * Synthesizes a truthful, natural response based strictly on actual tool results,
   * verification status, and conversational context.
   */
  static generateResponse({
    workflowStatus,
    executedSteps = [],
    activeContext = {},
    userPreference = {},
    timeFormat = '12h',
    failureState = null,
    defaultMessage = ''
  }) {
    // 1. If explicit failure state exists, truth over politeness
    if (failureState || workflowStatus === VERIFICATION_STATUS.FAILED) {
      const firstFailure = executedSteps.find(s => s.result?.success === false || s.result?.error || s.result?.data?.error);
      const errorMsg = firstFailure?.result?.error || firstFailure?.result?.data?.error || failureState?.message || 'I encountered an error executing that request.';
      
      // Never invent success or fake completion
      return {
        speech: VoiceResponseFormatter.formatForSpeech(errorMsg),
        message: errorMsg,
        status: VERIFICATION_STATUS.FAILED,
        verified: false
      };
    }

    // 2. Partial Success handling
    if (workflowStatus === VERIFICATION_STATUS.PARTIAL_SUCCESS) {
      const succeededSteps = executedSteps.filter(s => s.result?.success !== false);
      const failedSteps = executedSteps.filter(s => s.result?.success === false);
      const partialMsg = `I completed ${succeededSteps.length} action(s), but encountered an issue with: ${failedSteps.map(f => f.toolName).join(', ')}.`;
      return {
        speech: VoiceResponseFormatter.formatForSpeech(partialMsg),
        message: partialMsg,
        status: VERIFICATION_STATUS.PARTIAL_SUCCESS,
        verified: false
      };
    }

    // 3. Clarification Required
    if (workflowStatus === VERIFICATION_STATUS.REQUIRES_CLARIFICATION) {
      const clarificationMsg = defaultMessage || 'Could you please specify which item you are referring to?';
      return {
        speech: VoiceResponseFormatter.formatForSpeech(clarificationMsg),
        message: clarificationMsg,
        status: VERIFICATION_STATUS.REQUIRES_CLARIFICATION,
        verified: true
      };
    }

    // 4. Confirmation Required
    if (workflowStatus === VERIFICATION_STATUS.REQUIRES_CONFIRMATION) {
      const confMsg = defaultMessage || 'I need your confirmation before proceeding with this action.';
      return {
        speech: VoiceResponseFormatter.formatForSpeech(confMsg),
        message: confMsg,
        status: VERIFICATION_STATUS.REQUIRES_CONFIRMATION,
        verified: true
      };
    }

    // 5. Successful Execution
    const firstStepData = executedSteps[0]?.result?.data || executedSteps[0]?.result || {};
    let successMsg = firstStepData.speech || firstStepData.message || defaultMessage || 'Done.';

    const rawUserName = (activeContext.userName || activeContext.user?.name || '').trim();
    if (rawUserName && !rawUserName.includes('@')) {
      if (!successMsg.toLowerCase().includes(rawUserName.toLowerCase())) {
        successMsg = `Sure, ${rawUserName}. ${successMsg}`;
      }
    }

    return {
      speech: VoiceResponseFormatter.formatForSpeech(successMsg),
      message: firstStepData.message || successMsg,
      status: VERIFICATION_STATUS.SUCCESS,
      verified: true
    };
  }
}

module.exports = {
  ResponseAgent
};
