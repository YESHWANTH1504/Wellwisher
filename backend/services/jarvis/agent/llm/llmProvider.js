class LLMProvider {
  /**
   * Base method to generate structured intent and tool plan
   */
  async plan(contextPackage, requestText, availableTools = []) {
    throw new Error('plan() method must be implemented by concrete LLM Provider.');
  }

  /**
   * Base method to generate conversational final response
   */
  async synthesizeResponse(contextPackage, requestText, executionResults = []) {
    throw new Error('synthesizeResponse() method must be implemented by concrete LLM Provider.');
  }
}

module.exports = LLMProvider;
