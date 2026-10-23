import 'package:flutter/material.dart';
import '../../theme/jarvis_colors.dart';
import '../../theme/jarvis_theme_manager.dart';
import '../../theme/jarvis_typography.dart';

/// Futuristic floating speech bar matching the reference image bottom area.
/// Contains a neon wave ribbon, keyboard action button, central glowing mic, and audio wave action.
/// Full White Theme and Dark Theme visual contrast support.
class JarvisBottomSpeechBar extends StatelessWidget {
  final bool isListening;
  final VoidCallback onMicTap;
  final VoidCallback onKeyboardTap;
  final VoidCallback? onWaveformTap;

  const JarvisBottomSpeechBar({
    super.key,
    required this.isListening,
    required this.onMicTap,
    required this.onKeyboardTap,
    this.onWaveformTap,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: JarvisThemeManager(),
      builder: (context, _) {
        final isDark = JarvisThemeManager().isDarkMode;

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // 1. Neon / Sky Gradient Wave Ribbon Background
              Positioned.fill(
                child: CustomPaint(
                  painter: _WaveRibbonPainter(
                    isListening: isListening,
                    isDark: isDark,
                  ),
                ),
              ),

              // 2. Interactive Controls Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Keyboard button
                  _buildSquareButton(
                    key: const Key('jarvis_keyboard_button'),
                    icon: Icons.keyboard_alt_outlined,
                    tooltip: 'Type message',
                    onTap: onKeyboardTap,
                    isDark: isDark,
                  ),

                  // Center Mic + "Tap to speak"
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      GestureDetector(
                        onTap: onMicTap,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isDark ? const Color(0xFF070B14) : Colors.white,
                            border: Border.all(
                              color: isListening
                                  ? (isDark ? JarvisColors.cyan : const Color(0xFF0284C7))
                                  : (isDark ? const Color(0xFF38BDF8) : const Color(0xFFCBD5E1)),
                              width: 2.5,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: isDark
                                    ? (isListening
                                        ? JarvisColors.cyan.withValues(alpha: 0.55)
                                        : const Color(0xFF3B82F6).withValues(alpha: 0.35))
                                    : (isListening
                                        ? const Color(0xFF0284C7).withValues(alpha: 0.35)
                                        : const Color(0x140284C7)),
                                blurRadius: isListening ? 20 : 12,
                                spreadRadius: isListening ? 3 : 1,
                              ),
                            ],
                          ),
                          child: Icon(
                            isListening ? Icons.mic_rounded : Icons.mic_none_rounded,
                            color: isListening
                                ? (isDark ? JarvisColors.cyan : const Color(0xFF0284C7))
                                : (isDark ? Colors.white : const Color(0xFF0F172A)),
                            size: 30,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        isListening ? 'Listening...' : 'Tap to speak',
                        style: JarvisTypography.caption.copyWith(
                          color: isDark ? JarvisColors.textSecondary : const Color(0xFF64748B),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),

                  // Waveform / Audio State button
                  _buildSquareButton(
                    icon: Icons.graphic_eq_rounded,
                    tooltip: 'Audio mode',
                    onTap: onWaveformTap ?? onMicTap,
                    active: isListening,
                    isDark: isDark,
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSquareButton({
    Key? key,
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
    bool active = false,
    required bool isDark,
  }) {
    final activeColor = isDark ? JarvisColors.cyan : const Color(0xFF0284C7);
    final inactiveColor = isDark ? JarvisColors.textSecondary : const Color(0xFF475569);

    return Material(
      key: key,
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: isDark ? const Color(0x990D1527) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: active ? activeColor : (isDark ? const Color(0x3338BDF8) : const Color(0xFFCBD5E1)),
              width: 1.2,
            ),
            boxShadow: isDark
                ? null
                : [
                    const BoxShadow(
                      color: Color(0x0A000000),
                      blurRadius: 6,
                      offset: Offset(0, 2),
                    ),
                  ],
          ),
          child: Icon(
            icon,
            color: active ? activeColor : inactiveColor,
            size: 22,
          ),
        ),
      ),
    );
  }
}

class _WaveRibbonPainter extends CustomPainter {
  final bool isListening;
  final bool isDark;

  _WaveRibbonPainter({required this.isListening, required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path();
    final midY = size.height * 0.55;

    path.moveTo(0, midY);
    path.cubicTo(
      size.width * 0.25,
      midY + 12,
      size.width * 0.4,
      midY - 18,
      size.width * 0.5,
      midY,
    );
    path.cubicTo(
      size.width * 0.6,
      midY + 18,
      size.width * 0.75,
      midY - 12,
      size.width,
      midY,
    );

    final ribbonShader = LinearGradient(
      colors: isDark
          ? [
              const Color(0x003B82F6),
              const Color(0x9938BDF8),
              isListening ? const Color(0xFF00F0FF) : const Color(0xFF8B5CF6),
              const Color(0x9938BDF8),
              const Color(0x003B82F6),
            ]
          : [
              const Color(0x000284C7),
              const Color(0x4D38BDF8),
              isListening ? const Color(0xFF0284C7) : const Color(0xFF7C3AED),
              const Color(0x4D38BDF8),
              const Color(0x000284C7),
            ],
    ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    // Outer subtle ambient glow stroke
    final glowPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = isListening ? 5.0 : 3.5
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 4.0)
      ..shader = ribbonShader;
    canvas.drawPath(path, glowPaint);

    // Inner crisp ribbon stroke
    final ribbonPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..shader = ribbonShader;
    canvas.drawPath(path, ribbonPaint);
  }

  @override
  bool shouldRepaint(covariant _WaveRibbonPainter oldDelegate) {
    return oldDelegate.isListening != isListening || oldDelegate.isDark != isDark;
  }
}
