import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:wellwisher/features/jarvis/services/wake_word_service.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_api_service.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_tts_service.dart';
import 'package:wellwisher/features/jarvis/models/autonomous_models.dart';

class JarvisBackgroundService {
  final WakeWordService _wakeWordService;
  final JarvisApiService _apiService;
  final IJarvisTtsService _ttsService;

  bool _isBackgroundMonitoringActive = true;
  String? _activeConversationId;

  final StreamController<VoiceCommandResult> _commandResultsController = StreamController<VoiceCommandResult>.broadcast();
  Stream<VoiceCommandResult> get commandResultsStream => _commandResultsController.stream;
  bool get isBackgroundMonitoringActive => _isBackgroundMonitoringActive;

  JarvisBackgroundService({
    WakeWordService? wakeWordService,
    JarvisApiService? apiService,
    IJarvisTtsService? ttsService,
  })  : _wakeWordService = wakeWordService ?? WakeWordService(),
        _apiService = apiService ?? JarvisApiService(),
        _ttsService = ttsService ?? JarvisTtsService() {
    _initListeners();
  }

  void _initListeners() {
    _wakeWordService.onWakeWordTriggered = () {
      debugPrint('[JarvisBackgroundService] Wake word triggered! JARVIS listening...');
    };

    _wakeWordService.onCommandCaptured = (command) async {
      debugPrint('[JarvisBackgroundService] Captured command: $command');
      await executeVoiceCommand(command);
    };
  }

  Future<bool> initialize() async {
    final wakeWordReady = await _wakeWordService.initialize();
    _isBackgroundMonitoringActive = wakeWordReady;
    return wakeWordReady;
  }

  /// Execute spoken command headlessly (speaks response verbally via TTS)
  Future<VoiceCommandResult> executeVoiceCommand(String command) async {
    try {
      final response = await _apiService.sendMessage(
        command,
        conversationId: _activeConversationId,
      );

      if (response.conversationId != null) {
        _activeConversationId = response.conversationId;
      }

      final result = VoiceCommandResult(
        success: response.success,
        intent: response.intent,
        spokenResponse: response.message,
        executionSteps: response.executionSteps,
        confirmation: response.confirmation,
        requiresConfirmation: response.confirmation != null,
        conversationId: response.conversationId ?? _activeConversationId,
        timestamp: response.timestamp,
      );

      if (!_commandResultsController.isClosed) {
        _commandResultsController.add(result);
      }

      // Speak result verbally without requiring UI opening
      if (result.spokenResponse.isNotEmpty) {
        await _ttsService.speak(result.spokenResponse);
      }

      return result;
    } catch (e) {
      final errorResult = VoiceCommandResult(
        success: false,
        intent: 'ERROR',
        spokenResponse: 'I encountered a communication error with the subsystem.',
        timestamp: DateTime.now(),
      );
      if (!_commandResultsController.isClosed) {
        _commandResultsController.add(errorResult);
      }
      return errorResult;
    }
  }

  /// Handle actionable notification response directly
  Future<void> handleNotificationAction(String actionId, Map<String, dynamic> payload) async {
    debugPrint('[JarvisBackgroundService] Handling notification action: $actionId with payload: $payload');
    if (actionId == 'dismiss') {
      return;
    } else if (actionId == 'prepare_briefing') {
      await executeVoiceCommand('Prepare consultation briefing for my upcoming doctor visit');
    } else if (actionId == 'view_schedule') {
      await executeVoiceCommand("What's on my schedule today?");
    }
  }

  void setBackgroundMonitoring(bool active) {
    _isBackgroundMonitoringActive = active;
    _wakeWordService.setWakeWordEnabled(active);
  }

  void dispose() {
    _wakeWordService.dispose();
    if (!_commandResultsController.isClosed) {
      _commandResultsController.close();
    }
  }
}
