import 'package:flutter/material.dart';
import '../models/proactive_models.dart';

class ProactiveCard extends StatelessWidget {
  final ProactiveEventModel event;
  final VoidCallback? onDismiss;
  final VoidCallback? onAction;

  const ProactiveCard({
    super.key,
    required this.event,
    this.onDismiss,
    this.onAction,
  });

  Color _getPriorityColor() {
    switch (event.priority) {
      case 'CRITICAL':
        return const Color(0xFFEF4444);
      case 'HIGH':
        return const Color(0xFFF59E0B);
      case 'MEDIUM':
        return const Color(0xFF6366F1);
      case 'LOW':
      default:
        return const Color(0xFF10B981);
    }
  }

  IconData _getEventIcon() {
    switch (event.eventType) {
      case 'UPCOMING_TASK':
      case 'TASK_DUE':
        return Icons.alarm;
      case 'OVERDUE_TASK':
        return Icons.warning_amber_rounded;
      case 'DAILY_BRIEFING':
        return Icons.wb_sunny_outlined;
      case 'EVENING_SUMMARY':
        return Icons.nightlight_round;
      case 'HYDRATION_NUDGE':
        return Icons.water_drop_outlined;
      case 'FREE_TIME_SUGGESTION':
        return Icons.event_available;
      default:
        return Icons.auto_awesome;
    }
  }

  @override
  Widget build(BuildContext context) {
    final priorityColor = _getPriorityColor();

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 2),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: priorityColor.withValues(alpha: 0.4), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: priorityColor.withValues(alpha: 0.15),
            blurRadius: 12,
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
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: priorityColor.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(_getEventIcon(), color: priorityColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  event.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: priorityColor.withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  event.priority,
                  style: TextStyle(
                    color: priorityColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (onDismiss != null)
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white54, size: 18),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  onPressed: onDismiss,
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            event.message,
            style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
          ),
          if (onAction != null) ...[
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: ElevatedButton(
                onPressed: onAction,
                style: ElevatedButton.styleFrom(
                  backgroundColor: priorityColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('View Action', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
