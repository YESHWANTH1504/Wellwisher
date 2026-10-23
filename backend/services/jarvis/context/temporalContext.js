/**
 * Timezone-aware temporal context engine
 */
class TemporalContext {
  /**
   * Resolve complete temporal context for a user
   */
  static resolve(timezone = 'UTC', baseDate = new Date()) {
    const validTz = this.getValidTimezone(timezone);

    // Format localized date parts
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: validTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      weekday: 'long'
    });

    const parts = dtf.formatToParts(baseDate);
    const partMap = {};
    for (const p of parts) partMap[p.type] = p.value;

    const year = partMap.year;
    const month = partMap.month;
    const day = partMap.day;
    const currentDate = `${year}-${month}-${day}`;
    const currentTime = `${partMap.hour}:${partMap.minute} ${partMap.dayPeriod || (parseInt(partMap.hour, 10) >= 12 ? 'PM' : 'AM')}`;
    const dayOfWeek = partMap.weekday;

    // Calculate dayOfWeekNumber (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const weekdayMap = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6
    };
    const dayOfWeekNumber = weekdayMap[dayOfWeek] !== undefined ? weekdayMap[dayOfWeek] : 0;
    const isWeekend = dayOfWeekNumber === 0 || dayOfWeekNumber === 6;
    const isWorkingDay = dayOfWeekNumber >= 1 && dayOfWeekNumber <= 5;

    // Calculate hour in 24h
    let hour24 = parseInt(partMap.hour, 10);
    const isPm = (partMap.dayPeriod || '').toUpperCase() === 'PM';
    if (isPm && hour24 < 12) hour24 += 12;
    if (!isPm && hour24 === 12) hour24 = 0;

    let period = 'morning';
    if (hour24 >= 5 && hour24 < 12) period = 'morning';
    else if (hour24 >= 12 && hour24 < 17) period = 'afternoon';
    else if (hour24 >= 17 && hour24 < 21) period = 'evening';
    else period = 'night';

    // Relative dates math
    const todayMs = new Date(`${currentDate}T12:00:00Z`).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const yesterdayDate = new Date(todayMs - oneDayMs).toISOString().split('T')[0];
    const tomorrowDate = new Date(todayMs + oneDayMs).toISOString().split('T')[0];
    const dayAfterTomorrowDate = new Date(todayMs + 2 * oneDayMs).toISOString().split('T')[0];
    const nextWeekDate = new Date(todayMs + 7 * oneDayMs).toISOString().split('T')[0];

    return {
      currentDate,
      currentTime,
      dayOfWeek,
      dayOfWeekNumber,
      isWeekend,
      isWorkingDay,
      timezone: validTz,
      period,
      periodWindows: {
        morning: { start: '06:00 AM', end: '11:59 AM' },
        afternoon: { start: '12:00 PM', end: '04:59 PM' },
        evening: { start: '05:00 PM', end: '08:59 PM' },
        night: { start: '09:00 PM', end: '05:59 AM' }
      },
      resolvedDates: {
        yesterday: yesterdayDate,
        today: currentDate,
        tomorrow: tomorrowDate,
        dayAfterTomorrow: dayAfterTomorrowDate,
        nextWeek: nextWeekDate
      }
    };
  }

  /**
   * Resolve target date string from natural language text
   */
  static resolveTargetDate(text = '', timezone = 'UTC', baseDate = new Date()) {
    if (text instanceof Date) {
      return text.toISOString().split('T')[0];
    }
    const ctx = this.resolve(timezone, baseDate);
    const lower = (typeof text === 'string' ? text : String(text || '')).toLowerCase().trim();

    if (!lower || lower.includes('today') || lower.includes('tonight') || lower.includes('this morning') || lower.includes('this afternoon') || lower.includes('this evening')) {
      return ctx.currentDate;
    }
    if (lower.includes('tomorrow')) {
      return ctx.resolvedDates.tomorrow;
    }
    if (lower.includes('yesterday')) {
      return ctx.resolvedDates.yesterday;
    }

    // Direct YYYY-MM-DD
    const isoMatch = lower.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (isoMatch) return isoMatch[0];

    // Day of week handling
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      const dName = days[i];
      if (lower.includes(dName)) {
        let diff = (i - ctx.dayOfWeekNumber + 7) % 7;
        if (diff === 0 && lower.includes('next')) {
          diff = 7;
        } else if (diff === 0 && !lower.includes('this')) {
          // If referring to today's day name without "this", treat as today or upcoming
          diff = 0;
        }
        const targetMs = new Date(`${ctx.currentDate}T12:00:00Z`).getTime() + diff * 24 * 60 * 60 * 1000;
        return new Date(targetMs).toISOString().split('T')[0];
      }
    }

    return ctx.currentDate;
  }

  static getValidTimezone(tz) {
    if (!tz || typeof tz !== 'string') return 'UTC';
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return tz;
    } catch {
      return 'UTC';
    }
  }
}

module.exports = TemporalContext;
