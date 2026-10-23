import 'package:flutter/material.dart';
import '../models/jarvis_models.dart';

class ActionCard extends StatelessWidget {
  final JarvisAction action;

  const ActionCard({super.key, required this.action});

  @override
  Widget build(BuildContext context) {
    final type = action.type;
    final data = action.data;

    if (type == 'create_schedule') {
      final rot = data['createdRoutine'] is Map<String, dynamic>
          ? data['createdRoutine'] as Map<String, dynamic>
          : data;
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF0F1E1B),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.event_available_rounded, color: Color(0xFF10B981), size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    rot['title']?.toString() ?? 'Scheduled Item',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${rot['date'] ?? 'Today'} at ${rot['time'] ?? 'Scheduled Time'}',
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12.5),
                  ),
                ],
              ),
            ),
            const Icon(Icons.check_circle_outline_rounded, color: Color(0xFF10B981), size: 18),
          ],
        ),
      );
    }

    if (type == 'log_hydration' || type == 'get_hydration') {
      final total = data['totalMl'] ?? data['amount'] ?? 0;
      final percentage = data['percentage'] ?? 0;
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF0E1A2B),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.water_drop_rounded, color: Color(0xFF38BDF8), size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Hydration Progress',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$total ml logged today ($percentage% of 2.5L goal)',
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12.5),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    if (type == 'save_memory') {
      final mem = data['savedMemory'] is Map<String, dynamic> ? data['savedMemory'] as Map<String, dynamic> : data;
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF1B142E),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFA855F7).withValues(alpha: 0.35)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFA855F7).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.psychology_rounded, color: Color(0xFFA855F7), size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Saved to Memory',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    mem['memory_value']?.toString() ?? 'Preference saved',
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12.5),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }
}
