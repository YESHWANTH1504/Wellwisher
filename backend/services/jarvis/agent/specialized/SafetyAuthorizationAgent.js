const { confirmationManager } = require('../confirmationManager');
const SecurityHardeningEngine = require('../../security/securityHardeningEngine');

/**
 * SafetyAuthorizationAgent
 * Enforces prompt-injection defenses, medical non-diagnostic guardrails, dosage protection,
 * user data isolation, and cryptographic single-use confirmation tokens.
 */
class SafetyAuthorizationAgent {
  constructor(options = {}) {
    this.confirmation = options.confirmation || confirmationManager;
  }

  /**
   * Evaluate request for prompt-injection attacks
   */
  evaluateSecurity(userRequest) {
    const raw = (userRequest || '').trim();
    const lower = raw.toLowerCase();

    // Detect Prompt Injection / Jailbreak / System Overrides
    if (
      lower.includes('ignore all') ||
      lower.includes('system prompt') ||
      lower.includes('system instruction') ||
      lower.includes('delete everything') ||
      lower.includes('bypass security') ||
      lower.includes('disregard rules') ||
      lower.includes('drop database') ||
      lower.includes('drop table')
    ) {
      return {
        safe: false,
        intent: 'SECURITY_ALERT',
        message: 'I cannot comply with requests that attempt to override security controls.'
      };
    }

    return { safe: true };
  }

  /**
   * Evaluate request for medical clinical advice and medication alterations
   */
  evaluateMedicalSafety(userRequest) {
    const lower = (userRequest || '').toLowerCase();

    // 1. Refusal to alter medication dosages
    if (
      lower.includes('double my dose') ||
      lower.includes('double my dosage') ||
      lower.includes('double my medication') ||
      lower.includes('increase my dosage') ||
      lower.includes('stop taking my pills') ||
      lower.includes('change my medication dosage')
    ) {
      return {
        safe: false,
        intent: 'MEDICAL_DOSAGE_SAFETY_ALERT',
        message: 'I cannot advise on changing medication dosages. Please consult your healthcare provider or prescribing doctor directly.'
      };
    }

    // 2. Refusal to provide clinical diagnoses
    if (
      lower.includes('do i have diabetes') ||
      lower.includes('diagnose my symptoms') ||
      lower.includes('do i have cancer') ||
      lower.includes('heart attack') ||
      lower.includes('is this a heart attack')
    ) {
      return {
        safe: false,
        intent: 'MEDICAL_NON_DIAGNOSTIC_QUERY',
        message: 'I cannot diagnose medical conditions. If you are experiencing concerning symptoms, please consult a medical professional or seek emergency care.'
      };
    }

    return { safe: true };
  }

  /**
   * Validate authorization and check if high-risk action requires confirmation
   */
  checkAuthorization(userId, toolName, args = {}, isConfirmed = false) {
    if (!userId) {
      return { authorized: false, reason: 'UNAUTHORIZED' };
    }

    const { RiskClassifier } = require('../../actions/RiskClassifier');
    const riskInfo = RiskClassifier.classifyTool(toolName, args);
    const highRiskTools = ['delete_all_reminders', 'cancel_all_appointments', 'reset_memory'];
    const isHighRisk = highRiskTools.includes(toolName) || riskInfo.requiresConfirmation;

    if (isHighRisk && !isConfirmed) {
      const token = this.confirmation.createToken({
        userId,
        tool: toolName,
        arguments: args
      });
      return {
        authorized: true,
        requiresConfirmation: true,
        confirmationId: token.confirmationId,
        riskLevel: riskInfo.level,
        riskLevelName: riskInfo.name,
        message: `Action "${toolName}" requires explicit user confirmation (${riskInfo.name}).`
      };
    }

    return {
      authorized: true,
      requiresConfirmation: false,
      riskLevel: riskInfo.level,
      riskLevelName: riskInfo.name
    };
  }
}

module.exports = SafetyAuthorizationAgent;
