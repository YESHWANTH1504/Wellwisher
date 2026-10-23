import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../theme/jarvis_colors.dart';
import '../../theme/jarvis_theme_manager.dart';

/// JarvisDailyProgressRing
/// Renders a futuristic glowing circular activity ring matching the reference design.
/// Strictly displays genuine goal progress (e.g. 75% Daily Progress) or explicit NO_DATA.
/// ZERO fabricated "Health Score" or arbitrary health calculations.
class JarvisDailyProgressRing extends StatefulWidget {
  final double progressPercent; // 0.0 to 100.0+
  final String label;
  final String statusText;
  final bool hasData;
  final double size;

  const JarvisDailyProgressRing({
    super.key,
    required this.progressPercent,
    this.label = 'Daily Progress',
    this.statusText = 'Good',
    this.hasData = true,
    this.size = 130.0,
  });

  @override
  State<JarvisDailyProgressRing> createState() => _JarvisDailyProgressRingState();
}

class _JarvisDailyProgressRingState extends State<JarvisDailyProgressRing>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _progressAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _progressAnim = Tween<double>(
      begin: 0.0,
      end: widget.progressPercent.clamp(0.0, 100.0),
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutCubic,
    ));
    _animController.forward();
  }

  @override
  void didUpdateWidget(covariant JarvisDailyProgressRing oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.progressPercent != widget.progressPercent) {
      _progressAnim = Tween<double>(
        begin: _progressAnim.value,
        end: widget.progressPercent.clamp(0.0, 100.0),
      ).animate(CurvedAnimation(
        parent: _animController,
        curve: Curves.easeOutCubic,
      ));
      _animController
        ..reset()
        ..forward();
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = JarvisThemeManager().isDarkMode;

    return AnimatedBuilder(
      animation: _animController,
      builder: (context, _) {
        final currentVal = _progressAnim.value.toInt();
        return FittedBox(
          fit: BoxFit.scaleDown,
          child: Container(
            width: widget.size,
            height: widget.size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: JarvisColors.cyan.withOpacity(isDark ? 0.18 : 0.12),
                  blurRadius: 28,
                  spreadRadius: 2,
                ),
                BoxShadow(
                  color: JarvisColors.purple.withOpacity(isDark ? 0.12 : 0.08),
                  blurRadius: 36,
                  spreadRadius: 4,
                ),
              ],
            ),
            child: CustomPaint(
              painter: _ProgressRingPainter(
                progress: _progressAnim.value / 100.0,
                hasData: widget.hasData,
                isDark: isDark,
              ),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      widget.hasData ? '$currentVal%' : '--',
                      style: TextStyle(
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                        height: 1.0,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      widget.label,
                      style: TextStyle(
                        color: isDark ? Colors.white70 : const Color(0xFF475569),
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: widget.hasData
                            ? const Color(0xFF00E676).withOpacity(isDark ? 0.18 : 0.14)
                            : (isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: widget.hasData
                              ? const Color(0xFF00E676).withOpacity(0.5)
                              : (isDark ? Colors.white24 : const Color(0xFFCBD5E1)),
                          width: 0.8,
                        ),
                      ),
                      child: Text(
                        widget.hasData ? widget.statusText : 'No Data',
                        style: TextStyle(
                          color: widget.hasData
                              ? const Color(0xFF00E676)
                              : (isDark ? Colors.white54 : const Color(0xFF64748B)),
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _ProgressRingPainter extends CustomPainter {
  final double progress; // 0.0 to 1.0
  final bool hasData;
  final bool isDark;

  _ProgressRingPainter({
    required this.progress,
    required this.hasData,
    this.isDark = true,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - 14) / 2;
    const strokeWidth = 8.0;

    // Background track ring
    final bgPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..color = isDark
          ? const Color(0xFF142036).withOpacity(0.85)
          : const Color(0xFFE2E8F0);
    canvas.drawCircle(center, radius, bgPaint);

    if (hasData && progress > 0.0) {
      // Glow under progress arc
      final glowPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth + 4
        ..strokeCap = StrokeCap.round
        ..shader = const SweepGradient(
          startAngle: -math.pi / 2,
          endAngle: 3 * math.pi / 2,
          colors: [
            Color(0x6600E5FF),
            Color(0x662979FF),
            Color(0x669D4EDD),
            Color(0x6600E5FF),
          ],
        ).createShader(Rect.fromCircle(center: center, radius: radius))
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);

      final sweepAngle = (2 * math.pi * progress).clamp(0.01, 2 * math.pi);
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -math.pi / 2,
        sweepAngle,
        false,
        glowPaint,
      );

      // Primary gradient arc
      final arcPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round
        ..shader = const SweepGradient(
          startAngle: -math.pi / 2,
          endAngle: 3 * math.pi / 2,
          colors: [
            Color(0xFF00E5FF),
            Color(0xFF2979FF),
            Color(0xFF9D4EDD),
            Color(0xFF00E5FF),
          ],
        ).createShader(Rect.fromCircle(center: center, radius: radius));

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -math.pi / 2,
        sweepAngle,
        false,
        arcPaint,
      );

      // Node dot at progress tip
      final tipAngle = -math.pi / 2 + sweepAngle;
      final tipX = center.dx + radius * math.cos(tipAngle);
      final tipY = center.dy + radius * math.sin(tipAngle);
      final dotPaint = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill;
      canvas.drawCircle(Offset(tipX, tipY), strokeWidth * 0.45, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _ProgressRingPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.hasData != hasData;
  }
}
