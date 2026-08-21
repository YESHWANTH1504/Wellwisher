import 'package:flutter/material.dart';
import '../models/health_intelligence_models.dart';

class HealthAlertCard extends StatelessWidget {
  final HealthAlertModel alert;
  final VoidCallback? onDismiss;

  const HealthAlertCard({
    super.key,
    required this.alert,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final isHigh = alert.severity == 'HIGH';
    final severityColor = isHigh ? Colors.red.shade700 : Colors.amber.shade800;
    final bgColor = isHigh ? Colors.red.shade50 : Colors.amber.shade50;

    return Card(
      elevation: 2,
      margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: severityColor.withValues(alpha: 0.3)),
      ),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      isHigh ? Icons.warning_amber_rounded : Icons.info_outline,
                      color: severityColor,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      alert.metric.isNotEmpty ? '${alert.metric} Alert' : 'Health Observation',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: severityColor,
                      ),
                    ),
                  ],
                ),
                if (onDismiss != null)
                  IconButton(
                    icon: const Icon(Icons.close, size: 16, color: Colors.grey),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: onDismiss,
                    tooltip: 'Dismiss Alert',
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              alert.message,
              style: const TextStyle(fontSize: 13, color: Colors.black87, height: 1.3),
            ),
            if (alert.doctorQuestions.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Suggested Question for Your Doctor:',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.blueGrey),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      alert.doctorQuestions.first,
                      style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.black87),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
