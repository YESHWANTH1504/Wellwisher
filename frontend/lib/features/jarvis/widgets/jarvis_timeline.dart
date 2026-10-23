import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';

enum JarvisTimelineCategory {
  appointment,
  routine,
  medication,
  document,
  healthAlert,
  workflowAction,
  jarvisAction
}

class JarvisTimelineItem {
  final String id;
  final String time;
  final String title;
  final String? subtitle;
  final JarvisTimelineCategory category;
  final bool isCompleted;
  final bool isPendingAttention;
  final VoidCallback? onTap;

  const JarvisTimelineItem({
    required this.id,
    required this.time,
    required this.title,
    this.subtitle,
    required this.category,
    this.isCompleted = false,
    this.isPendingAttention = false,
    this.onTap,
  });
}

/// Unified Life Timeline merging appointments, routines, tasks, medication reminders,
/// workflow actions, health alerts, and JARVIS actions.
class JarvisTimeline extends StatelessWidget {
  final String title;
  final List<JarvisTimelineItem> items;
  final ValueChanged<JarvisTimelineCategory?>? onFilterChanged;
  final JarvisTimelineCategory? activeFilter;

  const JarvisTimeline({
    super.key,
    this.title = 'JARVIS UNIFIED TIMELINE',
    required this.items,
    this.onFilterChanged,
    this.activeFilter,
  });

  @override
  Widget build(BuildContext context) {
    final filteredItems = activeFilter == null
        ? items
        : items.where((i) => i.category == activeFilter).toList();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: JarvisColors.surfaceElevated,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: JarvisColors.borderSubtle,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: JarvisColors.cyan.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.timeline_rounded,
                  color: JarvisColors.cyan,
                  size: 16,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title.toUpperCase(),
                  style: JarvisTypography.telemetry.copyWith(
                    color: JarvisColors.cyan,
                    fontSize: 11,
                  ),
                ),
              ),
              Text(
                '${filteredItems.length} items',
                style: JarvisTypography.bodySmall.copyWith(
                  color: JarvisColors.textTertiary,
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          if (filteredItems.isEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.event_available,
                      color: JarvisColors.textDisabled,
                      size: 32,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'JARVIS timeline is clear for this window.',
                      style: JarvisTypography.bodyMedium.copyWith(
                        color: JarvisColors.textTertiary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: filteredItems.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = filteredItems[index];
                return _buildTimelineNode(item, isLast: index == filteredItems.length - 1);
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTimelineNode(JarvisTimelineItem item, {required bool isLast}) {
    final color = _getCategoryColor(item.category);
    final icon = _getCategoryIcon(item.category);

    return InkWell(
      onTap: item.onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: JarvisColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: item.isPendingAttention
                ? JarvisColors.warning.withValues(alpha: 0.5)
                : JarvisColors.borderSubtle,
            width: item.isPendingAttention ? 1.5 : 1,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Time Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                item.time,
                style: JarvisTypography.telemetry.copyWith(
                  color: color,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Icon node
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 14),
            ),
            const SizedBox(width: 10),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: JarvisTypography.bodyMedium.copyWith(
                      color: item.isCompleted
                          ? JarvisColors.textTertiary
                          : JarvisColors.textPrimary,
                      fontWeight: FontWeight.w600,
                      decoration: item.isCompleted ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  if (item.subtitle != null && item.subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      item.subtitle!,
                      style: JarvisTypography.bodySmall.copyWith(
                        color: JarvisColors.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),

            if (item.isPendingAttention) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: JarvisColors.warning.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'ATTENTION',
                  style: JarvisTypography.telemetry.copyWith(
                    color: JarvisColors.warning,
                    fontSize: 8,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _getCategoryColor(JarvisTimelineCategory category) {
    switch (category) {
      case JarvisTimelineCategory.appointment:
        return JarvisColors.indigo;
      case JarvisTimelineCategory.routine:
        return JarvisColors.cyan;
      case JarvisTimelineCategory.medication:
        return JarvisColors.purple;
      case JarvisTimelineCategory.document:
        return const Color(0xFF38BDF8); // Sky blue
      case JarvisTimelineCategory.healthAlert:
        return JarvisColors.warning;
      case JarvisTimelineCategory.workflowAction:
        return JarvisColors.success;
      case JarvisTimelineCategory.jarvisAction:
        return JarvisColors.cyan;
    }
  }

  IconData _getCategoryIcon(JarvisTimelineCategory category) {
    switch (category) {
      case JarvisTimelineCategory.appointment:
        return Icons.medical_services_outlined;
      case JarvisTimelineCategory.routine:
        return Icons.check_circle_outline;
      case JarvisTimelineCategory.medication:
        return Icons.medication_outlined;
      case JarvisTimelineCategory.document:
        return Icons.description_outlined;
      case JarvisTimelineCategory.healthAlert:
        return Icons.warning_amber_rounded;
      case JarvisTimelineCategory.workflowAction:
        return Icons.bolt;
      case JarvisTimelineCategory.jarvisAction:
        return Icons.auto_awesome;
    }
  }
}
