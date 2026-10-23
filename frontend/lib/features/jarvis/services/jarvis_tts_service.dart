import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import '../../../../services/local_storage_service.dart';

enum JarvisVoiceGender { female, male, systemDefault }

enum JarvisVoicePreset { calm, warm, professional, energetic }

abstract class IJarvisTtsService {
  Future<void> speak(String text, {String? language, VoidCallback? onComplete});
  Future<void> stop();
  bool get isSpeaking;
  void setGender(JarvisVoiceGender gender);
  void setPreset(JarvisVoicePreset preset);
  void setSpeechRate(double rate);
  void setPitch(double pitch);
  void setVolume(double volume);
  Future<List<Map<String, String>>> getAvailableVoices();
  Future<void> previewVoice({String? sampleText});
}

class JarvisTtsService implements IJarvisTtsService {
  static final JarvisTtsService _instance = JarvisTtsService._internal();
  factory JarvisTtsService() => _instance;

  final FlutterTts _flutterTts = FlutterTts();
  bool _isSpeaking = false;
  bool _isInitialized = false;

  late JarvisVoiceGender _gender;
  JarvisVoicePreset _preset = JarvisVoicePreset.warm;
  double _speechRate = 0.50;
  double _pitch = 1.15;
  double _volume = 1.0;
  final String _language = 'en-US';

  JarvisTtsService._internal() {
    _syncGenderFromStorage();
  }

  void _syncGenderFromStorage() {
    final savedGender = LocalStorageService().selectedVoiceGender;
    if (savedGender == 'male') {
      _gender = JarvisVoiceGender.male;
    } else if (savedGender == 'systemDefault') {
      _gender = JarvisVoiceGender.systemDefault;
    } else {
      _gender = JarvisVoiceGender.female;
    }
    _applyPresetParameters();
  }

  @override
  bool get isSpeaking => _isSpeaking;

  JarvisVoiceGender get gender => _gender;
  JarvisVoicePreset get preset => _preset;
  double get speechRate => _speechRate;
  double get pitch => _pitch;
  double get volume => _volume;

  @override
  void setGender(JarvisVoiceGender gender) {
    _gender = gender;
    final str = gender == JarvisVoiceGender.male
        ? 'male'
        : (gender == JarvisVoiceGender.systemDefault ? 'systemDefault' : 'female');
    LocalStorageService().selectedVoiceGender = str;
    _applyPresetParameters();
    _configureVoiceTarget(_language);
  }

  @override
  void setPreset(JarvisVoicePreset preset) {
    _preset = preset;
    _applyPresetParameters();
  }

  void _applyPresetParameters() {
    if (_gender == JarvisVoiceGender.female) {
      switch (_preset) {
        case JarvisVoicePreset.calm:
          _pitch = 1.10;
          _speechRate = 0.45;
          _volume = 0.95;
          break;
        case JarvisVoicePreset.warm:
          _pitch = 1.15;
          _speechRate = 0.50;
          _volume = 1.0;
          break;
        case JarvisVoicePreset.professional:
          _pitch = 1.05;
          _speechRate = 0.52;
          _volume = 1.0;
          break;
        case JarvisVoicePreset.energetic:
          _pitch = 1.25;
          _speechRate = 0.58;
          _volume = 1.0;
          break;
      }
    } else if (_gender == JarvisVoiceGender.male) {
      switch (_preset) {
        case JarvisVoicePreset.calm:
          _pitch = 0.68;
          _speechRate = 0.46;
          _volume = 1.0;
          break;
        case JarvisVoicePreset.warm:
          _pitch = 0.70;
          _speechRate = 0.48;
          _volume = 1.0;
          break;
        case JarvisVoicePreset.professional:
          _pitch = 0.68;
          _speechRate = 0.48;
          _volume = 1.0;
          break;
        case JarvisVoicePreset.energetic:
          _pitch = 0.72;
          _speechRate = 0.52;
          _volume = 1.0;
          break;
      }
    } else {
      _pitch = 1.0;
      _speechRate = 0.50;
      _volume = 1.0;
    }
  }

  @override
  void setSpeechRate(double rate) => _speechRate = rate.clamp(0.2, 2.0);

  @override
  void setPitch(double pitch) => _pitch = pitch.clamp(0.5, 2.0);

  @override
  void setVolume(double volume) => _volume = volume.clamp(0.0, 1.0);

  Future<void> _ensureInitialized() async {
    if (_isInitialized) return;
    try {
      await _flutterTts.setLanguage(_language);
      await _flutterTts.setSpeechRate(_speechRate);
      await _flutterTts.setVolume(_volume);
      await _flutterTts.setPitch(_pitch);

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

  /// Cleanly strips emojis, markdown formatting, asterisks, and technical symbols
  /// so TTS engine speaks natural conversational English without vocalizing 'astric' or 'asterisk'.
  /// Strictly protects legitimate words, punctuation, times (4:00 PM), numbers (8,420), and identifiers (snake_case).
  static String sanitizeForSpeech(String text) {
    if (text.trim().isEmpty) return '';

    var clean = text.trim();

    // 1. Remove Fenced Code Blocks (```lang ... ```)
    clean = clean.replaceAll(RegExp(r'```[\s\S]*?```'), '');

    // 2. Convert Markdown Links [Label](url) -> Label
    clean = clean.replaceAllMapped(
      RegExp(r'\[([^\]]+)\]\([^)]+\)'),
      (match) => match.group(1) ?? '',
    );

    // 3. Remove Inline Code Backticks `code` -> code
    clean = clean.replaceAllMapped(
      RegExp(r'`([^`]+)`'),
      (match) => match.group(1) ?? '',
    );
    clean = clean.replaceAll('`', '');

    // 4. Remove JSON / Key-Value Objects ({ ... })
    clean = clean.replaceAll(RegExp(r'\{[^{}]*\}'), '');

    // 5. Convert Bullet Points & Numbered Lists into Natural Spoken Pauses
    // E.g. "* Meeting with Arun\n* Call Mom" -> "Meeting with Arun. Call Mom."
    clean = clean.replaceAll(RegExp(r'^[ \t]*[-•*+][ \t]+', multiLine: true), '');
    clean = clean.replaceAll(RegExp(r'^[ \t]*\d+\.[ \t]+', multiLine: true), '');

    // 6. Remove Markdown Headers (### Header -> Header or standalone ###)
    clean = clean.replaceAll(RegExp(r'^[ \t]*#{1,6}[ \t]+', multiLine: true), '');
    clean = clean.replaceAll(RegExp(r'#+'), '');

    // 7. Strip Strikethrough (~~text~~ or ~~~text~~~)
    clean = clean.replaceAllMapped(
      RegExp(r'~{2,3}([^~\n]+)~{2,3}'),
      (match) => match.group(1) ?? '',
    );
    clean = clean.replaceAll('~', '');

    // 8. Strip Markdown Asterisks (*, **, ***) completely
    // Spoken output must NEVER pronounce "asterisk", "astric", or "star"
    clean = clean.replaceAllMapped(
      RegExp(r'\*{1,3}(.*?)\*{1,3}'),
      (match) => match.group(1) ?? '',
    );
    clean = clean.replaceAll('*', '');

    // 9. Strip Markdown Emphasis Underscores (_text_, __text__, ___text___)
    // IMPORTANT: Do NOT strip underscores inside legitimate words (file_name, snake_case)
    clean = clean.replaceAllMapped(
      RegExp(r'(^|[\s(])_{1,3}([^_\n]+?)_{1,3}(?=[\s).,?!;:]|$)'),
      (match) => '${match.group(1) ?? ""}${match.group(2) ?? ""}',
    );
    clean = clean.replaceAll(RegExp(r'(^|[\s])_+'), r'$1');
    clean = clean.replaceAll(RegExp(r'_+([\s]|$)'), r'$1');

    // 10. Clean Emojis and Extended Symbols
    final emojiRegex = RegExp(
      r'[\u{1F600}-\u{1F64F}'
      r'\u{1F300}-\u{1F5FF}'
      r'\u{1F680}-\u{1F6FF}'
      r'\u{1F700}-\u{1F77F}'
      r'\u{1F780}-\u{1F7FF}'
      r'\u{1F800}-\u{1F8FF}'
      r'\u{1F900}-\u{1F9FF}'
      r'\u{1FA00}-\u{1FA6F}'
      r'\u{1FA70}-\u{1FAFF}'
      r'\u{2600}-\u{26FF}'
      r'\u{2700}-\u{27BF}'
      r'\u{FE00}-\u{FE0F}'
      r'\u{1F1E6}-\u{1F1FF}]',
      unicode: true,
    );
    clean = clean.replaceAll(emojiRegex, '');

    // 11. Remove remaining raw structural brackets and pipes (leave legitimate quotes/parentheses)
    clean = clean.replaceAll(RegExp(r'[\[\]|]'), '');

    // 12. Convert Newlines to Sentence-Ending Pauses
    final hadNewlines = RegExp(r'\r?\n').hasMatch(clean);
    clean = clean.replaceAll(RegExp(r'\r?\n+'), '. ');

    // 13. Absolute Zero Tolerance for Residual Asterisks
    clean = clean.replaceAll('*', '');

    // 14. Normalize Whitespace and Punctuation Spacing
    clean = clean.replaceAll(RegExp(r'\s+'), ' ');
    clean = clean.replaceAll(RegExp(r',\s*,'), ',');
    clean = clean.replaceAll(RegExp(r'\.\s*\.+'), '.');
    clean = clean.replaceAll(RegExp(r',\s*\.'), '.');
    clean = clean.replaceAll(RegExp(r'\s+([.,?!;:])'), r'$1');
    clean = clean.replaceAll(RegExp(r'([.,?!;:])(?=[A-Za-z])'), r'$1 ');
    clean = clean.trim();

    if (clean.isEmpty || clean == '.' || clean == '..') {
      return '';
    }

    // Ensure multiline lists/schedules end naturally with terminal punctuation
    if (hadNewlines && !RegExp(r'[.?!]$').hasMatch(clean)) {
      clean = '$clean.';
    }

    return clean;
  }

  /// Backward-compatible alias for sanitizeForSpeech
  static String stripEmojis(String text) => sanitizeForSpeech(text);

  Future<void> _configureVoiceTarget(String lang) async {
    try {
      await _flutterTts.setLanguage(lang);
      await _flutterTts.setPitch(_pitch);
      await _flutterTts.setSpeechRate(_speechRate);
      await _flutterTts.setVolume(_volume);

      if (_gender == JarvisVoiceGender.systemDefault) return;

      final dynamic rawVoices = await _flutterTts.getVoices;
      if (rawVoices is List && rawVoices.isNotEmpty) {
        final prefix = lang.split('-')[0].toLowerCase();
        final femaleKeywords = [
          'female', 'woman', 'girl', 'siri', 'samantha', 'aria', 'jenny', 'zira',
          'karen', 'victoria', 'hazel', 'sfg', 'sfb', 'sfa', 'ioa', 'iof', 'tpf',
          '#female', '-female', 'f0', 'f1', 'f2', 'f3'
        ];
        final maleKeywords = [
          'male', 'man', 'boy', 'david', 'mark', 'george', 'guy', 'stefan',
          'rahul', 'richard', 'alex', 'daniel', 'oliver', 'james', 'brian', 'tom',
          'x-iom', 'x-iob', 'x-tpd', 'x-sfd', 'x-iol', 'x-cxx', 'x-ahp', 'x-rjs', 'x-fis',
          '#male', '-male', 'm0', 'm1', 'm2', 'm3'
        ];

        Map<String, String>? chosenVoice;

        // Pass 1: exact match for locale + gender keywords
        for (final v in rawVoices) {
          if (v is Map) {
            final name = (v['name'] ?? '').toString().toLowerCase();
            final locale = (v['locale'] ?? '').toString().toLowerCase();

            if (locale.contains(prefix) || name.contains(prefix)) {
              final isFemale = femaleKeywords.any((k) => name.contains(k));
              final isMale = !isFemale && maleKeywords.any((k) => name.contains(k));

              if (_gender == JarvisVoiceGender.female && isFemale) {
                chosenVoice = {'name': v['name'].toString(), 'locale': v['locale'].toString()};
                break;
              } else if (_gender == JarvisVoiceGender.male && isMale) {
                chosenVoice = {'name': v['name'].toString(), 'locale': v['locale'].toString()};
                break;
              }
            }
          }
        }

        // Pass 2: any English voice matching requested gender if locale-specific was not found
        if (chosenVoice == null) {
          for (final v in rawVoices) {
            if (v is Map) {
              final name = (v['name'] ?? '').toString().toLowerCase();
              final locale = (v['locale'] ?? '').toString().toLowerCase();

              if (locale.startsWith('en') || name.startsWith('en')) {
                final isFemale = femaleKeywords.any((k) => name.contains(k));
                final isMale = !isFemale && maleKeywords.any((k) => name.contains(k));

                if (_gender == JarvisVoiceGender.female && isFemale) {
                  chosenVoice = {'name': v['name'].toString(), 'locale': v['locale'].toString()};
                  break;
                } else if (_gender == JarvisVoiceGender.male && isMale) {
                  chosenVoice = {'name': v['name'].toString(), 'locale': v['locale'].toString()};
                  break;
                }
              }
            }
          }
        }

        if (chosenVoice != null) {
          await _flutterTts.setVoice(chosenVoice);
        }
        // CRITICAL: Re-apply pitch and rate after setVoice because Android setVoice resets engine pitch to 1.0
        await _flutterTts.setPitch(_pitch);
        await _flutterTts.setSpeechRate(_speechRate);
      }
    } catch (e) {
      if (kDebugMode) print('Voice configuration notice: $e');
    }
  }

  @override
  Future<List<Map<String, String>>> getAvailableVoices() async {
    await _ensureInitialized();
    final List<Map<String, String>> result = [];
    try {
      final dynamic raw = await _flutterTts.getVoices;
      if (raw is List) {
        for (final v in raw) {
          if (v is Map) {
            result.add({
              'name': (v['name'] ?? '').toString(),
              'locale': (v['locale'] ?? '').toString(),
            });
          }
        }
      }
    } catch (_) {}
    return result;
  }

  @override
  Future<void> previewVoice({String? sampleText}) async {
    _syncGenderFromStorage();
    final name = LocalStorageService().userName ?? 'there';
    final genderStr = _gender == JarvisVoiceGender.male ? 'male' : 'female';
    final text = sampleText ?? 'Hello $name! This is my $genderStr voice. I am your personal assistant.';
    await speak(text);
  }

  @override
  Future<void> speak(String text, {String? language, VoidCallback? onComplete}) async {
    final clean = stripEmojis(text);
    if (clean.isEmpty) return;
    _syncGenderFromStorage();
    await _ensureInitialized();

    try {
      // Barge-in: interrupt previous speech immediately
      if (_isSpeaking) {
        await stop();
      }

      final targetLang = language ?? _language;
      await _configureVoiceTarget(targetLang);

      _flutterTts.setCompletionHandler(() {
        _isSpeaking = false;
        onComplete?.call();
      });

      _isSpeaking = true;
      await _flutterTts.speak(clean);
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
