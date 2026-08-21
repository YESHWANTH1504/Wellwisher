const pool = require('../../config/db');

const VALID_RESPONSE_STYLES = ['CONCISE', 'DETAILED', 'ELDERLY_AFFECTIONATE', 'PROFESSIONAL'];
const VALID_NOTIFICATION_FREQUENCIES = ['LOW', 'BALANCED', 'HIGH'];

class AiPreferenceRepository {
  /**
   * Get user AI preferences, initializing default settings if not already present
   */
  static async getPreferences(userId) {
    if (!userId) throw new Error('userId is required');

    const [rows] = await pool.query(
      `SELECT * FROM ai_preferences WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    if (rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        userId: r.user_id,
        assistantName: r.assistant_name,
        voiceEnabled: Boolean(r.voice_enabled),
        ttsEnabled: Boolean(r.tts_enabled),
        proactiveAssistanceEnabled: Boolean(r.proactive_assistance_enabled),
        proactiveRemindersEnabled: r.proactive_reminders_enabled !== undefined ? Boolean(r.proactive_reminders_enabled) : true,
        dailyBriefingEnabled: r.daily_briefing_enabled !== undefined ? Boolean(r.daily_briefing_enabled) : true,
        eveningSummaryEnabled: r.evening_summary_enabled !== undefined ? Boolean(r.evening_summary_enabled) : true,
        proactiveVoiceEnabled: r.proactive_voice_enabled !== undefined ? Boolean(r.proactive_voice_enabled) : true,
        quietHoursEnabled: r.quiet_hours_enabled !== undefined ? Boolean(r.quiet_hours_enabled) : true,
        quietHoursStart: r.quiet_hours_start || '22:00',
        quietHoursEnd: r.quiet_hours_end || '07:00',
        notificationFrequency: r.notification_frequency || 'BALANCED',
        briefingTime: r.briefing_time || '08:00 AM',
        summaryTime: r.summary_time || '08:30 PM',
        preferredResponseStyle: r.preferred_response_style || 'CONCISE',
        wakeWordEnabled: Boolean(r.wake_word_enabled),
        languagePreference: r.language_preference || 'en-US',
        updatedAt: r.updated_at
      };
    }

    // Default configuration
    return {
      userId,
      assistantName: 'JARVIS',
      voiceEnabled: true,
      ttsEnabled: true,
      proactiveAssistanceEnabled: true,
      proactiveRemindersEnabled: true,
      dailyBriefingEnabled: true,
      eveningSummaryEnabled: true,
      proactiveVoiceEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      notificationFrequency: 'BALANCED',
      briefingTime: '08:00 AM',
      summaryTime: '08:30 PM',
      preferredResponseStyle: 'CONCISE',
      wakeWordEnabled: false,
      languagePreference: 'en-US',
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Update or initialize user AI preferences
   */
  static async updatePreferences(userId, prefs = {}) {
    if (!userId) throw new Error('userId is required');

    const current = await this.getPreferences(userId);

    const assistantName = (prefs.assistantName || current.assistantName || 'JARVIS').trim();
    const voiceEnabled = prefs.voiceEnabled !== undefined ? Boolean(prefs.voiceEnabled) : current.voiceEnabled;
    const ttsEnabled = prefs.ttsEnabled !== undefined ? Boolean(prefs.ttsEnabled) : current.ttsEnabled;
    const proactiveEnabled = prefs.proactiveAssistanceEnabled !== undefined ? Boolean(prefs.proactiveAssistanceEnabled) : current.proactiveAssistanceEnabled;
    const proactiveRemindersEnabled = prefs.proactiveRemindersEnabled !== undefined ? Boolean(prefs.proactiveRemindersEnabled) : current.proactiveRemindersEnabled;
    const dailyBriefingEnabled = prefs.dailyBriefingEnabled !== undefined ? Boolean(prefs.dailyBriefingEnabled) : current.dailyBriefingEnabled;
    const eveningSummaryEnabled = prefs.eveningSummaryEnabled !== undefined ? Boolean(prefs.eveningSummaryEnabled) : current.eveningSummaryEnabled;
    const proactiveVoiceEnabled = prefs.proactiveVoiceEnabled !== undefined ? Boolean(prefs.proactiveVoiceEnabled) : current.proactiveVoiceEnabled;
    const quietHoursEnabled = prefs.quietHoursEnabled !== undefined ? Boolean(prefs.quietHoursEnabled) : current.quietHoursEnabled;
    const quietHoursStart = (prefs.quietHoursStart || current.quietHoursStart || '22:00').trim();
    const quietHoursEnd = (prefs.quietHoursEnd || current.quietHoursEnd || '07:00').trim();
    
    let notificationFrequency = (prefs.notificationFrequency || current.notificationFrequency || 'BALANCED').toUpperCase();
    if (!VALID_NOTIFICATION_FREQUENCIES.includes(notificationFrequency)) {
      notificationFrequency = 'BALANCED';
    }

    const briefingTime = (prefs.briefingTime || current.briefingTime || '08:00 AM').trim();
    const summaryTime = (prefs.summaryTime || current.summaryTime || '08:30 PM').trim();

    let responseStyle = (prefs.preferredResponseStyle || current.preferredResponseStyle || 'CONCISE').toUpperCase();
    if (!VALID_RESPONSE_STYLES.includes(responseStyle)) {
      responseStyle = 'CONCISE';
    }

    const wakeWordEnabled = prefs.wakeWordEnabled !== undefined ? Boolean(prefs.wakeWordEnabled) : current.wakeWordEnabled;
    const languagePreference = (prefs.languagePreference || current.languagePreference || 'en-US').trim();

    await pool.query(
      `INSERT INTO ai_preferences 
       (user_id, assistant_name, voice_enabled, tts_enabled, proactive_assistance_enabled, proactive_reminders_enabled, daily_briefing_enabled, evening_summary_enabled, proactive_voice_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, notification_frequency, briefing_time, summary_time, preferred_response_style, wake_word_enabled, language_preference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         assistant_name = VALUES(assistant_name),
         voice_enabled = VALUES(voice_enabled),
         tts_enabled = VALUES(tts_enabled),
         proactive_assistance_enabled = VALUES(proactive_assistance_enabled),
         proactive_reminders_enabled = VALUES(proactive_reminders_enabled),
         daily_briefing_enabled = VALUES(daily_briefing_enabled),
         evening_summary_enabled = VALUES(evening_summary_enabled),
         proactive_voice_enabled = VALUES(proactive_voice_enabled),
         quiet_hours_enabled = VALUES(quiet_hours_enabled),
         quiet_hours_start = VALUES(quiet_hours_start),
         quiet_hours_end = VALUES(quiet_hours_end),
         notification_frequency = VALUES(notification_frequency),
         briefing_time = VALUES(briefing_time),
         summary_time = VALUES(summary_time),
         preferred_response_style = VALUES(preferred_response_style),
         wake_word_enabled = VALUES(wake_word_enabled),
         language_preference = VALUES(language_preference),
         updated_at = NOW()`,
      [
        userId,
        assistantName,
        voiceEnabled ? 1 : 0,
        ttsEnabled ? 1 : 0,
        proactiveEnabled ? 1 : 0,
        proactiveRemindersEnabled ? 1 : 0,
        dailyBriefingEnabled ? 1 : 0,
        eveningSummaryEnabled ? 1 : 0,
        proactiveVoiceEnabled ? 1 : 0,
        quietHoursEnabled ? 1 : 0,
        quietHoursStart,
        quietHoursEnd,
        notificationFrequency,
        briefingTime,
        summaryTime,
        responseStyle,
        wakeWordEnabled ? 1 : 0,
        languagePreference
      ]
    );

    return await this.getPreferences(userId);
  }
}

module.exports = {
  AiPreferenceRepository,
  VALID_RESPONSE_STYLES,
  VALID_NOTIFICATION_FREQUENCIES
};
