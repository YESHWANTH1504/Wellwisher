import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../models/jarvis_models.dart';

/// Interactive animated execution timeline showing step-by-step progress
/// of active JARVIS agent tool runs.
class JarvisExecutionTimeline extends StatelessWidget {
  final String title;
  final List<JarvisExecutionStep> steps;
  final bool isCompleted;

  const JarvisExecutionTimeline({
    super.key,
    this.title = 'JARVIS Agent Execution Plan',
    required this.steps,
    this.isCompleted = false,
  });

  @override
  Widget build(BuildContext context) {
    if (steps.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: JarvisColors.surfaceElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCompleted
              ? JarvisColors.success.withValues(alpha: 0.4)
              : JarvisColors.cyan.withValues(alpha: 0.3),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: (isCompleted ? JarvisColors.success : JarvisColors.cyan)
                .withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isCompleted ? Icons.check_circle_outline : Icons.bolt,
                color: isCompleted ? JarvisColors.success : JarvisColors.cyan,
                size: 18,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title.toUpperCase(),
                  style: JarvisTypography.telemetry.copyWith(
                    color: isCompleted ? JarvisColors.success : JarvisColors.cyan,
                    fontSize: 11,
                  ),
                ),
              ),
              if (!isCompleted) ...[
                const SizedBox(
                  width: 12,
                  height: 12,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: JarvisColors.cyan,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: steps.length,
            separatorBuilder: (context, index) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final step = steps[index];
              return _buildStepRow(step, isLast: index == steps.length - 1);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildStepRow(JarvisExecutionStep step, {required bool isLast}) {
    Color iconColor;
    Widget statusIcon;

    switch (step.status) {
      case JarvisExecutionStatus.completed:
        iconColor = JarvisColors.success;
        statusIcon = const Icon(Icons.check, size: 14, color: JarvisColors.success);
        break;
      case JarvisExecutionStatus.running:
        iconColor = JarvisColors.cyan;
        statusIcon = const SizedBox(
          width: 10,
          height: 10,
          child: CircularProgressIndicator(
            strokeWidth: 1.8,
            color: JarvisColors.cyan,
          ),
        );
        break;
      case JarvisExecutionStatus.failed:
        iconColor = JarvisColors.error;
        statusIcon = const Icon(Icons.close, size: 14, color: JarvisColors.error);
        break;
      case JarvisExecutionStatus.waitingConfirmation:
        iconColor = JarvisColors.warning;
        statusIcon = const Icon(Icons.lock_outline, size: 12, color: JarvisColors.warning);
        break;
      case JarvisExecutionStatus.skipped:
        iconColor = JarvisColors.textDisabled;
        statusIcon = const Icon(Icons.remove, size: 12, color: JarvisColors.textDisabled);
        break;
      case JarvisExecutionStatus.pending:
        iconColor = JarvisColors.textDisabled;
        statusIcon = Container(
          width: 6,
          height: 6,
          decoration: const BoxDecoration(
            color: JarvisColors.textDisabled,
            shape: BoxShape.circle,
          ),
        );
        break;
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 20,
          height: 20,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: iconColor.withValues(alpha: 0.15),
            border: Border.all(color: iconColor.withValues(alpha: 0.4)),
          ),
          child: statusIcon,
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                step.label,
                style: JarvisTypography.bodyMedium.copyWith(
                  color: step.status == JarvisExecutionStatus.pending
                      ? JarvisColors.textTertiary
                      : JarvisColors.textPrimary,
                  fontWeight: step.status == JarvisExecutionStatus.running
                      ? FontWeight.w600
                      : FontWeight.normal,
                ),
              ),
              if (step.detail != null && step.detail!.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  step.detail!,
                  style: JarvisTypography.bodySmall.copyWith(
                    color: JarvisColors.textTertiary,
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
