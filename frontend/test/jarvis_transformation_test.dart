import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/core/jarvis_colors.dart';
import 'package:wellwisher/features/jarvis/core/jarvis_theme.dart';
import 'package:wellwisher/features/jarvis/models/jarvis_models.dart';
import 'package:wellwisher/features/jarvis/models/proactive_models.dart';
import 'package:wellwisher/features/jarvis/models/health_intelligence_models.dart';
import 'package:wellwisher/features/jarvis/models/workflow_models.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_api_service.dart';
import 'package:wellwisher/features/jarvis/services/proactive_api_service.dart';
import 'package:wellwisher/features/jarvis/services/health_intelligence_api_service.dart';
import 'package:wellwisher/features/jarvis/services/workflow_api_service.dart';
import 'package:wellwisher/features/jarvis/services/voice_input_service.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_tts_service.dart';
import 'package:wellwisher/features/jarvis/widgets/jarvis_core.dart';
import 'package:wellwisher/features/jarvis/widgets/jarvis_waveform.dart';
import 'package:wellwisher/features/jarvis/widgets/jarvis_command_input.dart';
import 'package:wellwisher/features/jarvis/widgets/jarvis_execution_timeline.dart';
import 'package:wellwisher/features/jarvis/widgets/jarvis_timeline.dart';
import 'package:wellwisher/features/jarvis/widgets/jarvis_insight.dart';
import 'package:wellwisher/features/jarvis/widgets/jarvis_attention.dart';
import 'package:wellwisher/features/jarvis/controller/jarvis_home_controller.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_home_screen.dart';

class TestJarvisApiService extends JarvisApiService {
  @override
  Future<JarvisResponse> sendMessage(
    String message, {
    String? conversationId,
    String? timezone,
    String? langCode,
    Map<String, dynamic>? healthContext,
    Map<String, dynamic>? healthGoals,
  }) async {
    return JarvisResponse(
      success: true,
      type: JarvisResponseType.finalResponse,
      intent: 'GENERAL_CONVERSATION',
      message: 'JARVIS processed command successfully.',
      timestamp: DateTime.now(),
    );
  }
}

class TestProactiveApiService extends ProactiveApiService {
  @override
  Future<DailyBriefingModel?> getDailyBriefing() async {
    return DailyBriefingModel(
      title: 'Morning Briefing',
      message: 'Good morning. 2 items scheduled today on your JARVIS timeline.',
    );
  }

  @override
  Future<List<ProactiveEventModel>> getFeed() async => [];
}

class TestHealthApiService extends HealthIntelligenceApiService {
  @override
  Future<List<HealthTrendModel>> getTrends() async => [];

  @override
  Future<List<HealthAlertModel>> getAlerts() async => [];
}

class TestWorkflowApiService extends WorkflowApiService {
  @override
  Future<List<AppointmentItem>> getAppointments({String? status}) async => [];

  @override
  Future<List<WorkflowActionItem>> getWorkflowActions({String? status}) async => [];
}

class TestVoiceService implements IVoiceInputService {
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

class TestTtsService implements IJarvisTtsService {
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
  Future<void> speak(String text, {String? language, VoidCallback? onComplete}) async {
    onComplete?.call();
  }
  @override
  Future<void> stop() async {}
}

JarvisHomeController createTestController() {
  return JarvisHomeController(
    apiService: TestJarvisApiService(),
    proactiveService: TestProactiveApiService(),
    healthService: TestHealthApiService(),
    workflowService: TestWorkflowApiService(),
    voiceService: TestVoiceService(),
    ttsService: TestTtsService(),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 11: JARVIS Design System & Models', () {
    test('JarvisState enum supports all required operational states', () {
      expect(JarvisState.idle, isNotNull);
      expect(JarvisState.listening, isNotNull);
      expect(JarvisState.thinking, isNotNull);
      expect(JarvisState.retrieving, isNotNull);
      expect(JarvisState.executing, isNotNull);
      expect(JarvisState.awaitingConfirmation, isNotNull);
      expect(JarvisState.responding, isNotNull);
      expect(JarvisState.success, isNotNull);
      expect(JarvisState.warning, isNotNull);
      expect(JarvisState.error, isNotNull);
    });

    test('JarvisTheme builds valid dark theme with obsidian background', () {
      final theme = JarvisTheme.darkTheme;
      expect(theme.scaffoldBackgroundColor, JarvisColors.background);
      expect(theme.colorScheme.primary, JarvisColors.cyan);
    });
  });

  group('Phase 11: JARVIS Core & Waveform Widgets', () {
    testWidgets('JarvisCore renders in IDLE state', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Center(
              child: JarvisCore(state: JarvisState.idle),
            ),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('JARVIS READY'), findsOneWidget);
    });

    testWidgets('JarvisCore renders in LISTENING state with mic icon', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Center(
              child: JarvisCore(state: JarvisState.listening),
            ),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('LISTENING...'), findsOneWidget);
      expect(find.byIcon(Icons.mic), findsOneWidget);
    });

    testWidgets('JarvisWaveform renders active bars when listening', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Center(
              child: JarvisWaveform(isActive: true),
            ),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(JarvisWaveform), findsOneWidget);
    });
  });

  group('Phase 11: Execution Timeline & Command Input', () {
    testWidgets('JarvisExecutionTimeline displays multi-step tool progress', (tester) async {
      final steps = [
        const JarvisExecutionStep(id: '1', label: 'Found appointment', status: JarvisExecutionStatus.completed),
        const JarvisExecutionStep(id: '2', label: 'Analyzing reports', status: JarvisExecutionStatus.running),
        const JarvisExecutionStep(id: '3', label: 'Generating briefing', status: JarvisExecutionStatus.pending),
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: JarvisExecutionTimeline(steps: steps),
          ),
        ),
      );

      expect(find.text('Found appointment'), findsOneWidget);
      expect(find.text('Analyzing reports'), findsOneWidget);
      expect(find.text('Generating briefing'), findsOneWidget);
      expect(find.byIcon(Icons.check), findsOneWidget);
    });

    testWidgets('JarvisCommandInput handles text submission and quick actions', (tester) async {
      final controller = TextEditingController();
      String? submittedText;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: JarvisCommandInput(
              controller: controller,
              state: JarvisState.idle,
              onSubmitted: (val) => submittedText = val,
              onMicTap: () {},
            ),
          ),
        ),
      );

      // Find quick action chip
      expect(find.text('Plan my day'), findsOneWidget);
      await tester.tap(find.text('Plan my day'));
      await tester.pump();
      expect(submittedText, 'Plan my day');

      // Enter text and submit
      await tester.enterText(find.byType(TextField), 'Prepare my doctor briefing');
      await tester.pump();
      expect(find.byIcon(Icons.arrow_upward_rounded), findsOneWidget);

      await tester.tap(find.byIcon(Icons.arrow_upward_rounded));
      await tester.pump();
      expect(submittedText, 'Prepare my doctor briefing');
    });
  });

  group('Phase 11: Unified Life Timeline & Insights', () {
    testWidgets('JarvisTimeline renders diverse life categories', (tester) async {
      final items = [
        const JarvisTimelineItem(
          id: '1',
          time: '08:00 AM',
          title: 'Morning Routine & Hydration',
          category: JarvisTimelineCategory.routine,
        ),
        const JarvisTimelineItem(
          id: '2',
          time: '10:30 AM',
          title: 'Doctor Appointment (Dr. Smith)',
          category: JarvisTimelineCategory.appointment,
          isPendingAttention: true,
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: JarvisTimeline(items: items),
          ),
        ),
      );

      expect(find.text('Morning Routine & Hydration'), findsOneWidget);
      expect(find.text('Doctor Appointment (Dr. Smith)'), findsOneWidget);
      expect(find.text('ATTENTION'), findsOneWidget);
    });

    testWidgets('JarvisInsight renders biomarker differentials and clinician questions', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: JarvisInsight(
              biomarkerName: 'LDL Cholesterol',
              previousValue: '110',
              currentValue: '145',
              unit: 'mg/dL',
              percentageChange: 31.8,
              explanation: 'Your LDL changed from 110 to 145 mg/dL between reports.',
              clinicianDiscussionQuestions: [
                'What could explain this change?',
                'Should this value be monitored again?',
              ],
            ),
          ),
        ),
      );

      expect(find.text('LDL Cholesterol'), findsOneWidget);
      expect(find.text('+31.8%'), findsOneWidget);
      expect(find.text('What could explain this change?'), findsOneWidget);
      expect(find.textContaining('informational purposes only'), findsOneWidget);
    });

    testWidgets('JarvisAttention renders confirmation approval actions', (tester) async {
      bool approved = false;
      final confirmation = JarvisConfirmation(
        confirmationId: 'conf_1234567890',
        tool: 'delete_schedule',
        arguments: {'id': 'sched_1'},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: JarvisAttention(
              title: 'Routine Removal Consent',
              description: 'Approve deleting routine item.',
              confirmation: confirmation,
              onConfirm: () => approved = true,
            ),
          ),
        ),
      );

      expect(find.text('JARVIS APPROVAL REQUIRED'), findsOneWidget);
      expect(find.text('Tool: delete_schedule'), findsOneWidget);
      await tester.tap(find.text('Approve & Execute'));
      await tester.pump();
      expect(approved, isTrue);
    });
  });

  group('Phase 11: Screen Rendering & Responsive Layouts', () {
    testWidgets('JarvisHomeScreen renders on mobile layout', (tester) async {
      tester.view.physicalSize = const Size(400, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final ctrl = createTestController();

      await tester.pumpWidget(
        MaterialApp(
          home: JarvisHomeScreen(controller: ctrl),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('JARVIS'), findsAtLeastNWidgets(1));
      expect(find.byType(JarvisCore), findsOneWidget);
      expect(find.byIcon(Icons.mic_none_rounded), findsOneWidget);
    });

    testWidgets('JarvisHomeScreen renders on desktop 3-column layout', (tester) async {
      tester.view.physicalSize = const Size(1200, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final ctrl = createTestController();

      await tester.pumpWidget(
        MaterialApp(
          home: JarvisHomeScreen(controller: ctrl),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('JARVIS'), findsAtLeastNWidgets(1));
      expect(find.byType(JarvisCore), findsOneWidget);
      expect(find.byIcon(Icons.mic_none_rounded), findsOneWidget);
    });
  });
}
