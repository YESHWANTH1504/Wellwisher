enum JarvisOrbState {
  idle,
  listening,
  thinking,
  executing,
  speaking,
  waitingForConfirmation,
  error
}

enum JarvisResponseType {
  finalResponse,
  actionCompleted,
  confirmationRequired,
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

  JarvisAction({
    required this.type,
    required this.data,
  });

  factory JarvisAction.fromJson(Map<String, dynamic> json) {
    return JarvisAction(
      type: json['type']?.toString() ?? '',
      data: json['data'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['data'])
          : {},
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
  final String? agentRunId;
  final String? conversationId;
  final String? errorCode;
  final DateTime timestamp;

  JarvisResponse({
    required this.success,
    required this.type,
    required this.intent,
    required this.message,
    this.action,
    this.confirmation,
    this.agentRunId,
    this.conversationId,
    this.errorCode,
    required this.timestamp,
  });

  factory JarvisResponse.fromJson(Map<String, dynamic> json) {
    final rawType = (json['type'] ?? json['data']?['type'])?.toString().toUpperCase() ?? '';
    JarvisResponseType responseType = JarvisResponseType.unknown;

    if (rawType == 'FINAL_RESPONSE') {
      responseType = JarvisResponseType.finalResponse;
    } else if (rawType == 'ACTION_COMPLETED') {
      responseType = JarvisResponseType.actionCompleted;
    } else if (rawType == 'CONFIRMATION_REQUIRED' || json['data']?['requiresConfirmation'] == true) {
      responseType = JarvisResponseType.confirmationRequired;
    } else if (rawType == 'ERROR' || json['success'] == false) {
      responseType = JarvisResponseType.error;
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

    return JarvisResponse(
      success: json['success'] == true,
      type: responseType,
      intent: json['intent']?.toString() ?? 'GENERAL_CONVERSATION',
      message: json['message']?.toString() ??
          dataMap?['reply']?.toString() ??
          'Response received from JARVIS.',
      action: action,
      confirmation: confirmation,
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
  final DateTime timestamp;
  final bool isVoice;

  JarvisMessage({
    required this.id,
    required this.sender,
    required this.text,
    this.responseType = JarvisResponseType.finalResponse,
    this.action,
    this.confirmation,
    required this.timestamp,
    this.isVoice = false,
  });

  bool get isUser => sender == 'user';
  bool get isJarvis => sender == 'jarvis';
  bool get requiresConfirmation => confirmation != null;
}
