import '../features/schedule/models/schedule_model.dart';

class ParsedVoiceSchedule {
  final String title;
  final String time; // e.g. "06:00 AM"
  final DateTime date;
  final ActivityCategory category;
  final String rawText;

  const ParsedVoiceSchedule({
    required this.title,
    required this.time,
    required this.date,
    required this.category,
    required this.rawText,
  });
}

class VoiceScheduleParser {
  /// Parses natural spoken commands into structured schedule fields.
  /// Example: "set me a remainder to go for a early morning walk at 6.00AM"
  /// Output: Title: "Go for an early morning walk", Time: "06:00 AM", Category: exercise, Date: today
  static ParsedVoiceSchedule parse(String spokenText, {DateTime? fallbackDate}) {
    if (spokenText.trim().isEmpty) {
      return ParsedVoiceSchedule(
        title: 'New Routine Plan',
        time: '08:00 AM',
        date: fallbackDate ?? DateTime.now(),
        category: ActivityCategory.custom,
        rawText: spokenText,
      );
    }

    final normalized = _normalizeSpokenNumbers(spokenText.trim());
    final lower = normalized.toLowerCase();
    final baseDate = fallbackDate ?? DateTime.now();

    // 1. Extract Target Date
    DateTime targetDate = baseDate;
    if (lower.contains('tomorrow')) {
      targetDate = DateTime(baseDate.year, baseDate.month, baseDate.day + 1);
    } else if (lower.contains('day after tomorrow')) {
      targetDate = DateTime(baseDate.year, baseDate.month, baseDate.day + 2);
    } else if (lower.contains('today')) {
      targetDate = baseDate;
    } else {
      // Check weekday mentions (e.g. "on monday", "this friday")
      final weekdays = {
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6,
        'sunday': 7,
      };
      for (final entry in weekdays.entries) {
        if (lower.contains(entry.key)) {
          int daysToAdd = (entry.value - baseDate.weekday) % 7;
          if (daysToAdd <= 0) daysToAdd += 7;
          targetDate = DateTime(baseDate.year, baseDate.month, baseDate.day + daysToAdd);
          break;
        }
      }
    }

    // 2. Extract Time
    String formattedTime = _extractTime(lower);

    // 3. Extract Category
    ActivityCategory category = _extractCategory(lower);

    // 4. Extract Clean Title
    String title = _extractTitle(normalized, formattedTime);

    if (title.isEmpty) {
      title = _generateFallbackTitle(category, formattedTime);
    }

    return ParsedVoiceSchedule(
      title: title,
      time: formattedTime,
      date: targetDate,
      category: category,
      rawText: spokenText.trim(),
    );
  }

  /// Converts spoken number words to numeric strings (e.g. "six am" -> "6 am", "six thirty" -> "6:30")
  static String _normalizeSpokenNumbers(String text) {
    String out = text;

    final numberWords = {
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
      'eleven': '11', 'twelve': '12',
    };

    for (final entry in numberWords.entries) {
      out = out.replaceAll(RegExp('\\b${entry.key}\\b', caseSensitive: false), entry.value);
    }

    // Replace "o'clock" or "o clock"
    out = out.replaceAll(RegExp(r"\b(?:o'clock|o\s+clock)\b", caseSensitive: false), ':00');
    // Replace "half past (\d+)" -> "$1:30"
    out = out.replaceAllMapped(RegExp(r'half\s+past\s+(\d+)', caseSensitive: false), (m) => '${m.group(1)}:30');
    // Replace "quarter past (\d+)" -> "$1:15"
    out = out.replaceAllMapped(RegExp(r'quarter\s+past\s+(\d+)', caseSensitive: false), (m) => '${m.group(1)}:15');
    // Replace "quarter to (\d+)" -> "$1:45"
    out = out.replaceAllMapped(RegExp(r'quarter\s+to\s+(\d+)', caseSensitive: false), (m) {
      final h = (int.tryParse(m.group(1)!) ?? 1) - 1;
      return '$h:45';
    });

    return out;
  }

  static String _extractTime(String text) {
    // Relative times: "in 30 minutes", "in 1 hour", "in 45 mins"
    final inMinutesMatch = RegExp(r'in\s+(\d+)\s*(?:minutes|mins|min)', caseSensitive: false).firstMatch(text);
    if (inMinutesMatch != null) {
      final mins = int.tryParse(inMinutesMatch.group(1)!) ?? 30;
      final futureTime = DateTime.now().add(Duration(minutes: mins));
      return _formatDateTimeToTimeString(futureTime);
    }

    final inHoursMatch = RegExp(r'in\s+(\d+)\s*(?:hours|hour|hr|hrs)', caseSensitive: false).firstMatch(text);
    if (inHoursMatch != null) {
      final hrs = int.tryParse(inHoursMatch.group(1)!) ?? 1;
      final futureTime = DateTime.now().add(Duration(hours: hrs));
      return _formatDateTimeToTimeString(futureTime);
    }

    // Match patterns like:
    // "at 6.00am", "6:00 AM", "6.30 PM", "6 am", "6pm", "6:00", "06.00", "at 6", "for 6"
    final timePattern = RegExp(
      r'(?:at|for|by|around)?\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|in the morning|in the evening|in the afternoon|at night)?',
      caseSensitive: false,
    );

    final matches = timePattern.allMatches(text);
    for (final m in matches) {
      final hourStr = m.group(1);
      if (hourStr == null) continue;
      int hour = int.parse(hourStr);
      if (hour < 1 || hour > 24) continue;

      int minute = 0;
      if (m.group(2) != null) {
        minute = int.tryParse(m.group(2)!) ?? 0;
      }

      String? rawPeriod = m.group(3)?.toLowerCase().replaceAll('.', '').trim();

      String period = '';
      if (rawPeriod != null) {
        if (rawPeriod.contains('am') || rawPeriod.contains('morning')) {
          period = 'am';
        } else if (rawPeriod.contains('pm') || rawPeriod.contains('evening') || rawPeriod.contains('afternoon') || rawPeriod.contains('night')) {
          period = 'pm';
        }
      }

      // Infer AM/PM if not explicitly specified
      if (period.isEmpty) {
        if (text.contains('morning') || text.contains('breakfast') || text.contains('wake')) {
          period = 'am';
        } else if (text.contains('evening') || text.contains('dinner') || text.contains('night') || text.contains('afternoon') || text.contains('lunch') || text.contains('tea')) {
          period = 'pm';
        } else {
          period = (hour >= 6 && hour <= 11) ? 'am' : (hour == 12 ? 'pm' : (hour < 6 ? 'pm' : 'am'));
        }
      }

      final padHour = (hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour)).toString().padLeft(2, '0');
      final padMin = minute.toString().padLeft(2, '0');
      final periodStr = period.toUpperCase();
      return '$padHour:$padMin $periodStr';
    }

    // Keyword fallback times
    if (text.contains('morning') || text.contains('wake up')) {
      return '06:00 AM';
    } else if (text.contains('breakfast')) {
      return '08:00 AM';
    } else if (text.contains('lunch')) {
      return '01:00 PM';
    } else if (text.contains('tea') || text.contains('snack')) {
      return '04:30 PM';
    } else if (text.contains('dinner')) {
      return '08:00 PM';
    } else if (text.contains('bed') || text.contains('sleep')) {
      return '10:00 PM';
    }

    // Default to next hour
    final nextHour = DateTime.now().add(const Duration(hours: 1));
    return _formatDateTimeToTimeString(nextHour);
  }

  static ActivityCategory _extractCategory(String text) {
    if (text.contains('walk') || text.contains('jog') || text.contains('run') ||
        text.contains('gym') || text.contains('exercise') || text.contains('workout') ||
        text.contains('yoga') || text.contains('stretch')) {
      return ActivityCategory.exercise;
    } else if (text.contains('breakfast')) {
      return ActivityCategory.breakfast;
    } else if (text.contains('lunch') || text.contains('dinner') || text.contains('meal') ||
               text.contains('food') || text.contains('eat') || text.contains('snack') ||
               text.contains('tea') || text.contains('coffee')) {
      return ActivityCategory.meal;
    } else if (text.contains('medicine') || text.contains('tablet') || text.contains('pill') ||
               text.contains('dose') || text.contains('bp') || text.contains('sugar')) {
      return ActivityCategory.medicine;
    } else if (text.contains('water') || text.contains('hydrate') || text.contains('drink')) {
      return ActivityCategory.waterReminder;
    } else if (text.contains('eye') || text.contains('screen') || text.contains('20-20')) {
      return ActivityCategory.eyeCare;
    } else if (text.contains('meeting') || text.contains('work') || text.contains('office') ||
               text.contains('standup') || text.contains('call') || text.contains('email') ||
               text.contains('task')) {
      return ActivityCategory.office;
    } else if (text.contains('wake') || text.contains('wakeup')) {
      return ActivityCategory.wakeUp;
    } else if (text.contains('sleep') || text.contains('bed') || text.contains('night rest')) {
      return ActivityCategory.sleep;
    }
    return ActivityCategory.custom;
  }

  static String _extractTitle(String raw, String extractedTime) {
    String cleaned = raw;

    // Remove introductory framing phrases
    final prefixes = [
      RegExp(r'^(?:please\s+)?set\s+(?:me\s+)?(?:a\s+)?(?:reminder|remainder|plan|alarm|schedule)\s+(?:for|to|of)?\s*', caseSensitive: false),
      RegExp(r'^(?:please\s+)?remind\s+me\s+(?:to|for|about)?\s*', caseSensitive: false),
      RegExp(r'^(?:please\s+)?schedule\s+(?:a\s+)?(?:plan|routine|reminder|task)\s+(?:for|to)?\s*', caseSensitive: false),
      RegExp(r'^(?:please\s+)?add\s+(?:a\s+)?(?:plan|routine|task|event)\s+(?:for|to)?\s*', caseSensitive: false),
      RegExp(r'^(?:please\s+)?create\s+(?:a\s+)?(?:plan|routine|reminder)?\s*', caseSensitive: false),
      RegExp(r'^(?:i\s+want\s+to\s+)', caseSensitive: false),
    ];

    for (final p in prefixes) {
      cleaned = cleaned.replaceFirst(p, '');
    }

    // If text still has "remind me at ... to ...", clean it up
    cleaned = cleaned.replaceFirst(RegExp(r'^(?:at\s+)?\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?\s*(?:to|for)?\s*', caseSensitive: false), '');
    cleaned = cleaned.replaceFirst(RegExp(r'^remind\s+(?:me\s+)?(?:to|for)?\s*', caseSensitive: false), '');

    // Remove time mentions from the title string (e.g. "at 6.00AM", "at 6:00 AM", "at 6am", "tomorrow", "today")
    cleaned = cleaned.replaceAll(RegExp(r'(?:at|for|by|around)?\s*\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?', caseSensitive: false), '');
    cleaned = cleaned.replaceAll(RegExp(r'\b(?:today|tomorrow|day after tomorrow|in the morning|in the evening|in the afternoon|at night|in \d+ (?:mins|minutes|hours))\b', caseSensitive: false), '');
    cleaned = cleaned.replaceAll(RegExp(r'\s+'), ' ').trim();

    // Clean leading prepositions like "to ", "for "
    cleaned = cleaned.replaceFirst(RegExp(r'^(?:to|for|about)\s+', caseSensitive: false), '');

    // Capitalize first letter
    if (cleaned.isNotEmpty) {
      cleaned = cleaned[0].toUpperCase() + cleaned.substring(1);
    }

    return cleaned;
  }

  static String _generateFallbackTitle(ActivityCategory category, String time) {
    switch (category) {
      case ActivityCategory.exercise:
        return 'Morning Walk & Workout';
      case ActivityCategory.breakfast:
        return 'Healthy Breakfast';
      case ActivityCategory.meal:
        return 'Meal & Refreshment';
      case ActivityCategory.medicine:
        return 'Daily Medicine';
      case ActivityCategory.waterReminder:
        return 'Drink Water & Hydrate';
      case ActivityCategory.eyeCare:
        return 'Eye Care Screen Rest';
      case ActivityCategory.office:
        return 'Work Focus Session';
      case ActivityCategory.wakeUp:
        return 'Wake Up & Hydration';
      case ActivityCategory.sleep:
        return 'Night Rest & Sleep';
      default:
        return 'Routine Plan ($time)';
    }
  }

  static String _formatDateTimeToTimeString(DateTime dt) {
    int hour = dt.hour;
    final int minute = dt.minute;
    final isPm = hour >= 12;
    if (isPm && hour > 12) hour -= 12;
    if (!isPm && hour == 0) hour = 12;

    final hourStr = hour.toString().padLeft(2, '0');
    final minStr = minute.toString().padLeft(2, '0');
    final periodStr = isPm ? 'PM' : 'AM';
    return '$hourStr:$minStr $periodStr';
  }
}

