import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../models/jarvis_models.dart';

class JarvisOrb extends StatefulWidget {
  final JarvisOrbState state;
  final double size;
  final VoidCallback? onTap;

  const JarvisOrb({
    super.key,
    required this.state,
    this.size = 140,
    this.onTap,
  });

  @override
  State<JarvisOrb> createState() => _JarvisOrbState();
}

class _JarvisOrbState extends State<JarvisOrb> with TickerProviderStateMixin {
  late AnimationController _rotationController;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    )..repeat();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);
  }

  @override
  void didUpdateWidget(JarvisOrb oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.state != widget.state) {
      if (widget.state == JarvisOrbState.thinking || widget.state == JarvisOrbState.executing) {
        _rotationController.duration = const Duration(milliseconds: 1200);
        _rotationController.repeat();
        _pulseController.duration = const Duration(milliseconds: 600);
        _pulseController.repeat(reverse: true);
      } else if (widget.state == JarvisOrbState.listening || widget.state == JarvisOrbState.speaking) {
        _rotationController.duration = const Duration(seconds: 3);
        _rotationController.repeat();
        _pulseController.duration = const Duration(milliseconds: 900);
        _pulseController.repeat(reverse: true);
      } else {
        _rotationController.duration = const Duration(seconds: 6);
        _rotationController.repeat();
        _pulseController.duration = const Duration(milliseconds: 1800);
        _pulseController.repeat(reverse: true);
      }
    }
  }

  @override
  void dispose() {
    _rotationController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  List<Color> _getSiriPalette() {
    switch (widget.state) {
      case JarvisOrbState.capturing:
      case JarvisOrbState.listening:
      case JarvisOrbState.listeningForWakeWord:
      case JarvisOrbState.listeningForCommand:
        return const [
          Color(0xFF00F0FF), // Electric Cyan
          Color(0xFF7000FF), // Neon Purple
          Color(0xFFFF007A), // Hot Magenta
          Color(0xFF00E5FF), // Aqua
        ];
      case JarvisOrbState.wakeWordDetected:
        return const [
          Color(0xFF00E5FF),
          Color(0xFF00B0FF),
          Color(0xFF80D8FF),
          Color(0xFF00F0FF),
        ];
      case JarvisOrbState.analyzing:
      case JarvisOrbState.transcribing:
      case JarvisOrbState.understanding:
      case JarvisOrbState.thinking:
      case JarvisOrbState.retrieving:
        return const [
          Color(0xFF7928CA), // Deep Indigo
          Color(0xFFFF0080), // Neon Fuchsia
          Color(0xFF4338CA), // Royal Blue
          Color(0xFF00DFD8), // Turquoise
        ];
      case JarvisOrbState.planning:
      case JarvisOrbState.authorizing:
      case JarvisOrbState.executing:
      case JarvisOrbState.verifying:
        return const [
          Color(0xFF00F5A0), // Neon Emerald
          Color(0xFF00D9F5), // Electric Cyan
          Color(0xFF10B981), // Mint
          Color(0xFF38EF7D), // Spring Green
        ];
      case JarvisOrbState.speaking:
      case JarvisOrbState.responding:
        return const [
          Color(0xFFFF8A00), // Glowing Amber
          Color(0xFFE52E71), // Coral Neon
          Color(0xFFFF416C), // Vibrant Pink
          Color(0xFFFFB199), // Warm Sun
        ];
      case JarvisOrbState.waitingForConfirmation:
      case JarvisOrbState.awaitingConfirmation:
      case JarvisOrbState.warning:
        return const [
          Color(0xFFFFD600), // Gold
          Color(0xFFFF6D00), // Vivid Orange
          Color(0xFFFFAB00), // Amber
          Color(0xFFFFEA00), // Electric Yellow
        ];
      case JarvisOrbState.recovery:
        return const [
          Color(0xFFFB923C),
          Color(0xFFF59E0B),
          Color(0xFFD97706),
          Color(0xFFFBBF24),
        ];
      case JarvisOrbState.interrupted:
        return const [
          Color(0xFFFF0055), // Interrupted Coral
          Color(0xFFFF9900), // Amber Flash
          Color(0xFFFF3366), // Crimson Wave
          Color(0xFFFFCC00), // Gold Accent
        ];
      case JarvisOrbState.reconnecting:
        return const [
          Color(0xFF6366F1), // Reconnecting Indigo
          Color(0xFF3B82F6), // Sky Blue
          Color(0xFF00F0FF), // Cyan
          Color(0xFF818CF8), // Purple Accent
        ];
      case JarvisOrbState.error:
        return const [
          Color(0xFFFF0055), // Crimson
          Color(0xFFFF5252), // Neon Coral
          Color(0xFF7A0000), // Dark Burgundy
          Color(0xFFFF1744), // Scarlet
        ];
      case JarvisOrbState.sleeping:
        return const [
          Color(0xFF1E293B), // Deep Slate
          Color(0xFF334155),
          Color(0xFF0F172A),
          Color(0xFF475569),
        ];
      case JarvisOrbState.acting:
        return const [
          Color(0xFF00F5A0),
          Color(0xFF00D9F5),
          Color(0xFF10B981),
          Color(0xFF38EF7D),
        ];
      case JarvisOrbState.waitingForFollowup:
        return const [
          Color(0xFF00F0FF),
          Color(0xFF38BDF8),
          Color(0xFF00E5FF),
          Color(0xFF818CF8),
        ];
      case JarvisOrbState.manualMode:
        return const [
          Color(0xFF818CF8),
          Color(0xFF6366F1),
          Color(0xFF4F46E5),
          Color(0xFFC084FC),
        ];
      case JarvisOrbState.completed:
      case JarvisOrbState.success:
      case JarvisOrbState.idle:
        return const [
          Color(0xFF3B82F6), // Siri Royal Blue
          Color(0xFF8B5CF6), // Siri Purple
          Color(0xFF06B6D4), // Cyan Glow
          Color(0xFFEC4899), // Magenta Accent
        ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final palette = _getSiriPalette();

    return GestureDetector(
      onTap: widget.onTap,
      child: Semantics(
        label: 'Siri & Alexa AI Assistant (${widget.state.name})',
        button: true,
        child: AnimatedBuilder(
          animation: Listenable.merge([_rotationController, _pulseController]),
          builder: (context, child) {
            return CustomPaint(
              size: Size(widget.size, widget.size),
              painter: _SiriFluidOrbPainter(
                rotationProgress: _rotationController.value,
                pulseProgress: _pulseController.value,
                state: widget.state,
                palette: palette,
              ),
            );
          },
        ),
      ),
    );
  }
}

class _SiriFluidOrbPainter extends CustomPainter {
  final double rotationProgress;
  final double pulseProgress;
  final JarvisOrbState state;
  final List<Color> palette;

  _SiriFluidOrbPainter({
    required this.rotationProgress,
    required this.pulseProgress,
    required this.state,
    required this.palette,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final baseRadius = size.width * 0.36;

    // 1. Siri Ambient Atmospheric Bloom (Soft Giant Glow)
    final bloomScale = 1.0 + 0.20 * pulseProgress;
    final bloomPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          palette[0].withValues(alpha: 0.35),
          palette[1].withValues(alpha: 0.20),
          palette[2].withValues(alpha: 0.08),
          Colors.transparent,
        ],
        stops: const [0.0, 0.45, 0.75, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: baseRadius * 1.8 * bloomScale));
    canvas.drawCircle(center, baseRadius * 1.8 * bloomScale, bloomPaint);

    // 2. Swirling Chromatic Wave Rings (Multi-pass Organic Wave Layer)
    for (int i = 0; i < 3; i++) {
      final ringAngle = (rotationProgress * 2 * math.pi) + (i * math.pi * 2 / 3);
      final ringColor = palette[i % palette.length];
      final ringRadius = baseRadius * (1.05 + 0.12 * math.sin(rotationProgress * 4 * math.pi + i));

      final ringPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.0
        ..color = ringColor.withValues(alpha: 0.65)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5);

      final rect = Rect.fromCircle(center: center, radius: ringRadius);
      canvas.drawArc(rect, ringAngle, math.pi * 1.2, false, ringPaint);
    }

    // 3. Fluid Liquid Plasma Core (Siri Organic Gradient)
    final rotationAngle = rotationProgress * 2 * math.pi;
    final coreGradient = SweepGradient(
      colors: [
        palette[0],
        palette[1],
        palette[2],
        palette[3],
        palette[0],
      ],
      transform: GradientRotation(rotationAngle),
    );

    final coreRadius = baseRadius * (0.95 + 0.08 * pulseProgress);
    final corePaint = Paint()
      ..shader = coreGradient.createShader(Rect.fromCircle(center: center, radius: coreRadius))
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2);
    canvas.drawCircle(center, coreRadius, corePaint);

    // 4. Inner Crystalline Specular Light (Glossy 3D Highlight)
    final specularOffset = Offset(center.dx - coreRadius * 0.25, center.dy - coreRadius * 0.25);
    final specularPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          Colors.white.withValues(alpha: 0.95),
          Colors.white.withValues(alpha: 0.4),
          Colors.transparent,
        ],
        stops: const [0.0, 0.35, 1.0],
      ).createShader(Rect.fromCircle(center: specularOffset, radius: coreRadius * 0.6));
    canvas.drawCircle(specularOffset, coreRadius * 0.5, specularPaint);

    // 5. Center Brilliant Neural Node
    final centerGlow = Paint()
      ..color = Colors.white.withValues(alpha: 0.9)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3);
    canvas.drawCircle(center, 4.5, centerGlow);
  }

  @override
  bool shouldRepaint(covariant _SiriFluidOrbPainter oldDelegate) {
    return oldDelegate.rotationProgress != rotationProgress ||
        oldDelegate.pulseProgress != pulseProgress ||
        oldDelegate.state != state;
  }
}
