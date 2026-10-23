import 'package:flutter/material.dart';

/// Smooth, cinematic motion curves and durations for JARVIS animations.
class JarvisMotion {
  // Durations
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 300);
  static const Duration medium = Duration(milliseconds: 500);
  static const Duration long = Duration(milliseconds: 800);
  static const Duration orbBreathing = Duration(milliseconds: 3200);
  static const Duration orbFastSpin = Duration(milliseconds: 1200);

  // Curves
  static const Curve standard = Curves.easeInOutCubic;
  static const Curve enter = Curves.easeOutCubic;
  static const Curve exit = Curves.easeInCubic;
  static const Curve spring = Curves.elasticOut;
  static const Curve pulse = Curves.easeInOutSine;
}
