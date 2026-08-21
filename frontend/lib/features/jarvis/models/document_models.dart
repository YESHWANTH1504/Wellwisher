import 'package:flutter/material.dart';

class AiDocumentModel {
  final String id;
  final String documentType;
  final String originalFilename;
  final String mimeType;
  final int fileSize;
  final String processingStatus;
  final String uploadedAt;
  final String? processedAt;
  final Map<String, dynamic> metadata;

  AiDocumentModel({
    required this.id,
    required this.documentType,
    required this.originalFilename,
    required this.mimeType,
    required this.fileSize,
    required this.processingStatus,
    required this.uploadedAt,
    this.processedAt,
    this.metadata = const {},
  });

  factory AiDocumentModel.fromJson(Map<String, dynamic> json) {
    return AiDocumentModel(
      id: json['id']?.toString() ?? '',
      documentType: json['documentType']?.toString() ?? json['document_type']?.toString() ?? 'UNKNOWN',
      originalFilename: json['originalFilename']?.toString() ?? json['original_filename']?.toString() ?? 'Document',
      mimeType: json['mimeType']?.toString() ?? json['mime_type']?.toString() ?? 'application/pdf',
      fileSize: json['fileSize'] is num ? (json['fileSize'] as num).toInt() : (int.tryParse(json['file_size']?.toString() ?? '0') ?? 0),
      processingStatus: json['processingStatus']?.toString() ?? json['processing_status']?.toString() ?? 'UPLOADED',
      uploadedAt: json['uploadedAt']?.toString() ?? json['uploaded_at']?.toString() ?? '',
      processedAt: json['processedAt']?.toString() ?? json['processed_at']?.toString(),
      metadata: json['metadata'] is Map<String, dynamic> ? json['metadata'] as Map<String, dynamic> : {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'documentType': documentType,
      'originalFilename': originalFilename,
      'mimeType': mimeType,
      'fileSize': fileSize,
      'processingStatus': processingStatus,
      'uploadedAt': uploadedAt,
      'processedAt': processedAt,
      'metadata': metadata,
    };
  }

  String get formattedFileSize {
    if (fileSize < 1024) return '$fileSize B';
    if (fileSize < 1024 * 1024) return '${(fileSize / 1024).toStringAsFixed(1)} KB';
    return '${(fileSize / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  String get displayType {
    switch (documentType) {
      case 'BLOOD_REPORT':
        return 'Blood Report';
      case 'LAB_REPORT':
        return 'Lab Report';
      case 'PRESCRIPTION':
        return 'Prescription';
      case 'MEDICATION_LABEL':
        return 'Medication Label';
      case 'VITALS_REPORT':
        return 'Vitals Report';
      case 'DOCTOR_NOTE':
        return 'Doctor Note';
      case 'DISCHARGE_SUMMARY':
        return 'Discharge Summary';
      case 'HEALTH_CERTIFICATE':
        return 'Health Certificate';
      case 'GENERAL_HEALTH_DOCUMENT':
        return 'Health Document';
      default:
        return 'Document';
    }
  }

  IconData get typeIcon {
    switch (documentType) {
      case 'BLOOD_REPORT':
      case 'LAB_REPORT':
        return Icons.biotech_rounded;
      case 'PRESCRIPTION':
      case 'MEDICATION_LABEL':
        return Icons.medication_rounded;
      case 'VITALS_REPORT':
        return Icons.monitor_heart_rounded;
      case 'DOCTOR_NOTE':
        return Icons.note_alt_rounded;
      case 'DISCHARGE_SUMMARY':
        return Icons.assignment_rounded;
      default:
        return Icons.description_rounded;
    }
  }
}

class AiExtractedValueModel {
  final String id;
  final String documentId;
  final String fieldName;
  final String fieldValue;
  final String? normalizedValue;
  final String? unit;
  final String? referenceRange;
  final String flag;
  final String? category;
  final double confidenceScore;
  final int pageNumber;
  final String? sourceText;
  final String extractionStatus;

  AiExtractedValueModel({
    required this.id,
    required this.documentId,
    required this.fieldName,
    required this.fieldValue,
    this.normalizedValue,
    this.unit,
    this.referenceRange,
    this.flag = 'NORMAL',
    this.category,
    this.confidenceScore = 0.90,
    this.pageNumber = 1,
    this.sourceText,
    this.extractionStatus = 'EXTRACTED',
  });

  factory AiExtractedValueModel.fromJson(Map<String, dynamic> json) {
    return AiExtractedValueModel(
      id: json['id']?.toString() ?? '',
      documentId: json['documentId']?.toString() ?? json['document_id']?.toString() ?? '',
      fieldName: json['fieldName']?.toString() ?? json['field_name']?.toString() ?? json['testName']?.toString() ?? 'Metric',
      fieldValue: json['fieldValue']?.toString() ?? json['field_value']?.toString() ?? json['value']?.toString() ?? '',
      normalizedValue: json['normalizedValue']?.toString() ?? json['normalized_value']?.toString(),
      unit: json['unit']?.toString(),
      referenceRange: json['referenceRange']?.toString() ?? json['reference_range']?.toString(),
      flag: json['flag']?.toString() ?? 'NORMAL',
      category: json['category']?.toString(),
      confidenceScore: json['confidenceScore'] is num
          ? (json['confidenceScore'] as num).toDouble()
          : (double.tryParse(json['confidence_score']?.toString() ?? '0.90') ?? 0.90),
      pageNumber: json['pageNumber'] is num
          ? (json['pageNumber'] as num).toInt()
          : (int.tryParse(json['page_number']?.toString() ?? json['sourcePage']?.toString() ?? '1') ?? 1),
      sourceText: json['sourceText']?.toString() ?? json['source_text']?.toString(),
      extractionStatus: json['extractionStatus']?.toString() ?? json['extraction_status']?.toString() ?? 'EXTRACTED',
    );
  }

  bool get isOutOfRange => ['LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH', 'ABNORMAL'].contains(flag.toUpperCase());

  Color get flagColor {
    switch (flag.toUpperCase()) {
      case 'CRITICAL_LOW':
      case 'CRITICAL_HIGH':
        return const Color(0xFFEF4444);
      case 'HIGH':
        return const Color(0xFFF59E0B);
      case 'LOW':
        return const Color(0xFF3B82F6);
      case 'NORMAL':
        return const Color(0xFF10B981);
      default:
        return Colors.white70;
    }
  }
}

class DocumentSummaryModel {
  final String documentId;
  final String documentType;
  final String summary;
  final List<String> keyFindings;
  final List<Map<String, dynamic>> outOfRangeValues;
  final List<Map<String, dynamic>> uncertainValues;
  final List<String> questionsForDoctor;
  final List<String> warnings;
  final double confidence;
  final String disclaimer;

  DocumentSummaryModel({
    required this.documentId,
    required this.documentType,
    required this.summary,
    this.keyFindings = const [],
    this.outOfRangeValues = const [],
    this.uncertainValues = const [],
    this.questionsForDoctor = const [],
    this.warnings = const [],
    this.confidence = 0.90,
    this.disclaimer = 'This is an informational summary and not a medical diagnosis.',
  });

  factory DocumentSummaryModel.fromJson(Map<String, dynamic> json) {
    return DocumentSummaryModel(
      documentId: json['documentId']?.toString() ?? json['document_id']?.toString() ?? '',
      documentType: json['documentType']?.toString() ?? json['document_type']?.toString() ?? 'UNKNOWN',
      summary: json['summary']?.toString() ?? 'Summary unavailable.',
      keyFindings: (json['keyFindings'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
          (json['key_findings'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
          [],
      outOfRangeValues: (json['outOfRangeValues'] as List<dynamic>?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ??
          (json['out_of_range_values'] as List<dynamic>?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ??
          [],
      uncertainValues: (json['uncertainValues'] as List<dynamic>?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ??
          (json['uncertain_values'] as List<dynamic>?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ??
          [],
      questionsForDoctor: (json['questionsForDoctor'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
          (json['questions_for_doctor'] as List<dynamic>?)?.map((e) => e.toString()).toList() ??
          [],
      warnings: (json['warnings'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      confidence: json['confidence'] is num
          ? (json['confidence'] as num).toDouble()
          : (double.tryParse(json['confidence']?.toString() ?? '0.90') ?? 0.90),
      disclaimer: json['disclaimer']?.toString() ?? 'This is an informational summary and not a medical diagnosis.',
    );
  }
}

class DocumentComparisonItemModel {
  final String fieldName;
  final String unit;
  final Map<String, dynamic> latest;
  final Map<String, dynamic> previous;
  final String change;

  DocumentComparisonItemModel({
    required this.fieldName,
    required this.unit,
    required this.latest,
    required this.previous,
    required this.change,
  });

  factory DocumentComparisonItemModel.fromJson(Map<String, dynamic> json) {
    return DocumentComparisonItemModel(
      fieldName: json['fieldName']?.toString() ?? 'Metric',
      unit: json['unit']?.toString() ?? '',
      latest: json['latest'] is Map<String, dynamic> ? json['latest'] as Map<String, dynamic> : {},
      previous: json['previous'] is Map<String, dynamic> ? json['previous'] as Map<String, dynamic> : {},
      change: json['change']?.toString() ?? '',
    );
  }
}

class DocumentComparisonModel {
  final String latestDocumentId;
  final String previousDocumentId;
  final int comparisonCount;
  final List<DocumentComparisonItemModel> comparisons;
  final String disclaimer;

  DocumentComparisonModel({
    required this.latestDocumentId,
    required this.previousDocumentId,
    required this.comparisonCount,
    required this.comparisons,
    required this.disclaimer,
  });

  factory DocumentComparisonModel.fromJson(Map<String, dynamic> json) {
    final rawComps = json['comparisons'] as List<dynamic>? ?? [];
    return DocumentComparisonModel(
      latestDocumentId: json['latestDocumentId']?.toString() ?? '',
      previousDocumentId: json['previousDocumentId']?.toString() ?? '',
      comparisonCount: json['comparisonCount'] is num ? (json['comparisonCount'] as num).toInt() : rawComps.length,
      comparisons: rawComps.map((e) => DocumentComparisonItemModel.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
      disclaimer: json['disclaimer']?.toString() ?? 'This is an informational comparison and not a medical diagnosis.',
    );
  }
}
