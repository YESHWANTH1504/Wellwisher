/**
 * multimodalTools.js
 * Phase 6 Multimodal & Vision Tools for JARVIS Personal OS
 */

const { RISK_LEVELS } = require('./toolRegistry');
const { aiModelRouter, MODEL_ROLES } = require('../providers/AIModelRouter');
const { multimodalContextManager } = require('../multimodal/MultimodalContextManager');
const VisualMemoryManager = require('../multimodal/VisualMemoryManager');
const MultimodalPromptGuard = require('../multimodal/MultimodalPromptGuard');
const HealthVisualSafetyGuard = require('../multimodal/HealthVisualSafetyGuard');

const multimodalTools = [
  {
    name: 'camera_analyze_current',
    description: 'Analyze the current camera capture or image in front of the user.',
    category: 'vision',
    permissionKey: 'camera_analyze_current',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Question or query about the image' },
        imageData: { type: 'string', description: 'Optional base64 image data' }
      }
    },
    execute: async (context, input = {}) => {
      const sessionId = context.sessionId || 'default';
      const userId = context.userId;
      let activeVisual = null;

      if (input.imageData) {
        activeVisual = {
          data: input.imageData,
          mimeType: 'image/jpeg',
          storedAt: Date.now()
        };
        multimodalContextManager.setActiveContext(userId, sessionId, activeVisual);
      } else {
        activeVisual = multimodalContextManager.getActiveContext(userId, sessionId);
      }

      if (!activeVisual || !activeVisual.data) {
        return {
          success: false,
          hasVisualContext: false,
          message: 'No active camera capture or image context available. Please point the camera and try again.'
        };
      }

      const prompt = input.prompt || 'Describe what you see in this image clearly and concisely.';
      const rawAnalysis = await aiModelRouter.understandImage(activeVisual.data, prompt);

      if (!rawAnalysis) {
        return {
          success: false,
          message: 'Unable to analyze image with the vision provider.'
        };
      }

      const safeAnalysis = HealthVisualSafetyGuard.sanitizeVisualClinicalResponse(
        rawAnalysis,
        HealthVisualSafetyGuard.isClinicalContent(prompt)
      );

      return {
        success: true,
        hasVisualContext: true,
        analysis: safeAnalysis,
        message: safeAnalysis
      };
    }
  },

  {
    name: 'screen_analyze_current',
    description: 'Analyze what is currently displayed on the user screen or captured screenshot.',
    category: 'vision',
    permissionKey: 'screen_analyze_current',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Question about the screen content' },
        screenData: { type: 'string', description: 'Optional base64 screenshot data' }
      }
    },
    execute: async (context, input = {}) => {
      const sessionId = context.sessionId || 'default';
      const userId = context.userId;
      let screenContext = null;

      if (input.screenData) {
        screenContext = {
          data: input.screenData,
          mimeType: 'image/png',
          type: 'SCREENSHOT',
          storedAt: Date.now()
        };
        multimodalContextManager.setActiveContext(userId, sessionId, screenContext);
      } else {
        screenContext = multimodalContextManager.getActiveContext(userId, sessionId);
      }

      if (!screenContext || !screenContext.data) {
        return {
          success: false,
          message: 'No active screen capture or context available.'
        };
      }

      const prompt = input.prompt || 'Analyze this screen capture. Summarize the active application, important text, or any visible errors.';
      const analysis = await aiModelRouter.analyzeScreen(screenContext.data, prompt);

      if (!analysis) {
        return {
          success: false,
          message: 'Unable to analyze screen capture with the vision model.'
        };
      }

      return {
        success: true,
        analysis,
        message: analysis
      };
    }
  },

  {
    name: 'visual_memory_store',
    description: 'Explicitly remember a visual object, desk, medicine, or location seen by the camera.',
    category: 'vision',
    permissionKey: 'visual_memory_store',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['label'],
      properties: {
        label: { type: 'string', description: 'Name or label for the visual entity (e.g. "office desk", "vitamins")' },
        description: { type: 'string', description: 'Detailed visual description' }
      }
    },
    execute: async (context, input = {}) => {
      const userId = context.userId;
      const res = await VisualMemoryManager.saveVisualMemory(userId, {
        label: input.label,
        description: input.description || `Visual memory of ${input.label}`
      });
      return {
        success: true,
        key: res.key,
        message: `I have remembered this as "${input.label}".`
      };
    }
  },

  {
    name: 'visual_memory_recall',
    description: 'Recall an explicitly saved visual memory by label or query.',
    category: 'vision',
    permissionKey: 'visual_memory_recall',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Label or topic of the visual memory' }
      }
    },
    execute: async (context, input = {}) => {
      const userId = context.userId;
      const mem = await VisualMemoryManager.recallVisualMemory(userId, input.query || '');
      if (!mem) {
        return {
          success: false,
          message: `I don't have a visual memory stored for "${input.query || 'that'}".`
        };
      }
      return {
        success: true,
        key: mem.memory_key,
        memoryValue: mem.memory_value,
        message: mem.memory_value
      };
    }
  },

  {
    name: 'visual_context_clear',
    description: 'Clear the active visual or image context from the current session.',
    category: 'vision',
    permissionKey: 'visual_context_clear',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context) => {
      const sessionId = context.sessionId || 'default';
      const userId = context.userId;
      multimodalContextManager.clearContext(userId, sessionId);
      return {
        success: true,
        message: 'Active visual context has been cleared.'
      };
    }
  }
];

module.exports = multimodalTools;
