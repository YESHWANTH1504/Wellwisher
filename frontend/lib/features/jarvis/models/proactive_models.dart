class ProactiveEventModel {
  final String id;
  final String eventType;
  final String priority;
  final String title;
  final String message;
  final DateTime? scheduledFor;
  final String status;
  final Map<String, dynamic>? actionPayload;
  final Map<String, dynamic>? metadata;

  ProactiveEventModel({
    required this.id,
    required this.eventType,
    required this.priority,
    required this.title,
    required this.message,
    this.scheduledFor,
    required this.status,
    this.actionPayload,
    this.metadata,
  });

  factory ProactiveEventModel.fromJson(Map<String, dynamic> json) {
    return ProactiveEventModel(
      id: json['id']?.toString() ?? '',
      eventType: json['event_type'] ?? json['eventType'] ?? 'UPCOMING_TASK',
      priority: json['priority'] ?? 'MEDIUM',
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      scheduledFor: json['scheduled_for'] != null ? DateTime.tryParse(json['scheduled_for'].toString()) : null,
      status: json['status'] ?? 'PENDING',
      actionPayload: json['action_payload'] is Map ? Map<String, dynamic>.from(json['action_payload']) : null,
      metadata: json['metadata'] is Map ? Map<String, dynamic>.from(json['metadata']) : null,
    );
  }
}

class DailyBriefingModel {
  final String title;
  final String message;
  final Map<String, dynamic>? data;
  final Map<String, dynamic>? actionPayload;

  DailyBriefingModel({
    required this.title,
    required this.message,
    this.data,
    this.actionPayload,
  });

  factory DailyBriefingModel.fromJson(Map<String, dynamic> json) {
    return DailyBriefingModel(
      title: json['title'] ?? 'Morning Briefing',
      message: json['message'] ?? '',
      data: json['data'] is Map ? Map<String, dynamic>.from(json['data']) : null,
      actionPayload: json['actionPayload'] is Map ? Map<String, dynamic>.from(json['actionPayload']) : null,
    );
  }
}

class EveningSummaryModel {
  final String title;
  final String message;
  final Map<String, dynamic>? data;
  final Map<String, dynamic>? actionPayload;

  EveningSummaryModel({
    required this.title,
    required this.message,
    this.data,
    this.actionPayload,
  });

  factory EveningSummaryModel.fromJson(Map<String, dynamic> json) {
    return EveningSummaryModel(
      title: json['title'] ?? 'Evening Summary',
      message: json['message'] ?? '',
      data: json['data'] is Map ? Map<String, dynamic>.from(json['data']) : null,
      actionPayload: json['actionPayload'] is Map ? Map<String, dynamic>.from(json['actionPayload']) : null,
    );
  }
}

class AiPreferenceModel {
  final String assistantName;
  final bool voiceEnabled;
  final bool ttsEnabled;
  final bool proactiveAssistanceEnabled;
  final bool proactiveRemindersEnabled;
  final bool dailyBriefingEnabled;
  final bool eveningSummaryEnabled;
  final bool proactiveVoiceEnabled;
  final bool quietHoursEnabled;
  final String quietHoursStart;
  final String quietHoursEnd;
  final String notificationFrequency;
  final String preferredResponseStyle;

  AiPreferenceModel({
    this.assistantName = 'JARVIS',
    this.voiceEnabled = true,
    this.ttsEnabled = true,
    this.proactiveAssistanceEnabled = true,
    this.proactiveRemindersEnabled = true,
    this.dailyBriefingEnabled = true,
    this.eveningSummaryEnabled = true,
    this.proactiveVoiceEnabled = true,
    this.quietHoursEnabled = true,
    this.quietHoursStart = '22:00',
    this.quietHoursEnd = '07:00',
    this.notificationFrequency = 'BALANCED',
    this.preferredResponseStyle = 'CONCISE',
  });

  factory AiPreferenceModel.fromJson(Map<String, dynamic> json) {
    return AiPreferenceModel(
      assistantName: json['assistantName'] ?? json['assistant_name'] ?? 'JARVIS',
      voiceEnabled: json['voiceEnabled'] ?? (json['voice_enabled'] == 1) ?? true,
      ttsEnabled: json['ttsEnabled'] ?? (json['tts_enabled'] == 1) ?? true,
      proactiveAssistanceEnabled: json['proactiveAssistanceEnabled'] ?? (json['proactive_assistance_enabled'] == 1) ?? true,
      proactiveRemindersEnabled: json['proactiveRemindersEnabled'] ?? (json['proactive_reminders_enabled'] == 1) ?? true,
      dailyBriefingEnabled: json['dailyBriefingEnabled'] ?? (json['daily_briefing_enabled'] == 1) ?? true,
      eveningSummaryEnabled: json['eveningSummaryEnabled'] ?? (json['evening_summary_enabled'] == 1) ?? true,
      proactiveVoiceEnabled: json['proactiveVoiceEnabled'] ?? (json['proactive_voice_enabled'] == 1) ?? true,
      quietHoursEnabled: json['quietHoursEnabled'] ?? (json['quiet_hours_enabled'] == 1) ?? true,
      quietHoursStart: json['quietHoursStart'] ?? json['quiet_hours_start'] ?? '22:00',
      quietHoursEnd: json['quietHoursEnd'] ?? json['quiet_hours_end'] ?? '07:00',
      notificationFrequency: json['notificationFrequency'] ?? json['notification_frequency'] ?? 'BALANCED',
      preferredResponseStyle: json['preferredResponseStyle'] ?? json['preferred_response_style'] ?? 'CONCISE',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'assistantName': assistantName,
      'voiceEnabled': voiceEnabled,
      'ttsEnabled': ttsEnabled,
      'proactiveAssistanceEnabled': proactiveAssistanceEnabled,
      'proactiveRemindersEnabled': proactiveRemindersEnabled,
      'dailyBriefingEnabled': dailyBriefingEnabled,
      'eveningSummaryEnabled': eveningSummaryEnabled,
      'proactiveVoiceEnabled': proactiveVoiceEnabled,
      'quietHoursEnabled': quietHoursEnabled,
      'quietHoursStart': quietHoursStart,
      'quietHoursEnd': quietHoursEnd,
      'notificationFrequency': notificationFrequency,
      'preferredResponseStyle': preferredResponseStyle,
    };
  }
}
