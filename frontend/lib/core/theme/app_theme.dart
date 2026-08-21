import 'package:flutter/material.dart';

class AppTheme {
  static Color getThemeColor(String colorName) {
    switch (colorName) {
      case 'green': return const Color(0xFF2E7D32); // Emerald Green
      case 'violet': return const Color(0xFF6A1B9A); // Sunset Violet
      case 'pink': return const Color(0xFFD81B60); // Rose Pink
      default: return const Color(0xFF1E88E5); // Ocean Blue
    }
  }

  static ThemeData buildTheme({
    required bool isDark,
    required bool isSeniorMode,
    required String colorTheme,
  }) {
    final primaryColor = getThemeColor(colorTheme);
    final textScale = isSeniorMode ? 1.25 : 1.0;

    final base = isDark
        ? ThemeData.dark(useMaterial3: true)
        : ThemeData.light(useMaterial3: true);

    return base.copyWith(
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        primary: primaryColor,
        brightness: isDark ? Brightness.dark : Brightness.light,
        surface: isDark ? const Color(0xFF1E1E1E) : Colors.white,
      ),
      scaffoldBackgroundColor: isDark ? const Color(0xFF121212) : const Color(0xFFF8FAFC),
      canvasColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
      dialogBackgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        modalBackgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        selectedItemColor: primaryColor,
        unselectedItemColor: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: primaryColor),
        titleTextStyle: TextStyle(
          color: isDark ? Colors.white : Colors.black87,
          fontSize: 20 * textScale,
          fontWeight: FontWeight.bold,
        ),
      ),
      cardTheme: CardThemeData(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        elevation: isDark ? 1 : 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}
