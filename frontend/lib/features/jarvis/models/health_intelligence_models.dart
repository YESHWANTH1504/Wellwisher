class HealthTrendModel {
  final String metricName;
  final String? previousValue;
  final String latestValue;
  final String unit;
  final String? previousDate;
  final String? latestDate;
  final String? changeValue;
  final double? changePercent;
  final String trendDirection; // INCREASING, DECREASING, STABLE, INSUFFICIENT_DATA
  final double confidence;
  final List<String> sourceDocumentIds;
  final String? printedReferenceRange;
  final int observationsCount;

  HealthTrendModel({
    required this.metricName,
    this.previousValue,
    required this.latestValue,
    required this.unit,
    this.previousDate,
    this.latestDate,
    this.changeValue,
    this.changePercent,
    required this.trendDirection,
    required this.confidence,
    required this.sourceDocumentIds,
    this.printedReferenceRange,
    this.observationsCount = 1,
  });

  factory HealthTrendModel.fromJson(Map<String, dynamic> json) {
    return HealthTrendModel(
      metricName: json['metricName'] ?? json['metric_name'] ?? 'Unknown Metric',
      previousValue: json['previousValue']?.toString() ?? json['previous_value']?.toString(),
      latestValue: (json['latestValue'] ?? json['latest_value'] ?? '').toString(),
      unit: (json['unit'] ?? '').toString(),
      previousDate: json['previousDate']?.toString() ?? json['previous_date']?.toString(),
      latestDate: json['latestDate']?.toString() ?? json['latest_date']?.toString(),
      changeValue: json['changeValue']?.toString() ?? json['change_value']?.toString(),
      changePercent: json['changePercent'] != null ? (json['changePercent'] as num).toDouble() : (json['change_percent'] != null ? (json['change_percent'] as num).toDouble() : null),
      trendDirection: (json['trendDirection'] ?? json['trend_direction'] ?? 'STABLE').toString(),
      confidence: json['confidence'] != null ? (json['confidence'] as num).toDouble() : 0.90,
      sourceDocumentIds: json['sourceDocumentIds'] != null
          ? List<String>.from(json['sourceDocumentIds'].map((x) => x.toString()))
          : (json['source_document_ids'] != null
              ? List<String>.from(json['source_document_ids'].map((x) => x.toString()))
              : []),
      printedReferenceRange: json['printedReferenceRange']?.toString() ?? json['printed_reference_range']?.toString(),
      observationsCount: json['observationsCount'] ?? json['observations_count'] ?? 1,
    );
  }
}

class HealthAlertModel {
  final String id;
  final String alertType; // PERSISTENT_OUT_OF_RANGE, REPEATED_OUT_OF_RANGE, HEALTH_TREND_ALERT
  final String metric;
  final String severity; // LOW, MEDIUM, HIGH
  final String message;
  final List<dynamic> evidence;
  final List<String> sourceDocumentIds;
  final List<String> doctorQuestions;
  final String status; // ACTIVE, DISMISSED
  final String? createdAt;

  HealthAlertModel({
    required this.id,
    required this.alertType,
    required this.metric,
    required this.severity,
    required this.message,
    required this.evidence,
    required this.sourceDocumentIds,
    required this.doctorQuestions,
    required this.status,
    this.createdAt,
  });

  factory HealthAlertModel.fromJson(Map<String, dynamic> json) {
    return HealthAlertModel(
      id: (json['id'] ?? '').toString(),
      alertType: (json['alertType'] ?? json['alert_type'] ?? 'HEALTH_TREND_ALERT').toString(),
      metric: (json['metric'] ?? '').toString(),
      severity: (json['severity'] ?? 'MEDIUM').toString(),
      message: (json['message'] ?? '').toString(),
      evidence: json['evidence'] is List ? json['evidence'] : [],
      sourceDocumentIds: json['sourceDocumentIds'] != null
          ? List<String>.from(json['sourceDocumentIds'].map((x) => x.toString()))
          : (json['source_document_ids'] != null
              ? List<String>.from(json['source_document_ids'].map((x) => x.toString()))
              : []),
      doctorQuestions: json['doctorQuestions'] != null
          ? List<String>.from(json['doctorQuestions'].map((x) => x.toString()))
          : (json['doctor_questions'] != null
              ? List<String>.from(json['doctor_questions'].map((x) => x.toString()))
              : []),
      status: (json['status'] ?? 'ACTIVE').toString(),
      createdAt: json['createdAt']?.toString() ?? json['created_at']?.toString(),
    );
  }
}

class MedicationConcernModel {
  final String type; // DOSAGE_DISCREPANCY, UNRECORDED_MEDICATION, POTENTIAL_DUPLICATE
  final String classification; // REQUIRES_CLINICIAN_REVIEW, POTENTIAL_CONCERN, REVIEW_RECOMMENDED, INFORMATIONAL
  final String medicationA;
  final String? medicationB;
  final String reason;
  final double confidence;
  final List<String> sourceDocuments;
  final String suggestedQuestion;

  MedicationConcernModel({
    required this.type,
    required this.classification,
    required this.medicationA,
    this.medicationB,
    required this.reason,
    required this.confidence,
    required this.sourceDocuments,
    required this.suggestedQuestion,
  });

  factory MedicationConcernModel.fromJson(Map<String, dynamic> json) {
    return MedicationConcernModel(
      type: (json['type'] ?? 'MEDICATION_REVIEW').toString(),
      classification: (json['classification'] ?? 'REVIEW_RECOMMENDED').toString(),
      medicationA: (json['medicationA'] ?? json['medication_a'] ?? '').toString(),
      medicationB: json['medicationB']?.toString() ?? json['medication_b']?.toString(),
      reason: (json['reason'] ?? '').toString(),
      confidence: json['confidence'] != null ? (json['confidence'] as num).toDouble() : 0.90,
      sourceDocuments: json['sourceDocuments'] != null
          ? List<String>.from(json['sourceDocuments'].map((x) => x.toString()))
          : [],
      suggestedQuestion: (json['suggestedQuestion'] ?? json['suggested_question'] ?? '').toString(),
    );
  }
}

class MedicationReconciliationModel {
  final String status;
  final int activeMedicationsCount;
  final int documentMedicationsCount;
  final List<dynamic> activeMedications;
  final List<dynamic> documentMedications;
  final List<MedicationConcernModel> potentialConcerns;
  final List<String> doctorQuestions;
  final String disclaimer;

  MedicationReconciliationModel({
    required this.status,
    required this.activeMedicationsCount,
    required this.documentMedicationsCount,
    required this.activeMedications,
    required this.documentMedications,
    required this.potentialConcerns,
    required this.doctorQuestions,
    required this.disclaimer,
  });

  factory MedicationReconciliationModel.fromJson(Map<String, dynamic> json) {
    final rawConcerns = json['potentialConcerns'] ?? json['potential_concerns'] ?? [];
    return MedicationReconciliationModel(
      status: (json['status'] ?? 'INFORMATIONAL').toString(),
      activeMedicationsCount: json['activeMedicationsCount'] ?? json['active_medications_count'] ?? 0,
      documentMedicationsCount: json['documentMedicationsCount'] ?? json['document_medications_count'] ?? 0,
      activeMedications: json['activeMedications'] is List ? json['activeMedications'] : [],
      documentMedications: json['documentMedications'] is List ? json['documentMedications'] : [],
      potentialConcerns: rawConcerns is List
          ? rawConcerns.map((c) => MedicationConcernModel.fromJson(Map<String, dynamic>.from(c))).toList()
          : [],
      doctorQuestions: json['doctorQuestions'] != null
          ? List<String>.from(json['doctorQuestions'].map((x) => x.toString()))
          : [],
      disclaimer: (json['disclaimer'] ?? '').toString(),
    );
  }
}

class DoctorBriefingModel {
  final String id;
  final Map<String, dynamic> briefingData;
  final String generatedAt;
  final List<String> sourceDocumentIds;
  final String status;

  DoctorBriefingModel({
    required this.id,
    required this.briefingData,
    required this.generatedAt,
    required this.sourceDocumentIds,
    required this.status,
  });

  factory DoctorBriefingModel.fromJson(Map<String, dynamic> json) {
    return DoctorBriefingModel(
      id: (json['id'] ?? '').toString(),
      briefingData: json['briefingData'] is Map
          ? Map<String, dynamic>.from(json['briefingData'])
          : (json['briefing_data'] is Map
              ? Map<String, dynamic>.from(json['briefing_data'])
              : {}),
      generatedAt: (json['generatedAt'] ?? json['generated_at'] ?? DateTime.now().toIso8601String()).toString(),
      sourceDocumentIds: json['sourceDocumentIds'] != null
          ? List<String>.from(json['sourceDocumentIds'].map((x) => x.toString()))
          : (json['source_document_ids'] != null
              ? List<String>.from(json['source_document_ids'].map((x) => x.toString()))
              : []),
      status: (json['status'] ?? 'READY').toString(),
    );
  }
}

class HealthOverviewModel {
  final int trendsCount;
  final int activeAlertsCount;
  final int potentialConcernsCount;
  final int documentsCount;
  final List<HealthTrendModel> recentTrends;
  final List<HealthAlertModel> activeAlerts;
  final List<MedicationConcernModel> medicationConcerns;
  final List<String> doctorQuestions;
  final String disclaimer;

  HealthOverviewModel({
    required this.trendsCount,
    required this.activeAlertsCount,
    required this.potentialConcernsCount,
    required this.documentsCount,
    required this.recentTrends,
    required this.activeAlerts,
    required this.medicationConcerns,
    required this.doctorQuestions,
    required this.disclaimer,
  });

  factory HealthOverviewModel.fromJson(Map<String, dynamic> json) {
    final rawTrends = json['recentTrends'] ?? [];
    final rawAlerts = json['activeAlerts'] ?? [];
    final rawConcerns = json['medicationConcerns'] ?? [];

    return HealthOverviewModel(
      trendsCount: json['trendsCount'] ?? 0,
      activeAlertsCount: json['activeAlertsCount'] ?? 0,
      potentialConcernsCount: json['potentialConcernsCount'] ?? 0,
      documentsCount: json['documentsCount'] ?? 0,
      recentTrends: rawTrends is List
          ? rawTrends.map((t) => HealthTrendModel.fromJson(Map<String, dynamic>.from(t))).toList()
          : [],
      activeAlerts: rawAlerts is List
          ? rawAlerts.map((a) => HealthAlertModel.fromJson(Map<String, dynamic>.from(a))).toList()
          : [],
      medicationConcerns: rawConcerns is List
          ? rawConcerns.map((c) => MedicationConcernModel.fromJson(Map<String, dynamic>.from(c))).toList()
          : [],
      doctorQuestions: json['doctorQuestions'] != null
          ? List<String>.from(json['doctorQuestions'].map((x) => x.toString()))
          : [],
      disclaimer: (json['disclaimer'] ?? '').toString(),
    );
  }
}
