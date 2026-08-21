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
