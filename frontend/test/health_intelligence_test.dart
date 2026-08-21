import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/models/health_intelligence_models.dart';
import 'package:wellwisher/features/jarvis/services/health_intelligence_api_service.dart';
import 'package:wellwisher/features/jarvis/services/doctor_briefing_pdf_service.dart';
import 'package:wellwisher/features/jarvis/controller/health_intelligence_controller.dart';
import 'package:wellwisher/features/jarvis/widgets/health_overview_card.dart';
import 'package:wellwisher/features/jarvis/widgets/health_trend_card.dart';
import 'package:wellwisher/features/jarvis/widgets/health_alert_card.dart';
import 'package:wellwisher/features/jarvis/widgets/medication_conflict_card.dart';
import 'package:wellwisher/features/jarvis/widgets/doctor_question_card.dart';
import 'package:wellwisher/features/jarvis/screens/health_intelligence_screen.dart';
import 'package:wellwisher/features/jarvis/screens/doctor_briefing_screen.dart';

class MockHealthIntelligenceApiService extends HealthIntelligenceApiService {
  @override
  Future<List<HealthTrendModel>> getTrends() async {
    return [
      HealthTrendModel(
        metricName: 'Blood Glucose',
        previousValue: '102',
        latestValue: '128',
        unit: 'mg/dL',
        previousDate: '2026-01-15',
        latestDate: '2026-08-15',
        changeValue: '+26.00 mg/dL',
        changePercent: 25.49,
        trendDirection: 'INCREASING',
        confidence: 0.95,
        sourceDocumentIds: ['doc_1', 'doc_2'],
        printedReferenceRange: '70 - 100 mg/dL',
        observationsCount: 3,
      ),
      HealthTrendModel(
        metricName: 'Hemoglobin',
        previousValue: null,
        latestValue: '14.2',
        unit: 'g/dL',
        latestDate: '2026-08-15',
        trendDirection: 'INSUFFICIENT_DATA',
        confidence: 0.90,
        sourceDocumentIds: ['doc_1'],
        printedReferenceRange: '13.0 - 17.0 g/dL',
        observationsCount: 1,
      ),
    ];
  }

  @override
  Future<List<HealthAlertModel>> getAlerts() async {
    return [
      HealthAlertModel(
        id: 'alert_1',
        alertType: 'PERSISTENT_OUT_OF_RANGE',
        metric: 'Blood Glucose',
        severity: 'HIGH',
        message: 'Your Blood Glucose reading has been outside reference range across 3 consecutive records.',
        evidence: [],
        sourceDocumentIds: ['doc_1', 'doc_2'],
        doctorQuestions: ['My Blood Glucose remained high over 3 visits. Is medication adjustment needed?'],
        status: 'ACTIVE',
      ),
    ];
  }

  @override
  Future<MedicationReconciliationModel?> getMedicationConflicts() async {
    return MedicationReconciliationModel(
      status: 'REQUIRES_CLINICIAN_REVIEW',
      activeMedicationsCount: 1,
      documentMedicationsCount: 2,
      activeMedications: [{'name': 'Metformin', 'dosage': '500 mg'}],
      documentMedications: [{'name': 'Metformin', 'dosage': '1000 mg'}],
      potentialConcerns: [
        MedicationConcernModel(
          type: 'DOSAGE_DISCREPANCY',
          classification: 'REQUIRES_CLINICIAN_REVIEW',
          medicationA: 'Metformin (500 mg)',
          medicationB: 'Metformin (1000 mg)',
          reason: 'Dosage in recent report (1000 mg) differs from active schedule (500 mg).',
          confidence: 0.92,
          sourceDocuments: ['doc_rx'],
          suggestedQuestion: 'Which Metformin dosage should I take?',
        ),
      ],
      doctorQuestions: ['Clarify correct Metformin dosage.'],
      disclaimer: 'Informational reconciliation only.',
    );
  }

  @override
  Future<HealthOverviewModel?> getOverview() async {
    final t = await getTrends();
    final a = await getAlerts();
    final m = await getMedicationConflicts();

    return HealthOverviewModel(
      trendsCount: t.length,
      activeAlertsCount: a.length,
      potentialConcernsCount: m?.potentialConcerns.length ?? 0,
      documentsCount: 3,
      recentTrends: t,
      activeAlerts: a,
      medicationConcerns: m?.potentialConcerns ?? [],
      doctorQuestions: ['Clarify correct Metformin dosage.'],
      disclaimer: 'Non-diagnostic overview.',
    );
  }

  @override
  Future<DoctorBriefingModel?> generateDoctorBriefing() async {
    return DoctorBriefingModel(
      id: 'db_101',
      briefingData: {
        'patientInfo': {'name': 'John Doe', 'reportDate': '2026-08-21'},
        'recentMeasurements': [
          {'metricName': 'Blood Glucose', 'latestValue': '128', 'unit': 'mg/dL', 'trendDirection': 'INCREASING'}
        ],
        'trendSummaries': [
          {'metricName': 'Blood Glucose', 'previousValue': '102', 'latestValue': '128', 'unit': 'mg/dL', 'change': '+26.00 mg/dL', 'dates': '2026-01-15 -> 2026-08-15'}
        ],
        'outOfRangeResults': [
          {'fieldName': 'Blood Glucose', 'value': '128', 'flag': 'HIGH', 'referenceRange': '70 - 100'}
        ],
        'currentMedications': [
          {'name': 'Metformin', 'dosage': '500 mg', 'scheduleTime': '08:00'}
        ],
        'discussionPoints': [
          {'classification': 'REQUIRES_CLINICIAN_REVIEW', 'summary': 'Metformin dosage discrepancy'}
        ],
        'questionsForDoctor': [
          'Which Metformin dosage should I follow?'
        ],
        'disclaimer': 'This briefing is non-diagnostic and informational only.'
      },
      generatedAt: '2026-08-21T10:00:00Z',
      sourceDocumentIds: ['doc_1', 'doc_2'],
      status: 'READY',
    );
  }

  @override
  Future<List<DoctorBriefingModel>> getDoctorBriefings() async {
    final b = await generateDoctorBriefing();
    return [b!];
  }
}

void main() {
  group('Phase 9 - Flutter Health Intelligence Test Suite', () {
    test('1. HealthTrendModel serialization round-trip', () {
      final json = {
        'metricName': 'Total Cholesterol',
        'previousValue': '185',
        'latestValue': '235',
        'unit': 'mg/dL',
        'previousDate': '2026-01-15',
        'latestDate': '2026-08-15',
        'changeValue': '+50.00 mg/dL',
        'changePercent': 27.03,
        'trendDirection': 'INCREASING',
        'confidence': 0.94,
        'sourceDocumentIds': ['doc_1'],
        'printedReferenceRange': '125 - 200 mg/dL',
        'observationsCount': 2
      };

      final model = HealthTrendModel.fromJson(json);
      expect(model.metricName, 'Total Cholesterol');
      expect(model.latestValue, '235');
      expect(model.trendDirection, 'INCREASING');
      expect(model.changePercent, 27.03);
    });

    test('2. HealthAlertModel serialization round-trip', () {
      final json = {
        'id': 'alert_99',
        'alertType': 'REPEATED_OUT_OF_RANGE',
        'metric': 'LDL',
        'severity': 'HIGH',
        'message': 'LDL reading outside reference range',
        'evidence': [],
        'sourceDocumentIds': ['doc_1'],
        'doctorQuestions': ['What does my LDL indicate?'],
        'status': 'ACTIVE'
      };

      final model = HealthAlertModel.fromJson(json);
      expect(model.id, 'alert_99');
      expect(model.severity, 'HIGH');
      expect(model.doctorQuestions.first, 'What does my LDL indicate?');
    });

    test('3. MedicationConcernModel & Reconciliation round-trip', () {
      final json = {
        'status': 'REQUIRES_CLINICIAN_REVIEW',
        'activeMedicationsCount': 1,
        'documentMedicationsCount': 1,
        'activeMedications': [],
        'documentMedications': [],
        'potentialConcerns': [
          {
            'type': 'DOSAGE_DISCREPANCY',
            'classification': 'REQUIRES_CLINICIAN_REVIEW',
            'medicationA': 'Metformin',
            'reason': 'Dosage difference',
            'confidence': 0.90,
            'sourceDocuments': [],
            'suggestedQuestion': 'What is correct dose?'
          }
        ],
        'doctorQuestions': ['Verify dose'],
        'disclaimer': 'Informational only'
      };

      final rec = MedicationReconciliationModel.fromJson(json);
      expect(rec.status, 'REQUIRES_CLINICIAN_REVIEW');
      expect(rec.potentialConcerns.length, 1);
      expect(rec.potentialConcerns.first.classification, 'REQUIRES_CLINICIAN_REVIEW');
    });

    test('4. DoctorBriefingPdfService compiles PDF document bytes', () async {
      final briefing = DoctorBriefingModel(
        id: 'db_pdf_test',
        briefingData: {
          'patientInfo': {'name': 'Jane Doe', 'reportDate': '2026-08-21'},
          'recentMeasurements': [
            {'metricName': 'HbA1c', 'latestValue': '6.2', 'unit': '%', 'trendDirection': 'INCREASING'}
          ],
          'trendSummaries': [
            {'metricName': 'HbA1c', 'previousValue': '5.6', 'latestValue': '6.2', 'unit': '%', 'change': '+0.60 %', 'dates': 'Jan -> Aug'}
          ],
          'outOfRangeResults': [],
          'currentMedications': [],
          'discussionPoints': [],
          'questionsForDoctor': ['Is HbA1c trending up?'],
          'disclaimer': 'Strictly non-diagnostic.'
        },
        generatedAt: '2026-08-21T00:00:00Z',
        sourceDocumentIds: ['doc_1'],
        status: 'READY',
      );

      final bytes = await DoctorBriefingPdfService.generatePdf(briefing);
      expect(bytes, isNotEmpty);
      expect(bytes.length, greaterThan(100));
    });

    testWidgets('5. HealthOverviewCard renders stats and action button', (WidgetTester tester) async {
      final overview = HealthOverviewModel(
        trendsCount: 5,
        activeAlertsCount: 2,
        potentialConcernsCount: 1,
        documentsCount: 3,
        recentTrends: [],
        activeAlerts: [],
        medicationConcerns: [],
        doctorQuestions: [],
        disclaimer: 'Non-diagnostic',
      );

      bool clicked = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: HealthOverviewCard(
              overview: overview,
              onPrepareDoctorVisit: () => clicked = true,
            ),
          ),
        ),
      );

      expect(find.text('Health Intelligence Center'), findsOneWidget);
      expect(find.text('3 Reports'), findsOneWidget);
      expect(find.text('5'), findsOneWidget);
      expect(find.text('Generate Doctor Consultation Briefing'), findsOneWidget);

      await tester.tap(find.text('Generate Doctor Consultation Briefing'));
      expect(clicked, isTrue);
    });

    testWidgets('6. HealthTrendCard renders increasing and insufficient trend states', (WidgetTester tester) async {
      final trend = HealthTrendModel(
        metricName: 'Blood Glucose',
        previousValue: '102',
        latestValue: '128',
        unit: 'mg/dL',
        previousDate: '2026-01-15',
        latestDate: '2026-08-15',
        changeValue: '+26.00 mg/dL',
        changePercent: 25.49,
        trendDirection: 'INCREASING',
        confidence: 0.95,
        sourceDocumentIds: ['doc_1'],
        printedReferenceRange: '70 - 100 mg/dL',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: HealthTrendCard(trend: trend),
          ),
        ),
      );

      expect(find.text('Blood Glucose'), findsOneWidget);
      expect(find.text('INCREASING'), findsOneWidget);
      expect(find.text('128 mg/dL'), findsOneWidget);
      expect(find.text('+26.00 mg/dL'), findsOneWidget);
      expect(find.text('Printed Reference Range: 70 - 100 mg/dL'), findsOneWidget);
    });

    testWidgets('7. HealthAlertCard renders message and handles dismiss', (WidgetTester tester) async {
      final alert = HealthAlertModel(
        id: 'a1',
        alertType: 'PERSISTENT_OUT_OF_RANGE',
        metric: 'Blood Glucose',
        severity: 'HIGH',
        message: 'Persistent high reading detected.',
        evidence: [],
        sourceDocumentIds: [],
        doctorQuestions: ['Ask doctor about glucose'],
        status: 'ACTIVE',
      );

      bool dismissed = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: HealthAlertCard(
              alert: alert,
              onDismiss: () => dismissed = true,
            ),
          ),
        ),
      );

      expect(find.text('Blood Glucose Alert'), findsOneWidget);
      expect(find.text('Persistent high reading detected.'), findsOneWidget);
      expect(find.text('Ask doctor about glucose'), findsOneWidget);

      await tester.tap(find.byIcon(Icons.close));
      expect(dismissed, isTrue);
    });

    testWidgets('8. MedicationConflictCard renders discussion question', (WidgetTester tester) async {
      final concern = MedicationConcernModel(
        type: 'DOSAGE_DISCREPANCY',
        classification: 'REQUIRES_CLINICIAN_REVIEW',
        medicationA: 'Metformin',
        reason: 'Dosage discrepancy detected',
        confidence: 0.95,
        sourceDocuments: [],
        suggestedQuestion: 'Confirm dose with doctor',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MedicationConflictCard(concern: concern),
          ),
        ),
      );

      expect(find.text('Metformin'), findsOneWidget);
      expect(find.text('REQUIRES CLINICIAN REVIEW'), findsOneWidget);
      expect(find.text('Confirm dose with doctor'), findsOneWidget);
    });

    testWidgets('9. DoctorQuestionCard renders copyable question', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DoctorQuestionCard(
              question: 'Are there any dietary changes recommended for my LDL?',
              index: 1,
            ),
          ),
        ),
      );

      expect(find.text('Are there any dietary changes recommended for my LDL?'), findsOneWidget);
      expect(find.text('1'), findsOneWidget);
      expect(find.byIcon(Icons.copy), findsOneWidget);
    });

    testWidgets('10. DoctorBriefingScreen renders full briefing and disclaimer', (WidgetTester tester) async {
      final briefing = DoctorBriefingModel(
        id: 'b1',
        briefingData: {
          'patientInfo': {'name': 'John Doe', 'reportDate': '2026-08-21'},
          'recentMeasurements': [
            {'metricName': 'Fasting Glucose', 'latestValue': '128', 'unit': 'mg/dL', 'trendDirection': 'INCREASING'}
          ],
          'trendSummaries': [],
          'outOfRangeResults': [],
          'currentMedications': [],
          'discussionPoints': [],
          'questionsForDoctor': ['Is Fasting Glucose elevated?'],
          'disclaimer': 'Informational only.'
        },
        generatedAt: '2026-08-21T00:00:00Z',
        sourceDocumentIds: [],
        status: 'READY',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: DoctorBriefingScreen(briefing: briefing),
        ),
      );

      expect(find.text('Doctor Visit Briefing'), findsOneWidget);
      expect(find.text('John Doe'), findsOneWidget);
      expect(find.text('Fasting Glucose'), findsOneWidget);
      expect(find.text('• Is Fasting Glucose elevated?'), findsOneWidget);
      expect(find.text('Print or Save PDF Briefing'), findsOneWidget);
    });

    testWidgets('11. HealthIntelligenceScreen renders tabs and navigates correctly', (WidgetTester tester) async {
      final controller = HealthIntelligenceController(apiService: MockHealthIntelligenceApiService());

      await tester.pumpWidget(
        MaterialApp(
          home: HealthIntelligenceScreen(controller: controller),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Autonomous Health Center'), findsOneWidget);
      expect(find.text('Biomarkers'), findsOneWidget);
      expect(find.text('Med Review'), findsWidgets);
      expect(find.text('Briefings'), findsWidgets);

      // Switch to Alerts Tab
      await tester.tap(find.widgetWithText(Tab, 'Alerts'));
      await tester.pumpAndSettle();
      expect(find.text('Proactive Health Observations'), findsOneWidget);

      // Switch to Med Review Tab
      await tester.tap(find.widgetWithText(Tab, 'Med Review'));
      await tester.pumpAndSettle();
      expect(find.text('Medication Reconciliation Points'), findsOneWidget);

      // Switch to Briefings Tab
      await tester.tap(find.widgetWithText(Tab, 'Briefings'));
      await tester.pumpAndSettle();
      expect(find.text('Doctor Visit Preparation'), findsOneWidget);
    });
  });
}
