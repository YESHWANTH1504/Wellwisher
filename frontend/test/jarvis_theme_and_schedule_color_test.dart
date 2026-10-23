import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wellwisher/core/theme/jarvis_colors.dart';
import 'package:wellwisher/core/theme/jarvis_theme_manager.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('JARVIS Unified Schedule Color & Theme Switcher Tests', () {
    test('1. JarvisThemeManager initializes with Dark Obsidian Mode by default', () async {
      final tm = JarvisThemeManager();
      await tm.init();

      expect(tm.isDarkMode, isTrue);
      expect(tm.background, const Color(0xFF050811));
      expect(tm.surface, const Color(0xFF0D1527));
      expect(tm.cardBackground, const Color(0xFF0F1A30));
      expect(tm.textPrimary, Colors.white);
      expect(tm.unifiedScheduleColor, JarvisColors.unifiedScheduleColor);
    });

    test('2. Real-time dynamic theme switching toggles between Dark and White Mode', () async {
      final tm = JarvisThemeManager();
      await tm.init();

      int notificationCount = 0;
      tm.addListener(() {
        notificationCount++;
      });

      // Toggle to Light / White theme
      tm.toggleTheme();
      expect(tm.isDarkMode, isFalse);
      expect(notificationCount, 1);
      expect(tm.background, const Color(0xFFF1F5F9));
      expect(tm.surface, Colors.white);
      expect(tm.cardBackground, Colors.white);
      expect(tm.textPrimary, const Color(0xFF0F172A));
      expect(tm.textSecondary, const Color(0xFF475569));
      expect(tm.unifiedScheduleColor, const Color(0xFF0284C7));

      // Toggle back to Dark theme
      tm.toggleTheme();
      expect(tm.isDarkMode, isTrue);
      expect(notificationCount, 2);
      expect(tm.background, const Color(0xFF050811));
      expect(tm.surface, const Color(0xFF0D1527));
      expect(tm.unifiedScheduleColor, const Color(0xFF00E5FF));
    });

    test('3. Explicit setDarkMode persists state and updates theme properties', () async {
      final tm = JarvisThemeManager();
      await tm.init();

      tm.setDarkMode(false);
      expect(tm.isDarkMode, isFalse);
      expect(tm.background, const Color(0xFFF1F5F9));

      tm.setDarkMode(true);
      expect(tm.isDarkMode, isTrue);
      expect(tm.background, const Color(0xFF050811));
    });

    test('4. Unified Schedule Color is identical across all activity categories and semantic tokens are provided', () {
      final tm = JarvisThemeManager();
      tm.setDarkMode(true);

      final colorDark = tm.unifiedScheduleColor;
      expect(colorDark, const Color(0xFF00E5FF));

      // Semantic category tokens
      expect(tm.meetingColor, const Color(0xFF38BDF8));
      expect(tm.taskColor, const Color(0xFF8B5CF6));
      expect(tm.reminderColor, const Color(0xFFF59E0B));
      expect(tm.healthColor, const Color(0xFF10B981));
      expect(tm.personalColor, const Color(0xFFEC4899));

      // Test helper in JarvisColors
      expect(JarvisColors.getCategoryColorByName('Meeting with team'), JarvisColors.meetingColor);
      expect(JarvisColors.getCategoryColorByName('Morning workout'), JarvisColors.healthColor);
      expect(JarvisColors.getCategoryColorByName('Water reminder'), JarvisColors.reminderColor);
      expect(JarvisColors.getCategoryColorByName('Family dinner'), JarvisColors.personalColor);

      tm.setDarkMode(false);
      final colorLight = tm.unifiedScheduleColor;
      expect(colorLight, const Color(0xFF0284C7));
      expect(tm.meetingColor, const Color(0xFF0284C7));
      expect(tm.taskColor, const Color(0xFF7C3AED));
    });
  });
}
