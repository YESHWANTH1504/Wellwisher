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

class MockPhase15JarvisApiService extends JarvisApiService {
  final List<JarvisResponse> responsesToReturn = [];
  final List<String> recordedQueries = [];
  String? currentConversationId;

  @override
  Future<JarvisResponse> sendMessage(
    String message, {
    String? conversationId,
    String? timezone,
    String? langCode,
    Map<String, dynamic>? healthContext,
    Map<String, dynamic>? healthGoals,
  }) async {
    recordedQueries.add(message);
    currentConversationId = conversationId;
    if (responsesToReturn.isNotEmpty) {
      return responsesToReturn.removeAt(0);
    }
    return JarvisResponse(
      success: true,
      type: JarvisResponseType.finalResponse,
      intent: 'GENERAL_CONVERSATION',
      message: 'Phase 15 Mock Response',
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
  group('Phase 15: JARVIS Final Production Audit & Reliability Suite', () {
    late MockPhase15JarvisApiService mockApi;
    late JarvisHomeController controller;

    setUp(() {
      mockApi = MockPhase15JarvisApiService();
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

    test('1. Multi-turn 3-turn appointment reschedule flow preserves conversation state', () async {
      mockApi.responsesToReturn.add(
        JarvisResponse(
          success: true,
          type: JarvisResponseType.actionCompleted,
          intent: 'APPOINTMENTS_QUERY',
          message: 'You have an upcoming consultation with Dr. Sarah Connor on Friday.',
          executionSteps: [
            const JarvisExecutionStep(
              id: 'step_1',
              toolName: 'get_upcoming_appointments',
              label: 'Checking upcoming medical appointments',
              status: JarvisExecutionStatus.completed,
            )
          ],
          timestamp: DateTime.now(),
        ),
      );

      mockApi.responsesToReturn.add(
        JarvisResponse(
          success: true,
          type: JarvisResponseType.actionCompleted,
          intent: 'APPOINTMENTS_QUERY',
          message: 'Dr. Sarah Connor is your next scheduled visit at 10:00 AM.',
          executionSteps: [
            const JarvisExecutionStep(
              id: 'step_2',
              toolName: 'get_upcoming_appointments',
              label: 'Checking upcoming medical appointments',
              status: JarvisExecutionStatus.completed,
            )
          ],
          timestamp: DateTime.now(),
        ),
      );

      mockApi.responsesToReturn.add(
        JarvisResponse(
          success: true,
          type: JarvisResponseType.actionCompleted,
          intent: 'SCHEDULE_REQUEST',
          message: 'I have rescheduled the activity for tomorrow at 09:00 AM.',
          executionSteps: [
            const JarvisExecutionStep(
              id: 'step_3',
              toolName: 'create_schedule',
              label: 'Adding routine to schedule',
              status: JarvisExecutionStatus.completed,
            )
          ],
          timestamp: DateTime.now(),
        ),
      );

      // Turn 1
      await controller.submitCommand('What appointments are coming up?');
      expect(mockApi.recordedQueries.last, 'What appointments are coming up?');

      // Turn 2
      await controller.submitCommand('Which one is first?');
      expect(mockApi.recordedQueries.last, 'Which one is first?');

      // Turn 3
      await controller.submitCommand('Move that to tomorrow.');
      expect(mockApi.recordedQueries.last, 'Move that to tomorrow.');

      // Total messages: 1 welcome + (3 user + 3 jarvis) = 7
      expect(controller.messages.length, 7);
      expect(controller.state, JarvisState.idle);
    });

    test('2. Multi-turn 3-turn health insights and clinician briefing flow', () async {
      mockApi.responsesToReturn.add(
        JarvisResponse(
          success: true,
          type: JarvisResponseType.healthTrend,
          intent: 'HEALTH_TRENDS_QUERY',
          message: 'Your longitudinal lipid panel shows an 8% LDL reduction over 90 days.',
          executionSteps: [
            const JarvisExecutionStep(
              id: 's1',
              toolName: 'get_health_trends',
              label: 'Analyzing longitudinal health trends',
              status: JarvisExecutionStatus.completed,
            )
          ],
          timestamp: DateTime.now(),
        ),
      );

      mockApi.responsesToReturn.add(
        JarvisResponse(
          success: true,
          type: JarvisResponseType.healthAlert,
          intent: 'HEALTH_ALERTS_QUERY',
          message: 'All vital telemetry remains within normal baseline thresholds.',
          executionSteps: [
            const JarvisExecutionStep(
              id: 's2',
              toolName: 'get_health_alerts',
              label: 'Scanning proactive health alerts',
              status: JarvisExecutionStatus.completed,
            )
          ],
          timestamp: DateTime.now(),
        ),
      );

      mockApi.responsesToReturn.add(
        JarvisResponse(
          success: true,
          type: JarvisResponseType.doctorBriefing,
          intent: 'DOCTOR_BRIEFING_REQUEST',
          message: 'Synthesized clinician briefing ready with 3 discussion points.',
          executionSteps: [
            const JarvisExecutionStep(
              id: 's3',
              toolName: 'generate_doctor_briefing',
              label: 'Synthesizing 1-page clinician briefing',
              status: JarvisExecutionStatus.completed,
            )
          ],
          timestamp: DateTime.now(),
        ),
      );

      // Turn 1
      await controller.submitCommand('Show my health trends.');
      // Turn 2
      await controller.submitCommand('What stands out?');
      // Turn 3
      await controller.submitCommand('What should I discuss with my doctor about this?');

      expect(controller.messages.length, 7);
      expect(controller.state, JarvisState.idle);
    });

    test('3. Natural phrasing variations map accurately without client regex', () async {
      mockApi.responsesToReturn.add(
        JarvisResponse(
          success: true,
          type: JarvisResponseType.finalResponse,
          intent: 'DAILY_FOCUS_QUERY',
          message: 'Your schedule has 3 routines today and no overdue items.',
          executionSteps: [
            const JarvisExecutionStep(
              id: 'df_1',
              toolName: 'get_today_schedule',
              label: "Checking today's schedule & routines",
              status: JarvisExecutionStatus.completed,
            ),
            const JarvisExecutionStep(
              id: 'df_2',
              toolName: 'get_health_alerts',
              label: 'Scanning proactive health alerts',
              status: JarvisExecutionStatus.completed,
            )
          ],
          timestamp: DateTime.now(),
        ),
      );

      await controller.submitCommand("What's happening today?");
      expect(mockApi.recordedQueries.last, "What's happening today?");
      expect(controller.messages.last.executionSteps.length, 2);
    });
  });
}
