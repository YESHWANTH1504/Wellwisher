import 'package:flutter/material.dart';
import '../models/document_models.dart';

class DocumentSummaryCard extends StatelessWidget {
  final DocumentSummaryModel summary;

  const DocumentSummaryCard({
    super.key,
    required this.summary,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with Type and Confidence
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.analytics_rounded, color: Color(0xFF38BDF8), size: 16),
                    const SizedBox(width: 6),
                    Text(
                      summary.documentType.replaceAll('_', ' '),
                      style: const TextStyle(
                        color: Color(0xFF38BDF8),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Text(
                'Confidence: ${(summary.confidence * 100).toInt()}%',
                style: const TextStyle(color: Colors.white60, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Main Summary Body
          Text(
            summary.summary,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              height: 1.45,
            ),
          ),

          // Out-of-range Warning Pills if present
          if (summary.outOfRangeValues.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text(
              '⚠️ Out of Reference Range on Report:',
              style: TextStyle(
                color: Color(0xFFF59E0B),
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: summary.outOfRangeValues.map((item) {
                final field = item['fieldName'] ?? 'Metric';
                final val = item['value'] ?? '';
                final flag = item['flag'] ?? 'ABNORMAL';
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4)),
                  ),
                  child: Text(
                    '$field: $val ($flag)',
                    style: const TextStyle(color: Color(0xFFFDE68A), fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                );
              }).toList(),
            ),
          ],

          // Questions for Doctor if present
          if (summary.questionsForDoctor.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Text(
              '💡 Helpful Questions to Ask Your Doctor:',
              style: TextStyle(
                color: Color(0xFF818CF8),
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            ...summary.questionsForDoctor.map((q) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('• ', style: TextStyle(color: Color(0xFF818CF8), fontSize: 13)),
                  Expanded(
                    child: Text(
                      q,
                      style: const TextStyle(color: Colors.white70, fontSize: 12.5, height: 1.3),
                    ),
                  ),
                ],
              ),
            )),
          ],

          const SizedBox(height: 14),
          const Divider(color: Colors.white12),
          const SizedBox(height: 4),

          // Medical Disclaimer Footer
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info_outline_rounded, color: Colors.white38, size: 14),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  summary.disclaimer,
                  style: const TextStyle(color: Colors.white38, fontSize: 11, fontStyle: FontStyle.italic),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
