const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });
const { AIProvider, PROVIDER_CAPABILITIES, PROVIDER_STATUS } = require('./AIProvider');
const { GoogleGenAI } = require('@google/genai');
const { JarvisPersona } = require('../core/JarvisPersona');
const { PlanSchemaValidator } = require('../planning/planSchemaValidator');

class GeminiProvider extends AIProvider {
  constructor(config = {}) {
    super('gemini', config);
    const rawKey = config.apiKey || (process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '');
    this.apiKey = rawKey.replace(/^"|"$/g, '').trim();
    this.modelName = config.modelName || (process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.replace(/^"|"$/g, '').trim() : 'gemini-3.5-flash-lite');
    this.client = null;
    this.lastDiagnostics = null;

    if (this.apiKey && !this.apiKey.includes('your_gemini_api_key')) {
      try {
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err) {
        console.warn('[AI_PROVIDER:GEMINI] Init warning:', err.message);
      }
    }
  }

  getCapabilities() {
    return new Set([
      PROVIDER_CAPABILITIES.TEXT_GENERATION,
      PROVIDER_CAPABILITIES.STRUCTURED_OUTPUT,
      PROVIDER_CAPABILITIES.TOOL_PLANNING,
      PROVIDER_CAPABILITIES.VISION,
      PROVIDER_CAPABILITIES.TRANSCRIPTION,
      PROVIDER_CAPABILITIES.REALTIME_TRANSPORT,
      PROVIDER_CAPABILITIES.OCR,
      PROVIDER_CAPABILITIES.DOCUMENT,
      PROVIDER_CAPABILITIES.SCREEN_ANALYSIS,
      PROVIDER_CAPABILITIES.MULTIMODAL_STREAMING
    ]);
  }

  async _performHealthCheck() {
    if (!this.client || !this.apiKey || this.apiKey.includes('your_gemini_api_key')) {
      this.status = PROVIDER_STATUS.MISCONFIGURED;
      return false;
    }
    return true;
  }

  /**
   * Primary text generation through Gemini
   */
  async generateText(prompt, systemInstruction = '', options = {}) {
    if (!this.client) {
      this.status = PROVIDER_STATUS.UNAVAILABLE;
      return null;
    }

    const candidateModels = Array.from(new Set([
      this.modelName,
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest'
    ].filter(Boolean)));

    const startTime = Date.now();

    for (const model of candidateModels) {
      try {
        const callPromise = this.client.models.generateContent({
          model,
          contents: prompt,
          config: systemInstruction ? { systemInstruction } : undefined
        });

        const timeoutMs = options.timeoutMs || 15000;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout invoking ${model}`)), timeoutMs)
        );

        const response = await Promise.race([callPromise, timeoutPromise]);
        if (response && response.text) {
          const durationMs = Date.now() - startTime;
          this.lastDiagnostics = {
            provider: 'gemini',
            model,
            operation: 'generateText',
            startTime,
            endTime: Date.now(),
            durationMs,
            success: true,
            fallbackUsed: model !== this.modelName
          };
          this.status = PROVIDER_STATUS.AVAILABLE;
          return response.text.trim();
        }
      } catch (err) {
        if (err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'))) {
          this.status = PROVIDER_STATUS.RATE_LIMITED;
        }
        continue;
      }
    }

    this.lastDiagnostics = {
      provider: 'gemini',
      operation: 'generateText',
      success: false,
      durationMs: Date.now() - startTime
    };
    return null;
  }

  /**
   * Real streaming text generation with Gemini SDK generateContentStream
   */
  async generateTextStream(prompt, systemInstruction = '', options = {}, onChunk = null) {
    if (!this.client) {
      this.status = PROVIDER_STATUS.UNAVAILABLE;
      return null;
    }

    const model = this.modelName || 'gemini-3.5-flash-lite';
    let fullText = '';
    const startTime = Date.now();

    try {
      const responseStream = await this.client.models.generateContentStream({
        model,
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
          if (typeof onChunk === 'function') {
            onChunk(chunk.text);
          }
        }
      }

      this.lastDiagnostics = {
        provider: 'gemini',
        model,
        operation: 'generateTextStream',
        durationMs: Date.now() - startTime,
        length: fullText.length,
        streaming: true,
        success: true
      };
      this.status = PROVIDER_STATUS.AVAILABLE;
      return fullText.trim();
    } catch (err) {
      if (err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'))) {
        this.status = PROVIDER_STATUS.RATE_LIMITED;
      } else {
        this.status = PROVIDER_STATUS.TEMPORARILY_FAILED;
      }
      return null;
    }
  }

  /**
   * Conversational response adhering to centralized persona
   */
  async respond(prompt, context = {}) {
    const systemInstruction = context.systemInstruction || JarvisPersona.getSystemInstruction(context);
    const raw = await this.generateText(prompt, systemInstruction, context);
    if (!raw) return null;
    return JarvisPersona.formatSpokenText(raw);
  }

  /**
   * Natural language intent classification and entity extraction
   */
  async understand(text, context = {}) {
    const prompt = `Analyze this user request: "${text}".
Return strict JSON with fields:
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

  /**
   * Plan request into structured plan using Gemini
   */
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

  /**
   * Real speech audio transcription using Gemini inline audio
   */
  async transcribe(audioBuffer) {
    if (!this.client || !audioBuffer || !Buffer.isBuffer(audioBuffer)) {
      return null;
    }
    const startTime = Date.now();
    try {
      const base64Audio = audioBuffer.toString('base64');
      const response = await this.client.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'audio/wav', data: base64Audio } },
              { text: 'Transcribe the speech in this audio exactly. Output only the verbatim transcript text, without preamble, timestamps, or quotes.' }
            ]
          }
        ]
      });

      const transcript = response?.text ? response.text.trim() : null;
      this.lastDiagnostics = {
        provider: 'gemini',
        operation: 'transcribe',
        durationMs: Date.now() - startTime,
        audioBytes: audioBuffer.length,
        success: Boolean(transcript)
      };
      return transcript;
    } catch (err) {
      return null;
    }
  }

  /**
   * Analyze image or camera frame
   */
  /**
   * Universal Multimodal Vision & Image Analysis
   */
  async analyzeImage(imageData, prompt = 'Describe this image clearly in 2 sentences.', options = {}) {
    if (!this.client) return null;
    try {
      let base64Data = '';
      let mimeType = options.mimeType || 'image/jpeg';

      if (Buffer.isBuffer(imageData)) {
        base64Data = imageData.toString('base64');
      } else if (typeof imageData === 'string') {
        if (imageData.startsWith('data:')) {
          const parts = imageData.split(',');
          const mimeMatch = parts[0].match(/data:(.*?);base64/);
          if (mimeMatch) mimeType = mimeMatch[1];
          base64Data = parts[1] || '';
        } else {
          base64Data = imageData;
        }
      } else if (imageData && imageData.data) {
        base64Data = Buffer.isBuffer(imageData.data) ? imageData.data.toString('base64') : imageData.data;
        if (imageData.mimeType) mimeType = imageData.mimeType;
      }

      if (!base64Data) return null;

      const candidateModels = Array.from(new Set([
        this.modelName,
        'gemini-3.5-flash-lite',
        'gemini-flash-latest',
        'gemini-2.5-flash',
        'gemini-3.6-flash'
      ].filter(Boolean)));

      for (const model of candidateModels) {
        try {
          const res = await this.client.models.generateContent({
            model,
            contents: [
              prompt,
              { inlineData: { mimeType, data: base64Data } }
            ]
          });
          if (res?.text) return res.text.trim();
        } catch (mErr) {
          console.warn(`[GeminiProvider] analyzeImage with ${model} failed: ${mErr.message}`);
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  async understandImage(imageData, prompt = 'Analyze this image and detail the main objects, text, and context.', options = {}) {
    return this.analyzeImage(imageData, prompt, options);
  }

  async analyzeScreen(screenData, prompt = 'Analyze this screen capture. Identify active apps, text, notifications, errors, or forms.', options = {}) {
    return this.analyzeImage(screenData, prompt, { ...options, mimeType: options.mimeType || 'image/png' });
  }

  async extractTextFromImage(imageData, options = {}) {
    const prompt = 'Extract all visible text from this image accurately. Preserve layout, table structures, names, numbers, and dates without adding commentary.';
    return this.analyzeImage(imageData, prompt, options);
  }

  async analyzeDocument(docData, mimeType = 'application/pdf', prompt = 'Analyze this document. Extract key facts, dates, entities, and summaries.', options = {}) {
    return this.analyzeImage(docData, prompt, { ...options, mimeType });
  }

  async analyzePdf(pdfData, prompt = 'Summarize and extract key information from this PDF document.', options = {}) {
    return this.analyzeDocument(pdfData, 'application/pdf', prompt, options);
  }

  async understandVideoFrame(frameData, prompt = 'Describe what is happening in this camera frame in real time.', options = {}) {
    return this.analyzeImage(frameData, prompt, options);
  }

  async multimodalResponse(multimodalInput, prompt = '', options = {}) {
    if (!multimodalInput) return this.generateText(prompt, options.systemInstruction);
    const data = multimodalInput.data || multimodalInput.bytes || multimodalInput.base64;
    const mimeType = multimodalInput.mimeType || 'image/jpeg';
    const combinedPrompt = prompt || multimodalInput.prompt || 'Describe this content.';
    return this.analyzeImage(data, combinedPrompt, { ...options, mimeType });
  }

  // ==========================================================
  // REALTIME PROVIDER CONTRACT (Phase 3)
  // ==========================================================

  async createRealtimeSession(options = {}) {
    if (!this.client || !this.apiKey || this.apiKey.includes('your_gemini_api_key')) {
      this.status = PROVIDER_STATUS.MISCONFIGURED;
      throw new Error('Gemini Realtime Live requires a valid configured GEMINI_API_KEY.');
    }

    return {
      provider: 'gemini',
      sessionId: options.sessionId || `gemini_live_${Date.now()}`,
      model: this.modelName,
      status: PROVIDER_STATUS.AVAILABLE,
      createdAt: Date.now()
    };
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

module.exports = GeminiProvider;
module.exports.GeminiProvider = GeminiProvider;
