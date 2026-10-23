import 'package:flutter/material.dart';
import '../../theme/jarvis_colors.dart';
import '../../theme/jarvis_spacing.dart';
import '../../theme/jarvis_typography.dart';
import 'jarvis_glow_button.dart';

/// Futuristic empty state indicator with subtle glow and call-to-action support.
class JarvisEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Color accentColor;
  final bool compact;

  const JarvisEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    this.actionLabel,
    this.onAction,
    this.accentColor = JarvisColors.neonCyan,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.all(compact ? JarvisSpacing.lg : JarvisSpacing.xxl),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Glowing Icon Capsule
            Container(
              width: compact ? 48 : 64,
              height: compact ? 48 : 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: accentColor.withOpacity(0.08),
                border: Border.all(
                  color: accentColor.withOpacity(0.3),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: accentColor.withOpacity(0.2),
                    blurRadius: 18,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Icon(
                icon,
                size: compact ? 22 : 30,
                color: accentColor,
              ),
            ),
            SizedBox(height: compact ? JarvisSpacing.md : JarvisSpacing.lg),

            // Title
            Text(
              title,
              style: (compact
                      ? JarvisTypography.titleMedium
                      : JarvisTypography.titleLarge)
                  .copyWith(
                color: JarvisColors.textPrimary,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: JarvisSpacing.xs),

            // Description
            Text(
              description,
              style: JarvisTypography.bodySmall.copyWith(
                color: JarvisColors.textMuted,
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),

            // Action Button
            if (actionLabel != null && onAction != null) ...[
              SizedBox(height: compact ? JarvisSpacing.md : JarvisSpacing.lg),
              JarvisGlowButton(
                label: actionLabel!,
                onPressed: onAction!,
                icon: const Icon(Icons.add, size: 16, color: Colors.black),
                height: compact ? 38 : 44,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
