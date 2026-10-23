/// TimeFormatHelper
/// 
/// Provides authoritative, robust time parsing and presentation formatting.
/// Schedule times must NEVER be stored as display strings internally;
/// this helper ensures presentation-layer-only rendering for 12h and 24h modes.
class TimeFormatHelper {
  /// Parses any standard time string into (hour, minute) in 24-hour domain [0..23, 0..59].
  /// Correctly handles:
  /// - 12:00 AM -> (0, 0)
  /// - 12:30 AM -> (0, 30)
  /// - 12:00 PM -> (12, 0)
  /// - 12:30 PM -> (12, 30)
  /// - 8:00 PM / 8 PM / 8:00 pm -> (20, 0)
  /// - 20:00 -> (20, 0)
  /// - 14:30 -> (14, 30)
  /// - 2:30 PM -> (14, 30)
  static (int hour, int minute)? parseToHourMinute(String? timeStr) {
    if (timeStr == null || timeStr.trim().isEmpty) return null;

    final trimmed = timeStr.trim();
    // Regular expression matching:
    // Group 1: hour digits (1 or 2)
    // Group 2: optional minute digits (:MM)
    // Group 3: optional period (am/pm, case-insensitive)
    final match = RegExp(r'^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([aApP][mM])?$').firstMatch(trimmed);
    if (match == null) {
      // Try relaxed search inside string
      final relaxed = RegExp(r'(\d{1,2})(?::(\d{2}))?\s*([aApP][mM])').firstMatch(trimmed);
      if (relaxed != null) {
        return _extractMatch(relaxed);
      }
      return null;
    }
    return _extractMatch(match);
  }

  static (int hour, int minute) _extractMatch(RegExpMatch match) {
    int hour = int.parse(match.group(1)!);
    final minute = match.group(2) != null ? int.parse(match.group(2)!) : 0;
    final period = match.group(3)?.toLowerCase();

    if (period != null) {
      if (period == 'am') {
        if (hour == 12) hour = 0;
      } else if (period == 'pm') {
        if (hour < 12) hour += 12;
      }
    }

    return (hour % 24, minute % 60);
  }

  /// Formats (hour, minute) or raw time string into 12-hour AM/PM string (e.g. "8:00 PM", "12:00 AM", "12:30 PM")
  static String formatTo12H(dynamic time) {
    int hour = 0;
    int minute = 0;

    if (time is String) {
      final parsed = parseToHourMinute(time);
      if (parsed == null) return time;
      hour = parsed.$1;
      minute = parsed.$2;
    } else if (time is (int, int)) {
      hour = time.$1;
      minute = time.$2;
    } else {
      return '';
    }

    final period = hour >= 12 ? 'PM' : 'AM';
    int h12 = hour % 12;
    if (h12 == 0) h12 = 12;

    final mm = minute.toString().padLeft(2, '0');
    return '$h12:$mm $period';
  }

  /// Formats (hour, minute) or raw time string into canonical 24-hour HH:MM string (e.g. "20:00", "00:00", "12:30")
  static String formatTo24H(dynamic time) {
    int hour = 0;
    int minute = 0;

    if (time is String) {
      final parsed = parseToHourMinute(time);
      if (parsed == null) return time;
      hour = parsed.$1;
      minute = parsed.$2;
    } else if (time is (int, int)) {
      hour = time.$1;
      minute = time.$2;
    } else {
      return '';
    }

    final hh = hour.toString().padLeft(2, '0');
    final mm = minute.toString().padLeft(2, '0');
    return '$hh:$mm';
  }

  /// Format dynamic time according to active setting ('12h' or '24h')
  static String format(String? timeStr, {bool is24Hour = false}) {
    if (timeStr == null || timeStr.isEmpty) return '';
    if (is24Hour) {
      return formatTo24H(timeStr);
    } else {
      return formatTo12H(timeStr);
    }
  }

  /// Extract time parts (digits, period) for responsive timeline badges
  /// In 12h: ("8:00", "PM")
  /// In 24h: ("20:00", "")
  static (String digits, String period) safeTimeParts(String? timeStr, {bool is24Hour = false}) {
    if (timeStr == null || timeStr.isEmpty) return ('--:--', '');
    final parsed = parseToHourMinute(timeStr);
    if (parsed == null) {
      final clean = timeStr.trim();
      final parts = clean.split(RegExp(r'\s+'));
      if (parts.length >= 2) return (parts[0], parts[1]);
      return (clean, '');
    }

    if (is24Hour) {
      return (formatTo24H(parsed), '');
    } else {
      final formatted = formatTo12H(parsed);
      final parts = formatted.split(' ');
      return (parts[0], parts.length > 1 ? parts[1] : '');
    }
  }
}
