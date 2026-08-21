import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/health_intelligence_models.dart';

class DoctorBriefingPdfService {
  /// Generate printable / shareable PDF document bytes from Doctor Briefing
  static Future<Uint8List> generatePdf(DoctorBriefingModel briefing) async {
    final pdf = pw.Document();
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

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(24),
        build: (pw.Context context) {
          return [
            // Header
            pw.Container(
              padding: const pw.EdgeInsets.only(bottom: 12),
              decoration: const pw.BoxDecoration(
                border: pw.Border(bottom: pw.BorderSide(width: 2, color: PdfColors.blueGrey800)),
              ),
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'WELLWISHER CLINICAL CONSULTATION BRIEFING',
                        style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        'Patient: ${patientInfo['name'] ?? 'Patient'} | Date: ${patientInfo['reportDate'] ?? DateTime.now().toString().split(' ')[0]}',
                        style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700),
                      ),
                    ],
                  ),
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: pw.BoxDecoration(
                      color: PdfColors.blue50,
                      borderRadius: pw.BorderRadius.circular(4),
                      border: pw.Border.all(color: PdfColors.blue300),
                    ),
                    child: pw.Text(
                      'STATUS: READY FOR CLINICIAN',
                      style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blue800),
                    ),
                  ),
                ],
              ),
            ),
            pw.SizedBox(height: 14),

            // Section 1: Recent Biomarkers & Vitals
            if (measurements.isNotEmpty) ...[
              _buildSectionTitle('1. Recent Biomarkers & Measurements'),
              pw.SizedBox(height: 6),
              pw.TableHelper.fromTextArray(
                border: pw.TableBorder.all(color: PdfColors.grey300),
                headerStyle: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.white),
                headerDecoration: const pw.BoxDecoration(color: PdfColors.blueGrey700),
                cellStyle: const pw.TextStyle(fontSize: 8),
                headers: ['Metric', 'Latest Value', 'Unit', 'Ref Range', 'Trend'],
                data: measurements.map((m) {
                  final map = m is Map ? m : {};
                  return [
                    map['metricName']?.toString() ?? '',
                    map['latestValue']?.toString() ?? '',
                    map['unit']?.toString() ?? '',
                    map['referenceRange']?.toString() ?? 'N/A',
                    map['trendDirection']?.toString() ?? 'STABLE'
                  ];
                }).toList(),
              ),
              pw.SizedBox(height: 12),
            ],

            // Section 2: Calculated Trend Deltas
            if (trends.isNotEmpty) ...[
              _buildSectionTitle('2. Biomarker Trend Deltas'),
              pw.SizedBox(height: 6),
              pw.TableHelper.fromTextArray(
                border: pw.TableBorder.all(color: PdfColors.grey300),
                headerStyle: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.white),
                headerDecoration: const pw.BoxDecoration(color: PdfColors.blueGrey600),
                cellStyle: const pw.TextStyle(fontSize: 8),
                headers: ['Metric', 'Previous', 'Latest', 'Change', 'Observation Dates'],
                data: trends.map((t) {
                  final map = t is Map ? t : {};
                  return [
                    map['metricName']?.toString() ?? '',
                    '${map['previousValue'] ?? ''} ${map['unit'] ?? ''}',
                    '${map['latestValue'] ?? ''} ${map['unit'] ?? ''}',
                    map['change']?.toString() ?? '',
                    map['dates']?.toString() ?? ''
                  ];
                }).toList(),
              ),
              pw.SizedBox(height: 12),
            ],

            // Section 3: Out-of-Range Items
            if (outOfRange.isNotEmpty) ...[
              _buildSectionTitle('3. Out-of-Range Observations (From Printed Reports)'),
              pw.SizedBox(height: 6),
              ...outOfRange.map((item) {
                final map = item is Map ? item : {};
                return pw.Container(
                  margin: const pw.EdgeInsets.only(bottom: 4),
                  padding: const pw.EdgeInsets.all(6),
                  decoration: pw.BoxDecoration(
                    color: PdfColors.orange50,
                    borderRadius: pw.BorderRadius.circular(4),
                    border: pw.Border.all(color: PdfColors.orange200),
                  ),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Text(
                        '• ${map['fieldName'] ?? ''}: ${map['value'] ?? ''} (${map['flag'] ?? 'ABNORMAL'})',
                        style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.orange900),
                      ),
                      pw.Text(
                        'Ref: ${map['referenceRange'] ?? 'Printed'} | Source: ${map['documentFilename'] ?? 'Report'}',
                        style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700),
                      ),
                    ],
                  ),
                );
              }),
              pw.SizedBox(height: 12),
            ],

            // Section 4: Current Medications & Reconciliation Items
            if (meds.isNotEmpty || discussionPoints.isNotEmpty) ...[
              _buildSectionTitle('4. Active Medication List & Discussion Points'),
              pw.SizedBox(height: 6),
              if (meds.isNotEmpty) ...[
                pw.Text('Active Schedule:', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
                pw.SizedBox(height: 4),
                ...meds.map((m) {
                  final map = m is Map ? m : {};
                  return pw.Text(
                    '• ${map['name'] ?? ''} - Dosage: ${map['dosage'] ?? ''} (Time: ${map['scheduleTime'] ?? 'Daily'})',
                    style: const pw.TextStyle(fontSize: 8),
                  );
                }),
                pw.SizedBox(height: 6),
              ],
              if (discussionPoints.isNotEmpty) ...[
                pw.Text('Reconciliation Discussion Points:', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900)),
                pw.SizedBox(height: 4),
                ...discussionPoints.map((dp) {
                  final map = dp is Map ? dp : {};
                  return pw.Container(
                    margin: const pw.EdgeInsets.only(bottom: 3),
                    child: pw.Text(
                      '• [${map['classification'] ?? 'DISCUSSION'}] ${map['summary'] ?? ''}',
                      style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey800),
                    ),
                  );
                }),
              ],
              pw.SizedBox(height: 12),
            ],

            // Section 5: Specific Clinician Questions
            if (questions.isNotEmpty) ...[
              _buildSectionTitle('5. Questions Prepared for Doctor Visit'),
              pw.SizedBox(height: 6),
              ...questions.map((q) => pw.Container(
                    margin: const pw.EdgeInsets.only(bottom: 4),
                    padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                    decoration: pw.BoxDecoration(
                      color: PdfColors.grey100,
                      borderRadius: pw.BorderRadius.circular(3),
                    ),
                    child: pw.Text(
                      'Q: $q',
                      style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey900),
                    ),
                  )),
              pw.SizedBox(height: 12),
            ],

            // Mandatory Non-Diagnostic Disclaimer
            pw.Divider(color: PdfColors.grey400),
            pw.SizedBox(height: 4),
            pw.Text(
              'NON-DIAGNOSTIC NOTICE: $disclaimer',
              style: pw.TextStyle(fontSize: 7, fontStyle: pw.FontStyle.italic, color: PdfColors.grey600),
            ),
          ];
        },
      ),
    );

    return pdf.save();
  }

  /// Trigger native print or save dialog
  static Future<void> printOrShareBriefing(DoctorBriefingModel briefing) async {
    final pdfBytes = await generatePdf(briefing);
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdfBytes,
      name: 'WellWisher_Doctor_Briefing_${DateTime.now().millisecondsSinceEpoch}.pdf',
    );
  }

  static pw.Widget _buildSectionTitle(String title) {
    return pw.Container(
      padding: const pw.EdgeInsets.symmetric(vertical: 2, horizontal: 4),
      decoration: const pw.BoxDecoration(
        color: PdfColors.grey200,
      ),
      child: pw.Text(
        title.toUpperCase(),
        style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.blueGrey800),
      ),
    );
  }
}
