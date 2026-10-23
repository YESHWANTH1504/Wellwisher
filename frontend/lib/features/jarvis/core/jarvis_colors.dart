import 'package:flutter/material.dart';

/// Professional, cinematic JARVIS color system.
/// Uses deep obsidian surfaces, luminous neon accents, and refined status colors.
class JarvisColors {
  // Deep space obsidian backgrounds
  static const Color background = Color(0xFF050811);
  static const Color surface = Color(0xFF0A0F1D);
  static const Color surfaceElevated = Color(0xFF10192E);
  static const Color surfaceHighlight = Color(0xFF18243E);
  static const Color surfaceGlass = Color(0xCC0D1527);

  // Borders and subtle glows
  static const Color border = Color(0x2600F0FF);
  static const Color glassBorder = border;
  static const Color borderSubtle = Color(0x2600F0FF);
  static const Color borderMedium = Color(0x4D00F0FF);
  static const Color borderStrong = Color(0x9900F0FF);
  static const Color borderWhite = Color(0x1AFFFFFF);

  // Luminous Core Accents
  static const Color cyan = Color(0xFF00F0FF);
  static const Color cyanDim = Color(0xFF00A3AD);
  static const Color cyanGlow = Color(0x3300F0FF);
  static const Color neonCyan = cyan;
  static const Color neonBlue = Color(0xFF38BDF8);

  static const Color indigo = Color(0xFF6366F1);
  static const Color indigoDim = Color(0xFF4F46E5);
  static const Color indigoGlow = Color(0x336366F1);

  static const Color purple = Color(0xFF8B5CF6);
  static const Color purpleGlow = Color(0x338B5CF6);
  static const Color neonPurple = purple;

  // Status & Telemetry
  static const Color success = Color(0xFF10B981); // Emerald
  static const Color emerald = Color(0xFF10B981);
  static const Color successGlow = Color(0x3310B981);
  static const Color neonEmerald = emerald;

  static const Color warning = Color(0xFFF59E0B); // Amber
  static const Color amber = Color(0xFFF59E0B);
  static const Color warningGlow = Color(0x33F59E0B);
  static const Color neonAmber = amber;

  static const Color error = Color(0xFFEF4444); // Crimson
  static const Color rose = Color(0xFFEF4444);
  static const Color errorGlow = Color(0x33EF4444);
  static const Color neonRed = error;
  static const Color neonRose = rose;

  static const Color info = Color(0xFF38BDF8); // Sky Blue

  // Semantic Timeline & Event Category Tokens
  static const Color unifiedScheduleColor = Color(0xFF00E5FF); // Single unified color fallback
  static const Color workoutColor = Color(0xFF10B981); // Emerald Green
  static const Color meetingColor = Color(0xFF38BDF8); // Electric Sky / Blue
  static const Color doctorColor = Color(0xFFEF4444); // Crimson Red
  static const Color personalColor = Color(0xFFEC4899); // Rose / Personal
  static const Color taskColor = Color(0xFF8B5CF6); // Purple / Task
  static const Color reminderColor = Color(0xFFF59E0B); // Amber / Reminder
  static const Color healthColor = Color(0xFF10B981); // Emerald / Health

  static Color getCategoryColorByName(String? name) {
    if (name == null) return taskColor;
    final n = name.toLowerCase();
    if (n.contains('health') || n.contains('workout') || n.contains('exercise') || n.contains('doctor') || n.contains('med') || n.contains('stretch') || n.contains('eye')) {
      return healthColor;
    } else if (n.contains('meet') || n.contains('office') || n.contains('work') || n.contains('call')) {
      return meetingColor;
    } else if (n.contains('remind') || n.contains('water')) {
      return reminderColor;
    } else if (n.contains('personal') || n.contains('family') || n.contains('sleep') || n.contains('wake') || n.contains('meal') || n.contains('breakfast')) {
      return personalColor;
    }
    return taskColor;
  }

  // Text Hierarchy
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textTertiary = Color(0xFF64748B);
  static const Color textDisabled = Color(0xFF475569);
  static const Color textCyan = Color(0xFF67E8F9);
  static const Color textMuted = textTertiary;

  // Gradients
  static const LinearGradient coreReactorGradient = LinearGradient(
    colors: [Color(0xFF00F0FF), Color(0xFF6366F1), Color(0xFF8B5CF6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient glassGradient = LinearGradient(
    colors: [Color(0x1A00F0FF), Color(0x0A6366F1)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    colors: [Color(0xFF050811), Color(0xFF090E1A), Color(0xFF050811)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
