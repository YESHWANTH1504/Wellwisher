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

class _JarvisOrbState extends State<JarvisOrb> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
  }

  @override
  void didUpdateWidget(JarvisOrb oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.state != widget.state) {
      if (widget.state == JarvisOrbState.thinking || widget.state == JarvisOrbState.executing) {
        _controller.duration = const Duration(seconds: 1);
        _controller.repeat();
      } else if (widget.state == JarvisOrbState.listening) {
        _controller.duration = const Duration(milliseconds: 1500);
        _controller.repeat();
      } else {
        _controller.duration = const Duration(seconds: 4);
        _controller.repeat();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color _getPrimaryColor() {
    switch (widget.state) {
      case JarvisOrbState.listening:
        return const Color(0xFF00E5FF); // Vibrant Cyan
      case JarvisOrbState.thinking:
        return const Color(0xFF7C4DFF); // Deep Violet
      case JarvisOrbState.executing:
        return const Color(0xFF00E676); // Spring Green
      case JarvisOrbState.speaking:
        return const Color(0xFFFF9100); // Warm Amber
      case JarvisOrbState.waitingForConfirmation:
        return const Color(0xFFFFD600); // Warning Yellow
      case JarvisOrbState.error:
        return const Color(0xFFFF1744); // Neon Red
      case JarvisOrbState.idle:
        return const Color(0xFF2979FF); // Royal Electric Blue
    }
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = _getPrimaryColor();

    return GestureDetector(
      onTap: widget.onTap,
      child: Semantics(
        label: 'JARVIS Central AI Core (${widget.state.name})',
        button: true,
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return CustomPaint(
              size: Size(widget.size, widget.size),
              painter: _JarvisOrbPainter(
                progress: _controller.value,
                state: widget.state,
                color: primaryColor,
              ),
            );
          },
        ),
      ),
    );
  }
}

class _JarvisOrbPainter extends CustomPainter {
  final double progress;
  final JarvisOrbState state;
  final Color color;

  _JarvisOrbPainter({
    required this.progress,
    required this.state,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.38;

    // Outer Halo Pulse
    final pulseScale = 1.0 + 0.15 * math.sin(progress * 2 * math.pi);
    final haloPaint = Paint()
      ..color = color.withValues(alpha: 0.18)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 28);
    canvas.drawCircle(center, radius * 1.35 * pulseScale, haloPaint);

    // Secondary Glow Ring
    final ringPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..color = color.withValues(alpha: 0.6)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4);

    final angle = progress * 2 * math.pi;
    final rect = Rect.fromCircle(center: center, radius: radius * 1.15);
    canvas.drawArc(rect, angle, math.pi * 1.4, false, ringPaint);
    canvas.drawArc(rect, angle + math.pi, math.pi * 0.8, false, ringPaint);

    // Inner Radiant Core
    final coreGradient = RadialGradient(
      colors: [
        Colors.white,
        color.withValues(alpha: 0.9),
        color.withValues(alpha: 0.4),
        Colors.transparent,
      ],
      stops: const [0.0, 0.45, 0.8, 1.0],
    );

    final corePaint = Paint()
      ..shader = coreGradient.createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawCircle(center, radius, corePaint);

    // Inner Sci-Fi Hex / Dot Accents
    final centerDotPaint = Paint()..color = Colors.white.withValues(alpha: 0.95);
    canvas.drawCircle(center, 4.0, centerDotPaint);
  }

  @override
  bool shouldRepaint(covariant _JarvisOrbPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.state != state ||
        oldDelegate.color != color;
  }
}
