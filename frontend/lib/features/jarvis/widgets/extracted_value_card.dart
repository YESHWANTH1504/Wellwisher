import 'package:flutter/material.dart';
import '../models/document_models.dart';

class ExtractedValueCard extends StatelessWidget {
  final AiExtractedValueModel metric;
  final VoidCallback? onTapSource;

  const ExtractedValueCard({
    super.key,
    required this.metric,
    this.onTapSource,
  });

  @override
  Widget build(BuildContext context) {
    final flagColor = metric.flagColor;
    final isOut = metric.isOutOfRange;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isOut ? flagColor.withValues(alpha: 0.5) : Colors.white10,
          width: isOut ? 1.5 : 1.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Row: Metric Name & Flag Badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  metric.fieldName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 14.5,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: flagColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: flagColor.withValues(alpha: 0.5)),
                ),
                child: Text(
                  metric.flag,
                  style: TextStyle(
                    color: flagColor,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Middle Row: Value + Unit & Printed Reference Range
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                metric.fieldValue,
                style: TextStyle(
                  color: flagColor,
                  fontWeight: FontWeight.w800,
                  fontSize: 20,
                ),
              ),
              if (metric.unit != null && metric.unit!.isNotEmpty) ...[
                const SizedBox(width: 4),
                Text(
                  metric.unit!,
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
              const Spacer(),
              if (metric.referenceRange != null && metric.referenceRange!.isNotEmpty) ...[
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text(
                      'Ref Range (Report):',
                      style: TextStyle(color: Colors.white38, fontSize: 10.5),
                    ),
                    Text(
                      metric.referenceRange!,
                      style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),

          // Bottom Row: Source Reference and Confidence
          Row(
            children: [
              InkWell(
                onTap: onTapSource,
                borderRadius: BorderRadius.circular(6),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 4),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.menu_book_rounded, color: Color(0xFF38BDF8), size: 13),
                      const SizedBox(width: 4),
                      Text(
                        'Page ${metric.pageNumber}',
                        style: const TextStyle(
                          color: Color(0xFF38BDF8),
                          fontSize: 11.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (onTapSource != null) ...[
                        const SizedBox(width: 2),
                        const Icon(Icons.chevron_right, color: Color(0xFF38BDF8), size: 13),
                      ],
                    ],
                  ),
                ),
              ),
              const Spacer(),
              Text(
                'Confidence: ${(metric.confidenceScore * 100).toInt()}%',
                style: TextStyle(
                  color: metric.confidenceScore < 0.60 ? const Color(0xFFF59E0B) : Colors.white38,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
