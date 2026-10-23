enum JarvisState {
  sleeping,
  idle,
  listeningForWakeWord,
  wakeWordDetected,
  listeningForCommand,
  transcribing,
  thinking,
  acting,
  speaking,
  waitingForFollowup,
  interrupted,
  reconnecting,
  manualMode,
  error,

  // Phase 6 Multimodal States
  capturing,
  analyzing,

  // Backward-compatible aliases
  understanding,
  planning,
  authorizing,
  executing,
  verifying,
  completed,
  waitingForConfirmation,
  recovery,
  listening,
  retrieving,
  awaitingConfirmation,
  responding,
  success,
  warning
}

enum ActivationSource {
  WAKE_WORD,
  MIC_BUTTON,
  TEXT_INPUT,
  VOICE_INTERACTION,
  CAMERA,
  SCREEN,
  MULTIMODAL
}

/// Canonical Request Contract enforcing genuine user activation
class CanonicalRequest {
  final String requestId;
  final String sessionId;
  final int userId;
  final ActivationSource activationSource;
  final String inputType;
  final bool userInitiated;
  final DateTime timestamp;
  final String rawTranscript;
  final String cleanedCommand;

  CanonicalRequest({
    required this.requestId,
    required this.sessionId,
    required this.userId,
    required this.activationSource,
    this.inputType = 'voice',
    this.userInitiated = true,
    DateTime? timestamp,
    required this.rawTranscript,
    String? cleanedCommand,
  }) : timestamp = timestamp ?? DateTime.now(),
       cleanedCommand = cleanedCommand ?? _clean(rawTranscript);

  static String _clean(String raw) {
    return raw
        .replaceAll(RegExp(r'^(?:hey|hi|hello|ok|okay)?\s*jarvis[,.\s]*', caseSensitive: false), '')
        .trim();
  }

  Map<String, dynamic> toJson() => {
    'requestId': requestId,
    'sessionId': sessionId,
    'userId': userId,
    'activationSource': activationSource.name,
    'inputType': inputType,
    'userInitiated': userInitiated,
    'timestamp': timestamp.toIso8601String(),
    'rawTranscript': rawTranscript,
    'cleanedCommand': cleanedCommand,
  };
}

// Backward-compatible alias for existing code
typedef JarvisOrbState = JarvisState;

enum JarvisExecutionStatus {
  pending,
  running,
  completed,
  failed,
  waitingConfirmation,
  skipped
}

const Map<String, String> kJarvisToolLabels = {
  'get_today_schedule': "Checking today's schedule & routines",
  'get_schedule': "Retrieving schedule timeline",
  'create_schedule': "Adding routine to schedule",
  'delete_schedule': "Removing routine from schedule",
  'update_schedule': "Updating routine parameters",
  'get_medications': "Checking medication adherence & dosages",
  'log_medication': "Logging medication intake",
  'get_hydration': "Retrieving hydration telemetry",
  'log_hydration': "Logging water intake",
  'get_wellness': "Checking wellness scores & mood",
  'log_wellness': "Recording wellness assessment",
  'analyze_journal': "Analyzing AI journal entry",
  'save_memory': "Saving semantic preference to memory",
  'search_memory': "Querying semantic memory matrix",
  'delete_memory': "Forgetting memory vector",
  'get_profile': "Accessing personalization profile",
  'update_preferences': "Updating neural settings",
  'get_family_feed': "Checking caregiver family activity",
  'get_documents': "Listing multi-modal medical documents",
  'get_document_summary': "Reading document clinical summary",
  'get_document_extraction': "Extracting biomarker parameters from document",
  'compare_documents': "Calculating biomarker differentials across reports",
  'get_health_trends': "Analyzing longitudinal health trends",
  'get_health_alerts': "Scanning proactive health alerts",
  'check_medication_conflicts': "Reconciling medication interactions",
  'generate_doctor_briefing': "Synthesizing 1-page clinician briefing",
  'get_upcoming_appointments': "Checking upcoming medical appointments",
  'create_appointment': "Scheduling clinician appointment",
  'get_calendar_events': "Checking calendar events & schedule slots",
  'find_calendar_availability': "Finding free calendar slots",
  'get_pending_workflow_actions': "Checking Action Center pending tasks",
  'confirm_workflow_action': "Confirming workflow task",
  'dismiss_workflow_action': "Dismissing workflow task",
  'prepare_doctor_visit': "Preparing consultation briefing & discussion items",
  'find_free_time': "Analyzing calendar for optimal time slot",
  'create_calendar_event': "Adding calendar event"
};

String getToolHumanLabel(String toolName) {
  if (toolName.isEmpty) return 'Executing JARVIS operation';
  return kJarvisToolLabels[toolName] ?? 'Executing ${toolName.replaceAll('_', ' ')}';
}

class JarvisExecutionStep {
  final String id;
  final String toolName;
  final String label;
  final JarvisExecutionStatus status;
  final String? detail;
  final Map<String, dynamic> data;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final String? error;

  const JarvisExecutionStep({
    required this.id,
    this.toolName = '',
    required this.label,
    this.status = JarvisExecutionStatus.pending,
    this.detail,
    this.data = const {},
    this.startedAt,
    this.completedAt,
    this.error,
  });

  factory JarvisExecutionStep.fromJson(Map<String, dynamic> json) {
    final rawStatus = (json['status'] ?? '').toString().toUpperCase();
    JarvisExecutionStatus parsedStatus = JarvisExecutionStatus.completed;

    if (rawStatus == 'RUNNING') {
      parsedStatus = JarvisExecutionStatus.running;
    } else if (rawStatus == 'PENDING' || rawStatus == 'PLANNED') {
      parsedStatus = JarvisExecutionStatus.pending;
    } else if (rawStatus == 'FAILED') {
      parsedStatus = JarvisExecutionStatus.failed;
    } else if (rawStatus == 'WAITING_CONFIRMATION') {
      parsedStatus = JarvisExecutionStatus.waitingConfirmation;
    } else if (rawStatus == 'SKIPPED') {
      parsedStatus = JarvisExecutionStatus.skipped;
    } else {
      parsedStatus = JarvisExecutionStatus.completed;
    }

    final tName = json['toolName']?.toString() ?? json['tool']?.toString() ?? '';
    final defaultLabel = tName.isNotEmpty ? getToolHumanLabel(tName) : 'Analyzing context';

    return JarvisExecutionStep(
      id: json['id']?.toString() ?? 'step_${DateTime.now().millisecondsSinceEpoch}',
      toolName: tName,
      label: json['label']?.toString() ?? defaultLabel,
      status: parsedStatus,
      detail: json['detail']?.toString(),
      data: json['data'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['data'])
          : (json['result'] is Map<String, dynamic>
              ? Map<String, dynamic>.from(json['result'])
              : {}),
      startedAt: DateTime.tryParse(json['startedAt']?.toString() ?? ''),
      completedAt: DateTime.tryParse(json['completedAt']?.toString() ?? ''),
      error: json['error']?.toString(),
    );
  }

  JarvisExecutionStep copyWith({
    String? id,
    String? toolName,
    String? label,
    JarvisExecutionStatus? status,
    String? detail,
    Map<String, dynamic>? data,
    DateTime? startedAt,
    DateTime? completedAt,
    String? error,
  }) {
    return JarvisExecutionStep(
      id: id ?? this.id,
      toolName: toolName ?? this.toolName,
      label: label ?? this.label,
      status: status ?? this.status,
      detail: detail ?? this.detail,
      data: data ?? this.data,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
      error: error ?? this.error,
    );
  }
}

enum JarvisResponseType {
  finalResponse,
  actionCompleted,
  confirmationRequired,
  healthTrend,
  appointment,
  calendar,
  healthAlert,
  document,
  medicationConflict,
  doctorBriefing,
  workflow,
  memory,
  task,
  voiceSwitch,
  error,
  unknown
}

class JarvisConfirmation {
  final String confirmationId;
  final String tool;
  final Map<String, dynamic> arguments;
  final DateTime? expiresAt;

  JarvisConfirmation({
    required this.confirmationId,
    required this.tool,
    required this.arguments,
    this.expiresAt,
  });

  factory JarvisConfirmation.fromJson(Map<String, dynamic> json) {
    DateTime? parsedExpiry;
    if (json['expiresAt'] != null) {
      parsedExpiry = DateTime.tryParse(json['expiresAt'].toString());
    }

    return JarvisConfirmation(
      confirmationId: json['confirmationId']?.toString() ?? '',
      tool: json['tool']?.toString() ?? '',
      arguments: json['arguments'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['arguments'])
          : {},
      expiresAt: parsedExpiry,
    );
  }

  Map<String, dynamic> toJson() => {
    'confirmationId': confirmationId,
    'tool': tool,
    'arguments': arguments,
    'expiresAt': expiresAt?.toIso8601String(),
  };
}

class JarvisAction {
  final String type;
  final Map<String, dynamic> data;

  String get tool => type;

  JarvisAction({
    required this.type,
    required this.data,
  });

  factory JarvisAction.fromJson(Map<String, dynamic> json) {
    final actType = (json['type'] ?? json['tool'] ?? json['action'])?.toString() ?? '';
    final actData = json['data'] is Map<String, dynamic>
        ? Map<String, dynamic>.from(json['data'])
        : Map<String, dynamic>.from(json);
    return JarvisAction(
      type: actType,
      data: actData,
    );
  }

  Map<String, dynamic> toJson() => {
    'type': type,
    'data': data,
  };
}

class JarvisResponse {
  final bool success;
  final JarvisResponseType type;
  final String intent;
  final String message;
  final JarvisAction? action;
  final JarvisConfirmation? confirmation;
  final List<JarvisExecutionStep> executionSteps;
  final Map<String, dynamic>? structuredData;
  final String? speech;
  final String? agentRunId;
  final String? conversationId;
  final String? errorCode;
  final DateTime timestamp;

  JarvisResponse({
    required this.success,
    required this.type,
    required this.intent,
    required this.message,
    this.speech,
    this.action,
    this.confirmation,
    this.executionSteps = const [],
    this.structuredData,
    this.agentRunId,
    this.conversationId,
    this.errorCode,
    required this.timestamp,
  });

  String get spokenResponse {
    final s = speech?.trim();
    if (s != null && s.isNotEmpty) return s;
    return message;
  }

  factory JarvisResponse.fromJson(Map<String, dynamic> json) {
    final rawType = (json['type'] ?? json['data']?['type'])?.toString().toUpperCase() ?? '';
    JarvisResponseType responseType = JarvisResponseType.unknown;

    if (rawType == 'FINAL_RESPONSE') {
      responseType = JarvisResponseType.finalResponse;
    } else if (rawType == 'ACTION_COMPLETED') {
      responseType = JarvisResponseType.actionCompleted;
    } else if (rawType == 'CONFIRMATION_REQUIRED' || json['data']?['requiresConfirmation'] == true) {
      responseType = JarvisResponseType.confirmationRequired;
    } else if (rawType == 'HEALTH_TREND') {
      responseType = JarvisResponseType.healthTrend;
    } else if (rawType == 'APPOINTMENT') {
      responseType = JarvisResponseType.appointment;
    } else if (rawType == 'CALENDAR') {
      responseType = JarvisResponseType.calendar;
    } else if (rawType == 'HEALTH_ALERT') {
      responseType = JarvisResponseType.healthAlert;
    } else if (rawType == 'DOCUMENT') {
      responseType = JarvisResponseType.document;
    } else if (rawType == 'MEDICATION_CONFLICT') {
      responseType = JarvisResponseType.medicationConflict;
    } else if (rawType == 'DOCTOR_BRIEFING') {
      responseType = JarvisResponseType.doctorBriefing;
    } else if (rawType == 'WORKFLOW') {
      responseType = JarvisResponseType.workflow;
    } else if (rawType == 'MEMORY') {
      responseType = JarvisResponseType.memory;
    } else if (rawType == 'TASK') {
      responseType = JarvisResponseType.task;
    } else if (rawType == 'ERROR' || json['success'] == false) {
      responseType = JarvisResponseType.error;
    } else {
      responseType = JarvisResponseType.finalResponse;
    }

    final dataMap = json['data'] is Map<String, dynamic> ? json['data'] : null;

    JarvisAction? action;
    final rawAction = json['action'] ?? dataMap?['action'];
    if (rawAction is Map<String, dynamic>) {
      action = JarvisAction.fromJson(rawAction);
    }

    JarvisConfirmation? confirmation;
    final rawConfirmation = json['confirmation'] ?? dataMap?['confirmation'];
    if (rawConfirmation is Map<String, dynamic>) {
      confirmation = JarvisConfirmation.fromJson(rawConfirmation);
    }

    // Parse real backend execution steps
    final List<JarvisExecutionStep> parsedSteps = [];
    final rawSteps = json['steps'] ?? dataMap?['steps'] ?? json['executionSteps'];
    if (rawSteps is List) {
      for (final s in rawSteps) {
        if (s is Map<String, dynamic>) {
          parsedSteps.add(JarvisExecutionStep.fromJson(s));
        }
      }
    }

    final parsedSpeech = json['speech']?.toString() ?? dataMap?['speech']?.toString();

    return JarvisResponse(
      success: json['success'] == true,
      type: responseType,
      intent: json['intent']?.toString() ?? 'GENERAL_CONVERSATION',
      message: json['message']?.toString() ??
          dataMap?['reply']?.toString() ??
          dataMap?['message']?.toString() ??
          'Response received from JARVIS.',
      speech: parsedSpeech,
      action: action,
      confirmation: confirmation,
      executionSteps: parsedSteps,
      structuredData: dataMap,
      agentRunId: json['agentRunId']?.toString() ?? dataMap?['agentRunId']?.toString(),
      conversationId: json['conversationId']?.toString() ?? dataMap?['conversationId']?.toString(),
      errorCode: json['errorCode']?.toString(),
      timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class JarvisMessage {
  final String id;
  final String sender; // 'user' | 'jarvis'
  final String text;
  final JarvisResponseType responseType;
  final JarvisAction? action;
  final JarvisConfirmation? confirmation;
  final List<JarvisExecutionStep> executionSteps;
  final Map<String, dynamic>? structuredData;
  final DateTime timestamp;
  final bool isVoice;

  JarvisMessage({
    required this.id,
    required this.sender,
    required this.text,
    this.responseType = JarvisResponseType.finalResponse,
    this.action,
    this.confirmation,
    this.executionSteps = const [],
    this.structuredData,
    required this.timestamp,
    this.isVoice = false,
  });

  bool get isUser => sender == 'user';
  bool get isJarvis => sender == 'jarvis';
  bool get requiresConfirmation => confirmation != null;
}
