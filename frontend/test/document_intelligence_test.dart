import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/models/document_models.dart';
import 'package:wellwisher/features/jarvis/services/document_api_service.dart';
import 'package:wellwisher/features/jarvis/controller/document_controller.dart';
import 'package:wellwisher/features/jarvis/widgets/document_summary_card.dart';
import 'package:wellwisher/features/jarvis/widgets/extracted_value_card.dart';
import 'package:wellwisher/features/jarvis/widgets/document_source_viewer.dart';
import 'package:wellwisher/features/jarvis/widgets/document_comparison_card.dart';
import 'package:wellwisher/features/jarvis/screens/document_upload_screen.dart';
import 'package:wellwisher/features/jarvis/screens/document_list_screen.dart';
import 'package:wellwisher/features/jarvis/screens/document_detail_screen.dart';

class MockDocumentApiService extends DocumentApiService {
  List<AiDocumentModel> documents = [
    AiDocumentModel(
      id: 'doc_101',
      documentType: 'BLOOD_REPORT',
      originalFilename: 'cbc_report_aug2026.pdf',
      mimeType: 'application/pdf',
      fileSize: 1048576, // 1MB
      processingStatus: 'PROCESSED',
      uploadedAt: '2026-08-20T10:00:00Z',
    ),
    AiDocumentModel(
      id: 'doc_102',
      documentType: 'PRESCRIPTION',
      originalFilename: 'rx_metformin.pdf',
      mimeType: 'application/pdf',
      fileSize: 524288, // 512KB
      processingStatus: 'REVIEW_REQUIRED',
      uploadedAt: '2026-08-15T09:30:00Z',
    ),
  ];

  DocumentSummaryModel sampleSummary = DocumentSummaryModel(
    documentId: 'doc_101',
    documentType: 'BLOOD_REPORT',
    summary: 'The uploaded blood report shows hemoglobin and metabolic values.',
    keyFindings: ['Hemoglobin: 13.8 g/dL (Range: 13.0-17.0)', 'Fasting Glucose: 118 mg/dL (Range: 70-100)'],
    outOfRangeValues: [
      {'fieldName': 'Fasting Glucose', 'value': '118 mg/dL', 'flag': 'HIGH'}
    ],
    questionsForDoctor: ['What does the fasting glucose reading of 118 mean for my diet?'],
    disclaimer: 'This is an informational summary and not a medical diagnosis.',
  );

  List<AiExtractedValueModel> sampleExtractions = [
    AiExtractedValueModel(
      id: 'ext_1',
      documentId: 'doc_101',
      fieldName: 'Hemoglobin',
      fieldValue: '13.8',
      unit: 'g/dL',
      referenceRange: '13.0 - 17.0',
      flag: 'NORMAL',
      pageNumber: 1,
      sourceText: 'Hemoglobin 13.8 g/dL',
    ),
    AiExtractedValueModel(
      id: 'ext_2',
      documentId: 'doc_101',
      fieldName: 'Fasting Glucose',
      fieldValue: '118',
      unit: 'mg/dL',
      referenceRange: '70 - 100',
      flag: 'HIGH',
      pageNumber: 1,
      sourceText: 'Fasting Blood Glucose 118 mg/dL',
    ),
  ];

  @override
  Future<List<AiDocumentModel>> getDocuments({String? documentType}) async {
    if (documentType != null) {
      return documents.where((d) => d.documentType == documentType).toList();
    }
    return documents;
  }

  @override
  Future<List<AiDocumentModel>> searchDocuments(String query) async {
    return documents.where((d) => d.originalFilename.toLowerCase().contains(query.toLowerCase())).toList();
  }

  @override
  Future<AiDocumentModel?> getDocument(String id) async {
    final match = documents.where((d) => d.id == id);
    return match.isNotEmpty ? match.first : null;
  }

  @override
  Future<DocumentSummaryModel?> getDocumentSummary(String id) async {
    return sampleSummary;
  }

  @override
  Future<Map<String, dynamic>> getDocumentExtraction(String id) async {
    return {
      'document': await getDocument(id),
      'extractions': sampleExtractions,
      'pages': [
        {'pageNumber': 1, 'ocrText': 'SAMPLE OCR REPORT TEXT CONTENT'}
      ]
    };
  }

  @override
  Future<Map<String, dynamic>> uploadDocument({
    List<int>? bytes,
    String? filename,
    String? mimeType,
    String? ocrText,
    String? fileBase64,
  }) async {
    final newDoc = AiDocumentModel(
      id: 'doc_new_${DateTime.now().millisecondsSinceEpoch}',
      documentType: 'BLOOD_REPORT',
      originalFilename: filename ?? 'upload.pdf',
      mimeType: mimeType ?? 'application/pdf',
      fileSize: 1024,
      processingStatus: 'PROCESSED',
      uploadedAt: DateTime.now().toIso8601String(),
    );
    documents.insert(0, newDoc);
    return {'success': true, 'data': {'documentId': newDoc.id}};
  }

  @override
  Future<DocumentComparisonModel?> compareDocuments(String latestDocumentId, String previousDocumentId) async {
    return DocumentComparisonModel(
      latestDocumentId: latestDocumentId,
      previousDocumentId: previousDocumentId,
      comparisonCount: 2,
      comparisons: [
        DocumentComparisonItemModel(
          fieldName: 'Hemoglobin',
          unit: 'g/dL',
          latest: {'value': '13.8'},
          previous: {'value': '13.2'},
          change: '+0.60 g/dL',
        ),
      ],
      disclaimer: 'This comparison displays historical numerical differences between reports.',
    );
  }

  @override
  Future<bool> deleteDocument(String id) async {
    documents.removeWhere((d) => d.id == id);
    return true;
  }
}

void main() {
  group('Phase 8 - Document Models & Serialization Tests', () {
    test('1. Parses AiDocumentModel correctly from JSON', () {
      final json = {
        'id': 'doc_test_1',
        'document_type': 'BLOOD_REPORT',
        'original_filename': 'blood_test.pdf',
        'mime_type': 'application/pdf',
        'file_size': 2097152, // 2MB
        'processing_status': 'PROCESSED',
        'uploaded_at': '2026-08-20T12:00:00Z',
      };

      final doc = AiDocumentModel.fromJson(json);
      expect(doc.id, 'doc_test_1');
      expect(doc.documentType, 'BLOOD_REPORT');
      expect(doc.displayType, 'Blood Report');
      expect(doc.formattedFileSize, '2.0 MB');
      expect(doc.typeIcon, Icons.biotech_rounded);
    });

    test('2. Parses AiExtractedValueModel and checks out-of-range flag colors', () {
      final json = {
        'id': 'ext_test_1',
        'document_id': 'doc_test_1',
        'field_name': 'Fasting Glucose',
        'field_value': '125',
        'unit': 'mg/dL',
        'reference_range': '70-100',
        'flag': 'HIGH',
        'confidence_score': 0.96,
        'page_number': 1,
      };

      final metric = AiExtractedValueModel.fromJson(json);
      expect(metric.fieldName, 'Fasting Glucose');
      expect(metric.fieldValue, '125');
      expect(metric.unit, 'mg/dL');
      expect(metric.isOutOfRange, true);
      expect(metric.flagColor, const Color(0xFFF59E0B));
    });

    test('3. Parses DocumentComparisonModel correctly', () {
      final json = {
        'latestDocumentId': 'doc_1',
        'previousDocumentId': 'doc_2',
        'comparisonCount': 1,
        'comparisons': [
          {
            'fieldName': 'Hemoglobin',
            'unit': 'g/dL',
            'latest': {'value': '13.8'},
            'previous': {'value': '13.2'},
            'change': '+0.60 g/dL'
          }
        ],
        'disclaimer': 'Historical informational comparison.'
      };

      final comp = DocumentComparisonModel.fromJson(json);
      expect(comp.comparisonCount, 1);
      expect(comp.comparisons.first.fieldName, 'Hemoglobin');
      expect(comp.comparisons.first.change, '+0.60 g/dL');
    });
  });

  group('Phase 8 - Document Controller Tests', () {
    test('4. DocumentController loads and filters documents', () async {
      final mockApi = MockDocumentApiService();
      final controller = DocumentController(apiService: mockApi);

      await controller.loadDocuments();
      expect(controller.documents.length, 2);

      controller.filterByType('BLOOD_REPORT');
      await Future.delayed(const Duration(milliseconds: 50));
      expect(controller.documents.length, 1);
      expect(controller.documents.first.documentType, 'BLOOD_REPORT');
    });

    test('5. DocumentController uploads and deletes documents', () async {
      final mockApi = MockDocumentApiService();
      final controller = DocumentController(apiService: mockApi);

      final uploaded = await controller.uploadDocument(
        ocrText: 'Hemoglobin: 14.0 g/dL',
        filename: 'new_report.pdf',
      );
      expect(uploaded, true);
      expect(controller.documents.length, 3);

      final deleted = await controller.deleteDocument('doc_101');
      expect(deleted, true);
      expect(controller.documents.any((d) => d.id == 'doc_101'), false);
    });
  });

  group('Phase 8 - Document Widgets & Screens Tests', () {
    testWidgets('6. DocumentSummaryCard renders summary, warnings, and non-diagnostic disclaimer', (tester) async {
      final summary = DocumentSummaryModel(
        documentId: 'doc_101',
        documentType: 'BLOOD_REPORT',
        summary: 'Report analysis shows normal hemoglobin and high fasting glucose.',
        outOfRangeValues: [
          {'fieldName': 'Glucose', 'value': '118 mg/dL', 'flag': 'HIGH'}
        ],
        questionsForDoctor: ['What does my glucose reading indicate?'],
        disclaimer: 'This is an informational summary and not a medical diagnosis.',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DocumentSummaryCard(summary: summary),
          ),
        ),
      );

      expect(find.text('BLOOD REPORT'), findsOneWidget);
      expect(find.textContaining('normal hemoglobin'), findsOneWidget);
      expect(find.textContaining('Glucose: 118 mg/dL (HIGH)'), findsOneWidget);
      expect(find.textContaining('What does my glucose reading indicate?'), findsOneWidget);
      expect(find.textContaining('not a medical diagnosis'), findsOneWidget);
    });

    testWidgets('7. ExtractedValueCard renders test values and flags', (tester) async {
      final metric = AiExtractedValueModel(
        id: 'ext_1',
        documentId: 'doc_101',
        fieldName: 'Serum Creatinine',
        fieldValue: '0.95',
        unit: 'mg/dL',
        referenceRange: '0.70 - 1.30',
        flag: 'NORMAL',
        pageNumber: 2,
      );

      bool tappedSource = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ExtractedValueCard(
              metric: metric,
              onTapSource: () => tappedSource = true,
            ),
          ),
        ),
      );

      expect(find.text('Serum Creatinine'), findsOneWidget);
      expect(find.text('0.95'), findsOneWidget);
      expect(find.text('mg/dL'), findsOneWidget);
      expect(find.text('0.70 - 1.30'), findsOneWidget);
      expect(find.text('NORMAL'), findsOneWidget);
      expect(find.text('Page 2'), findsOneWidget);

      await tester.tap(find.text('Page 2'));
      expect(tappedSource, true);
    });

    testWidgets('8. DocumentSourceViewerModal renders raw OCR text', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: DocumentSourceViewerModal(
              filename: 'cbc_report.pdf',
              pageNumber: 1,
              ocrText: 'RAW OCR EXTRACTED TEXT FOR TESTING',
              highlightedSnippet: 'Hemoglobin',
            ),
          ),
        ),
      );

      expect(find.textContaining('cbc_report.pdf'), findsOneWidget);
      expect(find.text('Page 1 OCR Transcript'), findsOneWidget);
      expect(find.textContaining('RAW OCR EXTRACTED TEXT FOR TESTING'), findsOneWidget);
      expect(find.textContaining('Target Match: "Hemoglobin"'), findsOneWidget);
    });

    testWidgets('9. DocumentComparisonCard renders numerical comparison deltas', (tester) async {
      final comp = DocumentComparisonModel(
        latestDocumentId: 'doc_1',
        previousDocumentId: 'doc_2',
        comparisonCount: 1,
        comparisons: [
          DocumentComparisonItemModel(
            fieldName: 'Hemoglobin',
            unit: 'g/dL',
            latest: {'value': '13.8'},
            previous: {'value': '13.2'},
            change: '+0.60 g/dL',
          )
        ],
        disclaimer: 'Comparison is informational only.',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DocumentComparisonCard(comparison: comp),
          ),
        ),
      );

      expect(find.text('Report Comparison (Historical Trends)'), findsOneWidget);
      expect(find.text('Hemoglobin'), findsOneWidget);
      expect(find.text('+0.60 g/dL'), findsOneWidget);
      expect(find.text('13.8'), findsOneWidget);
      expect(find.text('13.2'), findsOneWidget);
    });

    testWidgets('10. DocumentListScreen renders documents and launches scan', (tester) async {
      final mockApi = MockDocumentApiService();
      final controller = DocumentController(apiService: mockApi);

      await tester.pumpWidget(
        MaterialApp(
          home: DocumentListScreen(controller: controller),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('JARVIS Health Documents'), findsOneWidget);
      expect(find.text('cbc_report_aug2026.pdf'), findsOneWidget);
      expect(find.text('rx_metformin.pdf'), findsOneWidget);
      expect(find.text('Scan Document'), findsOneWidget);
    });

    testWidgets('11. DocumentDetailScreen renders summary and parameter cards', (tester) async {
      final mockApi = MockDocumentApiService();

      await tester.pumpWidget(
        MaterialApp(
          home: DocumentDetailScreen(
            documentId: 'doc_101',
            apiService: mockApi,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Extracted Clinical Parameters'), findsOneWidget);
      expect(find.text('Hemoglobin'), findsOneWidget);
      expect(find.text('Fasting Glucose'), findsOneWidget);
      expect(find.text('Compare with Previous Report'), findsOneWidget);
    });
  });
}
