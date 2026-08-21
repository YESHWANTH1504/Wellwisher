import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/models/jarvis_models.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_api_service.dart';
import 'package:wellwisher/features/jarvis/services/voice_input_service.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_tts_service.dart';
import 'package:wellwisher/features/jarvis/controller/jarvis_controller.dart';
import 'package:wellwisher/features/jarvis/widgets/jarvis_orb.dart';
import 'package:wellwisher/features/jarvis/widgets/confirmation_card.dart';
import 'package:wellwisher/features/jarvis/widgets/action_card.dart';
import 'package:wellwisher/features/jarvis/widgets/jarvis_chat_bubble.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_screen.dart';

// Mock Services for Testing
class MockJarvisApiService extends JarvisApiService {
  JarvisResponse? nextResponse;
  bool confirmCalled = false;

  @override
  Future<JarvisResponse> sendMessage(
    String message, {
    String? conversationId,
    String? timezone,
    String? langCode,
  }) async {
    return nextResponse ??
        JarvisResponse(
          success: true,
          type: JarvisResponseType.finalResponse,
          intent: 'GENERAL_CONVERSATION',
          message: 'Mock response for: $message',
          timestamp: DateTime.now(),
        );
  }

  @override
  Future<JarvisResponse> confirmAction({
    required String confirmationId,
    required String toolName,
    required Map<String, dynamic> arguments,
  }) async {
    confirmCalled = true;
    return JarvisResponse(
      success: true,
      type: JarvisResponseType.actionCompleted,
      intent: 'SCHEDULE_DELETE',
      message: 'Action confirmed successfully.',
      timestamp: DateTime.now(),
    );
  }
}

class MockVoiceInputService implements IVoiceInputService {
  bool listening = false;

  @override
  bool get isListening => listening;

  @override
  Future<bool> initialize() async => true;

  @override
  Future<void> startListening({
    required Function(String text, bool isFinal) onResult,
    Function(String error)? onError,
    String? localeId,
  }) async {
    listening = true;
    onResult('Mock speech transcript', true);
  }

  @override
  Future<void> stopListening() async {
    listening = false;
  }

  @override
  Future<void> cancelListening() async {
    listening = false;
  }
}

class MockJarvisTtsService implements IJarvisTtsService {
  bool speaking = false;
  String? lastSpokenText;

  @override
  bool get isSpeaking => speaking;

  @override
  Future<void> speak(String text, {String? language, VoidCallback? onComplete}) async {
    speaking = true;
    lastSpokenText = text;
    onComplete?.call();
    speaking = false;
  }

  @override
  Future<void> stop() async {
    speaking = false;
  }
}

void main() {
  group('Phase 5 - JARVIS Model Serialization Tests', () {
    test('1. Parses FINAL_RESPONSE from backend payload', () {
      final json = {
        'success': true,
        'type': 'FINAL_RESPONSE',
        'intent': 'GENERAL_CONVERSATION',
        'message': 'Hello, how can I assist you?',
        'timestamp': '2026-08-20T10:00:00.000Z'
      };

      final res = JarvisResponse.fromJson(json);
      assert(res.success == true);
      assert(res.type == JarvisResponseType.finalResponse);
      assert(res.message == 'Hello, how can I assist you?');
    });

    test('2. Parses CONFIRMATION_REQUIRED payload', () {
      final json = {
        'success': true,
        'type': 'CONFIRMATION_REQUIRED',
        'intent': 'SCHEDULE_DELETE',
        'message': 'Delete dentist appointment?',
        'data': {
          'requiresConfirmation': true,
          'confirmation': {
            'confirmationId': 'conf_123',
            'tool': 'delete_schedule',
            'arguments': {'scheduleId': 'rot_1'},
            'expiresAt': '2026-08-20T10:05:00.000Z'
          }
        }
      };

      final res = JarvisResponse.fromJson(json);
      assert(res.type == JarvisResponseType.confirmationRequired);
      assert(res.confirmation != null);
      assert(res.confirmation!.confirmationId == 'conf_123');
      assert(res.confirmation!.tool == 'delete_schedule');
    });

    test('3. Parses ACTION_COMPLETED payload', () {
      final json = {
        'success': true,
        'type': 'ACTION_COMPLETED',
        'intent': 'SCHEDULE_REQUEST',
        'message': 'Workout scheduled.',
        'data': {
          'action': {
            'type': 'create_schedule',
            'data': {'title': 'Morning Workout', 'time': '06:00 AM'}
          }
        }
      };

      final res = JarvisResponse.fromJson(json);
      assert(res.type == JarvisResponseType.actionCompleted);
      assert(res.action != null);
      assert(res.action!.type == 'create_schedule');
    });
  });

  group('Phase 5 - JarvisController State Management Tests', () {
    late MockJarvisApiService mockApi;
    late MockVoiceInputService mockVoice;
    late MockJarvisTtsService mockTts;
    late JarvisController controller;
    bool invalidationTriggered = false;

    setUp(() {
      mockApi = MockJarvisApiService();
      mockVoice = MockVoiceInputService();
      mockTts = MockJarvisTtsService();
      invalidationTriggered = false;

      controller = JarvisController(
        apiService: mockApi,
        voiceService: mockVoice,
        ttsService: mockTts,
        onStateInvalidationRequired: () {
          invalidationTriggered = true;
        },
      );
    });

    test('1. Controller starts with initial welcome message and idle orb state', () {
      expect(controller.orbState, JarvisOrbState.idle);
      expect(controller.messages.length, 1);
      expect(controller.messages.first.isJarvis, true);
    });

    test('2. Submitting text message adds user message, calls API, and plays TTS', () async {
      await controller.submitMessage('Schedule gym tomorrow at 6 AM');
      expect(controller.messages.length, 3); // 1 initial welcome + 1 user turn + 1 JARVIS turn
      expect(controller.messages.last.isJarvis, true);
      expect(mockTts.lastSpokenText, isNotNull);
    });

    test('3. Confirmation required response updates pendingConfirmation state', () async {
      mockApi.nextResponse = JarvisResponse(
        success: true,
        type: JarvisResponseType.confirmationRequired,
        intent: 'SCHEDULE_DELETE',
        message: 'Confirm deletion?',
        confirmation: JarvisConfirmation(
          confirmationId: 'conf_test',
          tool: 'delete_schedule',
          arguments: {'scheduleId': 'rot_test'},
        ),
        timestamp: DateTime.now(),
      );

      await controller.submitMessage('Delete my appointment');
      expect(controller.orbState, JarvisOrbState.waitingForConfirmation);
      expect(controller.pendingConfirmation, isNotNull);
      expect(controller.pendingConfirmation!.confirmationId, 'conf_test');
    });

    test('4. Confirming pending action executes and triggers state invalidation', () async {
      final conf = JarvisConfirmation(
        confirmationId: 'conf_test',
        tool: 'delete_schedule',
        arguments: {'scheduleId': 'rot_test'},
      );

      await controller.confirmPendingAction(conf);
      expect(mockApi.confirmCalled, true);
      expect(invalidationTriggered, true);
      expect(controller.pendingConfirmation, isNull);
    });

    test('5. Canceling pending action restores idle state', () {
      controller.cancelPendingAction();
      expect(controller.pendingConfirmation, isNull);
      expect(controller.orbState, JarvisOrbState.idle);
    });
  });

  group('Phase 5 - JARVIS Widget & UI Tests', () {
    testWidgets('1. JarvisOrb renders correctly across states', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: Center(
              child: JarvisOrb(state: JarvisOrbState.listening),
            ),
          ),
        ),
      );

      expect(find.byType(JarvisOrb), findsOneWidget);
    });

    testWidgets('2. ConfirmationCard renders details and buttons', (tester) async {
      bool confirmed = false;
      bool cancelled = false;

      final conf = JarvisConfirmation(
        confirmationId: 'conf_1',
        tool: 'delete_schedule',
        arguments: {'title': 'Dentist Appointment', 'time': '03:00 PM'},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ConfirmationCard(
              confirmation: conf,
              onConfirm: () => confirmed = true,
              onCancel: () => cancelled = true,
            ),
          ),
        ),
      );

      expect(find.text('Delete Scheduled Item'), findsOneWidget);
      expect(find.text('• title: Dentist Appointment'), findsOneWidget);

      await tester.tap(find.text('Confirm'));
      expect(confirmed, true);

      await tester.tap(find.text('Cancel'));
      expect(cancelled, true);
    });

    testWidgets('3. ActionCard renders schedule details', (tester) async {
      final action = JarvisAction(
        type: 'create_schedule',
        data: {'title': 'Client Review', 'date': '2026-08-21', 'time': '10:00 AM'},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ActionCard(action: action),
          ),
        ),
      );

      expect(find.text('Client Review'), findsOneWidget);
      expect(find.text('2026-08-21 at 10:00 AM'), findsOneWidget);
    });

    testWidgets('4. JarvisScreen renders with accessible Talk to JARVIS microphone', (tester) async {
      final mockApi = MockJarvisApiService();
      final mockVoice = MockVoiceInputService();
      final mockTts = MockJarvisTtsService();
      final controller = JarvisController(
        apiService: mockApi,
        voiceService: mockVoice,
        ttsService: mockTts,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: JarvisScreen(controller: controller),
        ),
      );

      expect(find.text('JARVIS AI Companion'), findsOneWidget);
      expect(find.byType(JarvisOrb), findsOneWidget);
      expect(find.bySemanticsLabel('Talk to JARVIS'), findsOneWidget);
    });
  });
}
