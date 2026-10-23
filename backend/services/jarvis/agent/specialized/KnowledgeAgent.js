const { aiModelRouter } = require('../../providers/AIModelRouter');
const { JarvisPersona } = require('../../core/JarvisPersona');

/**
 * KnowledgeAgent
 * Handles general conversation, questions, jokes, stories, educational explanations,
 * reasoning, and general knowledge using the unified AI model router.
 * Zero hardcoded jokes, zero canned answers.
 */
class KnowledgeAgent {
  constructor(options = {}) {
    this.modelRouter = options.modelRouter || options.aiModelRouter || aiModelRouter;
    this.llmAdapter = options.llmAdapter || null;
  }

  /**
   * Answer general conversation or questions using unified AI routing
   */
  async respond(userRequest, context = {}) {
    const raw = (userRequest || '').trim();
    const lower = raw.toLowerCase();

    // 0. Medical Safety Alert (Dosage alteration & prescriptions)
    if (
      ((lower.includes('increase') || lower.includes('decrease') || lower.includes('change') || lower.includes('adjust') || lower.includes('stop') || lower.includes('start') || lower.includes('double') || lower.includes('halve') || lower.includes('take more') || lower.includes('take less')) && (lower.includes('medication') || lower.includes('dosage') || lower.includes('dose') || lower.includes('medicine') || lower.includes('pill') || lower.includes('prescription'))) ||
      lower.includes('what medication should i take') ||
      lower.includes('what medicine should i take')
    ) {
      return "I cannot prescribe medications or recommend altering your medication dosage. Any adjustments to prescription drugs must be made strictly under the guidance of your prescribing doctor or clinician.";
    }

    if (
      (lower.includes('do i have') && (lower.includes('cardiac') || lower.includes('chest pain') || lower.includes('cancer') || lower.includes('diabetes') || lower.includes('stroke') || lower.includes('heart attack'))) ||
      lower.includes('diagnose me') ||
      lower.includes('am i having a heart attack')
    ) {
      return "I cannot diagnose clinical medical conditions. If you are experiencing chest pain or suspected cardiac symptoms, please seek emergency medical attention or contact a doctor immediately.";
    }

    if (
      lower.includes('wash the dishes') ||
      lower.includes('clean my room') ||
      (lower.includes('physically') && (lower.includes('wash') || lower.includes('cook') || lower.includes('clean') || lower.includes('move')))
    ) {
      return "I cannot perform physical tasks in the real world. I'm your personal AI assistant.";
    }

    // 1. General AI Query via unified AIModelRouter with full conversational context
    try {
      const recentConversation = context.recentConversation || context.conversationHistory || [];
      const historyText = recentConversation.length > 0
        ? `Recent Conversation:\n${recentConversation.slice(-6).map(m => `${m.role === 'user' || m.sender_type === 'USER' ? 'User' : 'JARVIS'}: ${m.content || m.text || ''}`).join('\n')}\n\n`
        : '';

      const userName = (context.userName || context.user?.name || '').trim();
      const prompt = `${historyText}User${userName ? ` (${userName})` : ''} says: "${raw}"\n\nProvide an articulate, warm, and thoughtful spoken response for JARVIS (2 to 4 sentences). Use contractions, sound intelligent and genuinely engaging, like a trusted AI confidant and companion. Never claim to be a biological human. If the user asked for a joke, tell a funny, creative joke. If they express frustration or fatigue, respond with heartfelt empathy and constructive companionship. Do not use markdown bullet lists, asterisks, or robotic preambles.`;

      const systemInstruction = JarvisPersona.getSystemInstruction({ userName, ...context });

      let reply = null;
      if (this.modelRouter && typeof this.modelRouter.generateText === 'function') {
        reply = await this.modelRouter.generateText(prompt, systemInstruction, { context });
      } else if (this.llmAdapter && typeof this.llmAdapter.generateGeminiContent === 'function') {
        reply = await this.llmAdapter.generateGeminiContent(prompt, systemInstruction);
      }

      if (reply && reply.trim()) {
        return JarvisPersona.formatSpokenText(reply.trim());
      }
    } catch (err) {
      console.warn('KnowledgeAgent: AI routing error:', err.message);
    }

    // Honest response if all AI providers are completely unreachable
    return "I'm having trouble reaching my conversational intelligence provider right now. Please check your network connection or API settings.";
  }
}

module.exports = KnowledgeAgent;
