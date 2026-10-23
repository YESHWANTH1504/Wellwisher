import 'package:flutter/material.dart';
import 'jarvis_colors.dart';

/// Clean, high-legibility, futuristic typography for JARVIS OS.
class JarvisTypography {
  static const TextStyle heroTitle = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.5,
    color: JarvisColors.textPrimary,
    height: 1.2,
  );

  static const TextStyle h1 = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.3,
    color: JarvisColors.textPrimary,
    height: 1.25,
  );

  static const TextStyle h2 = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    color: JarvisColors.textPrimary,
    height: 1.3,
  );

  static const TextStyle h3 = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.1,
    color: JarvisColors.textPrimary,
    height: 1.35,
  );

  static const TextStyle bodyLarge = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.1,
    color: JarvisColors.textPrimary,
    height: 1.5,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.1,
    color: JarvisColors.textSecondary,
    height: 1.45,
  );

  static const TextStyle bodySmall = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.2,
    color: JarvisColors.textTertiary,
    height: 1.4,
  );

  static const TextStyle telemetry = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    letterSpacing: 1.2,
    color: JarvisColors.cyan,
    fontFamily: 'monospace',
  );

  static const TextStyle monospace = telemetry;

  static const TextStyle telemetryLarge = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.5,
    color: JarvisColors.cyan,
    fontFamily: 'monospace',
  );

  static const TextStyle labelBadge = TextStyle(
    fontSize: 10,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.8,
    color: JarvisColors.textPrimary,
  );

  static const TextStyle labelSmall = labelBadge;

  static const TextStyle buttonText = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.3,
    color: JarvisColors.textPrimary,
  );

  static const TextStyle labelMedium = buttonText;
  static const TextStyle titleMedium = h2;
  static const TextStyle titleSmall = h3;
  static const TextStyle titleLarge = heroTitle;
  static const TextStyle headlineMedium = h1;
  static const TextStyle displayLarge = heroTitle;
  static const TextStyle caption = bodySmall;
  static const TextStyle micro = labelBadge;
}
