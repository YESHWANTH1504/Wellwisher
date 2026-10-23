import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:wellwisher/features/jarvis/services/voice_input_service.dart';

enum WakeWordStatus {
  disabled,
  initializing,
  passiveListening,
  wakeWordDetected,
  capturingCommand,
  processing,
  error
}

class WakeWordService {
  final IVoiceInputService _voiceInputService;
  WakeWordStatus _status = WakeWordStatus.disabled;
  bool _isWakeWordEnabled = true;
  bool _isPrivacyMode = false;

  final StreamController<WakeWordStatus> _statusController = StreamController<WakeWordStatus>.broadcast();
  Stream<WakeWordStatus> get statusStream => _statusController.stream;
  WakeWordStatus get status => _status;
  bool get isWakeWordEnabled => _isWakeWordEnabled;
  bool get isPrivacyMode => _isPrivacyMode;

  Function(String spokenCommand)? onCommandCaptured;
  Function()? onWakeWordTriggered;

  WakeWordService({IVoiceInputService? voiceInputService})
      : _voiceInputService = voiceInputService ?? VoiceInputService();

  Future<bool> initialize() async {
    _updateStatus(WakeWordStatus.initializing);
    try {
      final initialized = await _voiceInputService.initialize();
      if (initialized && _isWakeWordEnabled && !_isPrivacyMode) {
        await startPassiveListening();
        return true;
      }
      _updateStatus(WakeWordStatus.disabled);
      return initialized;
    } catch (e) {
      debugPrint('[WakeWordService] Init error: $e');
      _updateStatus(WakeWordStatus.error);
      return false;
    }
  }

  Future<void> startPassiveListening() async {
    if (_isPrivacyMode || !_isWakeWordEnabled) {
      _updateStatus(WakeWordStatus.disabled);
      return;
    }

    _updateStatus(WakeWordStatus.passiveListening);

    await _voiceInputService.startListening(
      onResult: (text, isFinal) {
        final lower = text.toLowerCase().trim();
        debugPrint('[WakeWordService] Heard stream: $lower');

        if (_status == WakeWordStatus.passiveListening) {
          final isWakeMatched = lower.contains('hey jarvis') ||
              lower.contains('hi jarvis') ||
              lower.contains('hello jarvis') ||
              lower.contains('ok jarvis') ||
              lower.startsWith('jarvis') ||
              lower == 'jarvis';

          if (isWakeMatched) {
            _updateStatus(WakeWordStatus.wakeWordDetected);
            onWakeWordTriggered?.call();

            // Extract command portion if spoken in the same sentence: e.g. "Hey JARVIS open WhatsApp"
            final commandPortion = text.replaceFirst(RegExp(r'^(hey|hi|hello|ok)?\s*jarvis,?\s*', caseSensitive: false), '').trim();
            if (commandPortion.isNotEmpty && isFinal) {
              _updateStatus(WakeWordStatus.processing);
              onCommandCaptured?.call(commandPortion);
              Future.delayed(const Duration(milliseconds: 1200), () {
                if (_isWakeWordEnabled && !_isPrivacyMode) {
                  startPassiveListening();
                }
              });
            } else if (commandPortion.isEmpty && isFinal) {
              // Complete greeting / wake-only utterance: e.g. "Hi Jarvis", "Hey Jarvis"
              _updateStatus(WakeWordStatus.processing);
              onCommandCaptured?.call(text.trim());
              Future.delayed(const Duration(milliseconds: 1200), () {
                if (_isWakeWordEnabled && !_isPrivacyMode) {
                  startPassiveListening();
                }
              });
            } else {
              _updateStatus(WakeWordStatus.capturingCommand);
            }
          }
        } else if (_status == WakeWordStatus.capturingCommand) {
          if (isFinal && text.trim().isNotEmpty) {
            _updateStatus(WakeWordStatus.processing);
            final clean = text.replaceFirst(RegExp(r'^(hey|hi|hello|ok)?\s*jarvis,?\s*', caseSensitive: false), '').trim();
            onCommandCaptured?.call(clean.isNotEmpty ? clean : text.trim());
            Future.delayed(const Duration(milliseconds: 1200), () {
              if (_isWakeWordEnabled && !_isPrivacyMode) {
                startPassiveListening();
              }
            });
          }
        }
      },
      onError: (err) {
        debugPrint('[WakeWordService] Passive stream notice: $err');
        // Graceful restart on stream pause
        if (_isWakeWordEnabled && !_isPrivacyMode && _status != WakeWordStatus.disabled) {
          Future.delayed(const Duration(seconds: 1), () => startPassiveListening());
        }
      }
    );
  }

  Future<void> stopListening() async {
    await _voiceInputService.stopListening();
    _updateStatus(WakeWordStatus.disabled);
  }

  void setWakeWordEnabled(bool enabled) {
    _isWakeWordEnabled = enabled;
    if (enabled && !_isPrivacyMode) {
      startPassiveListening();
    } else {
      stopListening();
    }
  }

  void setPrivacyMode(bool privacyMode) {
    _isPrivacyMode = privacyMode;
    if (privacyMode) {
      _updateStatus(WakeWordStatus.disabled);
      stopListening();
    } else if (_isWakeWordEnabled) {
      startPassiveListening();
    }
  }

  bool _isDisposed = false;

  void _updateStatus(WakeWordStatus newStatus) {
    _status = newStatus;
    if (!_isDisposed && !_statusController.isClosed) {
      _statusController.add(newStatus);
    }
  }

  void dispose() {
    _isDisposed = true;
    _isWakeWordEnabled = false;
    _voiceInputService.stopListening();
    if (!_statusController.isClosed) {
      _statusController.close();
    }
  }
}
