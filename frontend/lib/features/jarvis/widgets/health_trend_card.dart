import 'package:flutter/material.dart';
import '../models/health_intelligence_models.dart';

class HealthTrendCard extends StatelessWidget {
  final HealthTrendModel trend;

  const HealthTrendCard({super.key, required this.trend});

  @override
  Widget build(BuildContext context) {
    final isIncreasing = trend.trendDirection == 'INCREASING';
    final isDecreasing = trend.trendDirection == 'DECREASING';
    final isInsufficient = trend.trendDirection == 'INSUFFICIENT_DATA';

    Color trendColor = Colors.blueGrey;
    IconData trendIcon = Icons.remove;

    if (isIncreasing) {
      trendColor = Colors.amber.shade700;
      trendIcon = Icons.trending_up;
    } else if (isDecreasing) {
      trendColor = Colors.teal.shade700;
      trendIcon = Icons.trending_down;
    } else if (isInsufficient) {
      trendColor = Colors.grey.shade600;
      trendIcon = Icons.info_outline;
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
                  child: Text(
                    trend.metricName,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: trendColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: trendColor.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(trendIcon, size: 14, color: trendColor),
                      const SizedBox(width: 4),
                      Text(
                        isInsufficient ? '1 Report' : trend.trendDirection,
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: trendColor),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                _buildValueBox(
                  label: 'Latest',
                  value: '${trend.latestValue} ${trend.unit}',
                  date: trend.latestDate != null ? trend.latestDate!.split('T')[0] : null,
                  isPrimary: true,
                ),
                const SizedBox(width: 12),
                if (!isInsufficient && trend.previousValue != null) ...[
                  _buildValueBox(
                    label: 'Previous',
                    value: '${trend.previousValue} ${trend.unit}',
                    date: trend.previousDate != null ? trend.previousDate!.split('T')[0] : null,
                  ),
                  const SizedBox(width: 12),
                  _buildChangeBox(
                    changeValue: trend.changeValue ?? '',
                    changePercent: trend.changePercent,
                    trendColor: trendColor,
                  ),
                ] else ...[
                  Expanded(
                    child: Text(
                      'Upload another report to track biomarker trajectory.',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontStyle: FontStyle.italic),
                    ),
                  ),
                ],
              ],
            ),
            if (trend.printedReferenceRange != null) ...[
              const SizedBox(height: 8),
              Text(
                'Printed Reference Range: ${trend.printedReferenceRange}',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildValueBox({
    required String label,
    required String value,
    String? date,
    bool isPrimary = false,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isPrimary ? Colors.teal.shade50 : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(fontSize: 10, color: Colors.grey.shade700, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: isPrimary ? Colors.teal.shade900 : Colors.black87,
              ),
              overflow: TextOverflow.ellipsis,
            ),
            if (date != null)
              Text(
                date,
                style: TextStyle(fontSize: 9, color: Colors.grey.shade600),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildChangeBox({
    required String changeValue,
    double? changePercent,
    required Color trendColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: trendColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: trendColor.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          const Text('Change', style: TextStyle(fontSize: 10, color: Colors.grey)),
          const SizedBox(height: 2),
          Text(
            changeValue,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: trendColor),
          ),
          if (changePercent != null)
            Text(
              '${changePercent > 0 ? '+' : ''}$changePercent%',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: trendColor),
            ),
        ],
      ),
    );
  }
}
