/**
 * CompanionRecoveryManager
 * Recovers from external provider failures, permission loss, and process crashes with graceful degradation.
 */
class CompanionRecoveryManager {
  static handleProviderFailure(provider, operation, error) {
    const errorDetails = error?.message || String(error);
    return {
      handled: true,
      provider,
      operation,
      originalError: errorDetails,
      recoveryAction: 'SAFE_DEGRADATION',
      userExplanation: `Your ${operation.toLowerCase()} couldn't be completed because ${provider} encountered an issue (${errorDetails}). I haven't claimed it was created.`,
      retryEligible: true,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = CompanionRecoveryManager;
