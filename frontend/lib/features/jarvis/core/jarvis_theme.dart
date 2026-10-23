import 'package:flutter/material.dart';
import 'jarvis_colors.dart';

/// Central theme builder for JARVIS dark-first experience.
class JarvisTheme {
  static ThemeData get darkTheme {
    return ThemeData.dark(useMaterial3: true).copyWith(
      scaffoldBackgroundColor: JarvisColors.background,
      colorScheme: const ColorScheme.dark(
        primary: JarvisColors.cyan,
        secondary: JarvisColors.indigo,
        surface: JarvisColors.surface,
        error: JarvisColors.error,
        onPrimary: JarvisColors.background,
        onSurface: JarvisColors.textPrimary,
      ),
      canvasColor: JarvisColors.surface,
      dialogBackgroundColor: JarvisColors.surfaceElevated,
      cardColor: JarvisColors.surface,
      dividerColor: JarvisColors.borderSubtle,
      appBarTheme: const AppBarTheme(
        backgroundColor: JarvisColors.surface,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: JarvisColors.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
        ),
        iconTheme: IconThemeData(color: JarvisColors.cyan),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: JarvisColors.surfaceElevated,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: JarvisColors.borderSubtle),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: JarvisColors.borderSubtle),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: JarvisColors.cyan, width: 1.5),
        ),
        hintStyle: const TextStyle(color: JarvisColors.textTertiary, fontSize: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: JarvisColors.cyan,
          foregroundColor: JarvisColors.background,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
        ),
      ),
    );
  }

  static ThemeData get lightTheme {
    return ThemeData.light(useMaterial3: true).copyWith(
      scaffoldBackgroundColor: const Color(0xFFF1F5F9),
      colorScheme: const ColorScheme.light(
        primary: Color(0xFF0369A1),
        secondary: Color(0xFF1E40AF),
        surface: Colors.white,
        error: Color(0xFFDC2626),
        onPrimary: Colors.white,
        onSurface: Color(0xFF0F172A),
      ),
      canvasColor: Colors.white,
      dialogBackgroundColor: Colors.white,
      cardColor: Colors.white,
      dividerColor: const Color(0xFFCBD5E1),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: Color(0xFF0F172A),
          fontSize: 18,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
        ),
        iconTheme: IconThemeData(color: Color(0xFF0369A1)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF0369A1), width: 1.5),
        ),
        hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 14),
      ),
    );
  }
}
