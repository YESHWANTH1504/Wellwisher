/**
 * VoiceResponseFormatter
 * Optimizes agent responses for natural human speech (Android TTS / LiveKit streaming audio).
 * Eliminates all markdown asterisks, markdown emphasis markers, hashes, code blocks,
 * list markers, and markdown links, while preserving natural conversational punctuation,
 * numbers, times (e.g. 4:00 PM), and legitimate identifiers (e.g. snake_case, file_name).
 */
class VoiceResponseFormatter {
  /**
   * Robust speech sanitizer eliminating Markdown formatting artifacts
   * while strictly protecting legitimate words, punctuation, times, and numbers.
   *
   * @param {string} text - Raw Markdown or conversational response
   * @returns {string} - Clean, natural spoken English string
   */
  static sanitizeForSpeech(text) {
    if (!text || typeof text !== 'string') {
      return 'Done.';
    }

    let cleaned = text.trim();
    if (!cleaned) {
      return 'Done.';
    }

    // 1. Remove Fenced Code Blocks (```lang ... ```)
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');

    // 2. Convert Markdown Links [Label](URL) -> Label
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 3. Remove Inline Code Backticks `code` -> code
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
    cleaned = cleaned.replace(/`/g, '');

    // 4. Remove JSON / Key-Value Objects ({ ... })
    cleaned = cleaned.replace(/\{[^{}]*\}/g, '');

    // 5. Convert Bullet Points & Numbered Lists into Natural Spoken Pauses
    // E.g. "* Meeting with Arun\n* Call Mom" -> "Meeting with Arun. Call Mom."
    // Support leading whitespace/indentation for nested or indented bullets
    cleaned = cleaned.replace(/^[ \t]*[-•*+][ \t]+/gm, '');
    cleaned = cleaned.replace(/^[ \t]*\d+\.[ \t]+/gm, '');

    // 6. Remove Markdown Headers (### Header -> Header or standalone ###)
    cleaned = cleaned.replace(/^[ \t]*#{1,6}[ \t]+/gm, '');
    cleaned = cleaned.replace(/#+/g, '');

    // 7. Strip Strikethrough (~~text~~ or ~~~text~~~)
    cleaned = cleaned.replace(/~{2,3}([^~\n]+)~{2,3}/g, '$1');
    cleaned = cleaned.replace(/~+/g, '');

    // 8. Strip Markdown Asterisks (*, **, ***) completely
    // Spoken output must NEVER pronounce "asterisk", "astric", or "star"
    cleaned = cleaned.replace(/\*{1,3}(.*?)\*{1,3}/g, '$1');
    cleaned = cleaned.replace(/\*/g, '');

    // 9. Strip Markdown Emphasis Underscores (_text_, __text__, ___text___)
    // IMPORTANT: Do NOT strip underscores inside legitimate words (file_name, snake_case)
    cleaned = cleaned.replace(/(^|[\s(])_{1,3}([^_\n]+?)_{1,3}(?=[\s).,?!;:]|$)/g, '$1$2');
    // Remove isolated or boundary underscores not part of an identifier
    cleaned = cleaned.replace(/(^|[\s])_+/g, '$1');
    cleaned = cleaned.replace(/_+([\s]|$)/g, '$1');

    // 10. Remove Emojis and Extended Pictographs
    cleaned = cleaned.replace(/\p{Extended_Pictographic}/gu, '');
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '');

    // 11. Remove remaining raw structural brackets and pipes (leave legitimate quotes/parentheses)
    cleaned = cleaned.replace(/[\[\]|]/g, '');

    // 12. Convert Newlines to Sentence-Ending Pauses
    const hadNewlines = /\r?\n/.test(cleaned);
    cleaned = cleaned.replace(/\r?\n+/g, '. ');

    // 13. Absolute Zero-Tolerance Safety Verification: No asterisk reaches TTS
    cleaned = cleaned.replace(/\*/g, '');

    // 14. Normalize Whitespace and Punctuation Spacing
    // Merge consecutive punctuation like "..", ".,", ". ." into a single period
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/,\s*,/g, ',');
    cleaned = cleaned.replace(/\.\s*\.+/g, '.');
    cleaned = cleaned.replace(/,\s*\./g, '.');
    cleaned = cleaned.replace(/\s+([.,?!;:])/g, '$1');
    cleaned = cleaned.replace(/([.,?!;:])(?=[A-Za-z])/g, '$1 ');
    cleaned = cleaned.trim();

    if (!cleaned || cleaned === '.' || cleaned === '..') {
      return 'Done.';
    }

    // Ensure multiline lists/schedules end naturally with terminal punctuation
    if (hadNewlines && !/[.?!]$/.test(cleaned)) {
      cleaned += '.';
    }

    return cleaned;
  }

  /**
   * Backward-compatible alias for sanitizeForSpeech
   * @param {string} text
   * @returns {string}
   */
  static formatForSpeech(text) {
    return this.sanitizeForSpeech(text);
  }
}

module.exports = VoiceResponseFormatter;
