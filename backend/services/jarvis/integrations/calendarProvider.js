class CalendarProvider {
  /**
   * Abstract interface for external calendar sync (Google Calendar, Outlook, Device Calendar)
   */
  async getEvents(userId, { startDate, endDate } = {}) {
    return [];
  }

  async findFreeTime(userId, { date, durationMinutes = 30 } = {}) {
    return [];
  }

  async createEvent(userId, event = {}) {
    return { success: true, eventId: `cal_${Date.now()}` };
  }

  async updateEvent(userId, eventId, event = {}) {
    return { success: true, eventId };
  }
}

class MockCalendarProvider extends CalendarProvider {
  async getEvents(userId, { startDate, endDate } = {}) {
    return [
      { id: 'mock_cal_1', title: 'Team Strategy', startTime: '11:00 AM', endTime: '12:00 PM', date: startDate }
    ];
  }
}

module.exports = {
  CalendarProvider,
  MockCalendarProvider
};
