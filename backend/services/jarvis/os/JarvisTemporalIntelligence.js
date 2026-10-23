/**
 * JarvisTemporalIntelligence
 * Deterministic temporal parsing and anchor resolution layer.
 * Parses relative temporal expressions, relative offsets, and anchored references
 * without relying on cloud LLM guesses.
 */
class JarvisTemporalIntelligence {
  constructor(options = {}) {
    this.defaultTimezone = options.timezone || 'Asia/Kolkata';
    this.defaultOffset = options.timezoneOffset || '+05:30';
  }

  /**
   * Parse temporal natural language utterance against anchor context
   * @param {string} text
   * @param {Object} context { anchorDate, anchorTime, anchorEntity, timezone }
   */
  resolveTemporal(text = '', context = {}) {
    const raw = (text || '').toLowerCase().trim();
    const anchorDate = context.anchorDate || new Date().toISOString().split('T')[0];
    const anchorTime = context.anchorTime || '12:00';
    const anchorEntity = context.anchorEntity || null;
    const timezone = context.timezone || this.defaultTimezone;

    let targetDate = anchorDate;
    let targetTime = null;
    let recurrence = null;
    let relativeReference = null;
    let isRelativeOffset = false;
    let offsetMinutes = 0;

    // 1. Day references: "today", "tonight", "this evening", "tomorrow", "day after tomorrow"
    if (raw.includes('day after tomorrow')) {
      targetDate = this._addDays(anchorDate, 2);
      relativeReference = 'DAY_AFTER_TOMORROW';
    } else if (raw.includes('tomorrow')) {
      targetDate = this._addDays(anchorDate, 1);
      relativeReference = 'TOMORROW';
    } else if (raw.includes('today')) {
      targetDate = anchorDate;
      relativeReference = 'TODAY';
    }

    if (raw.includes('tonight')) {
      targetTime = '20:00';
      relativeReference = 'TONIGHT';
    } else if (raw.includes('this evening') || raw.includes('evening')) {
      targetTime = targetTime || '18:00';
      relativeReference = relativeReference || 'THIS_EVENING';
    } else if (raw.includes('this afternoon') || raw.includes('afternoon')) {
      targetTime = targetTime || '14:00';
    } else if (raw.includes('after lunch')) {
      targetTime = '14:00';
      relativeReference = 'AFTER_LUNCH';
    }

    // 2. Named Day references: "this friday", "next monday", "friday", "saturday", etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < dayNames.length; i++) {
      const day = dayNames[i];
      if (raw.includes(`next ${day}`)) {
        targetDate = this._getNextWeekday(anchorDate, i, true);
        relativeReference = `NEXT_${day.toUpperCase()}`;
        break;
      } else if (raw.includes(`this ${day}`) || raw.includes(`on ${day}`) || raw.match(new RegExp(`\\b${day}\\b`, 'i'))) {
        targetDate = this._getNextWeekday(anchorDate, i, false);
        relativeReference = day.toUpperCase();
        break;
      }
    }

    // 3. Week references: "next week"
    if (raw.includes('next week')) {
      targetDate = this._addDays(anchorDate, 7);
      relativeReference = 'NEXT_WEEK';
    }

    // 4. Recurrence: "every weekday", "every monday", "every day", "daily"
    if (raw.includes('every weekday')) {
      recurrence = { type: 'WEEKDAY', days: ['MON', 'TUE', 'WED', 'THU', 'FRI'] };
    } else if (raw.includes('every day') || raw.includes('daily')) {
      recurrence = { type: 'DAILY' };
    } else if (raw.match(/every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)) {
      const match = raw.match(/every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)[1].toUpperCase();
      recurrence = { type: 'WEEKLY', day: match };
    }

    // 5. Minute / Hour offsets: "in 30 minutes", "in two hours", "in 2 hours", "in 15 mins"
    const inOffsetMatch = raw.match(/in\s+(\d+|one|two|three|four|five|six|ten|fifteen|twenty|thirty|forty-five)\s*(minutes?|mins?|hours?|hrs?)/i);
    if (inOffsetMatch) {
      const num = this._parseWordNumber(inOffsetMatch[1]);
      const unit = inOffsetMatch[2].toLowerCase();
      offsetMinutes = unit.startsWith('hour') || unit.startsWith('hr') ? num * 60 : num;
      isRelativeOffset = true;
      targetTime = this._shiftTime(anchorTime, offsetMinutes);
      relativeReference = `IN_${offsetMinutes}_MINUTES`;
    }

    // 6. Anchor-relative offsets: "one hour before that", "30 minutes before", "1 hour before", "after that"
    const anchorRelMatch = raw.match(/(\d+|one|two|three|four|five)\s*(minutes?|mins?|hours?|hrs?)\s*(before|prior to|after|ahead of)(?:\s+(?:that|it|the meeting|my meeting))?/i);
    if (anchorRelMatch) {
      const num = this._parseWordNumber(anchorRelMatch[1]);
      const unit = anchorRelMatch[2].toLowerCase();
      const direction = anchorRelMatch[3].toLowerCase();
      const mins = unit.startsWith('hour') || unit.startsWith('hr') ? num * 60 : num;
      offsetMinutes = direction.includes('before') || direction.includes('prior') ? -mins : mins;
      isRelativeOffset = true;

      // Base time comes from anchorEntity if available, else anchorTime
      const baseTime = (anchorEntity && anchorEntity.time) ? anchorEntity.time : anchorTime;
      targetTime = this._shiftTime(baseTime, offsetMinutes);
      relativeReference = `${Math.abs(mins)}_MINUTES_${direction.toUpperCase()}`;
    }

    // 7. Explicit time of day: "at 4 PM", "4:30", "5 pm", "17:00", "9:00 am"
    const explicitTimeMatch = raw.match(/(?:at\s+)?\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
    if (explicitTimeMatch && !isRelativeOffset) {
      const hStr = explicitTimeMatch[1];
      const mStr = explicitTimeMatch[2] || '00';
      const ampm = explicitTimeMatch[3] ? explicitTimeMatch[3].toUpperCase() : null;
      let hour = parseInt(hStr, 10);
      const minute = parseInt(mStr, 10);

      // Only treat as time if hour is plausible or ampm is explicit
      if (ampm || (hour >= 1 && hour <= 24 && (raw.includes('at ') || raw.includes('pm') || raw.includes('am') || explicitTimeMatch[2]))) {
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        targetTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
    }

    return {
      date: targetDate,
      time: targetTime || anchorTime,
      hasExplicitTime: Boolean(targetTime),
      timezone,
      timezoneOffset: this.defaultOffset,
      recurrence,
      relativeReference,
      offsetMinutes,
      anchorEntityId: anchorEntity ? (anchorEntity.id || anchorEntity.eventId) : null
    };
  }

  _parseWordNumber(word) {
    const map = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'ten': 10, 'fifteen': 15, 'twenty': 20,
      'thirty': 30, 'forty-five': 45
    };
    if (map[word.toLowerCase()]) return map[word.toLowerCase()];
    const parsed = parseInt(word, 10);
    return isNaN(parsed) ? 1 : parsed;
  }

  _addDays(dateStr, days) {
    const d = new Date(`${dateStr}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
  }

  _getNextWeekday(startDateStr, targetDayIndex, forceNextWeek = false) {
    const d = new Date(`${startDateStr}T12:00:00Z`);
    const currentDay = d.getUTCDay();
    let diff = targetDayIndex - currentDay;
    if (diff <= 0 || forceNextWeek) {
      diff += 7;
    }
    d.setUTCDate(d.getUTCDate() + diff);
    return d.toISOString().split('T')[0];
  }

  _shiftTime(timeStr, offsetMinutes) {
    if (!timeStr) return '12:00';
    let [h, m] = timeStr.split(':').map(x => parseInt(x, 10) || 0);
    let totalMins = h * 60 + m + offsetMinutes;
    while (totalMins < 0) totalMins += 24 * 60;
    totalMins = totalMins % (24 * 60);
    const resH = Math.floor(totalMins / 60);
    const resM = totalMins % 60;
    return `${resH.toString().padStart(2, '0')}:${resM.toString().padStart(2, '0')}`;
  }
}

const defaultTemporalIntelligence = new JarvisTemporalIntelligence();

module.exports = {
  JarvisTemporalIntelligence,
  defaultTemporalIntelligence
};
