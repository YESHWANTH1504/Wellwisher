import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../models/health_intelligence_models.dart';

/// Renders a structured JARVIS health insight card with biomarker changes,
/// delta percentage, reference range notes, and clinician discussion questions.
class JarvisInsight extends StatelessWidget {
  final String title;
  final String? biomarkerName;
  final String? previousValue;
  final String? currentValue;
  final String? unit;
  final double? percentageChange;
  final String explanation;
  final List<String> clinicianDiscussionQuestions;
  final String? referenceRange;
  final VoidCallback? onDiscussTap;

  const JarvisInsight({
    super.key,
    this.title = 'JARVIS HEALTH INSIGHT',
    this.biomarkerName,
    this.previousValue,
    this.currentValue,
    this.unit,
    this.percentageChange,
    required this.explanation,
    this.clinicianDiscussionQuestions = const [],
    this.referenceRange,
    this.onDiscussTap,
  });

  factory JarvisInsight.fromHealthTrend(HealthTrendModel trend, {VoidCallback? onDiscussTap}) {
    return JarvisInsight(
      title: 'JARVIS BIOMARKER TREND',
      biomarkerName: trend.metricName,
      previousValue: trend.previousValue ?? '--',
      currentValue: trend.latestValue,
      unit: trend.unit,
      percentageChange: trend.changePercent,
      explanation: 'JARVIS detected a ${trend.trendDirection.toLowerCase()} trend for ${trend.metricName} based on your medical records.',
      clinicianDiscussionQuestions: const [
        'What could explain this change in biomarker value?',
        'Should this value be monitored again on the next routine checkup?',
      ],
      referenceRange: trend.printedReferenceRange,
      onDiscussTap: onDiscussTap,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isIncrease = (percentageChange ?? 0) > 0;
    final deltaColor = isIncrease ? JarvisColors.warning : JarvisColors.success;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: JarvisColors.surfaceElevated,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: JarvisColors.borderMedium,
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: JarvisColors.cyan.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Badge
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: JarvisColors.cyan.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.auto_awesome,
                  color: JarvisColors.cyan,
                  size: 16,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title.toUpperCase(),
                  style: JarvisTypography.telemetry.copyWith(
                    color: JarvisColors.cyan,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Biomarker name & Change Metric
          if (biomarkerName != null && previousValue != null && currentValue != null) ...[
            Text(
              biomarkerName!,
              style: JarvisTypography.h2.copyWith(color: JarvisColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: JarvisColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: JarvisColors.borderSubtle),
              ),
              child: Row(
                children: [
                  Text(
                    '$previousValue ${unit ?? ''}',
                    style: JarvisTypography.bodyLarge.copyWith(
                      color: JarvisColors.textSecondary,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.arrow_forward_rounded, color: JarvisColors.textTertiary, size: 16),
                  const SizedBox(width: 8),
                  Text(
                    '$currentValue ${unit ?? ''}',
                    style: JarvisTypography.h2.copyWith(
                      color: JarvisColors.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  if (percentageChange != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: deltaColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${isIncrease ? '+' : ''}${percentageChange!.toStringAsFixed(1)}%',
                        style: JarvisTypography.telemetry.copyWith(
                          color: deltaColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // JARVIS Explanation
          Text(
            explanation,
            style: JarvisTypography.bodyLarge.copyWith(
              color: JarvisColors.textPrimary,
            ),
          ),

          // Reference range notice
          if (referenceRange != null && referenceRange!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: JarvisColors.surface,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: JarvisColors.textTertiary, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Report reference range: $referenceRange (Consult your clinician)',
                      style: JarvisTypography.bodySmall.copyWith(
                        color: JarvisColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Clinician Discussion Points
          if (clinicianDiscussionQuestions.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(
              'Questions to discuss with your healthcare professional:',
              style: JarvisTypography.bodySmall.copyWith(
                color: JarvisColors.cyan,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            ...clinicianDiscussionQuestions.map(
              (q) => Padding(
                padding: const EdgeInsets.only(bottom: 4, left: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('• ', style: TextStyle(color: JarvisColors.cyan)),
                    Expanded(
                      child: Text(
                        q,
                        style: JarvisTypography.bodyMedium.copyWith(
                          color: JarvisColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],

          const SizedBox(height: 12),
          // Safety disclaimer
          Text(
            'JARVIS provides structured data analysis for informational purposes only and does not provide medical diagnoses or prescriptions.',
            style: JarvisTypography.bodySmall.copyWith(
              color: JarvisColors.textDisabled,
              fontStyle: FontStyle.italic,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}
