const { AiPreferenceRepository, VALID_RESPONSE_STYLES } = require('../../../repositories/ai/aiPreferenceRepository');
const { RISK_LEVELS } = require('./toolRegistry');

const preferenceTools = [
  {
    name: 'get_ai_preferences',
    description: 'Retrieve current AI assistant settings, response style, voice toggles, and language preference.',
    category: 'preference',
    permissionKey: 'get_ai_preferences',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context) => {
      const prefs = await AiPreferenceRepository.getPreferences(context.userId);
      return prefs;
    }
  },
  {
    name: 'update_ai_preferences',
    description: 'Update AI persona name, response style, voice output, or language preference (Cannot change security permissions).',
    category: 'preference',
    permissionKey: 'update_ai_preferences',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        assistantName: { type: 'string', description: 'Name of the assistant persona' },
        voiceEnabled: { type: 'boolean', description: 'Enable/disable voice listening' },
        ttsEnabled: { type: 'boolean', description: 'Enable/disable speech synthesis' },
        proactiveAssistanceEnabled: { type: 'boolean', description: 'Enable/disable proactive briefings and suggestions' },
        preferredResponseStyle: { type: 'string', enum: VALID_RESPONSE_STYLES, description: 'CONCISE, DETAILED, ELDERLY_AFFECTIONATE, PROFESSIONAL' },
        languagePreference: { type: 'string', description: 'Language code e.g. "en-US", "ta-IN", "hi-IN", "es-ES"' }
      }
    },
    execute: async (context, input) => {
      const updated = await AiPreferenceRepository.updatePreferences(context.userId, {
        assistantName: input.assistantName,
        voiceEnabled: input.voiceEnabled,
        ttsEnabled: input.ttsEnabled,
        proactiveAssistanceEnabled: input.proactiveAssistanceEnabled,
        preferredResponseStyle: input.preferredResponseStyle,
        languagePreference: input.languagePreference
      });

      return {
        updatedPreferences: updated,
        message: 'AI preferences updated successfully.'
      };
    }
  }
];

module.exports = preferenceTools;
