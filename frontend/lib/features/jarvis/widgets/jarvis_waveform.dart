import 'dart:math';
import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';

/// Animated multi-bar audio waveform visualizer for listening/speaking states.
class JarvisWaveform extends StatefulWidget {
  final bool isActive;
  final Color activeColor;
  final int barCount;
  final double height;

  const JarvisWaveform({
    super.key,
    required this.isActive,
    this.activeColor = JarvisColors.cyan,
    this.barCount = 18,
    this.height = 36,
  });

  @override
  State<JarvisWaveform> createState() => _JarvisWaveformState();
}

class _JarvisWaveformState extends State<JarvisWaveform>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    if (widget.isActive) {
      _controller.repeat();
    }
  }

  @override
  void didUpdateWidget(JarvisWaveform oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive != oldWidget.isActive) {
      if (widget.isActive) {
        _controller.repeat();
      } else {
        _controller.stop();
        _controller.animateTo(0.1, duration: const Duration(milliseconds: 200));
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return SizedBox(
          height: widget.height,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: List.generate(widget.barCount, (index) {
              final phase = (index / widget.barCount) * 2 * pi;
              final t = widget.isActive
                  ? (_controller.value * 2 * pi) + phase
                  : 0.0;
              final rawHeight = (sin(t) + 1.0) / 2.0;
              final barHeight = widget.isActive
                  ? max(6.0, rawHeight * widget.height)
                  : 4.0;

              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 2),
                width: 3.5,
                height: barHeight,
                decoration: BoxDecoration(
                  color: widget.isActive
                      ? widget.activeColor.withValues(
                          alpha: (0.4 + (rawHeight * 0.6)).clamp(0.0, 1.0),
                        )
                      : JarvisColors.textDisabled,
                  borderRadius: BorderRadius.circular(2),
                  boxShadow: widget.isActive
                      ? [
                          BoxShadow(
                            color: widget.activeColor.withValues(alpha: 0.3),
                            blurRadius: 4,
                            spreadRadius: 0.5,
                          ),
                        ]
                      : null,
                ),
              );
            }),
          ),
        );
      },
    );
  }
}
