import 'package:flutter/animation.dart';

class JarvisAnimations {
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 250);
  static const Duration slow = Duration(milliseconds: 400);
  static const Duration breathing = Duration(milliseconds: 2200);

  static const Curve easeCurve = Curves.easeOutCubic;
  static const Curve bounceCurve = Curves.elasticOut;
  static const Curve breathingCurve = Curves.easeInOutSine;
}
