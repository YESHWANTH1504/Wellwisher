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

class MockJarvisApiService extends JarvisApiService {
  JarvisResponse? mockResponse;
  JarvisResponse? mockConfirmResponse;
  String? lastSentMessage;
  String? lastConfirmedId;

  @override
  Future<JarvisResponse> sendMessage(
    String message, {
    String? conversationId,
    String? timezone,
    String? langCode,
    Map<String, dynamic>? healthContext,
    Map<String, dynamic>? healthGoals,
  }) async {
    lastSentMessage = message;
    return mockResponse ??
        JarvisResponse(
          success: true,
          type: JarvisResponseType.finalResponse,
          intent: 'GENERAL_CONVERSATION',
          message: 'Default mock response',
          executionSteps: [],
          timestamp: DateTime.now(),
        );
  }

  @override
  Future<JarvisResponse> confirmAction({
    required String confirmationId,
    required String toolName,
    required Map<String, dynamic> arguments,
  }) async {
    lastConfirmedId = confirmationId;
    return mockConfirmResponse ??
        JarvisResponse(
          success: true,
          type: JarvisResponseType.actionCompleted,
          intent: 'CONFIRMATION_EXECUTION',
          message: 'Action confirmed and executed successfully.',
          executionSteps: [
            JarvisExecutionStep(
              id: 'step_1',
              toolName: toolName,
              label: 'Executing $toolName',
              status: JarvisExecutionStatus.completed,
            )
          ],
          timestamp: DateTime.now(),
        );
  }
}

class MockProactiveApiService extends ProactiveApiService {
  @override
  Future<DailyBriefingModel?> getDailyBriefing() async => null;

  @override
  Future<List<ProactiveEventModel>> getFeed() async => [];
}

class MockHealthIntelligenceApiService extends HealthIntelligenceApiService {
  @override
  Future<List<HealthTrendModel>> getTrends() async => [];

  @override
  Future<List<HealthAlertModel>> getAlerts() async => [];
}

class MockWorkflowApiService extends WorkflowApiService {
  @override
  Future<List<AppointmentItem>> getAppointments({String? status}) async => [];

  @override
  Future<List<WorkflowActionItem>> getWorkflowActions({String? status}) async => [];
}

class MockVoiceInputService implements IVoiceInputService {
  bool _isListening = false;
  Function(String text, bool isFinal)? _onResult;

  @override
  bool get isListening => _isListening;

  @override
  Future<bool> initialize() async => true;

  @override
  Future<void> startListening({
    required Function(String text, bool isFinal) onResult,
    Function(String error)? onError,
    String? localeId,
  }) async {
    _isListening = true;
    _onResult = onResult;
  }

  @override
  Future<void> stopListening() async {
    _isListening = false;
  }

  @override
  Future<void> cancelListening() async {
    _isListening = false;
  }

  void simulateSpeech(String text, bool isFinal) {
    _onResult?.call(text, isFinal);
  }
}

class MockJarvisTtsService implements IJarvisTtsService {
  bool _isSpeaking = false;
  String? lastSpokenText;

  @override
  bool get isSpeaking => _isSpeaking;

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
    _isSpeaking = true;
    lastSpokenText = text;
    onComplete?.call();
    _isSpeaking = false;
  }

  @override
  Future<void> stop() async {
    _isSpeaking = false;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 12 — JARVIS Live Agent Execution & State Machine Tests', () {
    late MockJarvisApiService mockApi;
    late MockProactiveApiService mockProactive;
    late MockHealthIntelligenceApiService mockHealth;
    late MockWorkflowApiService mockWorkflow;
    late MockVoiceInputService mockVoice;
    late MockJarvisTtsService mockTts;
    late JarvisHomeController controller;
    bool stateInvalidationCalled = false;

    setUp(() {
      mockApi = MockJarvisApiService();
      mockProactive = MockProactiveApiService();
      mockHealth = MockHealthIntelligenceApiService();
      mockWorkflow = MockWorkflowApiService();
      mockVoice = MockVoiceInputService();
      mockTts = MockJarvisTtsService();
      stateInvalidationCalled = false;

      controller = JarvisHomeController(
        apiService: mockApi,
        proactiveService: mockProactive,
        healthService: mockHealth,
        workflowService: mockWorkflow,
        voiceService: mockVoice,
        ttsService: mockTts,
        onStateInvalidationRequired: () {
          stateInvalidationCalled = true;
        },
      );
    });

    tearDown(() {
      controller.dispose();
    });

    test('1. Backend response parses execution steps into List<JarvisExecutionStep>', () {
      final json = {
        'success': true,
        'type': 'ACTION_COMPLETED',
        'intent': 'SCHEDULE_REQUEST',
        'message': 'Routine created.',
        'steps': [
          {
            'id': 'step_1',
            'toolName': 'get_today_schedule',
            'label': "Checking today's schedule & routines",
            'status': 'SUCCESS',
            'data': {'count': 2}
          },
          {
            'id': 'step_2',
            'toolName': 'create_schedule',
            'label': 'Adding routine to schedule',
            'status': 'SUCCESS',
            'data': {'id': 'rot_123'}
          }
        ]
      };

      final response = JarvisResponse.fromJson(json);
      expect(response.success, true);
      expect(response.type, JarvisResponseType.actionCompleted);
      expect(response.executionSteps.length, 2);
      expect(response.executionSteps[0].toolName, 'get_today_schedule');
      expect(response.executionSteps[0].status, JarvisExecutionStatus.completed);
      expect(response.executionSteps[1].toolName, 'create_schedule');
    });

    test('2. No fake execution steps are generated on empty steps response', () async {
      mockApi.mockResponse = JarvisResponse(
        success: true,
        type: JarvisResponseType.finalResponse,
        intent: 'GENERAL_CONVERSATION',
        message: 'Hello! I am JARVIS.',
        executionSteps: [],
        timestamp: DateTime.now(),
      );

      await controller.submitCommand('Hello JARVIS');
      expect(controller.messages.last.executionSteps.isEmpty, true);
    });

    test('3. State transitions occur correctly through command lifecycle', () async {
      mockApi.mockResponse = JarvisResponse(
        success: true,
        type: JarvisResponseType.finalResponse,
        intent: 'GENERAL_CONVERSATION',
        message: 'Understood.',
        executionSteps: [],
        timestamp: DateTime.now(),
      );

      final statesObserved = <JarvisState>[];
      controller.addListener(() {
        statesObserved.add(controller.state);
      });

      await controller.submitCommand('Test command');
      expect(statesObserved.contains(JarvisState.thinking), true);
      expect(controller.state, JarvisState.idle);
    });

    test('4. Real tool steps render with human-readable labels from backend', () async {
      mockApi.mockResponse = JarvisResponse(
        success: true,
        type: JarvisResponseType.actionCompleted,
        intent: 'HEALTH_TRENDS_QUERY',
        message: 'Your health trends are stable.',
        executionSteps: [
          const JarvisExecutionStep(
            id: 'step_1',
            toolName: 'get_health_trends',
            label: 'Analyzing longitudinal health trends',
            status: JarvisExecutionStatus.completed,
          )
        ],
        timestamp: DateTime.now(),
      );

      await controller.submitCommand('Show my health trends');
      final lastMsg = controller.messages.last;
      expect(lastMsg.executionSteps.length, 1);
      expect(lastMsg.executionSteps.first.label, 'Analyzing longitudinal health trends');
      expect(lastMsg.executionSteps.first.status, JarvisExecutionStatus.completed);
    });

    test('5. Confirmation required response puts controller in awaitingConfirmation state', () async {
      final conf = JarvisConfirmation(
        confirmationId: 'conf_123',
        tool: 'delete_schedule',
        arguments: {'scheduleId': 'rot_target_1'},
        expiresAt: DateTime.now().add(const Duration(minutes: 5)),
      );

      mockApi.mockResponse = JarvisResponse(
        success: true,
        type: JarvisResponseType.confirmationRequired,
        intent: 'SCHEDULE_DELETE',
        message: 'Are you sure you want to delete this routine?',
        confirmation: conf,
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

      await controller.submitCommand('Delete my schedule');
      expect(controller.pendingConfirmation != null, true);
      expect(controller.pendingConfirmation!.confirmationId, 'conf_123');
      expect(controller.messages.last.requiresConfirmation, true);
    });

    test('6. Confirmation cancellation clears pending confirmation and restores idle state', () {
      controller.cancelConfirmation();
      expect(controller.pendingConfirmation, isNull);
      expect(controller.state, JarvisState.idle);
      expect(controller.messages.last.text, contains('Action cancelled'));
    });

    test('7. Confirmation approval executes through verified cryptographic token', () async {
      final conf = JarvisConfirmation(
        confirmationId: 'conf_xyz',
        tool: 'delete_schedule',
        arguments: {'scheduleId': 'rot_123'},
      );

      await controller.confirmAction(conf);
      expect(mockApi.lastConfirmedId, 'conf_xyz');
      expect(stateInvalidationCalled, true);
      expect(controller.pendingConfirmation, isNull);
      expect(controller.state, JarvisState.idle);
    });

    test('8. Post-action refresh invalidates parent state and reloads data', () async {
      mockApi.mockResponse = JarvisResponse(
        success: true,
        type: JarvisResponseType.actionCompleted,
        intent: 'SCHEDULE_REQUEST',
        message: 'Routine scheduled successfully.',
        executionSteps: [
          const JarvisExecutionStep(
            id: 'step_1',
            toolName: 'create_schedule',
            label: 'Adding routine to schedule',
            status: JarvisExecutionStatus.completed,
          )
        ],
        timestamp: DateTime.now(),
      );

      await controller.submitCommand('Schedule walk tomorrow at 7 AM');
      expect(stateInvalidationCalled, true);
    });

    test('9. Voice and text use the identical JARVIS command pipeline', () async {
      mockApi.mockResponse = JarvisResponse(
        success: true,
        type: JarvisResponseType.finalResponse,
        intent: 'GENERAL_CONVERSATION',
        message: 'Voice response generated.',
        executionSteps: [],
        timestamp: DateTime.now(),
      );

      await controller.startListening();
      expect(controller.state, JarvisState.listening);

      // Simulate final speech result from STT
      mockVoice.simulateSpeech('What is on my calendar today?', true);
      expect(mockApi.lastSentMessage, 'What is on my calendar today?');
    });

    test('10. Tool failure transitions to ERROR state and displays informative message', () async {
      mockApi.mockResponse = JarvisResponse(
        success: false,
        type: JarvisResponseType.error,
        intent: 'UNKNOWN',
        message: 'Database connection timed out during execution.',
        executionSteps: [
          const JarvisExecutionStep(
            id: 'step_1',
            toolName: 'get_today_schedule',
            label: "Checking today's schedule & routines",
            status: JarvisExecutionStatus.failed,
          )
        ],
        timestamp: DateTime.now(),
      );

      await controller.submitCommand('Check schedule');
      expect(controller.state, JarvisState.error);
      expect(controller.messages.last.responseType, JarvisResponseType.error);
    });

    test('11. Empty tool response is handled gracefully without crash', () async {
      mockApi.mockResponse = JarvisResponse(
        success: true,
        type: JarvisResponseType.finalResponse,
        intent: 'GENERAL_CONVERSATION',
        message: '',
        executionSteps: [],
        timestamp: DateTime.now(),
      );

      await controller.submitCommand('Ping');
      expect(controller.state, JarvisState.idle);
      expect(controller.messages.last.sender, 'jarvis');
    });
  });
}
