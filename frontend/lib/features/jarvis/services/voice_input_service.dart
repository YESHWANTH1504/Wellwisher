import 'package:flutter/foundation.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

abstract class IVoiceInputService {
  Future<bool> initialize();
  Future<void> startListening({
    required Function(String text, bool isFinal) onResult,
    Function(String error)? onError,
    String? localeId,
  });
  Future<void> stopListening();
  Future<void> cancelListening();
  bool get isListening;
}

class VoiceInputService implements IVoiceInputService {
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isInitialized = false;

  @override
  bool get isListening => _speech.isListening;

  @override
  Future<bool> initialize() async {
    if (_isInitialized) return true;
    try {
      _isInitialized = await _speech.initialize(
        onError: (val) {
          if (kDebugMode) print('Speech recognition error: ${val.errorMsg}');
        },
        onStatus: (status) {
          if (kDebugMode) print('Speech recognition status: $status');
        },
      );
      return _isInitialized;
    } catch (e) {
      if (kDebugMode) print('Speech initialization exception: $e');
      _isInitialized = false;
      return false;
    }
  }

  @override
  Future<void> startListening({
    required Function(String text, bool isFinal) onResult,
    Function(String error)? onError,
    String? localeId,
  }) async {
    final available = await initialize();
    if (!available) {
      onError?.call('Microphone or speech recognition service is not available.');
      return;
    }

    try {
      await _speech.listen(
        onResult: (result) {
          onResult(result.recognizedWords, result.finalResult);
        },
      );
    } catch (e) {
      onError?.call('Error during speech recognition: $e');
    }
  }

  @override
  Future<void> stopListening() async {
    try {
      if (_speech.isListening) {
        await _speech.stop();
      }
    } catch (e) {
      if (kDebugMode) print('Stop speech exception: $e');
    }
  }

  @override
  Future<void> cancelListening() async {
    try {
      if (_speech.isListening) {
        await _speech.cancel();
      }
    } catch (e) {
      if (kDebugMode) print('Cancel speech exception: $e');
    }
  }
}
