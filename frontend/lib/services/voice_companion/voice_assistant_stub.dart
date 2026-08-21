import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

// Native Android / iOS TextToSpeech Companion Engine
class VoiceAssistantPlatformHelper {
  static final FlutterTts _flutterTts = FlutterTts();
  static bool _initialized = false;

  static Future<void> _initTts() async {
    if (_initialized) return;
    try {
      await _flutterTts.setVolume(1.0);
      await _flutterTts.setPitch(1.05); // Siri/Alexa natural pitch
      await _flutterTts.setSpeechRate(0.5); // Clear conversational pacing
      await _flutterTts.awaitSpeakCompletion(true);
      _initialized = true;
    } catch (e) {
      if (kDebugMode) print('TTS Init notice: $e');
    }
  }

  static Future<void> playGentlePreChime() async {
    if (kDebugMode) {
      print('🔔 [Mobile Pre-Chime]: Soothing pre-alert pause...');
    }
    await Future.delayed(const Duration(milliseconds: 250));
  }

  static Future<void> stop() async {
    try {
      await _flutterTts.stop();
    } catch (_) {}
  }

  static Future<void> speak(String text, String langCode, {bool isMale = false}) async {
    await playGentlePreChime();
    await _initTts();

    if (kDebugMode) {
      print('🗣️ [Mobile Assistant Voice ($langCode, gender=${isMale ? 'Male' : 'Female'})]: "$text"');
    }

    try {
      // Set language with fallbacks (e.g., ta-IN -> ta_IN -> ta)
      final setRes = await _flutterTts.setLanguage(langCode);
      if (setRes == 0 || setRes == false) {
        final altLocale = langCode.replaceAll('-', '_');
        await _flutterTts.setLanguage(altLocale);
      }

      // Configure pitch for Male (0.85) vs Female (1.10) persona
      await _flutterTts.setPitch(isMale ? 0.85 : 1.10);
      await _flutterTts.setSpeechRate(0.5); // Natural rate

      try {
        final List<dynamic>? voices = await _flutterTts.getVoices;
        if (voices != null && voices.isNotEmpty) {
          final prefix = langCode.split('-')[0].toLowerCase();
          final isTamil = prefix == 'ta';

          final maleKeywords = ['male', 'man', 'boy', 'david', 'mark', 'george', 'guy', 'stefan', 'rahul', 'valluvar'];
          final femaleKeywords = ['female', 'woman', 'girl', 'siri', 'samantha', 'aria', 'jenny', 'zira', 'karen', 'victoria', 'hazel', 'natural'];

          Map<String, String>? targetVoice;
          for (var v in voices) {
            if (v is Map) {
              final name = (v['name'] ?? '').toString().toLowerCase();
              final locale = (v['locale'] ?? '').toString().toLowerCase();

              final isLangMatch = isTamil
                  ? (locale.contains('ta') || name.contains('tam') || name.contains('tamil'))
                  : locale.contains(prefix);

              if (isLangMatch) {
                final matchesGender = isMale
                    ? maleKeywords.any((k) => name.contains(k))
                    : femaleKeywords.any((k) => name.contains(k));

                if (matchesGender) {
                  targetVoice = {'name': v['name'].toString(), 'locale': v['locale'].toString()};
                  break;
                }
                targetVoice ??= {'name': v['name'].toString(), 'locale': v['locale'].toString()};
              }
            }
          }

          if (targetVoice != null) {
            await _flutterTts.setVoice(targetVoice);
          }
        }
      } catch (_) {}

      await _flutterTts.speak(text);
    } catch (e) {
      if (kDebugMode) print('Mobile TTS Error: $e');
    }
  }

  static Future<String?> listenToMicrophone({
    required String langCode,
    required Duration listenTimeout,
  }) async {
    if (kDebugMode) print('Native microphone listening stub');
    return null;
  }
}

