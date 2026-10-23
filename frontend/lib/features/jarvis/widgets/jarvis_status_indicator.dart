import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../models/jarvis_models.dart';

/// Top telemetry bar / HUD indicator for JARVIS system status.
class JarvisStatusIndicator extends StatelessWidget {
  final JarvisState state;
  final String modelName;
  final String contextEngineScore;
  final bool isSecure;
  final VoidCallback? onTap;

  const JarvisStatusIndicator({
    super.key,
    this.state = JarvisState.idle,
    this.modelName = 'Gemini 2.5 Pro Multimodal',
    this.contextEngineScore = 'Context Engine: Optimal',
    this.isSecure = true,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: JarvisColors.surfaceElevated.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: JarvisColors.borderSubtle,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Glowing Live Dot
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _getStatusColor(),
                boxShadow: [
                  BoxShadow(
                    color: _getStatusColor().withValues(alpha: 0.6),
                    blurRadius: 6,
                    spreadRadius: 1,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),

            // Engine Status Text
            Text(
              'JARVIS OS',
              style: JarvisTypography.telemetry.copyWith(
                color: JarvisColors.textPrimary,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              width: 3,
              height: 3,
              decoration: const BoxDecoration(
                color: JarvisColors.textDisabled,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),

            // Model / Context info
            Flexible(
              child: Text(
                modelName,
                style: JarvisTypography.bodySmall.copyWith(
                  color: JarvisColors.textSecondary,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),

            if (isSecure) ...[
              const SizedBox(width: 8),
              const Icon(
                Icons.verified_user_outlined,
                color: JarvisColors.success,
                size: 14,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _getStatusColor() {
    switch (state) {
      case JarvisState.listening:
      case JarvisState.responding:
        return JarvisColors.cyan;
      case JarvisState.thinking:
      case JarvisState.retrieving:
      case JarvisState.executing:
        return JarvisColors.indigo;
      case JarvisState.awaitingConfirmation:
      case JarvisState.warning:
        return JarvisColors.warning;
      case JarvisState.error:
        return JarvisColors.error;
      case JarvisState.success:
        return JarvisColors.success;
      case JarvisState.idle:
      default:
        return JarvisColors.cyan;
    }
  }
}
