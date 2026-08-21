class AiMemoryItemModel {
  final int id;
  final String memoryType;
  final String memoryKey;
  final String memoryValue;
  final String source;
  final int importance;
  final double confidenceScore;
  final int evidenceCount;
  final DateTime? createdAt;

  AiMemoryItemModel({
    required this.id,
    required this.memoryType,
    required this.memoryKey,
    required this.memoryValue,
    required this.source,
    this.importance = 3,
    this.confidenceScore = 1.0,
    this.evidenceCount = 1,
    this.createdAt,
  });

  factory AiMemoryItemModel.fromJson(Map<String, dynamic> json) {
    return AiMemoryItemModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      memoryType: json['memory_type'] ?? json['memoryType'] ?? 'USER_PREFERENCE',
      memoryKey: json['memory_key'] ?? json['memoryKey'] ?? '',
      memoryValue: json['memory_value'] ?? json['memoryValue'] ?? '',
      source: json['source'] ?? 'USER_EXPLICIT',
      importance: json['importance'] is int ? json['importance'] : int.tryParse(json['importance'].toString()) ?? 3,
      confidenceScore: json['confidence_score'] != null ? (double.tryParse(json['confidence_score'].toString()) ?? 1.0) : 1.0,
      evidenceCount: json['evidence_count'] is int ? json['evidence_count'] : int.tryParse(json['evidence_count'].toString()) ?? 1,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'].toString()) : null,
    );
  }
}

class WeeklySummaryModel {
  final String period;
  final int totalRoutines;
  final int completedRoutines;
  final int missedRoutines;
  final int postponedRoutines;
  final int completionRatePercentage;
  final int averageDailyHydrationMl;
  final List<String> insights;

  WeeklySummaryModel({
    required this.period,
    required this.totalRoutines,
    required this.completedRoutines,
    required this.missedRoutines,
    required this.postponedRoutines,
    required this.completionRatePercentage,
    required this.averageDailyHydrationMl,
    required this.insights,
  });

  factory WeeklySummaryModel.fromJson(Map<String, dynamic> json) {
    final stats = json['stats'] is Map ? json['stats'] : {};
    return WeeklySummaryModel(
      period: json['period'] ?? 'LAST_7_DAYS',
      totalRoutines: stats['totalRoutines'] ?? 0,
      completedRoutines: stats['completedRoutines'] ?? 0,
      missedRoutines: stats['missedRoutines'] ?? 0,
      postponedRoutines: stats['postponedRoutines'] ?? 0,
      completionRatePercentage: stats['completionRatePercentage'] ?? 0,
      averageDailyHydrationMl: stats['averageDailyHydrationMl'] ?? 0,
      insights: json['insights'] is List ? (json['insights'] as List).map((e) => e.toString()).toList() : [],
    );
  }
}

class PersonalProfileModel {
  final int userId;
  final Map<String, dynamic> personality;
  final Map<String, dynamic> habits;
  final Map<String, dynamic> stats;
  final List<Map<String, dynamic>> explicitPreferences;
  final List<Map<String, dynamic>> inferredHabits;

  PersonalProfileModel({
    required this.userId,
    required this.personality,
    required this.habits,
    required this.stats,
    required this.explicitPreferences,
    required this.inferredHabits,
  });

  factory PersonalProfileModel.fromJson(Map<String, dynamic> json) {
    return PersonalProfileModel(
      userId: json['userId'] ?? 0,
      personality: json['personality'] is Map ? Map<String, dynamic>.from(json['personality']) : {},
      habits: json['habits'] is Map ? Map<String, dynamic>.from(json['habits']) : {},
      stats: json['stats'] is Map ? Map<String, dynamic>.from(json['stats']) : {},
      explicitPreferences: json['explicitPreferences'] is List
          ? (json['explicitPreferences'] as List).map((e) => Map<String, dynamic>.from(e)).toList()
          : [],
      inferredHabits: json['inferredHabits'] is List
          ? (json['inferredHabits'] as List).map((e) => Map<String, dynamic>.from(e)).toList()
          : [],
    );
  }
}
