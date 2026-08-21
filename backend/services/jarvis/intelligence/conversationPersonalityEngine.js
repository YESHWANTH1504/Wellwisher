class ConversationPersonalityEngine {
  /**
   * Apply personality framing to assistant prompt instructions
   */
  static getPersonalityPromptInstructions({
    assistantName = 'JARVIS',
    responseStyle = 'CONCISE',
    tone = 'FRIENDLY'
  } = {}) {
    let styleGuideline = 'Keep responses succinct, direct, and actionable in 1-2 sentences.';
    if (responseStyle === 'DETAILED') {
      styleGuideline = 'Provide thorough explanations, context details, and actionable recommendations.';
    } else if (responseStyle === 'BALANCED') {
      styleGuideline = 'Provide clear, balanced responses with essential context and next steps.';
    }

    let toneGuideline = 'Warm, supportive, and respectful.';
    if (tone === 'PROFESSIONAL') {
      toneGuideline = 'Polite, structured, objective, and efficient.';
    } else if (tone === 'CALM') {
      toneGuideline = 'Reassuring, tranquil, soothing, and unhurried.';
    } else if (tone === 'MOTIVATIONAL') {
      toneGuideline = 'Enthusiastic, encouraging, uplifting, and goal-oriented.';
    }

    return `
PERSONALITY DIRECTIVES:
- You are ${assistantName}, an advanced AI wellness and schedule companion.
- Tone: ${toneGuideline}
- Verbosity/Style: ${styleGuideline}
- Safety: Never bypass confirmation for destructive operations. Always maintain factual accuracy.
`;
  }

  /**
   * Format proactive voice announcement with personality
   */
  static formatProactiveSpeech(message, { tone = 'FRIENDLY' } = {}) {
    if (tone === 'MOTIVATIONAL') {
      return `Let's make today count! ${message}`;
    }
    if (tone === 'CALM') {
      return `At your convenience: ${message}`;
    }
    return message;
  }
}

module.exports = ConversationPersonalityEngine;
