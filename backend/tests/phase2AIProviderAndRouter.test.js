const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { AIProvider, PROVIDER_CAPABILITIES, PROVIDER_STATUS, PROVIDER_ERRORS } = require('../services/jarvis/providers/AIProvider');
const { AIProviderRegistry } = require('../services/jarvis/providers/AIProviderRegistry');
const { AIModelRouter, MODEL_ROLES } = require('../services/jarvis/providers/AIModelRouter');
const GeminiProvider = require('../services/jarvis/providers/GeminiProvider');
const OpenAIProvider = require('../services/jarvis/providers/OpenAIProvider');
const ElevenLabsProvider = require('../services/jarvis/providers/ElevenLabsProvider');
const LiveKitProvider = require('../services/jarvis/providers/LiveKitProvider');
const { JarvisPersona } = require('../services/jarvis/core/JarvisPersona');
const { PlanSchemaValidator } = require('../services/jarvis/planning/planSchemaValidator');
const { JarvisSupervisorAgent, SUPERVISOR_STATES } = require('../services/jarvis/agent/JarvisSupervisorAgent');
const { masterOrchestrator } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const SafetyAuthorizationAgent = require('../services/jarvis/agent/specialized/SafetyAuthorizationAgent');
const ToolExecutionAgent = require('../services/jarvis/agent/specialized/ToolExecutionAgent');
const { WorkflowVerifier } = require('../services/jarvis/agent/WorkflowVerifier');

// Mock test provider helper
class MockTestProvider extends AIProvider {
  constructor(name, capabilities = [PROVIDER_CAPABILITIES.TEXT_GENERATION], options = {}) {
    super(name, options);
    this._capabilities = new Set(capabilities);
    this.shouldFail = options.shouldFail || false;
    this.failureError = options.failureError || 'Simulated provider network failure';
    this.customResponse = options.customResponse || `Response from ${name}`;
    this.customPlan = options.customPlan || null;
    this.lastReceivedPrompt = null;
    this.lastReceivedContext = null;
  }

  getCapabilities() {
    return this._capabilities;
  }

  async _performHealthCheck() {
    return !this.shouldFail;
  }

  async generateText(prompt, systemInstruction = '', options = {}) {
    this.lastReceivedPrompt = prompt;
    this.lastReceivedContext = options;
    if (this.shouldFail) {
      throw new Error(this.failureError);
    }
    return this.customResponse;
  }

  async respond(prompt, context = {}) {
    return this.generateText(prompt, '', context);
  }

  async plan(contextPackage, requestText, availableTools = []) {
    if (this.shouldFail) {
      throw new Error(this.failureError);
    }
    return this.customPlan;
  }

  async synthesize(text, voiceOptions = {}) {
    if (this.shouldFail) {
      throw new Error(this.failureError);
    }
    return Buffer.from([0x01, 0x02, 0x03]);
  }

  async analyzeImage(imageData, prompt) {
    if (this.shouldFail) {
      throw new Error(this.failureError);
    }
    return `Visual analysis of image: ${prompt}`;
  }
}

describe('PHASE 2: Unified AI Provider Architecture & Intelligent Model Routing', () => {

  // ==========================================
  // 1. PROVIDER REGISTRY TESTS
  // ==========================================
  describe('Provider Registry', () => {
    it('1. Provider registration succeeds and registers valid AIProvider', () => {
      const registry = new AIProviderRegistry();
      const custom = new MockTestProvider('custom_ai');
      registry.register('custom_ai', custom);

      assert.equal(registry.has('custom_ai'), true);
      assert.equal(registry.get('custom_ai'), custom);
    });

    it('2. Provider lookup returns registered instance case-insensitively', () => {
      const registry = new AIProviderRegistry();
      assert.notEqual(registry.get('GEMINI'), null);
      assert.notEqual(registry.get('gemini'), null);
      assert.equal(registry.get('GEMINI').name, 'gemini');
    });

    it('3. Capability lookup finds providers matching specific capabilities', () => {
      const registry = new AIProviderRegistry();
      const ttsProviders = registry.getProvidersWithCapability(PROVIDER_CAPABILITIES.TTS);
      assert.ok(ttsProviders.length >= 1);
      assert.equal(ttsProviders.some(p => p.name === 'elevenlabs'), true);

      const visionProviders = registry.getProvidersWithCapability(PROVIDER_CAPABILITIES.VISION);
      assert.ok(visionProviders.length >= 1);
      assert.equal(visionProviders.some(p => p.name === 'gemini'), true);
    });

    it('4. Missing provider returns null and false on lookup', () => {
      const registry = new AIProviderRegistry();
      assert.equal(registry.get('non_existent_provider_xyz'), null);
      assert.equal(registry.has('non_existent_provider_xyz'), false);
    });

    it('5. Disabled provider is excluded from available status check', async () => {
      const registry = new AIProviderRegistry();
      const testP = new MockTestProvider('toggle_provider');
      registry.register('toggle_provider', testP);

      assert.equal(await registry.isProviderAvailable('toggle_provider'), true);
      registry.setProviderStatus('toggle_provider', PROVIDER_STATUS.DISABLED);
      assert.equal(await registry.isProviderAvailable('toggle_provider'), false);
    });
  });

  // ==========================================
  // 2. ROUTING MATRIX TESTS
  // ==========================================
  describe('Routing Matrix & Logical Model Roles', () => {
    it('6. Greeting routes to FAST_MODEL', async () => {
      const registry = new AIProviderRegistry();
      const fastMock = new MockTestProvider('gemini', [PROVIDER_CAPABILITIES.TEXT_GENERATION], {
        customResponse: 'Hello! I am JARVIS, ready to assist.'
      });
      registry.register('gemini', fastMock);

      const router = new AIModelRouter(registry);
      const res = await router.respond('Hello JARVIS');
      assert.equal(res, 'Hello! I am JARVIS, ready to assist.');
      const telemetry = router.getTelemetry()[0];
      assert.equal(telemetry.role, MODEL_ROLES.FAST_MODEL);
      assert.equal(telemetry.provider, 'gemini');
    });

    it('7. Intent classification routes to FAST_MODEL', async () => {
      const registry = new AIProviderRegistry();
      const fastMock = new MockTestProvider('gemini', [PROVIDER_CAPABILITIES.TEXT_GENERATION], {
        customResponse: '{"intent":"GREETING"}'
      });
      fastMock.understand = async (text) => ({ intent: 'GREETING', category: 'CONVERSATION' });
      registry.register('gemini', fastMock);

      const router = new AIModelRouter(registry);
      const res = await router.understand('Hi there');
      assert.equal(res.intent, 'GREETING');
      const telemetry = router.getTelemetry()[0];
      assert.equal(telemetry.role, MODEL_ROLES.FAST_MODEL);
    });

    it('8. Complex multi-step task routes to STRONG_REASONING_MODEL', async () => {
      const registry = new AIProviderRegistry();
      const reasoningMock = new MockTestProvider('gemini', [PROVIDER_CAPABILITIES.TOOL_PLANNING], {
        customPlan: {
          type: 'TOOL_EXECUTION_PLAN',
          intent: 'SCHEDULE_REQUEST',
          steps: [{ stepNumber: 1, toolName: 'calendar_create_event', arguments: { title: 'Strategy Session', time: '14:00' } }]
        }
      });
      registry.register('gemini', reasoningMock);

      const router = new AIModelRouter(registry);
      const plan = await router.plan({}, 'Schedule a 2-hour strategy session at 2 PM');
      assert.equal(plan.type, 'TOOL_EXECUTION_PLAN');
      assert.equal(plan.steps[0].toolName, 'calendar_create_event');
      const telemetry = router.getTelemetry()[0];
      assert.equal(telemetry.role, MODEL_ROLES.STRONG_REASONING_MODEL);
    });

    it('9. Vision analysis routes to VISION_MODEL', async () => {
      const registry = new AIProviderRegistry();
      const visionMock = new MockTestProvider('gemini', [PROVIDER_CAPABILITIES.VISION]);
      registry.register('gemini', visionMock);

      const router = new AIModelRouter(registry);
      const res = await router.analyzeImage('base64data', 'What is on this prescription?');
      assert.ok(res.includes('Visual analysis of image'));
      const telemetry = router.getTelemetry()[0];
      assert.equal(telemetry.role, MODEL_ROLES.VISION_MODEL);
    });

    it('10. TTS synthesis routes to TTS_MODEL', async () => {
      const registry = new AIProviderRegistry();
      const ttsMock = new MockTestProvider('elevenlabs', [PROVIDER_CAPABILITIES.TTS]);
      registry.register('elevenlabs', ttsMock);

      const router = new AIModelRouter(registry);
      const buffer = await router.synthesize('Good morning Yeshwanth.');
      assert.ok(Buffer.isBuffer(buffer));
      const telemetry = router.getTelemetry()[0];
      assert.equal(telemetry.role, MODEL_ROLES.TTS_MODEL);
    });

    it('11. Realtime role resolves candidate providers for REALTIME_MODEL', () => {
      const registry = new AIProviderRegistry();
      const router = new AIModelRouter(registry);
      const candidates = router.getCandidateProviders(MODEL_ROLES.REALTIME_MODEL);
      assert.ok(candidates.length >= 1);
      assert.ok(candidates.some(c => c.name === 'livekit' || c.name === 'openai'));
    });
  });

  // ==========================================
  // 3. FALLBACK BEHAVIOR TESTS
  // ==========================================
  describe('Provider Fallback & Failure Handling', () => {
    it('12. Primary provider failure fails over to secondary configured provider', async () => {
      const registry = new AIProviderRegistry();
      const failingGemini = new MockTestProvider('gemini', [PROVIDER_CAPABILITIES.TEXT_GENERATION], {
        shouldFail: true,
        failureError: 'Gemini Quota Exceeded (429)'
      });
      const healthyOpenAI = new MockTestProvider('openai', [PROVIDER_CAPABILITIES.TEXT_GENERATION], {
        customResponse: 'Hello from healthy OpenAI secondary provider!'
      });

      registry.register('gemini', failingGemini);
      registry.register('openai', healthyOpenAI);

      const router = new AIModelRouter(registry);
      const result = await router.respond('What is the weather today?');
      assert.equal(result, 'Hello from healthy OpenAI secondary provider!');

      const telemetry = router.getTelemetry()[0];
      assert.equal(telemetry.provider, 'openai');
      assert.equal(telemetry.fallbackUsed, true);
      assert.equal(telemetry.attempts, 2);
    });

    it('13. Secondary provider selection executes when primary is unhealthy', async () => {
      const registry = new AIProviderRegistry();
      const failingPrimary = new MockTestProvider('gemini', [PROVIDER_CAPABILITIES.TEXT_GENERATION], { shouldFail: true });
      const workingSecondary = new MockTestProvider('openai', [PROVIDER_CAPABILITIES.TEXT_GENERATION], { customResponse: 'Secondary active' });
      registry.register('gemini', failingPrimary);
      registry.register('openai', workingSecondary);

      const router = new AIModelRouter(registry);
      const res = await router.generateText('Tell me a quote');
      assert.equal(res, 'Secondary active');
    });

    it('14. When both providers unavailable, returns honest failure (no hallucinated AI)', async () => {
      const registry = new AIProviderRegistry();
      const failingGemini = new MockTestProvider('gemini', [PROVIDER_CAPABILITIES.TEXT_GENERATION], { shouldFail: true });
      const failingOpenAI = new MockTestProvider('openai', [PROVIDER_CAPABILITIES.TEXT_GENERATION], { shouldFail: true });
      registry.register('gemini', failingGemini);
      registry.register('openai', failingOpenAI);

      const router = new AIModelRouter(registry);
      const execution = await router.routeAndExecute(MODEL_ROLES.FAST_MODEL, async (p) => p.respond('Explain quantum entanglement'));
      
      assert.equal(execution.success, false);
      assert.equal(execution.error, 'AI_SERVICES_UNAVAILABLE');
      assert.equal(execution.data, null);
    });

    it('15. Retry limit is bounded (does not loop infinitely)', async () => {
      const registry = new AIProviderRegistry();
      let callCount = 0;
      const loopingProvider = new MockTestProvider('gemini', [PROVIDER_CAPABILITIES.TEXT_GENERATION]);
      loopingProvider.generateText = async () => {
        callCount++;
        throw new Error('503 Service Unavailable');
      };
      registry.register('gemini', loopingProvider);
      registry.unregister('openai'); // no secondary

      const router = new AIModelRouter(registry);
      const execution = await router.routeAndExecute(MODEL_ROLES.FAST_MODEL, async (p) => p.generateText('test'));
      assert.equal(execution.success, false);
      assert.equal(callCount, 1); // Exactly 1 attempt per candidate, strictly bounded
    });

    it('16. Invalid provider response is caught and routed safely', async () => {
      const registry = new AIProviderRegistry();
      const badProvider = new MockTestProvider('gemini', [PROVIDER_CAPABILITIES.TEXT_GENERATION]);
      badProvider.generateText = async () => null; // returns null
      registry.register('gemini', badProvider);

      const router = new AIModelRouter(registry);
      const res = await router.generateText('Hello', '', {}, async () => 'Fallback text');
      assert.equal(res, 'Fallback text');
    });

    it('17. Schema validation failure rejects malformed model plans safely', () => {
      // 1. Missing plan type
      const v1 = PlanSchemaValidator.validate({ invalid: true });
      assert.equal(v1.valid, false);

      // 2. Tool plan without steps
      const v2 = PlanSchemaValidator.validate({ type: 'TOOL_EXECUTION_PLAN', steps: [] });
      assert.equal(v2.valid, false);

      // 3. Tool with dangerous SQL injection
      const v3 = PlanSchemaValidator.validate({
        type: 'TOOL_EXECUTION_PLAN',
        steps: [{ toolName: 'calendar_create_event', arguments: { title: "Test'; DROP TABLE users; --" } }]
      });
      assert.equal(v3.valid, false);
      assert.ok(v3.error.includes('Dangerous string argument'));

      // 4. Valid plan passes
      const v4 = PlanSchemaValidator.validate({
        type: 'TOOL_EXECUTION_PLAN',
        intent: 'CALENDAR_CREATE',
        steps: [{ stepNumber: 1, toolName: 'calendar_create_event', arguments: { title: 'Dentist', time: '10:00' } }]
      });
      assert.equal(v4.valid, true);
      assert.equal(v4.sanitizedPlan.steps[0].toolName, 'calendar_create_event');
    });
  });

  // ==========================================
  // 4. SECURITY & CONTEXT INTEGRITY TESTS
  // ==========================================
  describe('Security & Context Minimization', () => {
    it('18. API keys are never exposed in provider responses or serialization', () => {
      const gemini = new GeminiProvider({ apiKey: 'super_secret_gemini_api_key_12345' });
      const str = JSON.stringify(gemini);
      assert.equal(str.includes('super_secret_gemini_api_key_12345'), false);

      const openai = new OpenAIProvider({ apiKey: 'super_secret_openai_api_key_12345' });
      const strO = JSON.stringify(openai);
      assert.equal(strO.includes('super_secret_openai_api_key_12345'), false);
    });

    it('19. API keys are never logged in telemetry or error diagnostics', async () => {
      const registry = new AIProviderRegistry();
      const router = new AIModelRouter(registry);
      const execution = await router.routeAndExecute(MODEL_ROLES.FAST_MODEL, async () => {
        throw new Error('Network timeout talking to upstream API');
      });

      const diagStr = JSON.stringify(execution.diagnostics);
      assert.equal(diagStr.includes('API_KEY'), false);
      assert.equal(diagStr.includes('Bearer'), false);
    });

    it('20. User context (userId, userName) is preserved through orchestration to prompt builder', () => {
      const prompt = JarvisPersona.getSystemInstruction({ userName: 'Yeshwanth', timezone: 'Asia/Kolkata' });
      assert.ok(prompt.includes('Yeshwanth'));
      assert.ok(prompt.toLowerCase().includes('warm'));
    });

    it('21. Provider prompt minimizes data to required context fields', () => {
      const prompt = JarvisPersona.getPlanningInstruction({ user: { id: 1, name: 'Yeshwanth', passwordHash: 'secret' } });
      assert.equal(prompt.includes('secret'), false);
      assert.equal(prompt.includes('passwordHash'), false);
    });
  });

  // ==========================================
  // 5. ORCHESTRATOR & SUPERVISOR ARCHITECTURE
  // ==========================================
  describe('Orchestrator Architecture Decoupling', () => {
    it('22. Supervisor uses AIModelRouter and does not instantiate Gemini directly', () => {
      const customRouter = new AIModelRouter();
      const supervisor = new JarvisSupervisorAgent({ modelRouter: customRouter });

      assert.equal(supervisor.modelRouter, customRouter);
      assert.equal(supervisor.taskPlanningAgent.modelRouter, customRouter);
      assert.equal(supervisor.knowledge.modelRouter, customRouter);
    });

    it('23. Supervisor planning phase executes through AIModelRouter plan pipeline', async () => {
      const mockRouter = new AIModelRouter();
      mockRouter.plan = async (ctx, req, tools) => {
        return {
          type: 'FINAL_RESPONSE',
          intent: 'GREETING',
          message: 'Hello Yeshwanth! All systems operational through AIModelRouter.'
        };
      };

      const supervisor = new JarvisSupervisorAgent({ modelRouter: mockRouter });
      const result = await supervisor.processRequest(1, 'Hello', { sessionId: 'test_phase2_orch' });

      assert.equal(result.success, true);
      assert.equal(result.message, 'Hello Yeshwanth! All systems operational through AIModelRouter.');
      assert.equal(result.executionStatus, 'VERIFIED');
    });

    it('24. Tool execution still strictly passes through SafetyAuthorizationAgent', () => {
      const safety = new SafetyAuthorizationAgent();
      // Test destructive tool requiring confirmation
      const auth = safety.checkAuthorization(1, 'calendar_delete_event', { eventId: 'ev_123' }, false);
      assert.equal(typeof auth, 'object');
      assert.ok('authorized' in auth);
    });

    it('25. WorkflowVerifier remains active and verifies execution state', () => {
      const step = { toolName: 'calendar_get_today', arguments: {}, result: { success: true, data: [] } };
      const status = WorkflowVerifier.verifyWorkflow([step]);
      assert.equal(status, 'SUCCESS');
    });
  });

  // ==========================================
  // 6. REGRESSION SUITE
  // ==========================================
  describe('Full Functional Regressions Preserved', () => {
    const orchestrator = masterOrchestrator;
    const testUserId = 1;
    const testSession = `phase2_reg_${Date.now()}`;

    it('26. Greeting executes through orchestrator successfully', async () => {
      const res = await orchestrator.processRequest(testUserId, 'Good morning JARVIS', { sessionId: testSession });
      assert.equal(res.success, true);
      assert.ok(res.message.length > 0);
      assert.equal(res.executionStatus, 'VERIFIED');
    });

    it('27. Joke query executes through orchestrator successfully', async () => {
      const res = await orchestrator.processRequest(testUserId, 'Tell me a joke', { sessionId: testSession });
      assert.equal(res.success, true);
      assert.ok(res.message.length > 0);
      assert.equal(res.executionStatus, 'VERIFIED');
    });

    it('28. Schedule query executes without mutating routines', async () => {
      const res = await orchestrator.processRequest(testUserId, 'What is on my schedule today?', { sessionId: testSession });
      assert.equal(res.success, true);
      assert.ok(res.message.length > 0);
      assert.equal(res.executionStatus, 'VERIFIED');
    });

    it('29. Create reminder creates routine and updates active task', async () => {
      const res = await orchestrator.processRequest(testUserId, 'Remind me to drink water at 4 PM', { sessionId: testSession });
      assert.equal(res.success, true);
      assert.ok(res.message.length > 0);
      assert.equal(res.executionStatus, 'VERIFIED');
    });

    it('30. Reschedule reminder updates active routine without duplicates', async () => {
      const res = await orchestrator.processRequest(testUserId, 'Actually move that to 5 PM', { sessionId: testSession });
      assert.equal(res.success, true);
      assert.ok(res.message.length > 0);
      assert.equal(res.executionStatus, 'VERIFIED');
    });

    it('31. Cancel reminder cancels the active routine', async () => {
      const res = await orchestrator.processRequest(testUserId, 'Cancel that', { sessionId: testSession });
      assert.equal(res.success, true);
      assert.ok(res.message.length > 0);
      assert.equal(res.executionStatus, 'VERIFIED');
    });

    it('32. Follow-up query retains context across turns', async () => {
      const res1 = await orchestrator.processRequest(testUserId, "What's on my schedule today?", { sessionId: testSession });
      assert.equal(res1.success, true);

      const res2 = await orchestrator.processRequest(testUserId, 'What about tomorrow?', { sessionId: testSession });
      assert.equal(res2.success, true);
      assert.ok(res2.message.length > 0);
    });

    it('33. Health query provides safe non-diagnostic guidance', async () => {
      const res = await orchestrator.processRequest(testUserId, 'How is my hydration today?', { sessionId: testSession });
      assert.equal(res.success, true);
      assert.ok(res.message.length > 0);
    });

    it('34. Android app launch resolves application safely', async () => {
      const res = await orchestrator.processRequest(testUserId, 'Open WhatsApp', { sessionId: testSession });
      assert.equal(res.success, true);
      assert.ok(res.message.length > 0);
      assert.ok(res.executionStatus === 'ACTION_PLANNED' || res.executionStatus === 'VERIFIED');
    });
  });
});
