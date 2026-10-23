import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/models/jarvis_models.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_api_service.dart';
import 'package:wellwisher/features/jarvis/services/voice_input_service.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_tts_service.dart';
import 'package:wellwisher/features/jarvis/controller/jarvis_controller.dart';
import 'package:wellwisher/features/jarvis/widgets/jarvis_core.dart';
import 'package:wellwisher/features/jarvis/widgets/jarvis_state_indicator.dart';
import 'package:wellwisher/features/jarvis/widgets/jarvis_message_bubble.dart';
import 'package:wellwisher/features/jarvis/widgets/jarvis_typing_indicator.dart';
import 'package:wellwisher/features/jarvis/widgets/jarvis_quick_action.dart';
import 'package:wellwisher/features/jarvis/widgets/confirmation_card.dart';
import 'package:wellwisher/features/jarvis/widgets/action_card.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_screen.dart';

// Mock Services for Testing
class MockJarvisApiService extends JarvisApiService {
  JarvisResponse? nextResponse;
  bool throwNetworkError = false;
  bool throwAuthError = false;
  bool throwTimeout = false;
  bool confirmCalled = false;
  String? lastSentMessage;

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
    if (throwNetworkError) {
      return JarvisResponse(
        success: false,
        type: JarvisResponseType.error,
        intent: 'UNKNOWN',
        message: 'I could not connect to my server. Please check your network connection.',
        errorCode: 'NETWORK_ERROR',
        timestamp: DateTime.now(),
      );
    }
    if (throwAuthError) {
      return JarvisResponse(
        success: false,
        type: JarvisResponseType.error,
        intent: 'UNAUTHORIZED',
        message: 'Authentication session expired. Please log in again.',
        errorCode: 'AUTH_EXPIRED',
        timestamp: DateTime.now(),
      );
    }
    if (throwTimeout) {
      return JarvisResponse(
        success: false,
        type: JarvisResponseType.error,
        intent: 'TIMEOUT',
        message: 'Request timed out waiting for server response.',
        errorCode: 'TIMEOUT',
        timestamp: DateTime.now(),
      );
    }
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
      intent: 'CONFIRMATION_EXECUTION',
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
  group('Phase 10.1 - JARVIS Unit & Serialization Tests', () {
    test('1. JARVIS API request serialization', () {
      final json = {
        'success': true,
        'type': 'FINAL_RESPONSE',
        'intent': 'GENERAL_CONVERSATION',
        'message': 'Hello, how can I assist you?',
        'timestamp': '2026-08-24T10:00:00.000Z'
      };

      final res = JarvisResponse.fromJson(json);
      expect(res.success, true);
      expect(res.type, JarvisResponseType.finalResponse);
      expect(res.message, 'Hello, how can I assist you?');
    });

    test('2. Successful response parsing with action payload', () {
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
      expect(res.type, JarvisResponseType.actionCompleted);
      expect(res.action, isNotNull);
      expect(res.action!.type, 'create_schedule');
    });

    test('3. Authentication failure handling', () {
      final json = {
        'success': false,
        'type': 'ERROR',
        'intent': 'UNAUTHORIZED',
        'message': 'Authentication session expired. Please log in again.',
        'errorCode': 'TOKEN_EXPIRED'
      };

      final res = JarvisResponse.fromJson(json);
      expect(res.success, false);
      expect(res.type, JarvisResponseType.error);
      expect(res.errorCode, 'TOKEN_EXPIRED');
    });

    test('4. Network failure handling', () {
      final json = {
        'success': false,
        'type': 'ERROR',
        'intent': 'NETWORK_ERROR',
        'message': 'Connection refused',
        'errorCode': 'NETWORK_ERROR'
      };

      final res = JarvisResponse.fromJson(json);
      expect(res.type, JarvisResponseType.error);
      expect(res.errorCode, 'NETWORK_ERROR');
    });

    test('5. Timeout handling', () {
      final json = {
        'success': false,
        'type': 'ERROR',
        'message': 'Request timed out',
        'errorCode': 'TIMEOUT'
      };

      final res = JarvisResponse.fromJson(json);
      expect(res.type, JarvisResponseType.error);
      expect(res.errorCode, 'TIMEOUT');
    });

    test('6. Empty response handling with safe defaults', () {
      final json = <String, dynamic>{};
      final res = JarvisResponse.fromJson(json);
      expect(res.success, false);
      expect(res.message, 'Response received from JARVIS.');
    });
  });

  group('Phase 10.1 - JarvisController Lifecycle & State Tests', () {
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

    test('7. Thinking state during active request', () async {
      expect(controller.orbState, JarvisOrbState.idle);
      final submitFuture = controller.submitMessage('Show my health trends.');
      expect(controller.messages.any((m) => m.text == 'Show my health trends.'), true);
      await submitFuture;
      expect(controller.orbState, JarvisOrbState.idle);
    });

    test('8. Error state on API exception', () async {
      mockApi.throwNetworkError = true;
      await controller.submitMessage('Hello JARVIS');
      expect(controller.orbState, JarvisOrbState.error);
      expect(controller.messages.last.responseType, JarvisResponseType.error);
    });

    test('9. Retry action clears error and sends query', () async {
      mockApi.throwNetworkError = true;
      await controller.submitMessage('Hello JARVIS');
      expect(controller.orbState, JarvisOrbState.error);

      mockApi.throwNetworkError = false;
      await controller.submitMessage('Hello JARVIS');
      expect(controller.orbState, JarvisOrbState.idle);
      expect(controller.messages.last.responseType, JarvisResponseType.finalResponse);
    });

    test('10. Confirmation required and confirmation cancellation', () async {
      mockApi.nextResponse = JarvisResponse(
        success: true,
        type: JarvisResponseType.confirmationRequired,
        intent: 'SCHEDULE_DELETE',
        message: 'Confirm deletion of 10 AM meeting?',
        confirmation: JarvisConfirmation(
          confirmationId: 'conf_999',
          tool: 'delete_schedule',
          arguments: {'scheduleId': 'rot_999'},
        ),
        timestamp: DateTime.now(),
      );

      await controller.submitMessage('Delete meeting');
      expect(controller.orbState, JarvisOrbState.waitingForConfirmation);
      expect(controller.pendingConfirmation, isNotNull);

      // Confirm action
      await controller.confirmPendingAction(controller.pendingConfirmation!);
      expect(mockApi.confirmCalled, true);
      expect(invalidationTriggered, true);
      expect(controller.pendingConfirmation, isNull);

      // Cancel action
      controller.cancelPendingAction();
      expect(controller.orbState, JarvisOrbState.idle);
    });
  });

  group('Phase 10.1 - JARVIS Widgets & UI Tests', () {
    testWidgets('11. JarvisCore renders across all orb states', (tester) async {
      for (final state in JarvisOrbState.values) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: Center(
                child: JarvisCore(state: state, size: 100),
              ),
            ),
          ),
        );
        expect(find.byType(JarvisCore), findsOneWidget);
      }
    });

    testWidgets('12. JarvisStateIndicator renders labels and retry button on error', (tester) async {
      bool retryTapped = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: JarvisStateIndicator(
                state: JarvisOrbState.error,
                statusText: 'Connection failed',
                onRetry: () => retryTapped = true,
              ),
            ),
          ),
        ),
      );

      expect(find.text('ERROR'), findsOneWidget);
      expect(find.text('Connection failed'), findsOneWidget);
      expect(find.text('Retry Connection'), findsOneWidget);

      await tester.tap(find.text('Retry Connection'));
      expect(retryTapped, true);
    });

    testWidgets('13. JarvisTypingIndicator renders animated wave dots', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: JarvisTypingIndicator(),
          ),
        ),
      );

      expect(find.byType(JarvisTypingIndicator), findsOneWidget);
      expect(find.text('JARVIS'), findsOneWidget);
    });

    testWidgets('14. JarvisMessageBubble renders user and JARVIS messages', (tester) async {
      final userMsg = JarvisMessage(
        id: '1',
        sender: 'user',
        text: 'What is my schedule?',
        timestamp: DateTime.now(),
      );

      final jarvisMsg = JarvisMessage(
        id: '2',
        sender: 'jarvis',
        text: 'Here is your schedule for today.',
        timestamp: DateTime.now(),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                JarvisMessageBubble(message: userMsg),
                JarvisMessageBubble(message: jarvisMsg),
              ],
            ),
          ),
        ),
      );

      expect(find.text('What is my schedule?'), findsOneWidget);
      expect(find.text('Here is your schedule for today.'), findsOneWidget);
    });

    testWidgets('15. JarvisQuickAction renders with press animation', (tester) async {
      bool tapped = false;
      final action = JarvisQuickActionItem(
        label: 'Health Intel',
        icon: Icons.monitor_heart_rounded,
        accentColor: const Color(0xFF00E5FF),
        onTap: () => tapped = true,
        badge: 'NEW',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: JarvisQuickAction(item: action),
          ),
        ),
      );

      expect(find.text('Health Intel'), findsOneWidget);
      expect(find.text('NEW'), findsOneWidget);

      await tester.tap(find.text('Health Intel'));
      expect(tapped, true);
    });

    testWidgets('16. ConfirmationCard renders confirmation UI and callbacks', (tester) async {
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

    testWidgets('17. ActionCard renders completed workflow action card', (tester) async {
      final action = JarvisAction(
        type: 'create_schedule',
        data: {'title': 'Doctor Consultation', 'date': '2026-08-25', 'time': '10:00 AM'},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ActionCard(action: action),
          ),
        ),
      );

      expect(find.text('Doctor Consultation'), findsOneWidget);
      expect(find.text('2026-08-25 at 10:00 AM'), findsOneWidget);
    });

    testWidgets('18. JarvisScreen renders top Core, quick actions, and microphone', (tester) async {
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

      expect(find.text('JARVIS'), findsAtLeastNWidgets(1));
      expect(find.byType(JarvisCore), findsOneWidget);
      expect(find.byIcon(Icons.mic_none), findsOneWidget);
    });

    testWidgets('19. Responsive layout test on Mobile and Desktop widths', (tester) async {
      final mockApi = MockJarvisApiService();
      final mockVoice = MockVoiceInputService();
      final mockTts = MockJarvisTtsService();
      final controller = JarvisController(
        apiService: mockApi,
        voiceService: mockVoice,
        ttsService: mockTts,
      );

      // Desktop width test
      tester.view.physicalSize = const Size(1200, 800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        MaterialApp(
          home: JarvisScreen(controller: controller),
        ),
      );

      expect(find.byType(JarvisScreen), findsOneWidget);
      expect(find.byType(JarvisCore), findsOneWidget);
    });
  });
}
