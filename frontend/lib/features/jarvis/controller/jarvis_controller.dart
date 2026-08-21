import 'package:flutter/foundation.dart';
import '../models/jarvis_models.dart';
import '../services/jarvis_api_service.dart';
import '../services/voice_input_service.dart';
import '../services/jarvis_tts_service.dart';

class JarvisController extends ChangeNotifier {
  final JarvisApiService _apiService;
  final IVoiceInputService _voiceService;
  final IJarvisTtsService _ttsService;

  JarvisOrbState _orbState = JarvisOrbState.idle;
  JarvisOrbState get orbState => _orbState;

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

  void _addInitialGreeting() {
    _messages.add(
      JarvisMessage(
        id: 'msg_welcome',
        sender: 'jarvis',
        text: 'Good day! I am JARVIS, your intelligent wellness and schedule companion. Tap the microphone or type below to command me.',
        timestamp: DateTime.now(),
      ),
    );
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
            timestamp: response.timestamp,
          ),
        );

        // Notify parent screens to refresh schedule or wellness
        onStateInvalidationRequired?.call();

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
          timestamp: response.timestamp,
        ),
      );

      onStateInvalidationRequired?.call();
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
    _voiceService.cancelListening();
    _ttsService.stop();
    super.dispose();
  }
}
