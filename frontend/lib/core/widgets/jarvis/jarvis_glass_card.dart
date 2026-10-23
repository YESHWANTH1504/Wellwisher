import 'dart:ui';
import 'package:flutter/material.dart';
import '../../theme/jarvis_colors.dart';
import '../../theme/jarvis_theme_manager.dart';
import '../../theme/jarvis_spacing.dart';

/// Premium glassmorphic surface card for JARVIS OS.
///
/// Features:
/// - Translucent dark obsidian fill with subtle cyan/purple border gradient.
/// - Optional controlled backdrop blur (disabled by default for 60fps performance).
/// - Accent glow on tap/active.
/// - Rounded corners adhering to [JarvisSpacing.radiusCard].
class JarvisGlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final Color? backgroundColor;
  final Color? borderColor;
  final double borderRadius;
  final bool enableBlur;
  final Color? glowColor;
  final double? width;
  final double? height;

  const JarvisGlassCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.onLongPress,
    this.backgroundColor,
    this.borderColor,
    this.borderRadius = JarvisSpacing.radiusCard,
    this.enableBlur = false,
    this.glowColor,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = JarvisThemeManager().isDarkMode;
    final effectiveBg = backgroundColor ?? (isDark ? const Color(0xCC0D1527) : Colors.white);
    final effectiveBorder = borderColor ?? (isDark ? JarvisColors.borderSubtle : const Color(0xFFE2E8F0));

    Widget cardContent = Container(
      width: width,
      height: height,
      padding: padding ?? const EdgeInsets.all(JarvisSpacing.lg),
      decoration: BoxDecoration(
        color: effectiveBg,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: effectiveBorder, width: 1.0),
        boxShadow: glowColor != null
            ? [
                BoxShadow(
                  color: glowColor!.withOpacity(isDark ? 0.18 : 0.12),
                  blurRadius: 16,
                  spreadRadius: -2,
                ),
              ]
            : [
                BoxShadow(
                  color: isDark ? Colors.black.withOpacity(0.35) : const Color(0x0A000000),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
      ),
      child: child,
    );

    if (enableBlur) {
      cardContent = ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
          child: cardContent,
        ),
      );
    }

    if (onTap != null || onLongPress != null) {
      cardContent = Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(borderRadius),
        child: InkWell(
          onTap: onTap,
          onLongPress: onLongPress,
          borderRadius: BorderRadius.circular(borderRadius),
          splashColor: (glowColor ?? JarvisColors.cyan).withOpacity(0.12),
          highlightColor: (glowColor ?? JarvisColors.cyan).withOpacity(0.06),
          child: cardContent,
        ),
      );
    }

    if (margin != null) {
      cardContent = Padding(padding: margin!, child: cardContent);
    }

    return cardContent;
  }
}
