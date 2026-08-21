import 'package:flutter/material.dart';
import '../models/document_models.dart';

class DocumentComparisonCard extends StatelessWidget {
  final DocumentComparisonModel comparison;

  const DocumentComparisonCard({
    super.key,
    required this.comparison,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF818CF8).withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.compare_arrows_rounded, color: Color(0xFF818CF8), size: 20),
              const SizedBox(width: 8),
              const Text(
                'Report Comparison (Historical Trends)',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF818CF8).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${comparison.comparisonCount} metrics',
                  style: const TextStyle(color: Color(0xFF818CF8), fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          ...comparison.comparisons.map((item) {
            final change = item.change;
            final isIncrease = change.startsWith('+');
            final isDecrease = change.startsWith('-');
            final deltaColor = isIncrease
                ? const Color(0xFFF59E0B)
                : (isDecrease ? const Color(0xFF10B981) : Colors.white70);

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                children: [
                  Expanded(
                    flex: 4,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.fieldName,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                        ),
                        if (item.unit.isNotEmpty)
                          Text(
                            item.unit,
                            style: const TextStyle(color: Colors.white38, fontSize: 11),
                          ),
                      ],
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Text('Previous', style: TextStyle(color: Colors.white38, fontSize: 10)),
                        Text(
                          item.previous['value']?.toString() ?? '-',
                          style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w500, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Text('Latest', style: TextStyle(color: Colors.white38, fontSize: 10)),
                        Text(
                          item.latest['value']?.toString() ?? '-',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('Delta', style: TextStyle(color: Colors.white38, fontSize: 10)),
                        Text(
                          item.change,
                          style: TextStyle(color: deltaColor, fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),

          const SizedBox(height: 8),
          Text(
            comparison.disclaimer,
            style: const TextStyle(color: Colors.white38, fontSize: 11, fontStyle: FontStyle.italic),
          ),
        ],
      ),
    );
  }
}
