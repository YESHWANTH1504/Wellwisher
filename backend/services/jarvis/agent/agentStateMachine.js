const AGENT_STATES = {
  RECEIVED: 'RECEIVED',
  UNDERSTANDING: 'UNDERSTANDING',
  CONTEXT_BUILDING: 'CONTEXT_BUILDING',
  PLANNING: 'PLANNING',
  WAITING_FOR_CONFIRMATION: 'WAITING_FOR_CONFIRMATION',
  EXECUTING: 'EXECUTING',
  VERIFYING: 'VERIFYING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

class AgentStateMachine {
  constructor(initialState = AGENT_STATES.RECEIVED) {
    this.currentState = initialState;
    this.history = [{ state: initialState, timestamp: new Date().toISOString() }];
  }

  transitionTo(nextState, metadata = {}) {
    if (!AGENT_STATES[nextState]) {
      throw new Error(`Invalid agent state transition target: "${nextState}".`);
    }
    this.currentState = nextState;
    this.history.push({
      state: nextState,
      timestamp: new Date().toISOString(),
      ...metadata
    });
    return this.currentState;
  }

  getState() {
    return this.currentState;
  }

  isTerminal() {
    return [AGENT_STATES.COMPLETED, AGENT_STATES.FAILED].includes(this.currentState);
  }
}

module.exports = {
  AGENT_STATES,
  AgentStateMachine
};
