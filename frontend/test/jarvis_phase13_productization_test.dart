import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/models/jarvis_models.dart';
import 'package:wellwisher/features/jarvis/models/proactive_models.dart';
import 'package:wellwisher/features/jarvis/models/health_intelligence_models.dart';
import 'package:wellwisher/features/jarvis/models/workflow_models.dart';
import 'package:wellwisher/features/jarvis/controller/jarvis_home_controller.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_api_service.dart';
import 'package:wellwisher/features/jarvis/services/proactive_api_service.dart';
import 'package:wellwisher/features/jarvis/services/health_intelligence_api_service.dart';
import 'package:wellwisher/features/jarvis/services/workflow_api_service.dart';
import 'package:wellwisher/features/jarvis/services/voice_input_service.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_tts_service.dart';

class MockPhase13JarvisApiService extends JarvisApiService {
  JarvisResponse? nextResponse;
  String? lastQuery;

  @override
  Future<JarvisResponse> sendMessage(
    String message, {
    String? conversationId,
    String? timezone,
    String? langCode,
    Map<String, dynamic>? healthContext,
    Map<String, dynamic>? healthGoals,
  }) async {
    lastQuery = message;
    return nextResponse ??
        JarvisResponse(
          success: true,
          type: JarvisResponseType.finalResponse,
          intent: 'GENERAL_CONVERSATION',
          message: 'Phase 13 Mock Response',
          executionSteps: [],
          timestamp: DateTime.now(),
        );
  }
}

class MockProactiveService extends ProactiveApiService {
  @override
  Future<DailyBriefingModel?> getDailyBriefing() async => null;
  @override
  Future<List<ProactiveEventModel>> getFeed() async => [];
}

class MockHealthService extends HealthIntelligenceApiService {
  @override
  Future<List<HealthTrendModel>> getTrends() async => [];
  @override
  Future<List<HealthAlertModel>> getAlerts() async => [];
}

class MockWorkflowService extends WorkflowApiService {
  @override
  Future<List<AppointmentItem>> getAppointments({String? status}) async => [];
  @override
  Future<List<WorkflowActionItem>> getWorkflowActions({String? status}) async => [];
}

class MockVoiceService implements IVoiceInputService {
  @override
  bool get isListening => false;
  @override
  Future<bool> initialize() async => true;
  @override
  Future<void> startListening({
    required Function(String text, bool isFinal) onResult,
    Function(String error)? onError,
    String? localeId,
  }) async {}
  @override
  Future<void> stopListening() async {}
  @override
  Future<void> cancelListening() async {}
}

class MockTtsService implements IJarvisTtsService {
  @override
  bool get isSpeaking => false;
  @override
  void setGender(JarvisVoiceGender gender) {}
  @override
  void setPreset(JarvisVoicePreset preset) {}
  @override
  void setSpeechRate(double rate) {}
  @override
  void setPitch(double pitch) {}
  @override
  void setVolume(double volume) {}
  @override
  Future<List<Map<String, String>>> getAvailableVoices() async => [];
  @override
  Future<void> previewVoice({String? sampleText}) async {}
  @override
  Future<void> speak(String text, {String? language, void Function()? onComplete}) async {
    onComplete?.call();
  }
  @override
  Future<void> stop() async {}
}

void main() {
  group('Phase 13: JARVIS Real-World Productization & State Verification', () {
    late MockPhase13JarvisApiService mockApi;
    late JarvisHomeController controller;

    setUp(() {
      mockApi = MockPhase13JarvisApiService();
      controller = JarvisHomeController(
        apiService: mockApi,
        proactiveService: MockProactiveService(),
        healthService: MockHealthService(),
        workflowService: MockWorkflowService(),
        voiceService: MockVoiceService(),
        ttsService: MockTtsService(),
      );
    });

    tearDown(() {
      controller.dispose();
    });

    test('1. JarvisState includes verifying with correct state indicator semantics', () {
      expect(JarvisState.values.contains(JarvisState.verifying), true);
      controller.setStateEnum(JarvisState.verifying, 'Verifying cryptographic state');
      expect(controller.state, JarvisState.verifying);
      expect(controller.statusMessage, 'Verifying cryptographic state');
    });

    test('2. Multi-domain tool execution telemetry steps are cleanly parsed', () async {
      mockApi.nextResponse = JarvisResponse(
        success: true,
        type: JarvisResponseType.actionCompleted,
        intent: 'DAILY_FOCUS_QUERY',
        message: 'Here is your synthesized focus summary for today.',
        executionSteps: [
          const JarvisExecutionStep(
            id: 'step_1',
            toolName: 'get_today_schedule',
            label: "Checking today's schedule & routines",
            status: JarvisExecutionStatus.completed,
          ),
          const JarvisExecutionStep(
            id: 'step_2',
            toolName: 'get_health_alerts',
            label: 'Scanning proactive health alerts',
            status: JarvisExecutionStatus.completed,
          ),
          const JarvisExecutionStep(
            id: 'step_3',
            toolName: 'get_pending_workflow_actions',
            label: 'Checking Action Center pending tasks',
            status: JarvisExecutionStatus.completed,
          ),
        ],
        timestamp: DateTime.now(),
      );

      await controller.submitCommand('Look at everything relevant to me today');
      final lastMsg = controller.messages.last;
      expect(lastMsg.executionSteps.length, 3);
      expect(lastMsg.executionSteps[0].toolName, 'get_today_schedule');
      expect(lastMsg.executionSteps[1].toolName, 'get_health_alerts');
      expect(lastMsg.executionSteps[2].toolName, 'get_pending_workflow_actions');
    });

    test('3. Conversational cancellation clears pending state smoothly', () async {
      mockApi.nextResponse = JarvisResponse(
        success: true,
        type: JarvisResponseType.finalResponse,
        intent: 'ACTION_CANCELLED',
        message: 'Understood. Action cancelled. No changes have been made.',
        executionSteps: [],
        timestamp: DateTime.now(),
      );

      await controller.submitCommand("I changed my mind, don't delete it");
      expect(controller.pendingConfirmation, isNull);
      expect(controller.state, JarvisState.idle);
      expect(controller.messages.last.text, contains('Action cancelled'));
    });
  });
}
