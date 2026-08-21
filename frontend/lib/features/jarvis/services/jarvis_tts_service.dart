import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

abstract class IJarvisTtsService {
  Future<void> speak(String text, {String? language, VoidCallback? onComplete});
  Future<void> stop();
  bool get isSpeaking;
}

class JarvisTtsService implements IJarvisTtsService {
  final FlutterTts _flutterTts = FlutterTts();
  bool _isSpeaking = false;
  bool _isInitialized = false;

  @override
  bool get isSpeaking => _isSpeaking;

  Future<void> _ensureInitialized() async {
    if (_isInitialized) return;
    try {
      await _flutterTts.setLanguage('en-US');
      await _flutterTts.setSpeechRate(0.5);
      await _flutterTts.setVolume(1.0);
      await _flutterTts.setPitch(1.0);

      _flutterTts.setStartHandler(() {
        _isSpeaking = true;
      });

      _flutterTts.setCompletionHandler(() {
        _isSpeaking = false;
      });

      _flutterTts.setErrorHandler((msg) {
        _isSpeaking = false;
        if (kDebugMode) print('TTS Error: $msg');
      });

      _isInitialized = true;
    } catch (e) {
      if (kDebugMode) print('TTS initialization error: $e');
    }
  }

  @override
  Future<void> speak(String text, {String? language, VoidCallback? onComplete}) async {
    if (text.isEmpty) return;
    await _ensureInitialized();

    try {
      if (_isSpeaking) {
        await stop();
      }

      if (language != null && language.isNotEmpty) {
        await _flutterTts.setLanguage(language);
      }

      _flutterTts.setCompletionHandler(() {
        _isSpeaking = false;
        onComplete?.call();
      });

      _isSpeaking = true;
      await _flutterTts.speak(text);
    } catch (e) {
      _isSpeaking = false;
      if (kDebugMode) print('TTS speak exception: $e');
    }
  }

  @override
  Future<void> stop() async {
    try {
      _isSpeaking = false;
      await _flutterTts.stop();
    } catch (e) {
      if (kDebugMode) print('TTS stop exception: $e');
    }
  }
}
