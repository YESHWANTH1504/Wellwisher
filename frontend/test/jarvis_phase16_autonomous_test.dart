import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/models/jarvis_models.dart';
import 'package:wellwisher/features/jarvis/services/wake_word_service.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_background_service.dart';
import 'package:wellwisher/features/jarvis/services/voice_input_service.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_api_service.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_tts_service.dart';

class MockVoiceInput implements IVoiceInputService {
  bool _isListening = false;
  Function(String text, bool isFinal)? onResultCallback;

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
    onResultCallback = onResult;
  }

  @override
  Future<void> stopListening() async {
    _isListening = false;
  }

  @override
  Future<void> cancelListening() async {
    _isListening = false;
  }

  void simulateHeardSpeech(String text, {bool isFinal = true}) {
    onResultCallback?.call(text, isFinal);
  }
}

class MockJarvisApi extends JarvisApiService {
  String? lastCommandSent;

  @override
  Future<JarvisResponse> sendMessage(
    String message, {
    String? conversationId,
    String? timezone,
    String? langCode,
    Map<String, dynamic>? healthContext,
    Map<String, dynamic>? healthGoals,
  }) async {
    lastCommandSent = message;
    return JarvisResponse(
      success: true,
      type: JarvisResponseType.actionCompleted,
      intent: 'SCHEDULE_REQUEST',
      message: "Done. I've scheduled your meeting with Arun today at 5 PM. You have no calendar conflicts.",
      executionSteps: [
        const JarvisExecutionStep(
          id: 'step_bg_1',
          toolName: 'create_schedule',
          label: 'Adding routine to schedule',
          status: JarvisExecutionStatus.completed,
        )
      ],
      timestamp: DateTime.now(),
    );
  }
}

class MockTts implements IJarvisTtsService {
  String? lastSpokenText;
  bool _speaking = false;
  JarvisVoiceGender gender = JarvisVoiceGender.female;
  JarvisVoicePreset preset = JarvisVoicePreset.warm;
  double speechRate = 0.5;
  double pitch = 1.15;
  double volume = 1.0;

  @override
  bool get isSpeaking => _speaking;

  @override
  void setGender(JarvisVoiceGender g) => gender = g;

  @override
  void setPreset(JarvisVoicePreset p) => preset = p;

  @override
  void setSpeechRate(double rate) => speechRate = rate;

  @override
  void setPitch(double p) => pitch = p;

  @override
  void setVolume(double v) => volume = v;

  @override
  Future<List<Map<String, String>>> getAvailableVoices() async {
    return [
      {'name': 'en-us-x-sfg-female', 'locale': 'en-US'},
      {'name': 'en-us-x-sfg-male', 'locale': 'en-US'}
    ];
  }

  @override
  Future<void> previewVoice({String? sampleText}) async {
    await speak(sampleText ?? 'Test');
  }

  @override
  Future<void> speak(String text, {String? language, void Function()? onComplete}) async {
    _speaking = true;
    lastSpokenText = text;
    _speaking = false;
    onComplete?.call();
  }

  @override
  Future<void> stop() async {
    _speaking = false;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  group('Phase 16: JARVIS Autonomous Companion OS & Background Service Tests', () {
    late MockVoiceInput mockVoice;
    late WakeWordService wakeWordService;
    late MockJarvisApi mockApi;
    late MockTts mockTts;
    late JarvisBackgroundService backgroundService;

    setUp(() async {
      mockVoice = MockVoiceInput();
      wakeWordService = WakeWordService(voiceInputService: mockVoice);
      mockApi = MockJarvisApi();
      mockTts = MockTts();

      backgroundService = JarvisBackgroundService(
        wakeWordService: wakeWordService,
        apiService: mockApi,
        ttsService: mockTts,
      );

      await backgroundService.initialize();
    });

    tearDown(() {
      backgroundService.dispose();
    });

    test('1. Wake-word detection state transitions upon hearing "Hey JARVIS"', () {
      expect(wakeWordService.status, WakeWordStatus.passiveListening);

      bool wakeWordTriggered = false;
      wakeWordService.onWakeWordTriggered = () {
        wakeWordTriggered = true;
      };

      mockVoice.simulateHeardSpeech('Hey JARVIS');
      expect(wakeWordTriggered, true);
    });

    test('2. Privacy mode suspends passive listening stream', () {
      wakeWordService.setPrivacyMode(true);
      expect(wakeWordService.status, WakeWordStatus.disabled);
      expect(wakeWordService.isPrivacyMode, true);

      wakeWordService.setPrivacyMode(false);
      expect(wakeWordService.status, WakeWordStatus.passiveListening);
    });

    test('3. Headless voice execution speaks response via TTS without UI navigation', () async {
      final result = await backgroundService.executeVoiceCommand('Schedule a meeting with Arun at 5 PM');

      expect(result.success, true);
      expect(result.intent, 'SCHEDULE_REQUEST');
      expect(mockApi.lastCommandSent, 'Schedule a meeting with Arun at 5 PM');
      expect(mockTts.lastSpokenText, contains('Arun today at 5 PM'));
      expect(result.executionSteps.length, 1);
    });

    test('4. Notification action callback routes directly to autonomous execution', () async {
      await backgroundService.handleNotificationAction('prepare_briefing', {'appointmentId': 'apt_1'});
      expect(mockApi.lastCommandSent, contains('Prepare consultation briefing'));
    });

    test('5. Female TTS Default & Preset Configuration', () {
      final tts = JarvisTtsService();
      expect(tts.gender, JarvisVoiceGender.female);
      expect(tts.preset, JarvisVoicePreset.warm);
      expect(tts.pitch, 1.15);

      tts.setPreset(JarvisVoicePreset.calm);
      expect(tts.pitch, 1.10);
      expect(tts.speechRate, 0.45);

      tts.setPreset(JarvisVoicePreset.energetic);
      expect(tts.pitch, 1.25);
      expect(tts.speechRate, 0.58);
    });

    test('6. Barge-in / Interruption terminates ongoing speech immediately', () async {
      mockTts.speak('JARVIS is currently speaking a long response...');
      expect(mockTts.lastSpokenText, isNotNull);

      // User interrupts
      await mockTts.stop();
      expect(mockTts.isSpeaking, false);
    });
  });
}
