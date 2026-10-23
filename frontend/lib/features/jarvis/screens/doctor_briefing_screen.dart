import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../models/health_intelligence_models.dart';
import '../services/doctor_briefing_pdf_service.dart';

/// Futuristic 1-Page Clinician Briefing Package screen.
/// Formats vitals, biomarker trajectories, drug review points, and non-diagnostic disclaimers.
class DoctorBriefingScreen extends StatelessWidget {
  final DoctorBriefingModel briefing;

  const DoctorBriefingScreen({super.key, required this.briefing});

  @override
  Widget build(BuildContext context) {
    final data = briefing.briefingData;
    final patientInfo = data['patientInfo'] is Map ? Map<String, dynamic>.from(data['patientInfo']) : {};
    final measurements = data['recentMeasurements'] is List ? data['recentMeasurements'] as List : [];
    final trends = data['trendSummaries'] is List ? data['trendSummaries'] as List : [];
    final outOfRange = data['outOfRangeResults'] is List ? data['outOfRangeResults'] as List : [];
    final meds = data['currentMedications'] is List ? data['currentMedications'] as List : [];
    final discussionPoints = data['discussionPoints'] is List ? data['discussionPoints'] as List : [];
    final questions = data['questionsForDoctor'] is List ? data['questionsForDoctor'] as List : [];
    final disclaimer = data['disclaimer']?.toString() ??
        'This briefing is generated strictly from personal records for consultation organization. It does not constitute a diagnosis or prescription.';

    return Scaffold(
      backgroundColor: JarvisColors.background,
      appBar: AppBar(
        backgroundColor: JarvisColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: JarvisColors.cyan, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('CLINICIAN BRIEFING PACKAGE', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan)),
            Text('Doctor Visit Briefing', style: JarvisTypography.titleMedium),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.print_outlined, color: JarvisColors.cyan),
            tooltip: 'Print / Export PDF',
            onPressed: () => DoctorBriefingPdfService.printOrShareBriefing(briefing),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Briefing Header Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: JarvisColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: JarvisColors.cyan.withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        patientInfo['name'] ?? 'Patient Consultation Summary',
                        style: JarvisTypography.titleMedium,
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: JarvisColors.cyan.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: JarvisColors.cyan),
                        ),
                        child: Text(
                          'READY FOR VISIT',
                          style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Generated: ${briefing.generatedAt.split('T')[0]} • Status: Verified',
                    style: JarvisTypography.monospace.copyWith(color: JarvisColors.textSecondary, fontSize: 11),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Section 1: Recent Biomarkers
            if (measurements.isNotEmpty) ...[
              _buildSectionHeader('1. Recent Biomarkers & Vitals', Icons.monitor_heart_outlined),
              const SizedBox(height: 8),
              ...measurements.map((m) {
                final map = m is Map ? m : {};
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: JarvisColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: JarvisColors.border),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(map['metricName']?.toString() ?? '', style: JarvisTypography.bodyMedium),
                          Text('Date: ${map['date']?.toString().split('T')[0] ?? 'Recent'}', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
                        ],
                      ),
                      Text(
                        '${map['latestValue']} ${map['unit']}',
                        style: JarvisTypography.monospace.copyWith(color: JarvisColors.cyan, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 16),
            ],

            // Section 2: Trend Deltas
            if (trends.isNotEmpty) ...[
              _buildSectionHeader('2. Biomarker Trajectories', Icons.trending_up),
              const SizedBox(height: 8),
              ...trends.map((t) {
                final map = t is Map ? t : {};
                final isInc = map['trendDirection'] == 'INCREASING';
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: JarvisColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: JarvisColors.border),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(map['metricName']?.toString() ?? '', style: JarvisTypography.bodyMedium),
                      Text(
                        'Delta: ${map['change']}',
                        style: JarvisTypography.monospace.copyWith(
                          color: isInc ? JarvisColors.amber : JarvisColors.emerald,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 16),
            ],

            // Section 3: Out-of-Range Results
            if (outOfRange.isNotEmpty) ...[
              _buildSectionHeader('3. Out-of-Range Observations', Icons.warning_amber_rounded),
              const SizedBox(height: 8),
              ...outOfRange.map((item) {
                final map = item is Map ? item : {};
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: JarvisColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: JarvisColors.amber.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${map['fieldName']}: ${map['value']}',
                        style: JarvisTypography.bodyMedium.copyWith(color: JarvisColors.amber, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Ref: ${map['referenceRange'] ?? 'Printed Range'}',
                        style: JarvisTypography.monospace.copyWith(color: JarvisColors.textSecondary, fontSize: 11),
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 16),
            ],

            // Section 4: Current Medications & Review Points
            if (meds.isNotEmpty || discussionPoints.isNotEmpty) ...[
              _buildSectionHeader('4. Medications & Discussion Points', Icons.medication_outlined),
              const SizedBox(height: 8),
              if (meds.isNotEmpty) ...[
                Text('ACTIVE SCHEDULE:', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan)),
                const SizedBox(height: 4),
                ...meds.map((m) {
                  final map = m is Map ? m : {};
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Text('• ${map['name']} (${map['dosage']})', style: JarvisTypography.bodySmall),
                  );
                }),
                const SizedBox(height: 8),
              ],
              if (discussionPoints.isNotEmpty) ...[
                Text('DISCUSSION POINTS FOR CLINICIAN:', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.indigo)),
                const SizedBox(height: 4),
                ...discussionPoints.map((dp) {
                  final map = dp is Map ? dp : {};
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Text('• [${map['classification']}] ${map['summary']}', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
                  );
                }),
              ],
              const SizedBox(height: 16),
            ],

            // Section 5: Clinician Questions
            if (questions.isNotEmpty) ...[
              _buildSectionHeader('5. Questions Prepared for Your Doctor', Icons.help_outline),
              const SizedBox(height: 8),
              ...questions.map((q) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: JarvisColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: JarvisColors.border),
                    ),
                    child: Text('• $q', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textPrimary)),
                  )),
              const SizedBox(height: 16),
            ],

            // Non-Diagnostic Notice
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: JarvisColors.indigo.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: JarvisColors.indigo.withValues(alpha: 0.2)),
              ),
              child: Text(
                'NON-DIAGNOSTIC NOTICE: $disclaimer',
                style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary, fontStyle: FontStyle.italic, fontSize: 11),
              ),
            ),
            const SizedBox(height: 24),

            // Export Action Button
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: () => DoctorBriefingPdfService.printOrShareBriefing(briefing),
                icon: const Icon(Icons.picture_as_pdf_outlined, color: Colors.black),
                label: const Text('Print or Save PDF Briefing', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: JarvisColors.cyan,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: JarvisColors.cyan),
        const SizedBox(width: 8),
        Text(title, style: JarvisTypography.titleSmall),
      ],
    );
  }
}
