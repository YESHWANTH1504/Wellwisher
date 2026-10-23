import 'package:flutter/material.dart';

class JarvisGradients {
  static const LinearGradient backgroundGradient = LinearGradient(
    colors: [Color(0xFF050811), Color(0xFF090E1A), Color(0xFF050811)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient glassSurface = LinearGradient(
    colors: [Color(0xCC0D1527), Color(0x9910192E)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient coreReactor = LinearGradient(
    colors: [Color(0xFF00F0FF), Color(0xFF6366F1), Color(0xFF8B5CF6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient glassBorder = LinearGradient(
    colors: [Color(0x4D00F0FF), Color(0x1A8B5CF6), Color(0x1AFFFFFF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient tabPillActive = LinearGradient(
    colors: [Color(0x3300F0FF), Color(0x1A6366F1)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const RadialGradient orbGlow = RadialGradient(
    colors: [Color(0x3300F0FF), Color(0x0A00F0FF), Colors.transparent],
    stops: [0.0, 0.55, 1.0],
  );
}
