/**
 * JarvisScreenContext
 * Immutable on-screen awareness representation.
 * Encapsulates the current foreground application, visible text, interactive elements,
 * and semantic entities detected on the Android display.
 */
class JarvisScreenContext {
  constructor({
    currentApplication = '',
    packageName = '',
    screenTitle = '',
    visibleText = [],
    semanticEntities = [],
    interactiveElements = [],
    selectedElement = null,
    focusedElement = null,
    confidence = 1.0,
    source = 'METHOD_CHANNEL_SCREENSHOT',
    timestamp = Date.now()
  } = {}) {
    this.currentApplication = currentApplication;
    this.packageName = packageName;
    this.screenTitle = screenTitle;
    this.visibleText = Array.isArray(visibleText) ? visibleText : [String(visibleText)];
    this.semanticEntities = semanticEntities;
    this.interactiveElements = interactiveElements;
    this.selectedElement = selectedElement;
    this.focusedElement = focusedElement;
    this.confidence = confidence;
    this.source = source;
    this.timestamp = timestamp;
  }

  /**
   * Search visible text for keywords or patterns
   */
  hasText(term) {
    if (!term) return false;
    const clean = String(term).toLowerCase();
    return this.visibleText.some(t => t.toLowerCase().includes(clean));
  }

  /**
   * Extract potential dates or times visible on screen
   */
  extractTemporalMentions() {
    const textJoined = this.visibleText.join(' ');
    const timeMatch = textJoined.match(/\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/gi) || [];
    const dateMatch = textJoined.match(/\b\d{4}-\d{2}-\d{2}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}\b/gi) || [];
    return { times: timeMatch, dates: dateMatch };
  }

  toSummary() {
    return {
      application: this.currentApplication || this.packageName || 'Unknown',
      title: this.screenTitle || '',
      visibleTextSnippet: this.visibleText.join(' ').substring(0, 150),
      elementCount: this.interactiveElements.length,
      confidence: this.confidence,
      source: this.source,
      timestamp: new Date(this.timestamp).toISOString()
    };
  }
}

module.exports = JarvisScreenContext;
