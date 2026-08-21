import '../../../services/api_client.dart';
import '../models/jarvis_models.dart';

class JarvisApiService {
  final ApiClient _apiClient;

  JarvisApiService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Send a natural language message to the backend JARVIS Agent
  Future<JarvisResponse> sendMessage(
    String message, {
    String? conversationId,
    String? timezone,
    String? langCode,
  }) async {
    try {
      final body = <String, dynamic>{
        'message': message,
        if (conversationId != null) 'conversationId': conversationId,
        if (timezone != null) 'timezone': timezone,
        if (langCode != null) 'langCode': langCode,
      };

      final res = await _apiClient.post('/ai/chat', body);
      return JarvisResponse.fromJson(res);
    } catch (e) {
      return JarvisResponse(
        success: false,
        type: JarvisResponseType.error,
        intent: 'UNKNOWN',
        message: 'I could not connect to my server. Please check your network connection.',
        errorCode: 'NETWORK_ERROR',
        timestamp: DateTime.now(),
      );
    }
  }

  /// Confirm an action that is in WAITING_FOR_CONFIRMATION state
  Future<JarvisResponse> confirmAction({
    required String confirmationId,
    required String toolName,
    required Map<String, dynamic> arguments,
  }) async {
    try {
      final body = <String, dynamic>{
        'confirmationId': confirmationId,
        'toolName': toolName,
        'arguments': arguments,
      };

      final res = await _apiClient.post('/ai/confirm-action', body);
      return JarvisResponse.fromJson(res);
    } catch (e) {
      return JarvisResponse(
        success: false,
        type: JarvisResponseType.error,
        intent: 'CONFIRMATION_EXECUTION',
        message: 'Failed to confirm action. Please try again.',
        errorCode: 'CONFIRMATION_ERROR',
        timestamp: DateTime.now(),
      );
    }
  }
}
