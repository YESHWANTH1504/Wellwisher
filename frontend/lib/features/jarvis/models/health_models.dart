/// Structured Health Models for JARVIS Health Intelligence.
///
/// CRITICAL ARCHITECTURAL RULE:
/// Health Connect is authoritative. Never represent missing, denied, or unrecorded
/// health measurements as zero. Every model cleanly separates available values from
/// explicit status codes (NO_DATA, PERMISSION_DENIED, UNSUPPORTED, ERROR).
enum HealthStatus {
  available,
  noData,
  permissionDenied,
  unsupportedPlatform,
  sourceUnavailable,
  error,
  loading
}

enum MeasurementType {
  measured,
  synced,
  estimated,
  manual
}

MeasurementType parseMeasurementType(String? typeStr) {
  if (typeStr == null) return MeasurementType.measured;
  final t = typeStr.toUpperCase().trim();
  if (t.contains('SYNC')) return MeasurementType.synced;
  if (t.contains('ESTIMAT')) return MeasurementType.estimated;
  if (t.contains('MANUAL')) return MeasurementType.manual;
  return MeasurementType.measured;
}

HealthStatus parseHealthStatus(bool? available, String? reason) {
  if (available == true) return HealthStatus.available;
  final r = (reason ?? '').toUpperCase();
  if (r.contains('PERMISSION')) return HealthStatus.permissionDenied;
  if (r.contains('UNSUPPORTED')) return HealthStatus.unsupportedPlatform;
  if (r.contains('NO_DATA')) return HealthStatus.noData;
  if (r.contains('SOURCE')) return HealthStatus.sourceUnavailable;
  return HealthStatus.noData;
}

/// Generic health metric wrapper
class HealthMetric<T> {
  final String metric;
  final T? value;
  final String unit;
  final bool available;
  final HealthStatus status;
  final MeasurementType measurementType;
  final String reason;
  final String? message;
  final DateTime? timestamp;
  final String source;
  final String? date;

  const HealthMetric({
    required this.metric,
    this.value,
    required this.unit,
    required this.available,
    required this.status,
    this.measurementType = MeasurementType.measured,
    this.reason = '',
    this.message,
    this.timestamp,
    this.source = 'Health Connect',
    this.date,
  });

  bool get hasValue => available && value != null;
}

/// Configurable user wellness goals
class HealthGoal {
  final int stepsGoal;
  final int activeCaloriesGoal;
  final int sleepGoalMinutes;
  final double distanceGoalKm;

  const HealthGoal({
    this.stepsGoal = 8000,
    this.activeCaloriesGoal = 400,
    this.sleepGoalMinutes = 480, // 8 hours
    this.distanceGoalKm = 5.0,
  });

  HealthGoal copyWith({
    int? stepsGoal,
    int? activeCaloriesGoal,
    int? sleepGoalMinutes,
    double? distanceGoalKm,
  }) {
    return HealthGoal(
      stepsGoal: stepsGoal ?? this.stepsGoal,
      activeCaloriesGoal: activeCaloriesGoal ?? this.activeCaloriesGoal,
      sleepGoalMinutes: sleepGoalMinutes ?? this.sleepGoalMinutes,
      distanceGoalKm: distanceGoalKm ?? this.distanceGoalKm,
    );
  }

  Map<String, dynamic> toJson() => {
    'stepsGoal': stepsGoal,
    'activeCaloriesGoal': activeCaloriesGoal,
    'sleepGoalMinutes': sleepGoalMinutes,
    'distanceGoalKm': distanceGoalKm,
  };

  factory HealthGoal.fromJson(Map<String, dynamic> json) {
    return HealthGoal(
      stepsGoal: json['stepsGoal'] as int? ?? 8000,
      activeCaloriesGoal: json['activeCaloriesGoal'] as int? ?? 400,
      sleepGoalMinutes: json['sleepGoalMinutes'] as int? ?? 480,
      distanceGoalKm: (json['distanceGoalKm'] as num?)?.toDouble() ?? 5.0,
    );
  }
}

/// Steps model with cumulative aggregation and goal progress
class HealthSteps {
  final int? count;
  final int goal;
  final String unit;
  final bool available;
  final HealthStatus status;
  final MeasurementType measurementType;
  final String reason;
  final String source;
  final String? date;
  final DateTime? lastUpdated;

  const HealthSteps({
    this.count,
    this.goal = 8000,
    this.unit = 'steps',
    required this.available,
    required this.status,
    this.measurementType = MeasurementType.measured,
    this.reason = '',
    this.source = 'Health Connect',
    this.date,
    this.lastUpdated,
  });

  double get progressRatio => (count != null && goal > 0) ? (count! / goal).clamp(0.0, 1.0) : 0.0;
  int get progressPercent => (progressRatio * 100).round();
  int get remainingSteps => (count != null && count! < goal) ? (goal - count!) : 0;
  bool get hasReachedGoal => count != null && count! >= goal;

  factory HealthSteps.fromMap(Map<String, dynamic> map, {int goal = 8000}) {
    final avail = map['available'] == true;
    final rawCount = map['value'];
    final count = rawCount is num ? rawCount.toInt() : null;
    return HealthSteps(
      count: count,
      goal: goal,
      unit: map['unit']?.toString() ?? 'steps',
      available: avail && count != null,
      status: parseHealthStatus(avail && count != null, map['reason']?.toString()),
      measurementType: parseMeasurementType(map['measurementType']?.toString()),
      reason: map['reason']?.toString() ?? '',
      source: map['source']?.toString() ?? 'Health Connect',
      date: map['date']?.toString(),
      lastUpdated: map['timestamp'] != null ? DateTime.tryParse(map['timestamp'].toString()) : null,
    );
  }

  factory HealthSteps.unavailable({String reason = 'NO_DATA', int goal = 8000}) => HealthSteps(
    goal: goal,
    available: false,
    status: parseHealthStatus(false, reason),
    reason: reason,
  );
}

/// Calories model cleanly distinguishing Active from Total
class HealthCalories {
  final int? activeCalories;
  final int? totalCalories;
  final int goal;
  final String unit;
  final bool available;
  final HealthStatus status;
  final MeasurementType measurementType;
  final String reason;
  final String source;
  final String? date;
  final DateTime? lastUpdated;

  const HealthCalories({
    this.activeCalories,
    this.totalCalories,
    this.goal = 400,
    this.unit = 'kcal',
    required this.available,
    required this.status,
    this.measurementType = MeasurementType.measured,
    this.reason = '',
    this.source = 'Health Connect',
    this.date,
    this.lastUpdated,
  });

  double get progressRatio => (activeCalories != null && goal > 0) ? (activeCalories! / goal).clamp(0.0, 1.0) : 0.0;
  int get progressPercent => (progressRatio * 100).round();

  factory HealthCalories.fromMap(Map<String, dynamic> map, {int goal = 400}) {
    final avail = map['available'] == true;
    final active = (map['activeCalories'] ?? map['value']) as num?;
    final total = map['totalCalories'] as num?;

    return HealthCalories(
      activeCalories: active?.toInt(),
      totalCalories: total?.toInt(),
      goal: goal,
      unit: map['unit']?.toString() ?? 'kcal',
      available: avail && (active != null || total != null),
      status: parseHealthStatus(avail && (active != null || total != null), map['reason']?.toString()),
      measurementType: parseMeasurementType(map['measurementType']?.toString()),
      reason: map['reason']?.toString() ?? '',
      source: map['source']?.toString() ?? 'Health Connect',
      date: map['date']?.toString(),
      lastUpdated: map['timestamp'] != null ? DateTime.tryParse(map['timestamp'].toString()) : null,
    );
  }

  factory HealthCalories.unavailable({String reason = 'NO_DATA', int goal = 400}) => HealthCalories(
    goal: goal,
    available: false,
    status: parseHealthStatus(false, reason),
    reason: reason,
  );
}

/// Heart Rate model (never invented without wearable/sensor)
class HealthHeartRate {
  final int? latestBpm;
  final int? restingBpm;
  final int? averageBpm;
  final DateTime? timestamp;
  final String unit;
  final bool available;
  final HealthStatus status;
  final MeasurementType measurementType;
  final String reason;
  final String source;

  const HealthHeartRate({
    this.latestBpm,
    this.restingBpm,
    this.averageBpm,
    this.timestamp,
    this.unit = 'BPM',
    required this.available,
    required this.status,
    this.measurementType = MeasurementType.synced,
    this.reason = '',
    this.source = 'Health Connect',
  });

  factory HealthHeartRate.fromMap(Map<String, dynamic> map, {Map<String, dynamic>? restingMap}) {
    final avail = map['available'] == true;
    final bpm = (map['value'] as num?)?.toInt();
    final restingBpm = (restingMap?['value'] as num?)?.toInt();

    return HealthHeartRate(
      latestBpm: bpm,
      restingBpm: restingBpm,
      timestamp: map['timestamp'] != null ? DateTime.tryParse(map['timestamp'].toString()) : null,
      unit: map['unit']?.toString() ?? 'BPM',
      available: avail && bpm != null,
      status: parseHealthStatus(avail && bpm != null, map['reason']?.toString()),
      measurementType: parseMeasurementType(map['measurementType']?.toString() ?? 'SYNCED'),
      reason: map['reason']?.toString() ?? '',
      source: map['source']?.toString() ?? 'Health Connect',
    );
  }

  factory HealthHeartRate.unavailable({String reason = 'NO_DATA'}) => HealthHeartRate(
    available: false,
    status: parseHealthStatus(false, reason),
    reason: reason,
  );
}

/// Blood pressure model (Systolic/Diastolic — NEVER ESTIMATED)
class HealthBloodPressure {
  final int? systolic;
  final int? diastolic;
  final String formatted;
  final DateTime? timestamp;
  final String unit;
  final bool available;
  final HealthStatus status;
  final MeasurementType measurementType;
  final String reason;
  final String source;

  const HealthBloodPressure({
    this.systolic,
    this.diastolic,
    this.formatted = '',
    this.timestamp,
    this.unit = 'mmHg',
    required this.available,
    required this.status,
    this.measurementType = MeasurementType.synced,
    this.reason = '',
    this.source = 'Health Connect',
  });

  factory HealthBloodPressure.fromMap(Map<String, dynamic> map) {
    final avail = map['available'] == true;
    final sys = (map['systolic'] as num?)?.toInt();
    final dia = (map['diastolic'] as num?)?.toInt();
    final formatted = (sys != null && dia != null) ? '$sys/$dia mmHg' : '';

    return HealthBloodPressure(
      systolic: sys,
      diastolic: dia,
      formatted: formatted,
      timestamp: map['timestamp'] != null ? DateTime.tryParse(map['timestamp'].toString()) : null,
      unit: 'mmHg',
      available: avail && sys != null && dia != null,
      status: parseHealthStatus(avail && sys != null, map['reason']?.toString()),
      measurementType: parseMeasurementType(map['measurementType']?.toString() ?? 'SYNCED'),
      reason: map['reason']?.toString() ?? '',
      source: map['source']?.toString() ?? 'Health Connect',
    );
  }

  factory HealthBloodPressure.unavailable({String reason = 'NO_DATA'}) => HealthBloodPressure(
    available: false,
    status: parseHealthStatus(false, reason),
    reason: reason,
  );
}

/// Sleep model
class HealthSleep {
  final int? totalMinutes;
  final double? hours;
  final String formattedDuration;
  final DateTime? startTime;
  final DateTime? endTime;
  final int targetMinutes;
  final bool available;
  final HealthStatus status;
  final String reason;
  final String source;

  const HealthSleep({
    this.totalMinutes,
    this.hours,
    this.formattedDuration = '',
    this.startTime,
    this.endTime,
    this.targetMinutes = 480,
    required this.available,
    required this.status,
    this.reason = '',
    this.source = 'Health Connect',
  });

  double get progressRatio => (totalMinutes != null && targetMinutes > 0) ? (totalMinutes! / targetMinutes).clamp(0.0, 1.0) : 0.0;
  int get progressPercent => (progressRatio * 100).round();

  factory HealthSleep.fromMap(Map<String, dynamic> map, {int targetMinutes = 480}) {
    final avail = map['available'] == true;
    final totalMins = (map['totalSleepMinutes'] as num?)?.toInt();
    final durHours = (map['durationHours'] as num?)?.toDouble();
    final formatted = map['formattedDuration']?.toString() ?? (totalMins != null ? '${totalMins ~/ 60}h ${totalMins % 60}m' : '');

    return HealthSleep(
      totalMinutes: totalMins,
      hours: durHours,
      formattedDuration: formatted,
      startTime: map['startTime'] != null ? DateTime.tryParse(map['startTime'].toString()) : null,
      endTime: map['endTime'] != null ? DateTime.tryParse(map['endTime'].toString()) : null,
      targetMinutes: targetMinutes,
      available: avail && totalMins != null,
      status: parseHealthStatus(avail && totalMins != null, map['reason']?.toString()),
      reason: map['reason']?.toString() ?? '',
      source: map['source']?.toString() ?? 'Health Connect',
    );
  }

  factory HealthSleep.unavailable({String reason = 'NO_DATA', int targetMinutes = 480}) => HealthSleep(
    targetMinutes: targetMinutes,
    available: false,
    status: parseHealthStatus(false, reason),
    reason: reason,
  );
}

/// Distance model
class HealthDistance {
  final double? kilometers;
  final int? meters;
  final String formatted;
  final String unit;
  final bool available;
  final HealthStatus status;
  final String reason;
  final String source;

  const HealthDistance({
    this.kilometers,
    this.meters,
    this.formatted = '',
    this.unit = 'km',
    required this.available,
    required this.status,
    this.reason = '',
    this.source = 'Health Connect',
  });

  factory HealthDistance.fromMap(Map<String, dynamic> map) {
    final avail = map['available'] == true;
    final km = (map['kilometers'] as num?)?.toDouble();
    final meters = (map['meters'] as num?)?.toInt();
    final formatted = map['formatted']?.toString() ?? (km != null ? '${km.toStringAsFixed(2)} km' : '');

    return HealthDistance(
      kilometers: km,
      meters: meters,
      formatted: formatted,
      unit: 'km',
      available: avail && km != null,
      status: parseHealthStatus(avail && km != null, map['reason']?.toString()),
      reason: map['reason']?.toString() ?? '',
      source: map['source']?.toString() ?? 'Health Connect',
    );
  }

  factory HealthDistance.unavailable({String reason = 'NO_DATA'}) => HealthDistance(
    available: false,
    status: parseHealthStatus(false, reason),
    reason: reason,
  );
}

/// Workout / Exercise session model
class HealthWorkout {
  final String title;
  final int exerciseType;
  final int durationMinutes;
  final DateTime? startTime;
  final DateTime? endTime;
  final String source;

  const HealthWorkout({
    required this.title,
    this.exerciseType = 0,
    required this.durationMinutes,
    this.startTime,
    this.endTime,
    this.source = 'Health Connect',
  });

  factory HealthWorkout.fromMap(Map<String, dynamic> map) {
    return HealthWorkout(
      title: map['title']?.toString() ?? 'Workout',
      exerciseType: (map['exerciseType'] as num?)?.toInt() ?? 0,
      durationMinutes: (map['durationMinutes'] as num?)?.toInt() ?? 0,
      startTime: map['startTime'] != null ? DateTime.tryParse(map['startTime'].toString()) : null,
      endTime: map['endTime'] != null ? DateTime.tryParse(map['endTime'].toString()) : null,
      source: map['source']?.toString() ?? 'Health Connect',
    );
  }
}

/// Weight model
class HealthWeight {
  final double? weightKg;
  final String formatted;
  final DateTime? timestamp;
  final List<double> history;
  final bool available;
  final HealthStatus status;
  final String reason;
  final String source;

  const HealthWeight({
    this.weightKg,
    this.formatted = '',
    this.timestamp,
    this.history = const [],
    required this.available,
    required this.status,
    this.reason = '',
    this.source = 'Health Connect',
  });

  factory HealthWeight.fromMap(Map<String, dynamic> map, {List<double> history = const []}) {
    final avail = map['available'] == true;
    final kg = (map['value'] as num?)?.toDouble();
    final formatted = map['formatted']?.toString() ?? (kg != null ? '${kg.toStringAsFixed(1)} kg' : '');

    return HealthWeight(
      weightKg: kg,
      formatted: formatted,
      timestamp: map['timestamp'] != null ? DateTime.tryParse(map['timestamp'].toString()) : null,
      history: history,
      available: avail && kg != null,
      status: parseHealthStatus(avail && kg != null, map['reason']?.toString()),
      reason: map['reason']?.toString() ?? '',
      source: map['source']?.toString() ?? 'Health Connect',
    );
  }

  factory HealthWeight.unavailable({String reason = 'NO_DATA'}) => HealthWeight(
    available: false,
    status: parseHealthStatus(false, reason),
    reason: reason,
  );
}

/// Comprehensive daily health summary
class HealthDailySummary {
  final String date;
  final HealthSteps steps;
  final HealthCalories calories;
  final HealthHeartRate heartRate;
  final HealthBloodPressure bloodPressure;
  final HealthSleep sleep;
  final HealthDistance distance;
  final List<HealthWorkout> workouts;
  final HealthWeight weight;
  final HealthGoal goals;
  final bool isHealthConnectAvailable;
  final Map<String, bool> permissions;
  final bool backgroundSupported;
  final DateTime lastRefreshed;

  const HealthDailySummary({
    required this.date,
    required this.steps,
    required this.calories,
    required this.heartRate,
    required this.bloodPressure,
    required this.sleep,
    required this.distance,
    this.workouts = const [],
    required this.weight,
    required this.goals,
    this.isHealthConnectAvailable = true,
    this.permissions = const {},
    this.backgroundSupported = false,
    required this.lastRefreshed,
  });

  Map<String, dynamic> toMap() => {
    'date': date,
    'source': 'Health Connect',
    'dataType': 'LIVE_HEALTH_CONNECT_DATA',
    'steps': {
      'available': steps.available,
      'value': steps.count,
      'reason': steps.reason,
      'goal': steps.goal,
      'remaining': steps.remainingSteps,
    },
    'calories': {
      'available': calories.available,
      'activeCalories': calories.activeCalories,
      'totalCalories': calories.totalCalories,
      'reason': calories.reason,
      'goal': calories.goal,
    },
    'heartRate': {
      'available': heartRate.available,
      'latest': heartRate.latestBpm,
      'resting': heartRate.restingBpm,
      'reason': heartRate.reason,
    },
    'bloodPressure': {
      'available': bloodPressure.available,
      'systolic': bloodPressure.systolic,
      'diastolic': bloodPressure.diastolic,
      'reason': bloodPressure.reason,
    },
    'sleep': {
      'available': sleep.available,
      'minutes': sleep.totalMinutes,
      'formatted': sleep.formattedDuration,
      'reason': sleep.reason,
    },
    'distance': {
      'available': distance.available,
      'meters': distance.meters,
      'km': distance.kilometers,
      'reason': distance.reason,
    },
    'workouts': {
      'available': workouts.isNotEmpty,
      'count': workouts.length,
    },
    'weight': {
      'available': weight.available,
      'value': weight.weightKg,
      'reason': weight.reason,
    },
    'permissions': permissions,
    'isHealthConnectAvailable': isHealthConnectAvailable,
    'backgroundSupported': backgroundSupported,
  };

  /// Non-medical overall goal progress indicator
  int get wellnessProgressPercent {
    int activeMetrics = 0;
    double totalProgress = 0.0;

    if (steps.available) {
      activeMetrics++;
      totalProgress += steps.progressRatio;
    }
    if (calories.available && calories.activeCalories != null) {
      activeMetrics++;
      totalProgress += calories.progressRatio;
    }
    if (sleep.available && sleep.totalMinutes != null) {
      activeMetrics++;
      totalProgress += sleep.progressRatio;
    }

    if (activeMetrics == 0) return 0;
    return ((totalProgress / activeMetrics) * 100).round();
  }

  /// Factual, non-diagnostic insight built purely on real data
  String get dynamicInsight {
    final parts = <String>[];

    if (steps.available && steps.count != null) {
      final p = steps.progressPercent;
      if (p >= 100) {
        parts.add('Goal achieved! You have logged ${steps.count!.toLocaleString()} steps today.');
      } else if (p >= 50) {
        parts.add('You have reached $p% of your daily step goal (${steps.count!.toLocaleString()} steps).');
      } else {
        parts.add('You have recorded ${steps.count!.toLocaleString()} steps today, ${steps.remainingSteps} away from your goal.');
      }
    }

    if (sleep.available && sleep.formattedDuration.isNotEmpty) {
      parts.add('Last night you logged ${sleep.formattedDuration} of sleep.');
    }

    if (heartRate.available && heartRate.latestBpm != null) {
      parts.add('Latest heart rate: ${heartRate.latestBpm} BPM.');
    }

    if (bloodPressure.available && bloodPressure.formatted.isNotEmpty) {
      parts.add('Latest blood pressure: ${bloodPressure.formatted}.');
    }

    if (parts.isEmpty) {
      return 'Connect your wearable or health apps to Health Connect to view live wellness insights.';
    }

    return parts.join(' ');
  }

  factory HealthDailySummary.initial(String dateStr, {HealthGoal? goals}) {
    final g = goals ?? const HealthGoal();
    return HealthDailySummary(
      date: dateStr,
      steps: HealthSteps.unavailable(goal: g.stepsGoal),
      calories: HealthCalories.unavailable(goal: g.activeCaloriesGoal),
      heartRate: HealthHeartRate.unavailable(),
      bloodPressure: HealthBloodPressure.unavailable(),
      sleep: HealthSleep.unavailable(targetMinutes: g.sleepGoalMinutes),
      distance: HealthDistance.unavailable(),
      weight: HealthWeight.unavailable(),
      goals: g,
      lastRefreshed: DateTime.now(),
    );
  }
}

extension IntFormatting on int {
  String toLocaleString() {
    return toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]},',
    );
  }
}
