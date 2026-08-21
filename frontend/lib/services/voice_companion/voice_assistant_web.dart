import 'dart:async';
import 'package:flutter/foundation.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
// ignore: avoid_web_libraries_in_flutter
import 'dart:js' as js;

class VoiceAssistantPlatformHelper {
  static List<dynamic>? _cachedVoices;
  static bool _voicesListenerRegistered = false;

  static void _ensureVoicesLoaded() {
    try {
      final synth = html.window.speechSynthesis;
      if (synth == null) return;

      final dynamic raw = synth.getVoices();
      if (raw != null) {
        final list = List<dynamic>.from(raw);
        if (list.isNotEmpty) {
          _cachedVoices = list;
        }
      }

      if (!_voicesListenerRegistered) {
        _voicesListenerRegistered = true;
        synth.addEventListener('voiceschanged', (event) {
          try {
            final dynamic updatedRaw = synth.getVoices();
            if (updatedRaw != null) {
              _cachedVoices = List<dynamic>.from(updatedRaw);
            }
          } catch (_) {}
        });
      }
    } catch (_) {}
  }

  static Future<void> playGentlePreChime() async {
    if (kDebugMode) {
      print('🔔 [Web Audio Pre-Chime]: Preparing audio context...');
    }
    await Future.delayed(const Duration(milliseconds: 250));
  }

  static Future<void> stop() async {
    try {
      html.window.speechSynthesis?.cancel();
    } catch (_) {}
  }

  /// Siri / Alexa Grade Speech Synthesis Engine
  static Future<void> speak(String text, String langCode, {bool isMale = false}) async {
    await playGentlePreChime();
    _ensureVoicesLoaded();

    try {
      final synth = html.window.speechSynthesis;
      if (synth == null) return;

      synth.cancel(); // Stop any ongoing speech immediately

      final utterance = html.SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 0.95; // Crisp conversational pacing
      utterance.pitch = isMale ? 0.85 : 1.10; // Deeper pitch for Male, bright pitch for Female
      utterance.volume = 1.0;

      // Select best voice that matches requested language locale and gender
      if (_cachedVoices == null || _cachedVoices!.isEmpty) {
        try {
          final raw = synth.getVoices();
          _cachedVoices = List<dynamic>.from(raw);
        } catch (_) {}
      }

      if (_cachedVoices != null && _cachedVoices!.isNotEmpty) {
        final prefix = langCode.split('-')[0].toLowerCase();
        final isTamil = prefix == 'ta' || langCode.toLowerCase().contains('ta');

        final femaleKeywords = ['female', 'woman', 'girl', 'siri', 'samantha', 'aria', 'jenny', 'zira', 'karen', 'victoria', 'hazel', 'natural'];
        final maleKeywords = ['male', 'man', 'david', 'mark', 'george', 'richard', 'stefan', 'guy', 'valluvar', 'rahul'];

        dynamic selectedVoice;

        for (final dynamic v in _cachedVoices!) {
          if (v != null) {
            final name = (v.name?.toString() ?? '').toLowerCase();
            final lang = (v.lang?.toString() ?? '').toLowerCase();

            final isLangMatch = isTamil
                ? (lang.startsWith('ta') || lang.contains('tam') || name.contains('tamil') || name.contains('தமிழ்'))
                : (lang.startsWith(prefix) || lang.startsWith(langCode.toLowerCase()));

            if (!isLangMatch) continue;

            final matchesGender = isMale
                ? maleKeywords.any((m) => name.contains(m))
                : femaleKeywords.any((f) => name.contains(f));

            if (matchesGender) {
              selectedVoice = v;
              break;
            }
            selectedVoice ??= v;
          }
        }

        if (selectedVoice != null) {
          utterance.voice = selectedVoice as html.SpeechSynthesisVoice;
          if (kDebugMode) {
            print('✅ [Voice Selected]: ${selectedVoice.name} (Gender=${isMale ? 'Male' : 'Female'}) for lang=$langCode');
          }
        }
      }

      synth.speak(utterance);
      synth.resume();
    } catch (e) {
      if (kDebugMode) print('SpeechSynthesis Error: $e');
    }
  }

  /// Live Microphone Speech Recognition Engine (Web Speech API)
  static Future<String?> listenToMicrophone({
    required String langCode,
    required Duration listenTimeout,
  }) async {
    final completer = Completer<String?>();

    try {
      final hasWebkit = js.context.hasProperty('webkitSpeechRecognition');
      final hasStandard = js.context.hasProperty('SpeechRecognition');

      if (!hasWebkit && !hasStandard) {
        if (kDebugMode) print('⚠️ Browser does not support Web Speech Recognition.');
        return null;
      }

      final dynamic recognitionClass = hasWebkit
          ? js.context['webkitSpeechRecognition']
          : js.context['SpeechRecognition'];

      final dynamic recognition = js.JsObject(recognitionClass as js.JsFunction, []);
      recognition['lang'] = langCode;
      recognition['continuous'] = false;
      recognition['interimResults'] = false;

      recognition['onresult'] = js.JsFunction.withThis((self, event) {
        try {
          final results = event['results'];
          if (results != null && results['length'] > 0) {
            final firstResult = results[0];
            final transcript = firstResult[0]['transcript'].toString();
            if (!completer.isCompleted) {
              completer.complete(transcript);
            }
          }
        } catch (e) {
          if (!completer.isCompleted) completer.complete(null);
        }
      });

      recognition['onerror'] = js.JsFunction.withThis((self, event) {
        if (kDebugMode) print('Speech recognition error: ${event['error']}');
        if (!completer.isCompleted) completer.complete(null);
      });

      recognition['onend'] = js.JsFunction.withThis((self, event) {
        if (!completer.isCompleted) completer.complete(null);
      });

      recognition.callMethod('start', []);

      // Timeout fallback
      Future.delayed(listenTimeout, () {
        if (!completer.isCompleted) {
          try {
            recognition.callMethod('stop', []);
          } catch (_) {}
          completer.complete(null);
        }
      });

      return await completer.future;
    } catch (e) {
      if (kDebugMode) print('Microphone Recognition Error: $e');
      return null;
    }
  }
}

