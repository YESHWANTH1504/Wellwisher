import 'package:flutter/material.dart';
import '../models/health_intelligence_models.dart';
import '../services/doctor_briefing_pdf_service.dart';

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
      appBar: AppBar(
        title: const Text('Doctor Visit Briefing'),
        actions: [
          IconButton(
            icon: const Icon(Icons.print_outlined),
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
            Card(
              color: Colors.blueGrey.shade900,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          patientInfo['name'] ?? 'Patient Consultation Summary',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.tealAccent.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'READY FOR VISIT',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.tealAccent),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Generated on: ${briefing.generatedAt.split('T')[0]}',
                      style: const TextStyle(fontSize: 12, color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Section 1: Recent Biomarkers
            if (measurements.isNotEmpty) ...[
              _buildSectionHeader('1. Recent Biomarkers & Vitals', Icons.monitor_heart_outlined),
              const SizedBox(height: 8),
              ...measurements.map((m) {
                final map = m is Map ? m : {};
                return Card(
                  elevation: 1,
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  child: ListTile(
                    dense: true,
                    title: Text(map['metricName']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text('Date: ${map['date']?.toString().split('T')[0] ?? 'Recent'}'),
                    trailing: Text(
                      '${map['latestValue']} ${map['unit']}',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.teal),
                    ),
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
                return Card(
                  elevation: 1,
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  child: ListTile(
                    dense: true,
                    title: Text(map['metricName']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text('Observation: ${map['dates'] ?? ''}'),
                    trailing: Text(
                      'Change: ${map['change']}',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: (map['trendDirection'] == 'INCREASING') ? Colors.amber.shade900 : Colors.teal.shade800,
                      ),
                    ),
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
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.amber.shade200),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${map['fieldName']}: ${map['value']}',
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber.shade900),
                      ),
                      Text(
                        'Ref: ${map['referenceRange'] ?? 'Printed'}',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
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
                const Text('Active Schedule:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                ...meds.map((m) {
                  final map = m is Map ? m : {};
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Text('• ${map['name']} (${map['dosage']})', style: const TextStyle(fontSize: 13)),
                  );
                }),
                const SizedBox(height: 8),
              ],
              if (discussionPoints.isNotEmpty) ...[
                const Text('Discussion Points for Clinician:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blueGrey)),
                const SizedBox(height: 4),
                ...discussionPoints.map((dp) {
                  final map = dp is Map ? dp : {};
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Text('• [${map['classification']}] ${map['summary']}', style: const TextStyle(fontSize: 12.5, color: Colors.black87)),
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
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '• $q',
                      style: const TextStyle(fontSize: 12.5, color: Colors.black87),
                    ),
                  )),
              const SizedBox(height: 16),
            ],

            // Non-Diagnostic Notice
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blueGrey.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.blueGrey.shade200),
              ),
              child: Text(
                'NON-DIAGNOSTIC NOTICE: $disclaimer',
                style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Colors.blueGrey.shade800),
              ),
            ),
            const SizedBox(height: 24),

            // Export Action Button
            ElevatedButton.icon(
              onPressed: () => DoctorBriefingPdfService.printOrShareBriefing(briefing),
              icon: const Icon(Icons.picture_as_pdf_outlined),
              label: const Text('Print or Save PDF Briefing'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal.shade700,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
        Icon(icon, size: 18, color: Colors.teal.shade800),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}
