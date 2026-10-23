import 'package:flutter/foundation.dart';
import '../../../services/local_storage_service.dart';
import '../models/jarvis_models.dart';
import '../services/jarvis_api_service.dart';
import '../services/voice_input_service.dart';
import '../services/jarvis_tts_service.dart';
import '../../schedule/events/schedule_event_bus.dart';
import '../../../services/app_service_locator.dart';

class JarvisController extends ChangeNotifier {
  final JarvisApiService _apiService;
  final IVoiceInputService _voiceService;
  final IJarvisTtsService _ttsService;

  JarvisOrbState _orbState = JarvisOrbState.idle;
  JarvisOrbState get orbState => _orbState;
  JarvisState get currentState => _orbState;

  bool get isListening => _orbState == JarvisState.listening;
  bool get isSpeaking => _ttsService.isSpeaking || _orbState == JarvisState.speaking;
  bool get isThinking => _orbState == JarvisState.thinking || _orbState == JarvisState.retrieving;
  bool get isAlwaysOnVoiceRunning => true;

  JarvisVoiceGender get currentVoiceGender => (_ttsService is JarvisTtsService)
      ? _ttsService.gender
      : (LocalStorageService().selectedVoiceGender == 'male' ? JarvisVoiceGender.male : JarvisVoiceGender.female);

  void switchVoice(JarvisVoiceGender gender) {
    _ttsService.setGender(gender);
    notifyListeners();
  }

  Future<void> interruptSpeech() async {
    await _ttsService.stop();
    setOrbState(JarvisState.idle, 'Ready');
  }

  void _addInitialGreeting() {
    final userName = LocalStorageService().userName?.trim();
    final greeting = (userName != null && userName.isNotEmpty)
        ? 'Good day, $userName! I am your personal assistant. How can I help you today?'
        : 'Good day! I am your personal assistant. How can I help you today?';

    _messages.add(
      JarvisMessage(
        id: 'msg_welcome',
        sender: 'jarvis',
        text: greeting,
        timestamp: DateTime.now(),
      ),
    );
  }

  final List<JarvisMessage> _messages = [];
  List<JarvisMessage> get messages => List.unmodifiable(_messages);

  String? _currentTranscript;
  String? get currentTranscript => _currentTranscript;

  String? _conversationId;
  String? get conversationId => _conversationId;

  JarvisConfirmation? _pendingConfirmation;
  JarvisConfirmation? get pendingConfirmation => _pendingConfirmation;

  bool _isVoiceEnabled = true;
  bool get isVoiceEnabled => _isVoiceEnabled;

  String _statusMessage = 'How can I assist you today?';
  String get statusMessage => _statusMessage;

  // Callback to inform parent app when an action mutations occur (e.g. schedule, hydration)
  final VoidCallback? onStateInvalidationRequired;

  JarvisController({
    JarvisApiService? apiService,
    IVoiceInputService? voiceService,
    IJarvisTtsService? ttsService,
    this.onStateInvalidationRequired,
  })  : _apiService = apiService ?? JarvisApiService(),
        _voiceService = voiceService ?? VoiceInputService(),
        _ttsService = ttsService ?? JarvisTtsService() {
    _addInitialGreeting();
  }

  bool _isDisposed = false;

  @override
  void notifyListeners() {
    if (!_isDisposed) {
      super.notifyListeners();
    }
  }

  void toggleVoice(bool enabled) {
    _isVoiceEnabled = enabled;
    notifyListeners();
  }

  void setOrbState(JarvisOrbState state, [String? status]) {
    _orbState = state;
    if (status != null) _statusMessage = status;
    notifyListeners();
  }

  /// Submit a text or voice transcript command to the backend JARVIS agent
  Future<void> submitMessage(String text, {bool isVoice = false}) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    // Interrupt any ongoing speech
    if (_ttsService.isSpeaking) {
      await _ttsService.stop();
    }

    // Detect Voice Switch Command
    final lower = trimmed.toLowerCase();
    if (lower.contains('switch to male voice') ||
        lower.contains('change to male voice') ||
        lower.contains('use a male voice') ||
        lower.contains('switch voice to male') ||
        lower.contains('set voice to male') ||
        lower == 'male voice') {
      _ttsService.setGender(JarvisVoiceGender.male);
    } else if (lower.contains('switch to female voice') ||
        lower.contains('change to female voice') ||
        lower.contains('use a female voice') ||
        lower.contains('switch voice to female') ||
        lower.contains('set voice to female') ||
        lower == 'female voice') {
      _ttsService.setGender(JarvisVoiceGender.female);
    }

    // Add user turn to UI
    final userMsgId = 'user_${DateTime.now().millisecondsSinceEpoch}';
    _messages.add(
      JarvisMessage(
        id: userMsgId,
        sender: 'user',
        text: trimmed,
        timestamp: DateTime.now(),
        isVoice: isVoice,
      ),
    );

    _currentTranscript = null;
    setOrbState(JarvisOrbState.thinking, 'Reasoning & checking context...');

    try {
      final response = await _apiService.sendMessage(
        trimmed,
        conversationId: _conversationId,
      );

      if (response.intent == 'VOICE_SWITCH' || response.action?.type == 'VOICE_SWITCH') {
        if (response.message.toLowerCase().contains('male')) {
          _ttsService.setGender(JarvisVoiceGender.male);
        } else if (response.message.toLowerCase().contains('female')) {
          _ttsService.setGender(JarvisVoiceGender.female);
        }
      }

      if (response.conversationId != null) {
        _conversationId = response.conversationId;
      }

      if (response.type == JarvisResponseType.confirmationRequired && response.confirmation != null) {
        _pendingConfirmation = response.confirmation;
        setOrbState(JarvisOrbState.waitingForConfirmation, 'Waiting for confirmation...');

        _messages.add(
          JarvisMessage(
            id: 'jarvis_${DateTime.now().millisecondsSinceEpoch}',
            sender: 'jarvis',
            text: response.message,
            responseType: response.type,
            confirmation: response.confirmation,
            executionSteps: response.executionSteps,
            timestamp: response.timestamp,
          ),
        );

        if (_isVoiceEnabled) {
          _ttsService.speak(response.message);
        }
      } else if (response.type == JarvisResponseType.actionCompleted) {
        _pendingConfirmation = null;
        setOrbState(JarvisOrbState.executing, 'Executing action...');

        _messages.add(
          JarvisMessage(
            id: 'jarvis_${DateTime.now().millisecondsSinceEpoch}',
            sender: 'jarvis',
            text: response.message,
            responseType: response.type,
            action: response.action,
            executionSteps: response.executionSteps,
            timestamp: response.timestamp,
          ),
        );

        // Notify parent screens to refresh schedule or wellness
        onStateInvalidationRequired?.call();
        ScheduleEventBus().publishMutation(
          action: ScheduleActionType.refresh,
          source: ScheduleChangeSource.voice,
        );
        try {
          AppServiceLocator.instance.scheduleController.loadRoutines(forceRefresh: true);
        } catch (_) {}

        setOrbState(JarvisOrbState.idle, 'Action complete.');
        if (_isVoiceEnabled) {
          setOrbState(JarvisOrbState.speaking);
          _ttsService.speak(response.message, onComplete: () {
            setOrbState(JarvisOrbState.idle, 'Ready for your next command.');
          });
        }
      } else if (response.type == JarvisResponseType.error) {
        _pendingConfirmation = null;
        setOrbState(JarvisOrbState.error, 'An error occurred.');

        _messages.add(
          JarvisMessage(
            id: 'jarvis_${DateTime.now().millisecondsSinceEpoch}',
            sender: 'jarvis',
            text: response.message,
            responseType: response.type,
            executionSteps: response.executionSteps,
            timestamp: response.timestamp,
          ),
        );

        if (_isVoiceEnabled) {
          _ttsService.speak(response.message);
        }
      } else {
        // Conversational final response
        _pendingConfirmation = null;
        _messages.add(
          JarvisMessage(
            id: 'jarvis_${DateTime.now().millisecondsSinceEpoch}',
            sender: 'jarvis',
            text: response.message,
            responseType: response.type,
            executionSteps: response.executionSteps,
            timestamp: response.timestamp,
          ),
        );

        setOrbState(JarvisOrbState.idle, 'Ready.');
        if (_isVoiceEnabled) {
          setOrbState(JarvisOrbState.speaking);
          _ttsService.speak(response.message, onComplete: () {
            setOrbState(JarvisOrbState.idle, 'Ready.');
          });
        }
      }
    } catch (e) {
      setOrbState(JarvisOrbState.error, 'Communication error.');
      _messages.add(
        JarvisMessage(
          id: 'jarvis_err_${DateTime.now().millisecondsSinceEpoch}',
          sender: 'jarvis',
          text: 'I could not process that request. Please try again.',
          responseType: JarvisResponseType.error,
          timestamp: DateTime.now(),
        ),
      );
    }
  }

  /// Confirm pending action using the backend confirmation token
  Future<void> confirmPendingAction(JarvisConfirmation confirmation) async {
    setOrbState(JarvisOrbState.executing, 'Executing confirmed action...');
    _pendingConfirmation = null;

    try {
      final response = await _apiService.confirmAction(
        confirmationId: confirmation.confirmationId,
        toolName: confirmation.tool,
        arguments: confirmation.arguments,
      );

      _messages.add(
        JarvisMessage(
          id: 'jarvis_${DateTime.now().millisecondsSinceEpoch}',
          sender: 'jarvis',
          text: response.message,
          responseType: response.type,
          action: response.action,
          executionSteps: response.executionSteps,
          timestamp: response.timestamp,
        ),
      );

      onStateInvalidationRequired?.call();
      ScheduleEventBus().publishMutation(
        action: ScheduleActionType.refresh,
        source: ScheduleChangeSource.voice,
      );
      try {
        AppServiceLocator.instance.scheduleController.loadRoutines(forceRefresh: true);
      } catch (_) {}
      setOrbState(JarvisOrbState.idle, 'Action verified & completed.');

      if (_isVoiceEnabled) {
        setOrbState(JarvisOrbState.speaking);
        _ttsService.speak(response.message, onComplete: () {
          setOrbState(JarvisOrbState.idle, 'Ready.');
        });
      }
    } catch (e) {
      setOrbState(JarvisOrbState.error, 'Confirmation failed.');
    }
  }

  /// Cancel pending confirmation
  void cancelPendingAction() {
    _pendingConfirmation = null;
    _messages.add(
      JarvisMessage(
        id: 'jarvis_${DateTime.now().millisecondsSinceEpoch}',
        sender: 'jarvis',
        text: 'Action cancelled. I did not make any changes.',
        timestamp: DateTime.now(),
      ),
    );
    setOrbState(JarvisOrbState.idle, 'Action cancelled.');
  }

  /// Voice Interaction: Start listening
  Future<void> startListening() async {
    if (_ttsService.isSpeaking) {
      await _ttsService.stop();
    }

    setOrbState(JarvisOrbState.listening, 'Listening...');
    _currentTranscript = '';

    await _voiceService.startListening(
      onResult: (text, isFinal) {
        _currentTranscript = text;
        notifyListeners();
        if (isFinal && text.trim().isNotEmpty) {
          stopListening();
          submitMessage(text, isVoice: true);
        }
      },
      onError: (err) {
        setOrbState(JarvisOrbState.idle, 'Could not capture voice.');
      },
    );
  }

  /// Voice Interaction: Stop listening
  Future<void> stopListening() async {
    await _voiceService.stopListening();
    if (_orbState == JarvisOrbState.listening) {
      if (_currentTranscript != null && _currentTranscript!.trim().isNotEmpty) {
        submitMessage(_currentTranscript!, isVoice: true);
      } else {
        setOrbState(JarvisOrbState.idle, 'Ready.');
      }
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    _voiceService.cancelListening();
    _ttsService.stop();
    super.dispose();
  }
}
