import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../services/local_storage_service.dart';

/// JarvisThemeManager
/// Central reactive theme manager for JARVIS OS.
/// Controls instantaneous switching between Dark Obsidian Mode and Clean White Mode.
class JarvisThemeManager extends ChangeNotifier {
  static final JarvisThemeManager _instance = JarvisThemeManager._internal();
  factory JarvisThemeManager() => _instance;
  JarvisThemeManager._internal();

  bool _isDarkMode = false;
  bool get isDarkMode => _isDarkMode;

  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      // Default to Light Mode (false) matching the clean WellWisher aesthetic
      _isDarkMode = prefs.getBool('jarvis_is_dark_mode') ?? false;
      LocalStorageService().isDarkMode = _isDarkMode;
    } catch (_) {
      _isDarkMode = false;
    }
    notifyListeners();
  }

  void toggleTheme() {
    setDarkMode(!_isDarkMode);
  }

  void setDarkMode(bool isDark) {
    if (_isDarkMode == isDark) return;
    _isDarkMode = isDark;
    LocalStorageService().isDarkMode = isDark;
    SharedPreferences.getInstance().then((prefs) {
      prefs.setBool('jarvis_is_dark_mode', isDark);
    }).catchError((_) {});
    notifyListeners();
  }

  // Adaptive Theme Colors
  Color get background => _isDarkMode ? const Color(0xFF050811) : const Color(0xFFF1F5F9);
  Color get surface => _isDarkMode ? const Color(0xFF0D1527) : Colors.white;
  Color get surfaceElevated => _isDarkMode ? const Color(0xFF10192E) : const Color(0xFFF8FAFC);
  Color get cardBackground => _isDarkMode ? const Color(0xFF0F1A30) : Colors.white;
  Color get cardBorder => _isDarkMode ? const Color(0x2600F0FF) : const Color(0xFFE2E8F0);
  Color get textPrimary => _isDarkMode ? Colors.white : const Color(0xFF0F172A);
  Color get textSecondary => _isDarkMode ? Colors.white70 : const Color(0xFF475569);
  Color get textTertiary => _isDarkMode ? Colors.white38 : const Color(0xFF94A3B8);
  Color get accentColor => _isDarkMode ? const Color(0xFF00F0FF) : const Color(0xFF0369A1);
  Color get navBackground => _isDarkMode ? const Color(0xFF070B14).withOpacity(0.95) : Colors.white.withOpacity(0.98);
  Color get navBorder => _isDarkMode ? const Color(0x2600F0FF) : const Color(0xFFE2E8F0);

  // Unified Schedule Task Color (Identical for ALL tasks fallback)
  Color get unifiedScheduleColor => _isDarkMode ? const Color(0xFF00E5FF) : const Color(0xFF0369A1);

  // Semantic Category Tokens
  Color get meetingColor => _isDarkMode ? const Color(0xFF38BDF8) : const Color(0xFF0369A1);
  Color get taskColor => _isDarkMode ? const Color(0xFF8B5CF6) : const Color(0xFF7C3AED);
  Color get reminderColor => _isDarkMode ? const Color(0xFFF59E0B) : const Color(0xFFD97706);
  Color get healthColor => _isDarkMode ? const Color(0xFF10B981) : const Color(0xFF059669);
  Color get personalColor => _isDarkMode ? const Color(0xFFEC4899) : const Color(0xFFDB2777);
}
