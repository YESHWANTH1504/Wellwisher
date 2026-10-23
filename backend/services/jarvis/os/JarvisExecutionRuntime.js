const ACTION_STATES = Object.freeze({
  PROPOSED: 'PROPOSED',
  VALIDATING: 'VALIDATING',
  AWAITING_PERMISSION: 'AWAITING_PERMISSION',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  AUTHORIZED: 'AUTHORIZED',
  EXECUTING: 'EXECUTING',
  OBSERVING: 'OBSERVING',
  VERIFYING: 'VERIFYING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  PARTIALLY_SUCCEEDED: 'PARTIALLY_SUCCEEDED',
  CANCELLED: 'CANCELLED',
  ROLLED_BACK: 'ROLLED_BACK',
  EXPIRED: 'EXPIRED'
});

/**
 * JarvisExecutionRuntime
 * Tracks the state machine and lifecycle of in-flight actions, enforcing timeouts and safety checkpoints.
 */
class JarvisExecutionRuntime {
  constructor(actionId, options = {}) {
    this.actionId = actionId || `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.userId = options.userId;
    this.sessionId = options.sessionId;
    this.state = ACTION_STATES.PROPOSED;
    this.stepTimings = {};
    this.history = [];
    this.createdAt = Date.now();
    this.timeoutMs = options.timeoutMs || 15000;
  }

  transitionTo(newState, metadata = {}) {
    this.history.push({
      from: this.state,
      to: newState,
      timestamp: Date.now(),
      metadata
    });
    this.state = newState;
  }

  isTerminal() {
    return [
      ACTION_STATES.SUCCEEDED,
      ACTION_STATES.FAILED,
      ACTION_STATES.PARTIALLY_SUCCEEDED,
      ACTION_STATES.CANCELLED,
      ACTION_STATES.ROLLED_BACK,
      ACTION_STATES.EXPIRED
    ].includes(this.state);
  }
}

module.exports = {
  JarvisExecutionRuntime,
  ACTION_STATES
};
