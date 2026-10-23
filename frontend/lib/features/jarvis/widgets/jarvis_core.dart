import 'dart:math';
import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../models/jarvis_models.dart';

/// Central dynamic JARVIS AI Core / Reactor.
/// CustomPainter-driven with state-reactive energy rings, particle orbits,
/// breathing pulses, and state badges.
class JarvisCore extends StatefulWidget {
  final JarvisState state;
  final double size;
  final VoidCallback? onTap;
  final String? customLabel;
  final bool showLabel;

  const JarvisCore({
    super.key,
    required this.state,
    this.size = 140,
    this.onTap,
    this.customLabel,
    this.showLabel = true,
  });

  @override
  State<JarvisCore> createState() => _JarvisCoreState();
}

class _JarvisCoreState extends State<JarvisCore>
    with TickerProviderStateMixin {
  late final AnimationController _rotationController;
  late final AnimationController _pulseController;
  late final AnimationController _particleController;

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat(reverse: true);

    _particleController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
  }

  @override
  void didUpdateWidget(JarvisCore oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.state != oldWidget.state) {
      _adjustAnimationSpeeds();
    }
  }

  void _adjustAnimationSpeeds() {
    switch (widget.state) {
      case JarvisState.capturing:
      case JarvisState.listening:
      case JarvisState.listeningForWakeWord:
      case JarvisState.wakeWordDetected:
      case JarvisState.listeningForCommand:
        _rotationController.duration = const Duration(seconds: 4);
        _pulseController.duration = const Duration(milliseconds: 1000);
        break;
      case JarvisState.analyzing:
      case JarvisState.transcribing:
      case JarvisState.understanding:
      case JarvisState.thinking:
      case JarvisState.retrieving:
        _rotationController.duration = const Duration(seconds: 2);
        _pulseController.duration = const Duration(milliseconds: 800);
        break;
      case JarvisState.planning:
      case JarvisState.authorizing:
      case JarvisState.executing:
      case JarvisState.verifying:
        _rotationController.duration = const Duration(seconds: 1);
        _pulseController.duration = const Duration(milliseconds: 600);
        break;
      case JarvisState.responding:
      case JarvisState.speaking:
        _rotationController.duration = const Duration(seconds: 3);
        _pulseController.duration = const Duration(milliseconds: 1200);
        break;
      case JarvisState.awaitingConfirmation:
      case JarvisState.waitingForConfirmation:
      case JarvisState.warning:
        _rotationController.duration = const Duration(seconds: 6);
        _pulseController.duration = const Duration(milliseconds: 1400);
        break;
      case JarvisState.recovery:
      case JarvisState.error:
        _rotationController.duration = const Duration(seconds: 10);
        _pulseController.duration = const Duration(milliseconds: 1800);
        break;
      case JarvisState.sleeping:
        _rotationController.duration = const Duration(seconds: 16);
        _pulseController.duration = const Duration(milliseconds: 3200);
        break;
      case JarvisState.acting:
        _rotationController.duration = const Duration(seconds: 1);
        _pulseController.duration = const Duration(milliseconds: 600);
        break;
      case JarvisState.waitingForFollowup:
        _rotationController.duration = const Duration(seconds: 4);
        _pulseController.duration = const Duration(milliseconds: 1200);
        break;
      case JarvisState.manualMode:
        _rotationController.duration = const Duration(seconds: 10);
        _pulseController.duration = const Duration(milliseconds: 2000);
        break;
      case JarvisState.completed:
      case JarvisState.success:
      case JarvisState.idle:
        _rotationController.duration = const Duration(seconds: 8);
        _pulseController.duration = const Duration(milliseconds: 2400);
        break;
      case JarvisState.interrupted:
        _rotationController.duration = const Duration(seconds: 3);
        _pulseController.duration = const Duration(milliseconds: 600);
        break;
      case JarvisState.reconnecting:
        _rotationController.duration = const Duration(seconds: 2);
        _pulseController.duration = const Duration(milliseconds: 900);
        break;
    }
    _rotationController.repeat();
    _pulseController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _rotationController.dispose();
    _pulseController.dispose();
    _particleController.dispose();
    super.dispose();
  }

  Color _getStateColor() {
    switch (widget.state) {
      case JarvisState.sleeping:
        return const Color(0xFF475569);
      case JarvisState.capturing:
      case JarvisState.listening:
      case JarvisState.listeningForWakeWord:
      case JarvisState.listeningForCommand:
        return JarvisColors.cyan;
      case JarvisState.wakeWordDetected:
        return const Color(0xFF00E5FF);
      case JarvisState.analyzing:
      case JarvisState.transcribing:
      case JarvisState.understanding:
      case JarvisState.thinking:
      case JarvisState.retrieving:
        return JarvisColors.indigo;
      case JarvisState.planning:
      case JarvisState.authorizing:
      case JarvisState.executing:
      case JarvisState.acting:
        return JarvisColors.purple;
      case JarvisState.verifying:
        return const Color(0xFF10B981); // Emerald verifying pulse
      case JarvisState.responding:
      case JarvisState.speaking:
        return const Color(0xFF38BDF8); // Sky blue
      case JarvisState.waitingForFollowup:
        return const Color(0xFF00E5FF);
      case JarvisState.manualMode:
        return const Color(0xFF818CF8);
      case JarvisState.awaitingConfirmation:
      case JarvisState.waitingForConfirmation:
      case JarvisState.warning:
        return JarvisColors.warning;
      case JarvisState.recovery:
        return const Color(0xFFF59E0B);
      case JarvisState.error:
        return JarvisColors.error;
      case JarvisState.completed:
      case JarvisState.success:
        return JarvisColors.success;
      case JarvisState.idle:
        return JarvisColors.cyan;
      case JarvisState.interrupted:
        return const Color(0xFFF97316); // Amber / Orange
      case JarvisState.reconnecting:
        return const Color(0xFFEAB308); // Yellow
    }
  }

  String _getStateText() {
    if (widget.customLabel != null) return widget.customLabel!;
    switch (widget.state) {
      case JarvisState.sleeping:
        return "Say 'Hey Jarvis'";
      case JarvisState.idle:
        return 'JARVIS READY';
      case JarvisState.listeningForWakeWord:
        return "Say 'Hey Jarvis'";
      case JarvisState.wakeWordDetected:
        return "Yes? I'm listening";
      case JarvisState.capturing:
        return 'CAPTURING...';
      case JarvisState.analyzing:
        return 'ANALYZING...';
      case JarvisState.listening:
        return 'LISTENING...';
      case JarvisState.listeningForCommand:
        return "I'm listening...";
      case JarvisState.transcribing:
        return "Processing...";
      case JarvisState.understanding:
      case JarvisState.thinking:
        return "Thinking...";
      case JarvisState.retrieving:
        return "Fetching context...";
      case JarvisState.planning:
      case JarvisState.authorizing:
      case JarvisState.executing:
      case JarvisState.acting:
        return "Working...";
      case JarvisState.verifying:
        return "Checking...";
      case JarvisState.responding:
      case JarvisState.speaking:
        return "Speaking...";
      case JarvisState.waitingForFollowup:
        return "Anything else?";
      case JarvisState.manualMode:
        return "Manual Mode";
      case JarvisState.awaitingConfirmation:
      case JarvisState.waitingForConfirmation:
        return "Confirmation Required";
      case JarvisState.warning:
        return "Attention Required";
      case JarvisState.recovery:
        return "Recovering...";
      case JarvisState.error:
        return "Error Encountered";
      case JarvisState.completed:
      case JarvisState.success:
        return "Done ✓";
      case JarvisState.interrupted:
        return "Interrupted";
      case JarvisState.reconnecting:
        return "Reconnecting...";
    }
  }

  @override
  Widget build(BuildContext context) {
    final stateColor = _getStateColor();

    return GestureDetector(
      onTap: widget.onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: widget.size,
            height: widget.size,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Outer Ambient Glow
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (context, child) {
                    final scale = 0.95 + (_pulseController.value * 0.12);
                    final alpha = (0.2 + (_pulseController.value * 0.25)).clamp(0.0, 1.0);
                    return Transform.scale(
                      scale: scale,
                      child: Container(
                        width: widget.size * 0.85,
                        height: widget.size * 0.85,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: stateColor.withValues(alpha: alpha),
                              blurRadius: widget.size * 0.35,
                              spreadRadius: widget.size * 0.1,
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),

                // Multi-Ring Canvas
                AnimatedBuilder(
                  animation: Listenable.merge([
                    _rotationController,
                    _pulseController,
                    _particleController,
                  ]),
                  builder: (context, child) {
                    return CustomPaint(
                      size: Size(widget.size, widget.size),
                      painter: _JarvisCorePainter(
                        rotation: _rotationController.value * 2 * pi,
                        pulse: _pulseController.value,
                        particleProgress: _particleController.value,
                        state: widget.state,
                        color: stateColor,
                      ),
                    );
                  },
                ),

                // Center Icon/Symbol
                Container(
                  width: widget.size * 0.38,
                  height: widget.size * 0.38,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        stateColor.withValues(alpha: 0.9),
                        JarvisColors.surfaceElevated,
                        JarvisColors.background,
                      ],
                      stops: const [0.2, 0.7, 1.0],
                    ),
                    border: Border.all(
                      color: stateColor.withValues(alpha: 0.8),
                      width: 1.5,
                    ),
                  ),
                  child: Center(
                    child: _buildCenterIcon(stateColor),
                  ),
                ),
              ],
            ),
          ),

          if (widget.showLabel) ...[
            const SizedBox(height: 10),
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: stateColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: stateColor.withValues(alpha: 0.4),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: stateColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _getStateText(),
                    style: JarvisTypography.telemetry.copyWith(
                      color: stateColor,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCenterIcon(Color color) {
    switch (widget.state) {
      case JarvisState.capturing:
        return Icon(Icons.camera_alt, color: Colors.white, size: widget.size * 0.2);
      case JarvisState.analyzing:
        return Icon(Icons.document_scanner, color: Colors.white, size: widget.size * 0.2);
      case JarvisState.listening:
      case JarvisState.listeningForWakeWord:
      case JarvisState.listeningForCommand:
        return Icon(Icons.mic, color: Colors.white, size: widget.size * 0.18);
      case JarvisState.wakeWordDetected:
        return Icon(Icons.hearing_rounded, color: Colors.white, size: widget.size * 0.2);
      case JarvisState.transcribing:
      case JarvisState.understanding:
      case JarvisState.thinking:
      case JarvisState.retrieving:
        return Icon(Icons.psychology, color: Colors.white, size: widget.size * 0.18);
      case JarvisState.planning:
      case JarvisState.authorizing:
      case JarvisState.executing:
        return Icon(Icons.bolt, color: Colors.white, size: widget.size * 0.2);
      case JarvisState.verifying:
        return Icon(Icons.verified_outlined, color: Colors.white, size: widget.size * 0.2);
      case JarvisState.responding:
      case JarvisState.speaking:
        return Icon(Icons.graphic_eq, color: Colors.white, size: widget.size * 0.18);
      case JarvisState.awaitingConfirmation:
      case JarvisState.waitingForConfirmation:
      case JarvisState.warning:
        return Icon(Icons.shield_outlined, color: Colors.white, size: widget.size * 0.18);
      case JarvisState.recovery:
      case JarvisState.error:
        return Icon(Icons.warning_amber_rounded, color: Colors.white, size: widget.size * 0.18);
      case JarvisState.sleeping:
        return Icon(Icons.nightlight_round, color: Colors.white70, size: widget.size * 0.18);
      case JarvisState.acting:
        return Icon(Icons.bolt, color: Colors.white, size: widget.size * 0.2);
      case JarvisState.waitingForFollowup:
        return Icon(Icons.question_answer_rounded, color: Colors.white, size: widget.size * 0.18);
      case JarvisState.manualMode:
        return Icon(Icons.keyboard_rounded, color: Colors.white, size: widget.size * 0.18);
      case JarvisState.completed:
      case JarvisState.success:
        return Icon(Icons.check, color: Colors.white, size: widget.size * 0.2);
      case JarvisState.idle:
        return Icon(Icons.auto_awesome, color: Colors.white, size: widget.size * 0.18);
      case JarvisState.interrupted:
        return Icon(Icons.stop_circle_outlined, color: Colors.white, size: widget.size * 0.18);
      case JarvisState.reconnecting:
        return Icon(Icons.sync_rounded, color: Colors.white, size: widget.size * 0.18);
    }
  }
}

class _JarvisCorePainter extends CustomPainter {
  final double rotation;
  final double pulse;
  final double particleProgress;
  final JarvisState state;
  final Color color;

  _JarvisCorePainter({
    required this.rotation,
    required this.pulse,
    required this.particleProgress,
    required this.state,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    // 1. Outer Arc Rings
    final outerRingPaint = Paint()
      ..color = color.withValues(alpha: 0.35)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final outerRect = Rect.fromCircle(center: center, radius: radius * 0.92);
    // Draw 3 orbiting arcs
    canvas.drawArc(outerRect, rotation, pi * 0.5, false, outerRingPaint);
    canvas.drawArc(outerRect, rotation + (pi * 0.7), pi * 0.4, false, outerRingPaint);
    canvas.drawArc(outerRect, rotation + (pi * 1.4), pi * 0.6, false, outerRingPaint);

    // 2. Middle Counter-Rotating Ring with Dotted Nodes
    final middleRingPaint = Paint()
      ..color = color.withValues(alpha: 0.55)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    final middleRect = Rect.fromCircle(center: center, radius: radius * 0.72);
    canvas.drawArc(middleRect, -rotation * 1.5, pi * 0.8, false, middleRingPaint);
    canvas.drawArc(middleRect, -rotation * 1.5 + pi, pi * 0.7, false, middleRingPaint);

    // 3. Inner Pulsing Energy Track
    final innerPaint = Paint()
      ..color = color.withValues(alpha: (0.3 + (pulse * 0.4)).clamp(0.0, 1.0))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0 + (pulse * 1.5);
    canvas.drawCircle(center, radius * 0.52, innerPaint);

    // 4. Orbital Energy Nodes (Particles)
    final nodePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    for (int i = 0; i < 4; i++) {
      final angle = (rotation * 2) + (i * (pi / 2));
      final particleR = radius * (0.68 + (sin(particleProgress * 2 * pi + i) * 0.08));
      final x = center.dx + (particleR * cos(angle));
      final y = center.dy + (particleR * sin(angle));
      canvas.drawCircle(Offset(x, y), 2.2, nodePaint);
    }
  }

  @override
  bool shouldRepaint(covariant _JarvisCorePainter oldDelegate) {
    return oldDelegate.rotation != rotation ||
        oldDelegate.pulse != pulse ||
        oldDelegate.particleProgress != particleProgress ||
        oldDelegate.state != state ||
        oldDelegate.color != color;
  }
}
