import 'package:flutter/material.dart';
import '../../theme/jarvis_colors.dart';
import '../../theme/jarvis_spacing.dart';
import '../../theme/jarvis_typography.dart';

/// Standard futuristic section header for JARVIS interface screens.
class JarvisSectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData? icon;
  final Color? iconColor;
  final Widget? trailing;
  final VoidCallback? onTrailingTap;
  final String? trailingText;
  final EdgeInsetsGeometry padding;

  const JarvisSectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.iconColor,
    this.trailing,
    this.onTrailingTap,
    this.trailingText,
    this.padding = const EdgeInsets.symmetric(
      horizontal: JarvisSpacing.md,
      vertical: JarvisSpacing.sm,
    ),
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: (iconColor ?? JarvisColors.neonCyan).withOpacity(0.12),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: (iconColor ?? JarvisColors.neonCyan).withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Icon(
                icon,
                size: 16,
                color: iconColor ?? JarvisColors.neonCyan,
              ),
            ),
            const SizedBox(width: JarvisSpacing.sm),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title.toUpperCase(),
                  style: JarvisTypography.caption.copyWith(
                    color: JarvisColors.textPrimary,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: JarvisTypography.micro.copyWith(
                      color: JarvisColors.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null)
            trailing!
          else if (trailingText != null)
            InkWell(
              onTap: onTrailingTap,
              borderRadius: BorderRadius.circular(JarvisSpacing.radiusPill),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Text(
                  trailingText!,
                  style: JarvisTypography.caption.copyWith(
                    color: JarvisColors.neonCyan,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
