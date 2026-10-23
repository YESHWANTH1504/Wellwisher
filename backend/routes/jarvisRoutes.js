const express = require('express');
const router = express.Router();
const multer = require('multer');
const { masterOrchestrator } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const { aiProviderRegistry } = require('../services/jarvis/providers/AIProviderRegistry');
const { aiModelRouter } = require('../services/jarvis/providers/AIModelRouter');
const { verifyToken } = require('../middleware/authMiddleware');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const { AiProactiveEventRepository } = require('../repositories/ai/aiProactiveEventRepository');
const aiWorkflowRepository = require('../repositories/ai/aiWorkflowRepository');
const { MultimodalInput, MULTIMODAL_INPUT_TYPES } = require('../services/jarvis/multimodal/MultimodalInput');
const { multimodalContextManager } = require('../services/jarvis/multimodal/MultimodalContextManager');
const MultimodalPromptGuard = require('../services/jarvis/multimodal/MultimodalPromptGuard');
const HealthVisualSafetyGuard = require('../services/jarvis/multimodal/HealthVisualSafetyGuard');
const pool = require('../config/db');

// Multer memory storage with 20MB limit (temporary in-memory only, no leaked files on disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

// All routes require authentication
router.use(verifyToken);

function getAuthenticatedUserId(req, res) {
  const userId = req.userId || req.user?.id;
  if (!userId) {
    res.status(401).json({
      success: false,
      errorCode: 'UNAUTHORIZED',
      error: 'Authenticated user ID is required to access JARVIS.'
    });
    return null;
  }
  return userId;
}

// 1. POST /api/jarvis/session - Start or resume a session
router.post('/session', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const session = masterOrchestrator.createSession(userId, req.body.metadata || {});
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /api/jarvis/message - Process natural language message
router.post('/message', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { message, sessionId, timezone, source, healthContext, healthGoals, userName, multimodalInput } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message payload is required' });
  }

  try {
    const resolvedUserName = userName || req.userName || req.user?.name || null;
    const result = await masterOrchestrator.process(userId, message, {
      sessionId,
      timezone: timezone || 'UTC',
      source: source || (multimodalInput ? 'CAMERA' : 'TEXT'),
      healthContext: healthContext || null,
      healthGoals: healthGoals || null,
      userName: resolvedUserName,
      multimodalInput: multimodalInput || null
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2b. POST /api/jarvis/context/schedule-sync - Ingest lightweight schedule change event into working context
router.post('/context/schedule-sync', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { event, action, scheduleId, title, previousTime, newTime, date, sessionId } = req.body || {};
  masterOrchestrator.recordContextEvent(userId, sessionId, {
    type: 'SCHEDULE_CHANGED',
    event: event || 'SCHEDULE_CHANGED',
    action: action || 'UPDATED',
    scheduleId,
    title,
    previousTime,
    newTime,
    date,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, recorded: true });
});

// 2c. POST /api/jarvis/health/sync - Ingest authoritative Health Connect metrics and permissions
router.post('/health/sync', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const body = req.body || {};
  const metrics = body.metrics || body;
  const permissions = body.permissions || (body.metrics ? body.metrics.permissions : null);
  const date = body.date || (body.metrics ? body.metrics.date : null);

  try {
    const defaultHealthConnectRepository = require('../repositories/ai/healthConnectRepository');
    defaultHealthConnectRepository.syncDeviceHealth(userId, { ...(metrics || {}), date }, permissions);
    res.json({ success: true, synced: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/jarvis/voice - Process voice audio/transcript
router.post('/voice', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { transcript, text, sessionId, timezone, healthContext, healthGoals } = req.body;
  const utterance = (transcript || text || '').trim();
  if (!utterance) {
    return res.status(400).json({ success: false, error: 'Voice transcript is required' });
  }

  try {
    const result = await masterOrchestrator.process({
      userId,
      transcript: utterance,
      sessionId,
      source: 'FOREGROUND_VOICE',
      context: {
        timezone: timezone || 'UTC',
        healthContext: healthContext || null,
        healthGoals: healthGoals || null
      }
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /api/jarvis/action - Execute an explicit confirmed or direct action
router.post('/action', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { action, arguments: args, sessionId } = req.body;
  if (!action) {
    return res.status(400).json({ success: false, error: 'Action is required' });
  }

  try {
    const result = await masterOrchestrator.process(userId, action, {
      sessionId,
      explicitArgs: args
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST /api/jarvis/action/verify - Verify native device action result
router.post('/action/verify', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { sessionId, action, packageName, appName, nativeResult } = req.body;
  try {
    const result = await masterOrchestrator.verifyNativeAction(userId, sessionId, {
      action,
      packageName,
      appName,
      nativeResult
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST /api/jarvis/confirm - Confirm a pending authorization action
router.post('/confirm', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { confirmationId, sessionId } = req.body;
  try {
    const result = await masterOrchestrator.confirmAction(userId, confirmationId, { sessionId });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST /api/jarvis/cancel - Cancel an active or pending action
router.post('/cancel', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { sessionId } = req.body;
  const result = masterOrchestrator.cancelAction(userId, sessionId);
  res.json({ success: true, ...result });
});

// 8. POST /api/jarvis/interrupt - Handle speech barge-in / stop
router.post('/interrupt', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { sessionId } = req.body;
  const result = masterOrchestrator.interrupt(sessionId);
  res.json({ success: true, ...result });
});

// --- Phase 7 Autonomous Action, Audit & Task Lifecycle Endpoints ---
const { ActionPlan, ActionStep } = require('../services/jarvis/actions/ActionPlan');
const AgentExecutionEngine = require('../services/jarvis/actions/AgentExecutionEngine');
const actionAuditLogger = require('../services/jarvis/actions/ActionAuditLogger');
const { activeTaskManager } = require('../services/jarvis/tasks/ActiveTaskManager');
const { PermissionManager } = require('../services/jarvis/actions/PermissionManager');
const executionEngine = new AgentExecutionEngine();

// GET /api/jarvis/actions/audit - Retrieve action audit log history (redacted, tenant-isolated)
router.get('/actions/audit', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const limit = parseInt(req.query.limit, 10) || 20;
  const history = await actionAuditLogger.getAuditHistory(userId, limit);
  res.json({ success: true, history });
});

// GET /api/jarvis/actions/active - Retrieve current active task lifecycle state
router.get('/actions/active', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const sessionId = req.query.sessionId || `session_${userId}_default`;
  const task = activeTaskManager.getActiveTask(sessionId, userId)
    || await activeTaskManager.loadActiveTask(sessionId, userId);
  res.json({ success: true, task: task || null });
});

// POST /api/jarvis/actions/execute-plan - Directly execute a structured ActionPlan through the pipeline
router.post('/actions/execute-plan', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const { plan, permissions, isConfirmed } = req.body;
    if (!plan || !plan.goal || !Array.isArray(plan.steps)) {
      return res.status(400).json({ success: false, error: 'Valid ActionPlan object is required' });
    }

    const actionPlan = new ActionPlan({
      ...plan,
      userId,
      sessionId: plan.sessionId || `session_${userId}_default`
    });

    if (isConfirmed) {
      actionPlan.markConfirmed(req.body.confirmationToken || 'user_token');
    }

    const executionResult = await executionEngine.executePlan(actionPlan, {
      permissions: permissions || {},
      userId
    });

    res.json(executionResult);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jarvis/actions/recover - Recover interrupted task following process restart
router.post('/actions/recover', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const sessionId = req.body.sessionId || `session_${userId}_default`;
  const recoveredTask = await activeTaskManager.recoverTaskSafely(sessionId, userId);
  res.json({ success: true, task: recoveredTask });
});

// GET /api/jarvis/permissions - Query unified permission state and explanations
router.get('/permissions', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  res.json({
    success: true,
    trackedPermissions: [
      'CAMERA', 'MICROPHONE', 'NOTIFICATIONS', 'EXACT_ALARM',
      'CONTACTS', 'PHONE', 'SMS', 'ACCESSIBILITY', 'SCREEN_CAPTURE'
    ]
  });
});

// 9. GET /api/jarvis/history - Retrieve persistent command history
router.get('/history', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const history = masterOrchestrator.getCommandHistory(userId, req.query);
  res.json({ success: true, history });
});

// 10. Context Endpoints (Phase 5)
// GET /api/jarvis/context - Retrieve unified context snapshot with provenance
router.get('/context', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const snapshot = await masterOrchestrator.supervisor.personalContext.buildContextSnapshot(userId, {
      timezone: req.query.timezone || 'UTC',
      sessionId: req.query.sessionId
    });
    res.json({ success: true, context: snapshot, data: snapshot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jarvis/context/refresh - Refresh context snapshot with live device state
router.post('/context/refresh', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const snapshot = await masterOrchestrator.supervisor.personalContext.buildContextSnapshot(userId, {
      timezone: req.body.timezone || 'UTC',
      sessionId: req.body.sessionId,
      batteryLevel: req.body.batteryLevel,
      isCharging: req.body.isCharging,
      screenState: req.body.screenState,
      isLocked: req.body.isLocked,
      network: req.body.network
    });
    res.json({ success: true, context: snapshot, data: snapshot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10.1 Memory Endpoints (Phase 5)
// GET /api/jarvis/memory - Retrieve durable long-term memories + active working memory
router.get('/memory', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const memories = await AiMemoryRepository.getMemoriesByUser(userId, { limit: 50 });
    const sessionId = req.query.sessionId || `session_${userId}_default`;
    const workingMemory = masterOrchestrator.getSessionMemory(userId, sessionId);
    const sessionVal = workingMemory ? (workingMemory.session || null) : null;
    res.json({
      success: true,
      memories,
      data: memories,
      workingMemory,
      memory: { session: sessionVal, workingMemory }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jarvis/memory - Create new explicit memory
router.post('/memory', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const memoryKey = req.body.memoryKey || req.body.key;
  const memoryValue = req.body.memoryValue || req.body.value;
  const memoryType = req.body.memoryType || req.body.type || 'USER_PREFERENCE';
  const source = req.body.source || 'USER_EXPLICIT';
  const importance = req.body.importance || 3;
  const confidenceScore = req.body.confidenceScore || 1.0;

  if (!memoryKey || !memoryValue) {
    return res.status(400).json({ success: false, error: 'memoryKey and memoryValue are required.' });
  }

  try {
    const memory = await AiMemoryRepository.createMemory(userId, {
      memoryKey,
      memoryValue,
      memoryType,
      source,
      importance,
      confidenceScore
    });
    res.status(201).json({ success: true, memory, data: memory });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/jarvis/memory/:id - Update existing memory
router.patch('/memory/:id', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { id } = req.params;
  const memoryValue = req.body.memoryValue || req.body.value;
  const importance = req.body.importance;
  const confidenceScore = req.body.confidenceScore;

  try {
    const updated = await AiMemoryRepository.updateMemory(id, userId, {
      memoryValue,
      importance,
      confidenceScore
    });
    res.json({ success: Boolean(updated) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/jarvis/memory/:id - Delete memory
router.delete('/memory/:id', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { id } = req.params;
  try {
    const deleted = await AiMemoryRepository.deleteMemory(id, userId);
    res.json({ success: Boolean(deleted) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10.2 Proactive Feed Endpoints (Phase 5)
// GET /api/jarvis/proactive - Retrieve active proactive suggestions and alerts
router.get('/proactive', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const feed = await AiProactiveEventRepository.getActiveFeed(userId, { limit: 30 });
    res.json({ success: true, feed, data: feed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jarvis/proactive - Create new proactive event
router.post('/proactive', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { eventType, priority, title, message, metadata } = req.body;
  if (!eventType || !title) {
    return res.status(400).json({ success: false, error: 'eventType and title are required' });
  }

  try {
    const event = await AiProactiveEventRepository.createEvent(userId, {
      eventType,
      priority: priority || 'MEDIUM',
      title,
      message: message || '',
      metadata: metadata || {}
    });
    res.status(201).json({ success: true, event, data: event });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jarvis/proactive/ack - Acknowledge, dismiss or act on proactive event
router.post('/proactive/ack', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { eventId, action } = req.body;
  if (!eventId) {
    return res.status(400).json({ success: false, error: 'eventId is required' });
  }

  const targetStatus = action === 'DISMISS' ? 'DISMISSED' : (action === 'ACT' ? 'ACTED' : 'DELIVERED');
  try {
    const updated = await AiProactiveEventRepository.updateStatus(eventId, userId, targetStatus);
    res.json({ success: true, event: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jarvis/briefing - Trigger or fetch daily morning briefing
router.post('/briefing', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const briefing = await masterOrchestrator.supervisor.personalContext.generateMorningBriefing(userId, {
      force: req.body.force === true,
      respectQuietHours: req.body.respectQuietHours !== false
    });
    res.json({ success: true, ...briefing, data: briefing });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10.3 Autonomous Workflow Endpoints (Phase 5)
// GET /api/jarvis/workflows - List registered workflows
router.get('/workflows', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const workflows = await aiWorkflowRepository.getWorkflowActions(userId);
    res.json({ success: true, workflows, data: workflows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jarvis/workflows - Create a new autonomous workflow
router.post('/workflows', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { actionType, entityType, entityId, payload, requiresConfirmation, idempotencyKey } = req.body;
  if (!actionType || !entityType) {
    return res.status(400).json({ success: false, error: 'actionType and entityType are required.' });
  }

  try {
    const workflow = await aiWorkflowRepository.createWorkflowAction(userId, {
      actionType,
      entityType,
      entityId,
      payload: payload || {},
      requiresConfirmation: requiresConfirmation !== false,
      idempotencyKey
    });
    res.status(201).json({ success: true, workflow, data: workflow });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/jarvis/workflows/:id - Update workflow status
router.patch('/workflows/:id', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { id } = req.params;
  const { status, result } = req.body;
  try {
    const updated = await aiWorkflowRepository.updateWorkflowActionStatus(userId, id, status, result);
    res.json({ success: true, workflow: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/jarvis/workflows/:id - Delete workflow
router.delete('/workflows/:id', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM ai_workflow_actions WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. GET /api/jarvis/capabilities - Retrieve registered tool capabilities
router.get('/capabilities', (req, res) => {
  const capabilities = masterOrchestrator.getCapabilities();
  res.json({ success: true, capabilities });
});

// 12. GET /api/jarvis/providers - Check health and status of configured AI providers
router.get('/providers', async (req, res) => {
  try {
    const status = await aiProviderRegistry.getHealthStatus();
    res.json({ success: true, providers: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. GET /api/jarvis/state - Retrieve current active state
router.get('/state', (req, res) => {
  res.json({
    success: true,
    state: 'READY',
    companion: 'JARVIS',
    timestamp: new Date().toISOString()
  });
});

// 14. Realtime Voice Endpoints
const { defaultRealtimeProviderAdapter } = require('../services/jarvis/realtime/RealtimeProviderAdapter');

// POST /api/jarvis/realtime/session - Initialize authenticated realtime session
router.post('/realtime/session', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { deviceId, sessionId } = req.body;
  try {
    const session = defaultRealtimeProviderAdapter.createSession({ userId, deviceId, sessionId });
    res.json({
      success: true,
      sessionId: session.sessionId,
      state: session.state,
      createdAt: session.createdAt
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jarvis/realtime/audio - Stream PCM chunk from microphone
router.post('/realtime/audio', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { sessionId, pcmBase64 } = req.body;
  if (!sessionId || !pcmBase64) {
    return res.status(400).json({ success: false, error: 'sessionId and pcmBase64 are required' });
  }

  try {
    const pcmBuffer = Buffer.from(pcmBase64, 'base64');
    const pushed = defaultRealtimeProviderAdapter.pushAudioChunk(sessionId, userId, pcmBuffer);
    const state = defaultRealtimeProviderAdapter.getSessionState(sessionId, userId);
    res.json({ success: pushed, state });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/jarvis/realtime/interrupt - Trigger speech barge-in
router.post('/realtime/interrupt', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { sessionId, reason } = req.body;
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'sessionId is required' });
  }

  const interrupted = defaultRealtimeProviderAdapter.interrupt(sessionId, userId, reason || 'Client barge-in');
  res.json({ success: interrupted, state: 'INTERRUPTED' });
});

// GET /api/jarvis/realtime/status - Query session state
router.get('/realtime/status', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { sessionId } = req.query;
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'sessionId is required' });
  }

  const state = defaultRealtimeProviderAdapter.getSessionState(sessionId, userId);
  res.json({ success: Boolean(state), state });
});

// DELETE /api/jarvis/realtime/session - Close session
router.delete('/realtime/session', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'sessionId is required' });
  }

  const closed = defaultRealtimeProviderAdapter.disconnectSession(sessionId, userId);
  res.json({ success: closed });
});

// ==========================================================
// PHASE 6: MULTIMODAL, VISION, CAMERA & DOCUMENT REST APIS
// ==========================================================

// Helper: Normalize incoming multimodal image/document payload
function extractMultimodalPayload(req) {
  let data = null;
  let mimeType = 'image/jpeg';
  let type = MULTIMODAL_INPUT_TYPES.CAMERA_IMAGE;
  let filename = 'capture.jpg';

  if (req.file) {
    data = req.file.buffer.toString('base64');
    mimeType = req.file.mimetype || 'image/jpeg';
    filename = req.file.originalname || 'upload.jpg';
    if (mimeType === 'application/pdf') {
      type = MULTIMODAL_INPUT_TYPES.PDF;
    } else {
      type = MULTIMODAL_INPUT_TYPES.GALLERY_IMAGE;
    }
  } else if (req.body.imageData || req.body.base64 || req.body.data) {
    const raw = req.body.imageData || req.body.base64 || req.body.data;
    if (typeof raw === 'string' && raw.startsWith('data:')) {
      const parts = raw.split(';base64,');
      mimeType = parts[0].replace('data:', '') || 'image/jpeg';
      data = parts[1] || '';
    } else {
      data = raw;
      mimeType = req.body.mimeType || 'image/jpeg';
    }
    type = req.body.type || (mimeType === 'application/pdf' ? MULTIMODAL_INPUT_TYPES.PDF : MULTIMODAL_INPUT_TYPES.CAMERA_IMAGE);
    filename = req.body.filename || (mimeType === 'application/pdf' ? 'document.pdf' : 'capture.jpg');
  }

  return { data, mimeType, type, filename };
}

// 1. POST /api/jarvis/vision/analyze - Image / Camera Understanding
router.post('/vision/analyze', upload.single('file'), async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const sessionId = req.body.sessionId || `session_${userId}_${Date.now()}`;
  const requestId = req.body.requestId || `req_vis_${Date.now()}`;
  const prompt = req.body.prompt || 'Describe this image and identify all key objects, visible text, or important details.';
  const payload = extractMultimodalPayload(req);

  // If no payload provided, check active session visual context
  let activeData = payload.data;
  let activeMime = payload.mimeType;
  let activeType = payload.type;

  if (!activeData) {
    const activeCtx = multimodalContextManager.getActiveContext(userId, sessionId);
    if (activeCtx) {
      activeData = activeCtx.data;
      activeMime = activeCtx.mimeType || 'image/jpeg';
      activeType = activeCtx.type || MULTIMODAL_INPUT_TYPES.CAMERA_IMAGE;
    }
  }

  if (!activeData) {
    return res.status(400).json({
      success: false,
      requestId,
      error: 'No image data provided and no active visual context found.'
    });
  }

  try {
    // Validate multimodal input
    const mmInput = new MultimodalInput({
      userId,
      sessionId,
      type: activeType,
      source: req.body.source || 'CAMERA',
      mimeType: activeMime,
      data: activeData,
      filename: payload.filename
    });
    mmInput.validate();

    // Guard against prompt injection
    const guardedPrompt = MultimodalPromptGuard.buildGuardedInstruction(prompt, req.body.contextQuery || '');

    // Execute through router
    const rawAnalysis = await aiModelRouter.understandImage(activeData, guardedPrompt, { mimeType: activeMime });
    if (!rawAnalysis) {
      return res.status(502).json({
        success: false,
        requestId,
        error: 'Vision provider was unable to analyze this image.'
      });
    }

    const cleanOutput = MultimodalPromptGuard.sanitizeOutput(rawAnalysis);
    const isClinical = HealthVisualSafetyGuard.isClinicalContent(prompt + ' ' + cleanOutput);
    const safeAnswer = HealthVisualSafetyGuard.sanitizeVisualClinicalResponse(cleanOutput, isClinical);

    // Save into active context for multi-turn follow-ups
    multimodalContextManager.setActiveContext(userId, sessionId, {
      data: activeData,
      mimeType: activeMime,
      type: activeType,
      lastObservation: safeAnswer,
      storedAt: Date.now()
    });

    res.json({
      success: true,
      requestId,
      modality: activeType,
      answer: safeAnswer,
      confidence: 0.95,
      sources: [{ source: req.body.source || 'CAMERA', timestamp: new Date().toISOString() }],
      extractedText: cleanOutput,
      observations: safeAnswer,
      warnings: isClinical ? ['Observation only. Does not replace professional medical evaluation.'] : [],
      actions: [],
      requiresConfirmation: false,
      provenance: {
        provider: 'Gemini',
        model: 'gemini-3.5-flash-lite',
        source: req.body.source || 'CAMERA',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, requestId, error: err.message });
  }
});

// 2. POST /api/jarvis/vision/ocr - Real Text Extraction
router.post('/vision/ocr', upload.single('file'), async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const sessionId = req.body.sessionId || `session_${userId}_${Date.now()}`;
  const requestId = req.body.requestId || `req_ocr_${Date.now()}`;
  const payload = extractMultimodalPayload(req);

  let activeData = payload.data;
  let activeMime = payload.mimeType;

  if (!activeData) {
    const activeCtx = multimodalContextManager.getActiveContext(userId, sessionId);
    if (activeCtx) {
      activeData = activeCtx.data;
      activeMime = activeCtx.mimeType || 'image/jpeg';
    }
  }

  if (!activeData) {
    return res.status(400).json({
      success: false,
      requestId,
      error: 'No image provided for text extraction.'
    });
  }

  try {
    const extracted = await aiModelRouter.extractText(activeData, { mimeType: activeMime });
    if (!extracted) {
      return res.json({
        success: true,
        requestId,
        modality: 'OCR',
        answer: 'No legible text was detected in this image.',
        extractedText: '',
        confidence: 0.0
      });
    }

    const cleanText = MultimodalPromptGuard.sanitizeOutput(extracted);

    res.json({
      success: true,
      requestId,
      modality: 'OCR',
      answer: cleanText,
      confidence: 0.96,
      sources: [{ source: req.body.source || 'IMAGE_OCR', timestamp: new Date().toISOString() }],
      extractedText: cleanText,
      observations: cleanText,
      warnings: [],
      actions: [],
      requiresConfirmation: false,
      provenance: {
        provider: 'Gemini',
        model: 'gemini-3.5-flash-lite',
        source: 'OCR',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, requestId, error: err.message });
  }
});

// 3. POST /api/jarvis/vision/document - PDF and Document Analysis
router.post('/vision/document', upload.single('file'), async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const sessionId = req.body.sessionId || `session_${userId}_${Date.now()}`;
  const requestId = req.body.requestId || `req_doc_${Date.now()}`;
  const prompt = req.body.prompt || 'Summarize this document and list all critical dates, names, or action items.';
  const payload = extractMultimodalPayload(req);

  if (!payload.data) {
    return res.status(400).json({ success: false, requestId, error: 'Document file or base64 data required.' });
  }

  try {
    const guardedPrompt = MultimodalPromptGuard.buildGuardedInstruction(prompt, 'Document analysis');
    const docAnalysis = await aiModelRouter.analyzeDocument(payload.data, payload.mimeType, guardedPrompt);

    if (!docAnalysis) {
      return res.status(502).json({ success: false, requestId, error: 'Unable to analyze document.' });
    }

    const cleanAnswer = MultimodalPromptGuard.sanitizeOutput(docAnalysis);

    res.json({
      success: true,
      requestId,
      modality: 'DOCUMENT',
      answer: cleanAnswer,
      confidence: 0.95,
      sources: [{ source: payload.filename, timestamp: new Date().toISOString() }],
      extractedText: cleanAnswer,
      observations: cleanAnswer,
      warnings: [],
      actions: [],
      requiresConfirmation: false,
      provenance: {
        provider: 'Gemini',
        model: 'gemini-3.5-flash-lite',
        source: payload.filename,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, requestId, error: err.message });
  }
});

// 4. POST /api/jarvis/vision/screen - Screenshot and Screen Context Analysis
router.post('/vision/screen', upload.single('file'), async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const sessionId = req.body.sessionId || `session_${userId}_${Date.now()}`;
  const requestId = req.body.requestId || `req_scr_${Date.now()}`;
  const prompt = req.body.prompt || 'Analyze this screen. Describe the open app, visible notifications, errors, or forms.';
  const payload = extractMultimodalPayload(req);

  let screenData = payload.data;
  if (!screenData) {
    const activeCtx = multimodalContextManager.getActiveContext(userId, sessionId);
    if (activeCtx && activeCtx.type === MULTIMODAL_INPUT_TYPES.SCREENSHOT) {
      screenData = activeCtx.data;
    }
  }

  if (!screenData) {
    return res.status(400).json({ success: false, requestId, error: 'Screenshot data required.' });
  }

  try {
    const guardedPrompt = MultimodalPromptGuard.buildGuardedInstruction(prompt, 'Screen analysis');
    const screenAnalysis = await aiModelRouter.analyzeScreen(screenData, guardedPrompt);

    if (!screenAnalysis) {
      return res.status(502).json({ success: false, requestId, error: 'Screen analysis failed.' });
    }

    const cleanOutput = MultimodalPromptGuard.sanitizeOutput(screenAnalysis);

    // Save into active context
    multimodalContextManager.setActiveContext(userId, sessionId, {
      data: screenData,
      mimeType: payload.mimeType || 'image/png',
      type: MULTIMODAL_INPUT_TYPES.SCREENSHOT,
      lastObservation: cleanOutput,
      storedAt: Date.now()
    });

    res.json({
      success: true,
      requestId,
      modality: 'SCREENSHOT',
      answer: cleanOutput,
      confidence: 0.95,
      sources: [{ source: 'ANDROID_SCREENSHOT', timestamp: new Date().toISOString() }],
      extractedText: cleanOutput,
      observations: cleanOutput,
      warnings: ['Screen analysis is read-only. No UI actions will be executed automatically.'],
      actions: [],
      requiresConfirmation: false,
      provenance: {
        provider: 'Gemini',
        model: 'gemini-3.5-flash-lite',
        source: 'SCREENSHOT',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, requestId, error: err.message });
  }
});

// 5. POST /api/jarvis/vision/multimodal - Unified Multimodal Ingestion & Query
router.post('/vision/multimodal', upload.single('file'), async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const sessionId = req.body.sessionId || `session_${userId}_${Date.now()}`;
  const requestId = req.body.requestId || `req_mm_${Date.now()}`;
  const query = req.body.query || req.body.prompt || 'What is this?';
  const payload = extractMultimodalPayload(req);

  try {
    const mmInput = new MultimodalInput({
      userId,
      sessionId,
      type: payload.type,
      source: req.body.source || 'CAMERA',
      mimeType: payload.mimeType,
      data: payload.data,
      filename: payload.filename
    });

    const result = await masterOrchestrator.process(userId, query, {
      sessionId,
      source: 'CAMERA',
      multimodalInput: mmInput
    });

    res.json({
      success: true,
      requestId,
      modality: payload.type,
      answer: result.speech || result.message,
      confidence: 0.95,
      sources: [{ source: req.body.source || 'MULTIMODAL', timestamp: new Date().toISOString() }],
      extractedText: result.extractedText || result.message,
      observations: result.message,
      warnings: [],
      actions: result.steps || [],
      requiresConfirmation: false,
      provenance: result.provenance || {
        provider: 'Gemini',
        model: 'gemini-3.5-flash-lite',
        source: req.body.source || 'MULTIMODAL',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, requestId, error: err.message });
  }
});

// 6. GET /api/jarvis/vision/context - Query active visual session context
router.get('/vision/context', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const sessionId = req.query.sessionId || 'default';
  const activeCtx = multimodalContextManager.getActiveContext(userId, sessionId);

  res.json({
    success: true,
    hasActiveContext: Boolean(activeCtx),
    contextSummary: activeCtx ? {
      type: activeCtx.type,
      source: activeCtx.source,
      mimeType: activeCtx.mimeType,
      storedAt: activeCtx.storedAt,
      lastObservation: activeCtx.lastObservation || null
    } : null
  });
});

// 7. DELETE /api/jarvis/vision/context - Forget/Clear active visual context
router.delete('/vision/context', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const sessionId = req.body.sessionId || req.query.sessionId || 'default';
  const cleared = multimodalContextManager.clearContext(userId, sessionId);

  res.json({
    success: true,
    cleared,
    message: cleared ? 'Vision context explicitly cleared' : 'No active vision context found'
  });
});

// ============================================================================
// PHASE 7: JARVIS OS CORE & UNIVERSAL INTELLIGENCE FABRIC ENDPOINTS
// ============================================================================

const { defaultOSCore, JarvisRequest } = require('../services/jarvis/os/JarvisOSCore');
const { defaultCapabilityRegistry } = require('../services/jarvis/os/JarvisCapabilityRegistry');
const { defaultWorldModel } = require('../services/jarvis/os/JarvisWorldModel');

// 8. POST /api/jarvis/os/execute - High-level operating layer execution
router.post('/os/execute', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const jarvisReq = new JarvisRequest({
      ...req.body,
      userId
    });

    const executionResult = await defaultOSCore.execute(jarvisReq);
    res.json(executionResult);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      executionStatus: 'FAILED'
    });
  }
});

// 9. GET /api/jarvis/os/status - Full OS diagnostics probe
router.get('/os/status', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const probe = await defaultOSCore.probe(userId);
    res.json({
      success: true,
      probe
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. GET /api/jarvis/os/capabilities - List registered capabilities across domains
router.get('/os/capabilities', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const domain = req.query.domain || null;
  const capabilities = defaultCapabilityRegistry.listCapabilities(domain);
  res.json({
    success: true,
    count: capabilities.length,
    capabilities: capabilities.map(c => ({
      name: c.name,
      description: c.description,
      domain: c.domain,
      risk: c.risk,
      platform: c.platform,
      availability: c.availability
    }))
  });
});

// 11. GET /api/jarvis/os/world-model - Query semantic entities and relationships
router.get('/os/world-model', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const query = req.query.q || '';
    const entityType = req.query.type || null;
    const entities = await defaultWorldModel.findEntities(userId, query, entityType);
    res.json({
      success: true,
      entities
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// PHASE 8 PERSONAL WORLD MODEL & STATE APIS
// ==========================================

const { defaultConversationState } = require('../services/jarvis/os/JarvisConversationState');
const { defaultSemanticIndex } = require('../services/jarvis/os/JarvisSemanticIndex');
const { defaultMemoryProvenance } = require('../services/jarvis/os/JarvisMemoryProvenance');
const { defaultContextFabric } = require('../services/jarvis/os/JarvisContextFabric');

// 12. GET /api/jarvis/context - Retrieve unified personal context graph
router.get('/context', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const sessionId = req.query.sessionId || `session_${userId}_default`;
    const snapshot = await defaultContextFabric.buildSnapshot(userId, '', { sessionId });
    res.json({ success: true, context: snapshot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. GET /api/jarvis/conversation/state - Get active conversation state
router.get('/conversation/state', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const sessionId = req.query.sessionId || `session_${userId}_default`;
    const state = await defaultConversationState.getOrCreate(sessionId, userId);
    res.json({ success: true, state });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. POST /api/jarvis/conversation/state - Update or lock entity in conversation state
router.post('/conversation/state', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const sessionId = req.body.sessionId || `session_${userId}_default`;
    const { activeEntity, candidates, clear } = req.body;

    if (clear) {
      await defaultConversationState.clear(sessionId, userId);
      return res.json({ success: true, cleared: true });
    }

    if (activeEntity) {
      await defaultConversationState.lockEntity(sessionId, userId, activeEntity);
    }
    if (candidates) {
      await defaultConversationState.setCandidates(sessionId, userId, candidates);
    }

    const state = await defaultConversationState.getOrCreate(sessionId, userId);
    res.json({ success: true, state });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. GET /api/jarvis/entities - Query world model entities
router.get('/entities', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const query = req.query.q || '';
    const type = req.query.type || null;
    const entities = await defaultWorldModel.findEntities(userId, query, type);
    res.json({ success: true, entities });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. GET /api/jarvis/entities/:id - Get entity by ID
router.get('/entities/:id', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const entity = await defaultWorldModel.getEntityById(userId, req.params.id);
    if (!entity) return res.status(404).json({ success: false, error: 'Entity not found' });
    res.json({ success: true, entity });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17. GET /api/jarvis/entities/:id/relations - Get directed relations for entity
router.get('/entities/:id/relations', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const relations = await defaultWorldModel.getRelatedEntities(userId, req.params.id, req.query.relationType || null);
    res.json({ success: true, relations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 18. GET /api/jarvis/search - Semantic personal search
router.get('/search', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const q = req.query.q || '';
    const results = await defaultSemanticIndex.search(userId, q, {
      limit: parseInt(req.query.limit, 10) || 10,
      itemType: req.query.type || null
    });
    res.json({ success: true, query: q, count: results.length, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 19. POST /api/jarvis/memory/correct - Correct or revise personal memory
router.post('/memory/correct', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { memoryKey, newValue, reason } = req.body;
  if (!memoryKey || newValue === undefined) {
    return res.status(400).json({ success: false, error: 'memoryKey and newValue are required' });
  }

  try {
    const result = await defaultMemoryProvenance.correctMemory(userId, memoryKey, String(newValue), { reason });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 20. POST /api/jarvis/memory/forget - Forget/delete personal memory
router.post('/memory/forget', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { memoryKey } = req.body;
  if (!memoryKey) {
    return res.status(400).json({ success: false, error: 'memoryKey is required' });
  }

  try {
    const result = await defaultMemoryProvenance.forgetMemory(userId, memoryKey);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// PHASE 9 UNIVERSAL APP & CAPABILITY ECOSYSTEM APIS
// ==========================================

const { defaultAppRegistry } = require('../services/jarvis/apps/JarvisAndroidAppRegistry');
const { defaultCapabilityResolver } = require('../services/jarvis/os/JarvisCapabilityResolver');

// 21. GET /api/jarvis/apps - List registered applications
router.get('/apps', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const apps = defaultAppRegistry.listApplications();
  res.json({
    success: true,
    count: apps.length,
    apps
  });
});

// 22. POST /api/jarvis/apps/sync - Bulk sync discovered applications from device
router.post('/apps/sync', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { applications } = req.body;
  if (!Array.isArray(applications)) {
    return res.status(400).json({ success: false, error: 'applications array is required' });
  }

  try {
    const synced = await defaultAppRegistry.syncDiscoveredApplications(userId, applications);
    res.json({ success: true, count: synced.length, applications: synced });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 23. GET /api/jarvis/apps/:packageName/capabilities - Get capabilities for an application
router.get('/apps/:packageName/capabilities', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const capabilities = defaultAppRegistry.getCapabilitiesForPackage(req.params.packageName);
  res.json({
    success: true,
    packageName: req.params.packageName,
    count: capabilities.length,
    capabilities
  });
});

// 24. POST /api/jarvis/apps/resolve - Resolve natural language app utterance
router.post('/apps/resolve', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { query, context } = req.body;
  const resolution = defaultAppRegistry.resolveApp(query || '', context || {});
  res.json({ success: true, resolution });
});

// 25. POST /api/jarvis/capabilities/evaluate - Evaluate "Can you do this?" query
router.post('/capabilities/evaluate', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { query } = req.body;
  const result = defaultCapabilityResolver.evaluateCapabilityQuery(query || '');
  res.json({ success: true, result });
});

// ==========================================
// PHASE 11 ANTICIPATORY EXECUTION & PROACTIVE INTELLIGENCE APIS
// ==========================================

const { defaultAnticipationEngine } = require('../services/jarvis/anticipation/JarvisAnticipationEngine');

// 26. GET /api/jarvis/proactive/feed - Get active proactive suggestions feed
router.get('/proactive/feed', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const feed = await defaultAnticipationEngine.getProactiveFeed(userId, limit);
    res.json({ success: true, count: feed.length, feed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 27. POST /api/jarvis/proactive/evaluate - Trigger context evaluation
router.post('/proactive/evaluate', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const results = await defaultAnticipationEngine.evaluateContext(userId, req.body || {});
    res.json({ success: true, count: results.length, decisions: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 28. GET /api/jarvis/proactive/preferences - Get user proactive preferences
router.get('/proactive/preferences', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const preferences = await defaultAnticipationEngine.getUserPreferences(userId);
    res.json({ success: true, preferences });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 29. PUT /api/jarvis/proactive/preferences - Update user proactive preferences
router.put('/proactive/preferences', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const updated = await defaultAnticipationEngine.setUserPreferences(userId, req.body || {});
    res.json({ success: true, preferences: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 30. POST /api/jarvis/proactive/feedback - Record suggestion feedback
router.post('/proactive/feedback', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { suggestionId, feedbackType, reason } = req.body;
  if (!suggestionId || !feedbackType) {
    return res.status(400).json({ success: false, error: 'suggestionId and feedbackType are required' });
  }

  try {
    const result = await defaultAnticipationEngine.recordFeedback(userId, suggestionId, feedbackType, reason);
    res.json({ success: result.success, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 31. GET /api/jarvis/proactive/:id/explain - Explain why a suggestion was made
router.get('/proactive/:id/explain', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const explanation = await defaultAnticipationEngine.explainSuggestion(userId, req.params.id);
    res.json({ success: explanation.success, ...explanation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 32. GET /api/jarvis/proactive/briefing - Get Morning Briefing
router.get('/proactive/briefing', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const briefing = await defaultAnticipationEngine.generateMorningBriefing(userId, req.query || {});
    res.json({ success: true, briefing });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 33. GET /api/jarvis/proactive/recap - Get Evening Recap
router.get('/proactive/recap', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const recap = await defaultAnticipationEngine.generateEveningRecap(userId, req.query || {});
    res.json({ success: true, recap });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Phase 12 On-Device & Offline Intelligence Endpoints ---
const { defaultNetworkState } = require('../services/jarvis/os/JarvisNetworkState');
const { defaultLocalModelRegistry } = require('../services/jarvis/os/JarvisLocalModelRegistry');
const { defaultOfflineOperationQueue } = require('../services/jarvis/os/JarvisOfflineOperationQueue');
const { defaultOfflineSyncEngine } = require('../services/jarvis/os/JarvisOfflineSyncEngine');

// 34. GET /api/jarvis/offline/status - Get offline & hybrid status
router.get('/offline/status', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const networkState = defaultNetworkState.getNetworkState();
    const reachability = defaultNetworkState.getReachability();
    const localModels = defaultLocalModelRegistry.listModels();
    const queueStats = await defaultOfflineOperationQueue.getStats(userId);

    res.json({
      success: true,
      networkState,
      reachability,
      localModels,
      queueStats
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 35. POST /api/jarvis/offline/mode - Toggle offline / network simulation
router.post('/offline/mode', (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { forcedOffline, failProvider } = req.body;
  if (forcedOffline !== undefined) {
    defaultNetworkState.setForcedOffline(forcedOffline);
  }
  if (failProvider) {
    defaultNetworkState.setProviderFailure(failProvider, true);
  }

  res.json({
    success: true,
    networkState: defaultNetworkState.getNetworkState(),
    reachability: defaultNetworkState.getReachability()
  });
});

// 36. POST /api/jarvis/offline/queue - Enqueue safe offline operation
router.post('/offline/queue', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { operation, payload, priority, idempotencyKey } = req.body;
  try {
    const item = await defaultOfflineOperationQueue.enqueue(userId, {
      operation,
      payload,
      priority,
      idempotencyKey
    });
    res.json({ success: true, item });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 37. GET /api/jarvis/offline/queue - List pending offline operations
router.get('/offline/queue', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const items = await defaultOfflineOperationQueue.getPendingOperations(userId, 50);
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 38. POST /api/jarvis/offline/sync - Trigger sync pass
router.post('/offline/sync', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const result = await defaultOfflineSyncEngine.synchronize(userId, req.body || {});
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// PHASE 13 — PRODUCTION HARDENING & RELIABILITY ENDPOINTS
// ============================================================

const { defaultDiagnosticExporter } = require('../services/jarvis/os/JarvisDiagnosticExporter');
const { defaultCrashRecovery } = require('../services/jarvis/os/JarvisCrashRecovery');
const { defaultPermissionStateManager } = require('../services/jarvis/os/JarvisPermissionStateManager');
const { defaultVersionCompatibilityManager } = require('../services/jarvis/os/JarvisVersionCompatibilityManager');
const { defaultDeviceIdentity } = require('../services/jarvis/os/JarvisDeviceIdentity');
const { defaultDataLifecycleManager } = require('../services/jarvis/os/JarvisDataLifecycleManager');

// 39. GET /api/jarvis/diagnostics - Export sanitized diagnostic payload
router.get('/diagnostics', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const diagnostics = await defaultDiagnosticExporter.exportDiagnostics(userId, {
      deviceId: req.headers['x-device-id'] || 'web',
      appVersion: req.headers['x-app-version'] || '1.4.0'
    });
    res.json({ success: true, diagnostics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 40. POST /api/jarvis/recovery/trigger - Run recovery assessment and restore interrupted operations
router.post('/recovery/trigger', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const recoveryReport = await defaultCrashRecovery.recoverInterruptedOperations(userId);
    res.json({ success: true, recovery: recoveryReport });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 41. GET /api/jarvis/permissions - Query permission states & degraded capabilities
router.get('/permissions', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const state = defaultPermissionStateManager.getAllStates(userId);
    res.json({ success: true, ...state });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 42. POST /api/jarvis/permissions/update - Update permission status for user
router.post('/permissions/update', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { permission, status, rationale } = req.body;
  if (!permission || !status) {
    return res.status(400).json({ success: false, error: 'permission and status are required' });
  }

  try {
    const updated = defaultPermissionStateManager.updatePermission(userId, permission, status, rationale);
    res.json({ success: true, permission: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 43. POST /api/jarvis/version/check - Check client/server/schema version compatibility
router.post('/version/check', async (req, res) => {
  const clientVersion = req.body.appVersion || req.headers['x-app-version'] || '1.4.0';
  const compatibility = defaultVersionCompatibilityManager.checkCompatibility(clientVersion);
  res.json({ success: true, ...compatibility });
});

// 44. POST /api/jarvis/data/export - Export all personal JARVIS data (GDPR/CCPA compliant)
router.post('/data/export', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  try {
    const exportBundle = await defaultDataLifecycleManager.exportPersonalData(userId);
    res.json({ success: true, ...exportBundle });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 45. POST /api/jarvis/data/delete - Erase personal JARVIS data permanently
router.post('/data/delete', async (req, res) => {
  const userId = getAuthenticatedUserId(req, res);
  if (!userId) return;

  const { confirmationPhrase } = req.body;
  if (confirmationPhrase !== 'DELETE MY PERSONAL DATA') {
    return res.status(400).json({
      success: false,
      error: 'Explicit confirmation required. Send confirmationPhrase: "DELETE MY PERSONAL DATA"'
    });
  }

  try {
    const deletionSummary = await defaultDataLifecycleManager.deletePersonalData(userId);
    res.json({ success: true, deletion: deletionSummary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;



