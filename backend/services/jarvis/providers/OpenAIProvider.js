const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });
const { AIProvider, PROVIDER_CAPABILITIES, PROVIDER_STATUS } = require('./AIProvider');
const { JarvisPersona } = require('../core/JarvisPersona');
const { PlanSchemaValidator } = require('../planning/planSchemaValidator');

class OpenAIProvider extends AIProvider {
  constructor(config = {}) {
    super('openai', config);
    const rawKey = config.apiKey || (process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : '');
    this.apiKey = rawKey.replace(/^"|"$/g, '').trim();
    this.modelName = config.modelName || (process.env.OPENAI_MODEL ? process.env.OPENAI_MODEL.replace(/^"|"$/g, '').trim() : 'gpt-4o-mini');
  }

  getCapabilities() {
    return new Set([
      PROVIDER_CAPABILITIES.TEXT_GENERATION,
      PROVIDER_CAPABILITIES.STRUCTURED_OUTPUT,
      PROVIDER_CAPABILITIES.TOOL_PLANNING,
      PROVIDER_CAPABILITIES.VISION,
      PROVIDER_CAPABILITIES.REALTIME_TRANSPORT
    ]);
  }

  async _performHealthCheck() {
    if (!this.apiKey || this.apiKey.includes('your_openai_api_key')) {
      this.status = PROVIDER_STATUS.MISCONFIGURED;
      return false;
    }
    return true;
  }

  async generateText(prompt, systemInstruction = '', options = {}) {
    if (!this.apiKey || this.apiKey.includes('your_openai_api_key')) {
      this.status = PROVIDER_STATUS.MISCONFIGURED;
      return null;
    }

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const startTime = Date.now();
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          max_tokens: options.maxTokens || 400,
          temperature: options.temperature || 0.7
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          this.status = PROVIDER_STATUS.RATE_LIMITED;
        } else if (response.status === 401) {
          this.status = PROVIDER_STATUS.MISCONFIGURED;
        }
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() || null;
      if (content) {
        this.status = PROVIDER_STATUS.AVAILABLE;
        this.lastDiagnostics = {
          provider: 'openai',
          model: this.modelName,
          durationMs: Date.now() - startTime,
          success: true
        };
      }
      return content;
    } catch (_) {
      this.status = PROVIDER_STATUS.TEMPORARILY_FAILED;
      return null;
    }
  }

  /**
   * Real streaming text generation via OpenAI Server-Sent Events (SSE)
   */
  async generateTextStream(prompt, systemInstruction = '', options = {}, onChunk = null) {
    if (!this.apiKey || this.apiKey.includes('your_openai_api_key')) {
      this.status = PROVIDER_STATUS.MISCONFIGURED;
      return null;
    }

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          stream: true,
          max_tokens: options.maxTokens || 400,
          temperature: options.temperature || 0.7
        })
      });

      if (!response.ok) return null;

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // preserve uncompleted line

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                if (typeof onChunk === 'function') {
                  onChunk(delta);
                }
              }
            } catch (_) {}
          }
        }
      }

      return fullText;
    } catch (_) {
      return null;
    }
  }

  async respond(prompt, context = {}) {
    const systemInstruction = context.systemInstruction || JarvisPersona.getSystemInstruction(context);
    const raw = await this.generateText(prompt, systemInstruction, context);
    if (!raw) return null;
    return JarvisPersona.formatSpokenText(raw);
  }

  async understand(text, context = {}) {
    const prompt = `Analyze user command: "${text}".
Return strict JSON:
{
  "category": "CONVERSATION|QUESTION|CALENDAR|REMINDER|ALARM|WELLNESS|DEVICE_ACTION|HEALTH|EMERGENCY",
  "intent": string,
  "entities": { "title": string, "time": string, "date": string, "app": string, "contact": string },
  "requiresClarification": boolean,
  "clarificationQuestion": string|null
}`;
    const rawJson = await this.generateText(prompt, JarvisPersona.getPlanningInstruction(context));
    if (!rawJson) return null;
    try {
      const match = rawJson.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    } catch (_) {
      return null;
    }
  }

  async plan(contextPackage = {}, requestText = '', availableTools = []) {
    const raw = (requestText || '').trim();
    const today = contextPackage.today || new Date().toISOString().split('T')[0];
    const toolsSummary = (availableTools || []).map(t => `${t.name}: ${t.description || ''}`).join('\n');

    const prompt = `User request: "${raw}"
Current Date: ${today}
Available Tools:
${toolsSummary || 'None registered'}

Generate a structured execution plan. Return ONLY JSON adhering to one of:
1. Tool plan: {"type":"TOOL_EXECUTION_PLAN","intent":"...","steps":[{"stepNumber":1,"toolName":"...","arguments":{}}],"message":"..."}
2. Direct answer: {"type":"FINAL_RESPONSE","intent":"...","message":"..."}
3. Clarification: {"type":"CLARIFICATION_REQUIRED","intent":"...","message":"...","missingSlot":"..."}
`;

    const systemInstruction = JarvisPersona.getPlanningInstruction(contextPackage);
    const rawOutput = await this.generateText(prompt, systemInstruction);
    if (!rawOutput) return null;

    try {
      const match = rawOutput.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]);
      const validation = PlanSchemaValidator.validate(parsed);
      return validation.valid ? validation.sanitizedPlan : null;
    } catch (_) {
      return null;
    }
  }

  async analyzeImage(imageData, prompt = 'Describe this image clearly in 2 sentences.') {
    if (!this.apiKey || this.apiKey.includes('your_openai_api_key')) return null;
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${imageData}` }
                }
              ]
            }
          ],
          max_tokens: 300
        })
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || null;
    } catch (_) {
      return null;
    }
  }

  // ==========================================================
  // REALTIME PROVIDER CONTRACT (Phase 3)
  // ==========================================================

  async createRealtimeSession(options = {}) {
    if (!this.apiKey || this.apiKey.includes('your_openai_api_key')) {
      this.status = PROVIDER_STATUS.MISCONFIGURED;
      throw new Error('OpenAI Realtime requires a valid OPENAI_API_KEY.');
    }

    // Call OpenAI Realtime session creation endpoint if configured
    try {
      const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-10-01',
          modalities: ['audio', 'text'],
          instructions: JarvisPersona.getSystemInstruction(options)
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI Realtime session endpoint returned ${response.status}`);
      }

      const sessionData = await response.json();
      return {
        provider: 'openai',
        sessionId: sessionData.id || options.sessionId,
        clientSecret: sessionData.client_secret?.value,
        model: sessionData.model,
        expiresAt: sessionData.expires_at
      };
    } catch (err) {
      this.status = PROVIDER_STATUS.TEMPORARILY_FAILED;
      throw err;
    }
  }

  async connectRealtimeSession(sessionId) {
    return true;
  }

  async disconnectRealtimeSession(sessionId) {
    return true;
  }

  async sendAudioChunk(sessionId, audioChunk) {
    return true;
  }

  async sendText(sessionId, text) {
    return true;
  }

  async interruptResponse(sessionId) {
    return true;
  }

  getRealtimeSessionState(sessionId) {
    return this.status;
  }
}

module.exports = OpenAIProvider;
