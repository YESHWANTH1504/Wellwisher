import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../models/jarvis_models.dart';

/// Attention panel rendered when JARVIS requires user consent, confirmation,
/// or high-priority intervention.
class JarvisAttention extends StatelessWidget {
  final String title;
  final String description;
  final JarvisConfirmation? confirmation;
  final VoidCallback? onConfirm;
  final VoidCallback? onDismiss;
  final bool isHighRisk;

  const JarvisAttention({
    super.key,
    required this.title,
    required this.description,
    this.confirmation,
    this.onConfirm,
    this.onDismiss,
    this.isHighRisk = false,
  });

  @override
  Widget build(BuildContext context) {
    final accentColor = isHighRisk || confirmation != null
        ? JarvisColors.warning
        : JarvisColors.info;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: JarvisColors.surfaceElevated,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: accentColor.withValues(alpha: 0.5),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: accentColor.withValues(alpha: 0.12),
            blurRadius: 18,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  confirmation != null
                      ? Icons.shield_outlined
                      : Icons.notification_important_outlined,
                  color: accentColor,
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  confirmation != null
                      ? 'JARVIS APPROVAL REQUIRED'
                      : 'JARVIS ATTENTION',
                  style: JarvisTypography.telemetry.copyWith(
                    color: accentColor,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          Text(
            title,
            style: JarvisTypography.h3.copyWith(
              color: JarvisColors.textPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 6),

          Text(
            description,
            style: JarvisTypography.bodyMedium.copyWith(
              color: JarvisColors.textSecondary,
            ),
          ),

          if (confirmation != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: JarvisColors.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: JarvisColors.borderSubtle),
              ),
              child: Row(
                children: [
                  const Icon(Icons.key_outlined, size: 14, color: JarvisColors.cyan),
                  const SizedBox(width: 6),
                  Text(
                    'Tool: ${confirmation!.tool}',
                    style: JarvisTypography.telemetry.copyWith(
                      color: JarvisColors.cyan,
                      fontSize: 10,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    'ID: ${confirmation!.confirmationId.length > 10 ? confirmation!.confirmationId.substring(0, 10) : confirmation!.confirmationId}...',
                    style: JarvisTypography.bodySmall.copyWith(
                      color: JarvisColors.textTertiary,
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 16),

          // Action Buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (onDismiss != null) ...[
                TextButton(
                  onPressed: onDismiss,
                  style: TextButton.styleFrom(
                    foregroundColor: JarvisColors.textSecondary,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                  child: const Text('Dismiss / Cancel'),
                ),
                const SizedBox(width: 8),
              ],
              if (onConfirm != null) ...[
                ElevatedButton.icon(
                  onPressed: onConfirm,
                  icon: const Icon(Icons.check, size: 16),
                  label: Text(
                    confirmation != null ? 'Approve & Execute' : 'Acknowledge',
                    style: JarvisTypography.buttonText.copyWith(
                      color: JarvisColors.background,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: accentColor,
                    foregroundColor: JarvisColors.background,
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
