import 'package:flutter/material.dart';
import '../models/health_intelligence_models.dart';

class MedicationConflictCard extends StatelessWidget {
  final MedicationConcernModel concern;

  const MedicationConflictCard({super.key, required this.concern});

  @override
  Widget build(BuildContext context) {
    Color badgeColor = Colors.orange.shade800;
    Color badgeBg = Colors.orange.shade50;

    if (concern.classification == 'REQUIRES_CLINICIAN_REVIEW') {
      badgeColor = Colors.deepOrange.shade800;
      badgeBg = Colors.deepOrange.shade50;
    } else if (concern.classification == 'INFORMATIONAL') {
      badgeColor = Colors.blueGrey.shade700;
      badgeBg = Colors.blueGrey.shade50;
    }

    return Card(
      elevation: 1.5,
      margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      const Icon(Icons.medication_liquid_outlined, color: Colors.blueGrey, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          concern.medicationA,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: badgeBg,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    concern.classification.replaceAll('_', ' '),
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: badgeColor),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              concern.reason,
              style: const TextStyle(fontSize: 12.5, color: Colors.black87, height: 1.3),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.blueGrey.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.question_answer_outlined, size: 16, color: Colors.blueGrey),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      concern.suggestedQuestion,
                      style: TextStyle(fontSize: 11.5, fontStyle: FontStyle.italic, color: Colors.blueGrey.shade900),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
