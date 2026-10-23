import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../theme/jarvis_colors.dart';
import '../../theme/jarvis_spacing.dart';

enum JarvisButtonVariant {
  primary,
  secondary,
  glass,
  danger,
}

/// Cybernetic glowing button with press-scale micro-interaction and haptics.
class JarvisGlowButton extends StatefulWidget {
  final VoidCallback? onPressed;
  final Widget? icon;
  final String label;
  final JarvisButtonVariant variant;
  final bool isLoading;
  final double? width;
  final double height;
  final EdgeInsetsGeometry? padding;

  const JarvisGlowButton({
    super.key,
    required this.onPressed,
    this.icon,
    required this.label,
    this.variant = JarvisButtonVariant.primary,
    this.isLoading = false,
    this.width,
    this.height = 48,
    this.padding,
  });

  @override
  State<JarvisGlowButton> createState() => _JarvisGlowButtonState();
}

class _JarvisGlowButtonState extends State<JarvisGlowButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _scaleController;
  late final Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
      reverseDuration: const Duration(milliseconds: 150),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _scaleController.dispose();
    super.dispose();
  }

  Color get _baseColor {
    switch (widget.variant) {
      case JarvisButtonVariant.primary:
        return JarvisColors.cyan;
      case JarvisButtonVariant.secondary:
        return JarvisColors.indigo;
      case JarvisButtonVariant.glass:
        return const Color(0xFF10192E);
      case JarvisButtonVariant.danger:
        return JarvisColors.rose;
    }
  }

  Color get _textColor {
    switch (widget.variant) {
      case JarvisButtonVariant.primary:
        return const Color(0xFF050811);
      case JarvisButtonVariant.secondary:
      case JarvisButtonVariant.glass:
      case JarvisButtonVariant.danger:
        return Colors.white;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDisabled = widget.onPressed == null || widget.isLoading;

    return ScaleTransition(
      scale: _scaleAnimation,
      child: Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: isDisabled ? _baseColor.withOpacity(0.3) : _baseColor,
          borderRadius: BorderRadius.circular(JarvisSpacing.radiusPill),
          border: widget.variant == JarvisButtonVariant.glass
              ? Border.all(color: JarvisColors.borderMedium, width: 1.0)
              : null,
          boxShadow: !isDisabled && widget.variant != JarvisButtonVariant.glass
              ? [
                  BoxShadow(
                    color: _baseColor.withOpacity(0.35),
                    blurRadius: 16,
                    spreadRadius: -2,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(JarvisSpacing.radiusPill),
          child: InkWell(
            borderRadius: BorderRadius.circular(JarvisSpacing.radiusPill),
            onTapDown: isDisabled ? null : (_) => _scaleController.forward(),
            onTapCancel: isDisabled ? null : () => _scaleController.reverse(),
            onTap: isDisabled
                ? null
                : () {
                    _scaleController.reverse();
                    HapticFeedback.lightImpact();
                    widget.onPressed?.call();
                  },
            child: Padding(
              padding: widget.padding ??
                  const EdgeInsets.symmetric(horizontal: JarvisSpacing.lg),
              child: Center(
                child: widget.isLoading
                    ? SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(_textColor),
                        ),
                      )
                    : Row(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (widget.icon != null) ...[
                            IconTheme(
                              data: IconThemeData(
                                color: _textColor,
                                size: 18,
                              ),
                              child: widget.icon!,
                            ),
                            const SizedBox(width: JarvisSpacing.sm),
                          ],
                          Text(
                            widget.label,
                            style: TextStyle(
                              color: _textColor,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.4,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
