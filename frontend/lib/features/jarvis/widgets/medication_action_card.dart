import 'package:flutter/material.dart';
import '../models/workflow_models.dart';

class MedicationActionCard extends StatelessWidget {
  final MedicationWorkflowOverview overview;

  const MedicationActionCard({
    super.key,
    required this.overview,
  });

  @override
  Widget build(BuildContext context) {
    final missingCount = overview.missingRoutines.length;
    final concernCount = overview.reconciliationConcerns.length;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.pinkAccent.withAlpha(50)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.pinkAccent.withAlpha(25),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.medication_outlined, color: Colors.pinkAccent, size: 20),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Medication Routine Coverage',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Schedule routine alignment & review points',
                      style: TextStyle(color: Colors.white60, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (missingCount > 0) ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.amber.withAlpha(20),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber.withAlpha(60)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Colors.amberAccent, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '$missingCount active medication(s) not currently linked to a daily reminder routine.',
                      style: const TextStyle(color: Colors.amberAccent, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
          if (concernCount > 0) ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.pink.withAlpha(20),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.pink.withAlpha(60)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.pinkAccent, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '$concernCount medication review item(s) recommended for discussion with your clinician.',
                      style: const TextStyle(color: Colors.pinkAccent, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
          if (missingCount == 0 && concernCount == 0) ...[
            const Row(
              children: [
                Icon(Icons.check_circle_outline, color: Colors.greenAccent, size: 16),
                SizedBox(width: 8),
                Text(
                  'All active medications are tracked in your schedule.',
                  style: TextStyle(color: Colors.greenAccent, fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
          const Divider(color: Colors.white10),
          Row(
            children: [
              const Icon(Icons.shield_outlined, color: Colors.white38, size: 12),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  overview.disclaimer,
                  style: const TextStyle(color: Colors.white38, fontSize: 10),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
