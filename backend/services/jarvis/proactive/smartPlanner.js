class SmartPlanner {
  /**
   * Plan activities for user's free time windows
   */
  static planFreeTime(routines, { period = 'afternoon', date = new Date().toISOString().split('T')[0] } = {}) {
    // 1. Define diurnal time boundaries in minutes from midnight
    let startMin = 13 * 60; // 1:00 PM
    let endMin = 18 * 60;   // 6:00 PM
    if (period === 'morning') {
      startMin = 8 * 60;    // 8:00 AM
      endMin = 12 * 60;    // 12:00 PM
    } else if (period === 'evening') {
      startMin = 18 * 60;   // 6:00 PM
      endMin = 22 * 60;   // 10:00 PM
    } else if (period === 'day') {
      startMin = 8 * 60;    // 8:00 AM
      endMin = 20 * 60;   // 8:00 PM
    }

    // 2. Map existing busy slots
    const busySlots = [];
    for (const r of routines) {
      const match = (r.time || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const isPm = match[3].toUpperCase() === 'PM';
        if (isPm && h < 12) h += 12;
        if (!isPm && h === 12) h = 0;
        const timeMins = h * 60 + m;
        busySlots.push({ start: timeMins, end: timeMins + 45 }); // Default 45m duration
      }
    }
    busySlots.sort((a, b) => a.start - b.start);

    // 3. Find free slots of at least 30 minutes
    const freeWindows = [];
    let cur = startMin;
    for (const busy of busySlots) {
      if (busy.end <= startMin) continue;
      if (busy.start >= endMin) break;

      if (busy.start - cur >= 30) {
        freeWindows.push({
          startMins: cur,
          endMins: Math.min(busy.start, endMin),
          durationMins: Math.min(busy.start, endMin) - cur,
          formatted: `${this._formatMins(cur)} – ${this._formatMins(Math.min(busy.start, endMin))}`
        });
      }
      cur = Math.max(cur, busy.end);
    }

    if (endMin - cur >= 30) {
      freeWindows.push({
        startMins: cur,
        endMins: endMin,
        durationMins: endMin - cur,
        formatted: `${this._formatMins(cur)} – ${this._formatMins(endMin)}`
      });
    }

    // 4. Generate recommendations
    const proposedPlan = [];
    if (freeWindows.length > 0) {
      const primaryWindow = freeWindows[0];
      proposedPlan.push({
        time: this._formatMins(primaryWindow.startMins),
        title: 'Deep Focus / Project Work',
        durationMins: 45
      });
      if (primaryWindow.durationMins >= 90) {
        proposedPlan.push({
          time: this._formatMins(primaryWindow.startMins + 60),
          title: 'Wellness Break & Hydration',
          durationMins: 15
        });
      }
    }

    return {
      period,
      date,
      freeWindows,
      proposedPlan,
      totalFreeMinutes: freeWindows.reduce((acc, w) => acc + w.durationMins, 0)
    };
  }

  static _formatMins(totalMins) {
    let h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    const padH = h.toString().padStart(2, '0');
    const padM = m.toString().padStart(2, '0');
    return `${padH}:${padM} ${ampm}`;
  }
}

module.exports = SmartPlanner;
