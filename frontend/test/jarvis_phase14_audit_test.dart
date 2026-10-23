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

class MockPhase14JarvisApiService extends JarvisApiService {
  JarvisResponse? nextResponse;
  String? lastQuery;
  String? lastConversationId;

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
    lastConversationId = conversationId;
    return nextResponse ??
        JarvisResponse(
          success: true,
          type: JarvisResponseType.finalResponse,
          intent: 'GENERAL_CONVERSATION',
          message: 'Phase 14 Audit Mock Response',
          executionSteps: [],
          timestamp: DateTime.now(),
        );
  }
}

class MockProactiveService extends ProactiveApiService {
  DailyBriefingModel? briefingToReturn;
  List<ProactiveEventModel> feedToReturn = [];

  @override
  Future<DailyBriefingModel?> getDailyBriefing() async => briefingToReturn;
  @override
  Future<List<ProactiveEventModel>> getFeed() async => feedToReturn;
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
  group('Phase 14: JARVIS Product-Level Audit & Production Hardening', () {
    late MockPhase14JarvisApiService mockApi;
    late MockProactiveService mockProactive;
    late JarvisHomeController controller;

    setUp(() {
      mockApi = MockPhase14JarvisApiService();
      mockProactive = MockProactiveService();
      controller = JarvisHomeController(
        apiService: mockApi,
        proactiveService: mockProactive,
        healthService: MockHealthService(),
        workflowService: MockWorkflowService(),
        voiceService: MockVoiceService(),
        ttsService: MockTtsService(),
      );
    });

    tearDown(() {
      controller.dispose();
    });

    test('1. First-time empty user experience produces clean default greeting', () {
      expect(controller.messages.isNotEmpty, true);
      expect(controller.messages.first.text, contains('JARVIS'));
      expect(controller.timelineItems.isEmpty, true);
      expect(controller.pendingConfirmation, isNull);
    });

    test('2. Multi-turn conversation preserves conversation session across turns', () async {
      mockApi.nextResponse = JarvisResponse(
        success: true,
        type: JarvisResponseType.actionCompleted,
        intent: 'APPOINTMENTS_QUERY',
        message: 'You have 1 upcoming doctor consultation.',
        executionSteps: [
          const JarvisExecutionStep(
            id: 'step_1',
            toolName: 'get_upcoming_appointments',
            label: 'Checking upcoming medical appointments',
            status: JarvisExecutionStatus.completed,
          )
        ],
        timestamp: DateTime.now(),
      );

      await controller.submitCommand('What appointments do I have?');
      expect(controller.messages.length, 3); // initial greeting + user msg + jarvis msg
      expect(mockApi.lastQuery, 'What appointments do I have?');

      // Turn 2
      mockApi.nextResponse = JarvisResponse(
        success: true,
        type: JarvisResponseType.actionCompleted,
        intent: 'APPOINTMENTS_QUERY',
        message: 'Dr. Sarah Connor (Cardiology) is your next appointment.',
        executionSteps: [
          const JarvisExecutionStep(
            id: 'step_2',
            toolName: 'get_upcoming_appointments',
            label: 'Checking upcoming medical appointments',
            status: JarvisExecutionStatus.completed,
          )
        ],
        timestamp: DateTime.now(),
      );

      await controller.submitCommand('Which one is coming first?');
      expect(controller.messages.length, 5);
      expect(mockApi.lastQuery, 'Which one is coming first?');
    });

    test('3. High-risk confirmation flow and user cancellation restore clean idle state', () async {
      mockApi.nextResponse = JarvisResponse(
        success: true,
        type: JarvisResponseType.confirmationRequired,
        intent: 'SCHEDULE_DELETE',
        message: 'Delete Morning Walk routine?',
        confirmation: JarvisConfirmation(
          confirmationId: 'conf_test_p14_1',
          tool: 'delete_schedule',
          arguments: const {'scheduleId': 'rot_morning_walk'},
          expiresAt: DateTime.now().add(const Duration(minutes: 5)),
        ),
        executionSteps: [
          const JarvisExecutionStep(
            id: 'step_1',
            toolName: 'delete_schedule',
            label: 'Removing routine from schedule',
            status: JarvisExecutionStatus.waitingConfirmation,
          )
        ],
        timestamp: DateTime.now(),
      );

      await controller.submitCommand('Delete my morning walk');
      expect(controller.pendingConfirmation, isNotNull);
      expect(controller.state, JarvisState.awaitingConfirmation);

      controller.cancelConfirmation();
      expect(controller.pendingConfirmation, isNull);
      expect(controller.state, JarvisState.idle);
    });
  });
}
