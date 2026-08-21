import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

enum ActivityCategory {
  wakeUp,
  breakfast,
  waterReminder,
  eyeCare,
  stretchBreak,
  office,
  meal,
  exercise,
  sleep,
  family,
  medicine,
  custom
}

extension ActivityCategoryExtension on ActivityCategory {
  String get displayName {
    switch (this) {
      case ActivityCategory.wakeUp: return 'Wake Up';
      case ActivityCategory.breakfast: return 'Breakfast';
      case ActivityCategory.waterReminder: return 'Water Reminder';
      case ActivityCategory.eyeCare: return 'Eye Care';
      case ActivityCategory.stretchBreak: return 'Stretch Break';
      case ActivityCategory.office: return 'Office';
      case ActivityCategory.meal: return 'Meal';
      case ActivityCategory.exercise: return 'Exercise';
      case ActivityCategory.sleep: return 'Sleep';
      case ActivityCategory.family: return 'Family';
      case ActivityCategory.medicine: return 'Medicine';
      case ActivityCategory.custom: return 'Custom';
    }
  }

  Color get color {
    switch (this) {
      case ActivityCategory.wakeUp: return AppColors.categoryRoutine;
      case ActivityCategory.breakfast: return AppColors.categoryMeals;
      case ActivityCategory.waterReminder: return AppColors.categoryRoutine;
      case ActivityCategory.eyeCare: return AppColors.categoryHealth;
      case ActivityCategory.stretchBreak: return AppColors.categoryExercise;
      case ActivityCategory.office: return AppColors.categoryWork;
      case ActivityCategory.meal: return AppColors.categoryMeals;
      case ActivityCategory.exercise: return AppColors.categoryExercise;
      case ActivityCategory.sleep: return AppColors.categorySleep;
      case ActivityCategory.family: return AppColors.categoryCustom;
      case ActivityCategory.medicine: return AppColors.categoryHealth;
      case ActivityCategory.custom: return AppColors.categoryCustom;
    }
  }

  IconData get icon {
    switch (this) {
      case ActivityCategory.wakeUp: return Icons.wb_sunny_rounded;
      case ActivityCategory.breakfast: return Icons.restaurant_rounded;
      case ActivityCategory.waterReminder: return Icons.water_drop_rounded;
      case ActivityCategory.eyeCare: return Icons.remove_red_eye_rounded;
      case ActivityCategory.stretchBreak: return Icons.directions_walk_rounded;
      case ActivityCategory.office: return Icons.laptop_mac_rounded;
      case ActivityCategory.meal: return Icons.lunch_dining_rounded;
      case ActivityCategory.exercise: return Icons.fitness_center_rounded;
      case ActivityCategory.sleep: return Icons.bedtime_rounded;
      case ActivityCategory.family: return Icons.people_rounded;
      case ActivityCategory.medicine: return Icons.medication_rounded;
      case ActivityCategory.custom: return Icons.notification_important_rounded;
    }
  }
}

enum ActivityStatus {
  pending,
  completed,
  upcoming,
  skipped,
  missed,
  disabled
}

extension ActivityStatusExtension on ActivityStatus {
  String get displayName {
    switch (this) {
      case ActivityStatus.pending: return 'Pending';
      case ActivityStatus.completed: return 'Completed';
      case ActivityStatus.upcoming: return 'Upcoming';
      case ActivityStatus.skipped: return 'Skipped';
      case ActivityStatus.missed: return 'Missed';
      case ActivityStatus.disabled: return 'Disabled';
    }
  }

  Color get color {
    switch (this) {
      case ActivityStatus.pending: return AppColors.statusPending;
      case ActivityStatus.completed: return AppColors.statusCompleted;
      case ActivityStatus.upcoming: return AppColors.statusUpcoming;
      case ActivityStatus.skipped: return AppColors.statusSkipped;
      case ActivityStatus.missed: return AppColors.statusMissed;
      case ActivityStatus.disabled: return AppColors.statusDisabled;
    }
  }
}

class ScheduleItem {
  final String id;
  final String title;
  final String description;
  final String time;
  final ActivityCategory category;
  final ActivityStatus status;
  final DateTime date;
  final bool reminderEnabled;
  final bool isSynced;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;

  ScheduleItem({
    required this.id,
    required this.title,
    required this.description,
    required this.time,
    required this.category,
    required this.status,
    required this.date,
    this.reminderEnabled = true,
    this.isSynced = false,
    required this.createdAt,
    required this.updatedAt,
    this.deletedAt,
  });

  /// The 3 core schedules requiring completion status: Morning Breakfast, Afternoon Lunch, Night Dinner.
  bool get isMainMealRoutine {
    final t = title.toLowerCase();
    final d = description.toLowerCase();
    return category == ActivityCategory.breakfast ||
        category == ActivityCategory.meal ||
        t.contains('breakfast') ||
        t.contains('lunch') ||
        t.contains('dinner') ||
        t.contains('காலை உணவு') ||
        t.contains('மதிய உணவு') ||
        t.contains('இரவு உணவு') ||
        t.contains('नाश्ता') ||
        t.contains('दोपहर का भोजन') ||
        t.contains('रात का खाना') ||
        d.contains('breakfast') ||
        d.contains('lunch') ||
        d.contains('dinner');
  }

  /// Whether this routine strictly requires completion status confirmation vs standard informational notification
  /// Now enabled for all tasks so user can mark any routine complete directly from status bar notifications.
  bool get requiresCompletionStatus => true;

  ScheduleItem copyWith({
    String? id,
    String? title,
    String? description,
    String? time,
    ActivityCategory? category,
    ActivityStatus? status,
    DateTime? date,
    bool? reminderEnabled,
    bool? isSynced,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? deletedAt,
  }) {
    return ScheduleItem(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      time: time ?? this.time,
      category: category ?? this.category,
      status: status ?? this.status,
      date: date ?? this.date,
      reminderEnabled: reminderEnabled ?? this.reminderEnabled,
      isSynced: isSynced ?? this.isSynced,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      deletedAt: deletedAt ?? this.deletedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'time': time,
      'category': category.name,
      'status': status.name,
      'date': date.toIso8601String(),
      'reminderEnabled': reminderEnabled,
      'isSynced': isSynced,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'deletedAt': deletedAt?.toIso8601String(),
    };
  }

  factory ScheduleItem.fromJson(Map<String, dynamic> json) {
    return ScheduleItem(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      time: json['time'] as String,
      category: ActivityCategory.values.firstWhere(
        (e) => e.name == json['category'],
        orElse: () => ActivityCategory.custom,
      ),
      status: ActivityStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => ActivityStatus.pending,
      ),
      date: DateTime.parse(json['date'] as String),
      reminderEnabled: json['reminderEnabled'] as bool? ?? true,
      isSynced: json['isSynced'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      deletedAt: json['deletedAt'] != null
          ? DateTime.parse(json['deletedAt'] as String)
          : null,
    );
  }
}
