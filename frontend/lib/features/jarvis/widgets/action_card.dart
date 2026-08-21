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
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF132F2B),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF00E676).withValues(alpha: 0.5)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF00E676).withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.calendar_today_rounded, color: Color(0xFF00E676), size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    rot['title']?.toString() ?? 'Scheduled Item',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${rot['date'] ?? 'Today'} at ${rot['time'] ?? 'Scheduled Time'}',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                ],
              ),
            ),
            const Icon(Icons.check_circle_rounded, color: Color(0xFF00E676), size: 20),
          ],
        ),
      );
    }

    if (type == 'log_hydration' || type == 'get_hydration') {
      final total = data['totalMl'] ?? data['amount'] ?? 0;
      final percentage = data['percentage'] ?? 0;
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF102538),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF00E5FF).withValues(alpha: 0.5)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF00E5FF).withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.water_drop_rounded, color: Color(0xFF00E5FF), size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Hydration Progress',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$total ml logged today ($percentage% of 2.5L goal)',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
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
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF261D3B),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFB388FF).withValues(alpha: 0.5)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFB388FF).withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.psychology_rounded, color: Color(0xFFB388FF), size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Saved to Memory',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    mem['memory_value']?.toString() ?? 'Preference saved',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
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
