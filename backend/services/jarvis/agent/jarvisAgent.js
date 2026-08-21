const { AGENT_STATES, AgentStateMachine } = require('./agentStateMachine');
const ContextEngine = require('../context/contextEngine');
const LLMAdapter = require('./llm/llmAdapter');
const { AgentPlanner } = require('./agentPlanner');
const AgentExecutor = require('./agentExecutor');
const AgentResponseBuilder = require('./agentResponseBuilder');
const { EXECUTION_STATUS } = require('../tools');

const AiConversationRepository = require('../../../repositories/ai/aiConversationRepository');
const { AiAgentRunRepository } = require('../../../repositories/ai/aiAgentRunRepository');

class JarvisAgent {
  constructor(options = {}) {
    this.llmAdapter = options.llmAdapter || new LLMAdapter(options);
  }

  /**
   * Process an incoming user request through the complete JARVIS orchestration pipeline
   */
  async processRequest(userId, requestText = '', options = {}) {
    if (!userId) {
      return AgentResponseBuilder.error({
        errorCode: 'UNAUTHORIZED',
        message: 'Authenticated userId is required to invoke JARVIS.'
      });
    }

    const trimmedRequest = (requestText || '').trim();
    if (!trimmedRequest && !options.confirmationId) {
      return AgentResponseBuilder.error({
        errorCode: 'INVALID_REQUEST',
        message: 'Request text cannot be empty.'
      });
    }

    const stateMachine = new AgentStateMachine(AGENT_STATES.RECEIVED);
    let agentRun = null;
    let conversationId = options.conversationId || null;

    try {
      // 1. Ensure Conversation Session
      if (!conversationId) {
        const conv = await AiConversationRepository.createConversation(userId, {
          title: trimmedRequest ? trimmedRequest.substring(0, 40) : 'JARVIS Session'
        });
        conversationId = conv.id;
      }

      // Persist User Message Turn
      if (trimmedRequest) {
        await AiConversationRepository.addMessage(userId, {
          conversationId,
          role: 'user',
          content: trimmedRequest
        });
      }

      // 2. Persist Initial Agent Run in PLANNED State
      agentRun = await AiAgentRunRepository.createRun(userId, {
        conversationId,
        request: trimmedRequest || `Confirmation Action #${options.confirmationId}`
      });

      // 3. Build Context via Phase 3 ContextEngine
      stateMachine.transitionTo(AGENT_STATES.CONTEXT_BUILDING);
      await AiAgentRunRepository.updateRunStatus(agentRun.id, userId, { status: 'RUNNING' });

      const contextPackage = await ContextEngine.buildContext(userId, trimmedRequest, {
        conversationId,
        timezone: options.timezone || 'UTC'
      });

      // 4. LLM Planning Phase
      stateMachine.transitionTo(AGENT_STATES.PLANNING);
      let planOutput = null;

      // Handle Direct Confirmation Invocation
      if (options.confirmationId && options.toolName) {
        planOutput = {
          type: 'TOOL_EXECUTION_PLAN',
          intent: 'CONFIRMATION_EXECUTION',
          steps: [
            {
              stepNumber: 1,
              toolName: options.toolName,
              arguments: options.arguments || {}
            }
          ]
        };
      } else {
        const rawLlmPlan = await this.llmAdapter.plan(contextPackage, trimmedRequest);
        planOutput = AgentPlanner.createPlan(rawLlmPlan);
      }

      // Handle Plan-Level Errors (e.g. Unknown Tool)
      if (planOutput.type === 'ERROR') {
        await AiAgentRunRepository.updateRunStatus(agentRun.id, userId, {
          status: 'FAILED',
          errorMessage: planOutput.message
        });
        return AgentResponseBuilder.error({
          errorCode: planOutput.errorCode || 'PLANNING_ERROR',
          message: planOutput.message,
          agentRunId: agentRun.id,
          conversationId
        });
      }

      // Handle Simple Conversational Responses (No Tool Calls)
      if (planOutput.type === 'FINAL_RESPONSE') {
        stateMachine.transitionTo(AGENT_STATES.COMPLETED);
        await AiAgentRunRepository.updateRunStatus(agentRun.id, userId, { status: 'COMPLETED' });

        await AiConversationRepository.addMessage(userId, {
          conversationId,
          role: 'assistant',
          content: planOutput.message
        });

        return AgentResponseBuilder.conversational({
          message: planOutput.message,
          intent: planOutput.intent || 'GENERAL_CONVERSATION',
          agentRunId: agentRun.id,
          conversationId
        });
      }

      // 5. Tool Execution & Confirmation Phase
      stateMachine.transitionTo(AGENT_STATES.EXECUTING);
      const executionResult = await AgentExecutor.executePlan({
        userId,
        agentRunId: agentRun.id,
        plan: planOutput,
        context: contextPackage,
        confirmationId: options.confirmationId
      });

      // Handle Waiting For Confirmation State
      if (executionResult.status === EXECUTION_STATUS.WAITING_FOR_CONFIRMATION) {
        stateMachine.transitionTo(AGENT_STATES.WAITING_FOR_CONFIRMATION);
        await AiAgentRunRepository.updateRunStatus(agentRun.id, userId, {
          status: 'WAITING_FOR_CONFIRMATION'
        });

        const confMsg = `Action "${executionResult.toolName}" requires your explicit confirmation before proceeding. Would you like me to proceed?`;
        
        await AiConversationRepository.addMessage(userId, {
          conversationId,
          role: 'assistant',
          content: confMsg,
          metadata: { requiresConfirmation: true, confirmationId: executionResult.confirmationToken.confirmationId }
        });

        return AgentResponseBuilder.confirmationRequired({
          confirmationToken: executionResult.confirmationToken,
          intent: planOutput.intent,
          message: confMsg,
          agentRunId: agentRun.id,
          conversationId
        });
      }

      // Handle Tool Execution Failure
      if (executionResult.status === EXECUTION_STATUS.FAILED || executionResult.status === EXECUTION_STATUS.DISABLED) {
        stateMachine.transitionTo(AGENT_STATES.FAILED);
        await AiAgentRunRepository.updateRunStatus(agentRun.id, userId, {
          status: 'FAILED',
          errorMessage: executionResult.message
        });

        return AgentResponseBuilder.error({
          errorCode: executionResult.errorCode || 'EXECUTION_FAILED',
          message: executionResult.message || 'Tool execution failed.',
          agentRunId: agentRun.id,
          conversationId
        });
      }

      // 6. Verification & Final Response Synthesis
      stateMachine.transitionTo(AGENT_STATES.VERIFYING);
      const finalMessage = await this.llmAdapter.synthesizeResponse(
        contextPackage,
        trimmedRequest,
        executionResult.results
      );

      stateMachine.transitionTo(AGENT_STATES.COMPLETED);
      await AiAgentRunRepository.updateRunStatus(agentRun.id, userId, { status: 'COMPLETED' });

      // Persist Assistant Response Turn
      await AiConversationRepository.addMessage(userId, {
        conversationId,
        role: 'assistant',
        content: finalMessage,
        toolCalls: executionResult.results.map(r => ({ tool: r.toolName, success: r.success }))
      });

      return AgentResponseBuilder.actionCompleted({
        message: finalMessage,
        actionType: executionResult.results[0]?.toolName,
        actionData: executionResult.results[0]?.data,
        intent: planOutput.intent,
        agentRunId: agentRun.id,
        conversationId
      });
    } catch (err) {
      console.error('JARVIS Orchestrator Exception:', err);
      if (agentRun) {
        await AiAgentRunRepository.updateRunStatus(agentRun.id, userId, {
          status: 'FAILED',
          errorMessage: err.message
        });
      }

      return AgentResponseBuilder.error({
        errorCode: 'INTERNAL_AGENT_ERROR',
        message: err.message || 'An internal agent error occurred.',
        agentRunId: agentRun?.id,
        conversationId
      });
    }
  }
}

const defaultAgent = new JarvisAgent();

module.exports = {
  JarvisAgent,
  defaultAgent
};
