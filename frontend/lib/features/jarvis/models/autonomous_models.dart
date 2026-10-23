import 'package:wellwisher/features/jarvis/models/jarvis_models.dart';

enum JarvisTaskStatus {
  pending,
  running,
  completed,
  cancelled,
  failed
}

class JarvisTask {
  final String id;
  final String userId;
  final String title;
  final String taskType;
  final DateTime? scheduleTime;
  final String? cronExpression;
  final JarvisTaskStatus status;
  final Map<String, dynamic> payload;
  final Map<String, dynamic>? result;
  final DateTime? lastRunAt;
  final DateTime createdAt;

  JarvisTask({
    required this.id,
    required this.userId,
    required this.title,
    this.taskType = 'REMINDER',
    this.scheduleTime,
    this.cronExpression,
    this.status = JarvisTaskStatus.pending,
    this.payload = const {},
    this.result,
    this.lastRunAt,
    required this.createdAt,
  });

  factory JarvisTask.fromJson(Map<String, dynamic> json) {
    JarvisTaskStatus parsedStatus = JarvisTaskStatus.pending;
    final rawStatus = (json['status'] ?? '').toString().toUpperCase();
    if (rawStatus == 'RUNNING') {
      parsedStatus = JarvisTaskStatus.running;
    } else if (rawStatus == 'COMPLETED') {
      parsedStatus = JarvisTaskStatus.completed;
    } else if (rawStatus == 'CANCELLED') {
      parsedStatus = JarvisTaskStatus.cancelled;
    } else if (rawStatus == 'FAILED') {
      parsedStatus = JarvisTaskStatus.failed;
    }

    return JarvisTask(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      taskType: json['task_type']?.toString() ?? 'REMINDER',
      scheduleTime: DateTime.tryParse(json['schedule_time']?.toString() ?? ''),
      cronExpression: json['cron_expression']?.toString(),
      status: parsedStatus,
      payload: json['payload'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['payload'])
          : {},
      result: json['result'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['result'])
          : null,
      lastRunAt: DateTime.tryParse(json['last_run_at']?.toString() ?? ''),
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class JarvisActionableNotification {
  final String id;
  final String title;
  final String body;
  final String notificationType;
  final List<Map<String, dynamic>> actionButtons;
  final bool isRead;
  final DateTime createdAt;

  JarvisActionableNotification({
    required this.id,
    required this.title,
    required this.body,
    this.notificationType = 'ACTIONABLE_REMINDER',
    this.actionButtons = const [],
    this.isRead = false,
    required this.createdAt,
  });

  factory JarvisActionableNotification.fromJson(Map<String, dynamic> json) {
    final rawActions = json['action_buttons'] ?? json['actionButtons'];
    final List<Map<String, dynamic>> actions = [];
    if (rawActions is List) {
      for (final a in rawActions) {
        if (a is Map<String, dynamic>) actions.add(a);
      }
    }

    return JarvisActionableNotification(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      body: json['body']?.toString() ?? '',
      notificationType: json['notification_type']?.toString() ?? 'ACTIONABLE_REMINDER',
      actionButtons: actions,
      isRead: json['is_read'] == 1 || json['is_read'] == true,
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class VoiceCommandResult {
  final bool success;
  final String intent;
  final String spokenResponse;
  final List<JarvisExecutionStep> executionSteps;
  final JarvisConfirmation? confirmation;
  final bool requiresConfirmation;
  final String? conversationId;
  final DateTime timestamp;

  VoiceCommandResult({
    required this.success,
    required this.intent,
    required this.spokenResponse,
    this.executionSteps = const [],
    this.confirmation,
    this.requiresConfirmation = false,
    this.conversationId,
    required this.timestamp,
  });

  factory VoiceCommandResult.fromJson(Map<String, dynamic> json) {
    final List<JarvisExecutionStep> steps = [];
    final rawSteps = json['executionSteps'] ?? json['steps'];
    if (rawSteps is List) {
      for (final s in rawSteps) {
        if (s is Map<String, dynamic>) steps.add(JarvisExecutionStep.fromJson(s));
      }
    }

    JarvisConfirmation? conf;
    if (json['confirmation'] is Map<String, dynamic>) {
      conf = JarvisConfirmation.fromJson(json['confirmation']);
    }

    return VoiceCommandResult(
      success: json['success'] == true,
      intent: json['intent']?.toString() ?? 'GENERAL_CONVERSATION',
      spokenResponse: json['spokenResponse']?.toString() ?? json['message']?.toString() ?? '',
      executionSteps: steps,
      confirmation: conf,
      requiresConfirmation: json['requiresConfirmation'] == true || conf != null,
      conversationId: json['conversationId']?.toString(),
      timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
