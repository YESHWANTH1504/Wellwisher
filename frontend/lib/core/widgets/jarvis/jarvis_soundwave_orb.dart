import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../theme/jarvis_colors.dart';
import '../../theme/jarvis_theme_manager.dart';

/// Animated circular glowing ring containing a dynamic audio soundwave/waveform.
///
/// Behavior:
/// - Idle, Listening, Thinking, Standby -> Completely stable resting baseline (zero oscillation).
/// - Speaking -> Smooth dynamic waveform oscillation.
/// - AnimationController only ticks while [isSpeaking] is active, preventing unnecessary rebuilds and battery drain.
/// - Full White Theme & Dark Theme palette support (no dark disk in White Theme).
class JarvisSoundwaveOrb extends StatefulWidget {
  final bool isListening;
  final bool isThinking;
  final bool isSpeaking;
  final VoidCallback? onTap;
  final double size;

  const JarvisSoundwaveOrb({
    super.key,
    this.isListening = false,
    this.isThinking = false,
    this.isSpeaking = false,
    this.onTap,
    this.size = 200.0,
  });

  @override
  State<JarvisSoundwaveOrb> createState() => JarvisSoundwaveOrbState();
}

class JarvisSoundwaveOrbState extends State<JarvisSoundwaveOrb>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;

  AnimationController get animController => _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    if (widget.isSpeaking) {
      _animController.repeat();
    }
  }

  @override
  void didUpdateWidget(JarvisSoundwaveOrb oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isSpeaking != oldWidget.isSpeaking) {
      if (widget.isSpeaking) {
        _animController.repeat();
      } else {
        _animController.stop();
        _animController.value = 0.0;
      }
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: JarvisThemeManager(),
      builder: (context, _) {
        final isDark = JarvisThemeManager().isDarkMode;

        return GestureDetector(
          onTap: widget.onTap,
          child: SizedBox(
            width: widget.size,
            height: widget.size,
            child: AnimatedBuilder(
              animation: _animController,
              builder: (context, child) {
                return CustomPaint(
                  size: Size(widget.size, widget.size),
                  painter: _SoundwaveOrbPainter(
                    progress: _animController.value,
                    isListening: widget.isListening,
                    isThinking: widget.isThinking,
                    isSpeaking: widget.isSpeaking,
                    isDark: isDark,
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }
}

class _SoundwaveOrbPainter extends CustomPainter {
  final double progress;
  final bool isListening;
  final bool isThinking;
  final bool isSpeaking;
  final bool isDark;

  _SoundwaveOrbPainter({
    required this.progress,
    required this.isListening,
    required this.isThinking,
    required this.isSpeaking,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 12;

    // 1. Outer Ambient Glow (Dark Mode: neon glow; Light Mode: soft colored shadow)
    final glowPaint = Paint()
      ..color = isDark
          ? (isListening
              ? JarvisColors.cyan.withValues(alpha: 0.35)
              : isSpeaking
                  ? JarvisColors.purple.withValues(alpha: 0.35)
                  : const Color(0xFF3B82F6).withValues(alpha: 0.22))
          : (isSpeaking
              ? const Color(0xFF7C3AED).withValues(alpha: 0.20)
              : isListening
                  ? const Color(0xFF0284C7).withValues(alpha: 0.22)
                  : const Color(0xFF0284C7).withValues(alpha: 0.12))
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 16);
    canvas.drawCircle(center, radius + 2, glowPaint);

    // 2. Main Glowing Ring (Gradient border: Dark mode neon; Light mode sapphire/sky blue)
    final ringRect = Rect.fromCircle(center: center, radius: radius);
    final ringShader = SweepGradient(
      startAngle: 0.0,
      endAngle: math.pi * 2,
      colors: isDark
          ? (isListening
              ? const [
                  Color(0xFF00F0FF),
                  Color(0xFF38BDF8),
                  Color(0xFF818CF8),
                  Color(0xFF00F0FF),
                ]
              : const [
                  Color(0xFF38BDF8),
                  Color(0xFF6366F1),
                  Color(0xFF8B5CF6),
                  Color(0xFF38BDF8),
                ])
          : (isListening
              ? const [
                  Color(0xFF0284C7),
                  Color(0xFF38BDF8),
                  Color(0xFF6366F1),
                  Color(0xFF0284C7),
                ]
              : const [
                  Color(0xFF0284C7),
                  Color(0xFF38BDF8),
                  Color(0xFF7C3AED),
                  Color(0xFF0284C7),
                ]),
      // Rotate ring subtly while speaking, keep steady at 0 when idle
      transform: GradientRotation(isSpeaking ? progress * math.pi * 2 : 0.0),
    ).createShader(ringRect);

    final ringPaint = Paint()
      ..shader = ringShader
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.2;
    canvas.drawCircle(center, radius, ringPaint);

    // 3. Interior background: In dark mode, obsidian core. In light mode, luminous crystalline white-to-soft-sky gradient.
    final bgPaint = Paint()..style = PaintingStyle.fill;
    if (isDark) {
      bgPaint.color = const Color(0xFF080E1C);
    } else {
      bgPaint.shader = const RadialGradient(
        colors: [
          Color(0xFFFFFFFF),
          Color(0xFFF8FAFC),
          Color(0xFFE0F2FE),
        ],
        stops: [0.0, 0.70, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: radius - 2));
    }
    canvas.drawCircle(center, radius - 2, bgPaint);

    // 4. Subtle inner radial gradient for depth
    final innerRadial = RadialGradient(
      colors: [
        (isDark
                ? (isListening ? JarvisColors.cyan : const Color(0xFF0284C7))
                : (isListening ? const Color(0xFF0284C7) : const Color(0xFF38BDF8)))
            .withValues(alpha: isDark ? 0.18 : 0.15),
        Colors.transparent,
      ],
      radius: 0.75,
    ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawCircle(center, radius - 2, Paint()..shader = innerRadial);

    // 5. Soundwave / Frequency lines
    _drawSoundwave(canvas, center, radius - 16);
  }

  void _drawSoundwave(Canvas canvas, Offset center, double maxInnerRadius) {
    const int numBars = 27;
    final waveWidth = maxInnerRadius * 1.5;
    final barSpacing = waveWidth / (numBars - 1);
    final startX = center.dx - (waveWidth / 2);

    final wavePaint = Paint()
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 2.4;

    for (int i = 0; i < numBars; i++) {
      final x = startX + (i * barSpacing);

      // Distance from center (0.0 at center, 1.0 at outer edge)
      final normDistFromCenter =
          ((i - (numBars / 2)).abs() / (numBars / 2)).clamp(0.0, 1.0);
      final envelope = math.cos(normDistFromCenter * math.pi / 2); // Bell curve envelope

      // CRITICAL:
      // When NOT speaking: speaker line is completely stationary & stable (classic resting voice capsule contour).
      // Only when isSpeaking == true: line moves dynamically with speech audio modulation.
      double baseHeight;
      if (isSpeaking) {
        final phase = (progress * math.pi * 4) + (i * 0.35);
        final dynamicScale = 0.35 + (0.65 * math.sin(phase).abs());
        baseHeight = 6.0 + (44.0 * envelope * dynamicScale);
      } else {
        // Completely stable, stationary voice waveform contour when idle / not in use
        baseHeight = 3.0 + (18.0 * envelope);
      }

      final halfH = baseHeight / 2;
      final yTop = center.dy - halfH;
      final yBottom = center.dy + halfH;

      // Vertical gradient on each bar:
      // Dark mode: neon cyan/purple
      // Light mode: high-contrast royal/sapphire azure that pops on light background
      final barShader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: isDark
            ? [
                const Color(0x6638BDF8),
                isListening
                    ? const Color(0xFF00F0FF)
                    : (isSpeaking ? const Color(0xFF818CF8) : const Color(0xFF00E5FF)),
                const Color(0x6638BDF8),
              ]
            : [
                const Color(0xFF0284C7),
                isListening
                    ? const Color(0xFF0369A1)
                    : (isSpeaking ? const Color(0xFF6D28D9) : const Color(0xFF1D4ED8)),
                const Color(0xFF0284C7),
              ],
      ).createShader(Rect.fromPoints(Offset(x, yTop), Offset(x, yBottom)));

      wavePaint.shader = barShader;
      canvas.drawLine(Offset(x, yTop), Offset(x, yBottom), wavePaint);
    }
  }

  @override
  bool shouldRepaint(covariant _SoundwaveOrbPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.isListening != isListening ||
        oldDelegate.isThinking != isThinking ||
        oldDelegate.isSpeaking != isSpeaking ||
        oldDelegate.isDark != isDark;
  }
}
