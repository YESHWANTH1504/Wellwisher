import 'package:flutter/material.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/notification_service.dart';
import '../../../services/senior_caregiver_sync_service.dart';
import '../../screen_care/controller/screen_care_controller.dart';
import '../models/schedule_model.dart';
import '../repositories/schedule_repository.dart';

class ScheduleController extends ChangeNotifier {
  final ScheduleRepository repository;
  final ScreenCareController screenCareController;

  DateTime _selectedDate = DateTime.now();
  List<ScheduleItem> _currentRoutines = [];
  bool _isLoading = false;

  ScheduleController({
    required this.repository,
    required this.screenCareController,
  }) {
    // Listen to screen care mode changes to dynamically update timelines
    screenCareController.addListener(_onScreenCareChanged);
    loadRoutines();
  }

  DateTime get selectedDate => _selectedDate;
  List<ScheduleItem> get currentRoutines => _currentRoutines;
  bool get isLoading => _isLoading;

  void _onScreenCareChanged() {
    loadRoutines();
  }

  // Set active date
  void setSelectedDate(DateTime date) {
    _selectedDate = date;
    loadRoutines();
  }

  // Load routines from Repository & inject Screen Care reminders if enabled
  Future<void> loadRoutines() async {
    _isLoading = true;
    notifyListeners();

    try {
      final repoItems = await repository.getScheduleForDate(
        _selectedDate,
        isSeniorMode: LocalStorageService().isSeniorMode,
      );

      // Inject Screen Care reminders dynamically if enabled and it's a weekday
      final list = List<ScheduleItem>.from(repoItems);

      if (screenCareController.isEnabled &&
          _selectedDate.weekday >= 1 &&
          _selectedDate.weekday <= 5) {
        // Only inject if not already present
        final hasScreenCare10 = list.any(
          (x) => x.time == '10:00 AM' && x.category == ActivityCategory.eyeCare,
        );
        if (!hasScreenCare10) {
          list.add(
            ScheduleItem(
              id: 'screencare_10am_${_selectedDate.millisecondsSinceEpoch}',
              title: '👀 Screen Care Reminder',
              description: 'Take a 20-second break using the 20-20-20 rule.',
              time: '10:00 AM',
              category: ActivityCategory.eyeCare,
              status: ActivityStatus.upcoming,
              date: _selectedDate,
              reminderEnabled: true,
              createdAt: DateTime.now(),
              updatedAt: DateTime.now(),
            ),
          );
        }

        final hasScreenCare3 = list.any(
          (x) => x.time == '03:00 PM' && x.category == ActivityCategory.eyeCare,
        );
        if (!hasScreenCare3) {
          list.add(
            ScheduleItem(
              id: 'screencare_3pm_${_selectedDate.millisecondsSinceEpoch}',
              title: '👀 Screen Care Reminder',
              description:
                  'Rest your eyes for 20 seconds. Focus on an object 20 feet away.',
              time: '03:00 PM',
              category: ActivityCategory.eyeCare,
              status: ActivityStatus.upcoming,
              date: _selectedDate,
              reminderEnabled: true,
              createdAt: DateTime.now(),
              updatedAt: DateTime.now(),
            ),
          );
        }
      }

      // Sort routines by time
      list.sort((a, b) => _compareTimeStrings(a.time, b.time));
      _currentRoutines = list;

      // Auto-schedule exact background alarms so notifications pop up even when app is closed / phone idle
      NotificationService().scheduleAllUpcomingRoutines(list);
    } catch (_) {
      _currentRoutines = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Reload schedule routines when persona mode changes (Working vs Senior)
  Future<void> reloadRoutinesForMode(bool isSeniorMode) async {
    _isLoading = true;
    notifyListeners();
    try {
      final repoItems = await repository.resetRoutinesForMode(
        _selectedDate,
        isSeniorMode,
      );
      final list = List<ScheduleItem>.from(repoItems);
      list.sort((a, b) => _compareTimeStrings(a.time, b.time));
      _currentRoutines = list;
      NotificationService().scheduleAllUpcomingRoutines(list);
    } catch (_) {
      _currentRoutines = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Helper to compare "HH:MM AM/PM" time strings
  int _compareTimeStrings(String t1, String t2) {
    try {
      final p1 = _parseTimeOfDay(t1);
      final p2 = _parseTimeOfDay(t2);
      if (p1.hour != p2.hour) return p1.hour.compareTo(p2.hour);
      return p1.minute.compareTo(p2.minute);
    } catch (_) {
      return t1.compareTo(t2);
    }
  }

  TimeOfDay _parseTimeOfDay(String timeStr) {
    final clean = timeStr.trim();
    final parts = clean.split(' ');
    final hm = parts[0].split(':');
    int hour = int.parse(hm[0]);
    final int minute = int.parse(hm[1]);
    final isPm = parts[1].toUpperCase() == 'PM';

    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour == 12) hour = 0;

    return TimeOfDay(hour: hour, minute: minute);
  }

  // Add a new routine
  Future<void> addNewRoutine(ScheduleItem item) async {
    await repository.addRoutine(item);
    await NotificationService().scheduleRoutineAlarm(item);
    await loadRoutines();
  }

  // Add multiple routines (e.g. for whole week or selective days)
  Future<void> addMultipleRoutines(List<ScheduleItem> items) async {
    await repository.addRoutines(items);
    await NotificationService().scheduleAllUpcomingRoutines(items);
    await loadRoutines();
  }

  // Update routine status
  Future<void> updateRoutine(ScheduleItem item) async {
    await repository.updateRoutine(item);

    // Update in-memory _currentRoutines immediately so UI updates with 0ms lag
    final currIndex = _currentRoutines.indexWhere((x) => x.id == item.id);
    if (currIndex != -1) {
      _currentRoutines[currIndex] = item;
    } else {
      final titleIndex = _currentRoutines.indexWhere(
        (x) => x.title == item.title,
      );
      if (titleIndex != -1) {
        _currentRoutines[titleIndex] = item;
      } else {
        _currentRoutines.add(item);
      }
    }
    _currentRoutines.sort((a, b) => _compareTimeStrings(a.time, b.time));
    notifyListeners();

    if (LocalStorageService().isSeniorCitizen) {
      if (item.status == ActivityStatus.completed) {
        SeniorCaregiverSyncService().logSeniorActivity(
          title: 'Mom completed "${item.title}" (${item.time}) ✅',
          category: item.category.name,
        );
      }
    }
    await loadRoutines();
  }

  // 1-Tap Notification Bar Direct Actions (Mark Complete / Snooze)
  Future<bool> markRoutineCompletedById(String id) async {
    ScheduleItem? item = repository.getItemById(id);
    if (item == null) {
      try {
        item = _currentRoutines.firstWhere((x) => x.id == id);
      } catch (_) {}
    }
    if (item == null) {
      try {
        item = repository.allLocalItems.firstWhere((x) => x.id == id);
      } catch (_) {}
    }
    if (item == null) {
      final todayItems = await repository.getScheduleForDate(DateTime.now());
      try {
        item = todayItems.firstWhere((x) => x.id == id);
      } catch (_) {}
    }

    // Special match for hydration alert or generic keywords if specific ID was dynamic
    if (item == null && id.contains('hydration')) {
      try {
        item = _currentRoutines.firstWhere(
          (x) =>
              (x.category == ActivityCategory.waterReminder ||
                  x.title.toLowerCase().contains('hydration')) &&
              x.status != ActivityStatus.completed,
        );
      } catch (_) {}
    }

    // Test item match
    if (item == null &&
        (id == 'test_breakfast_item' ||
            id.contains('test_') ||
            id.contains('lock_screen_test'))) {
      try {
        item = _currentRoutines.firstWhere(
          (x) => x.status != ActivityStatus.completed,
        );
      } catch (_) {
        if (_currentRoutines.isNotEmpty) item = _currentRoutines.first;
      }
    }

    // Fallback: match by partial ID
    if (item == null) {
      try {
        item = _currentRoutines.firstWhere(
          (x) => x.id.contains(id) || id.contains(x.id),
        );
      } catch (_) {}
    }

    if (item != null) {
      final updated = item.copyWith(status: ActivityStatus.completed);
      await updateRoutine(updated);
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<bool> snoozeRoutineById(String id, int minutes) async {
    ScheduleItem? item = repository.getItemById(id);
    if (item == null) {
      try {
        item = _currentRoutines.firstWhere((x) => x.id == id);
      } catch (_) {}
    }
    if (item == null) {
      try {
        item = repository.allLocalItems.firstWhere((x) => x.id == id);
      } catch (_) {}
    }
    if (item == null) {
      final todayItems = await repository.getScheduleForDate(DateTime.now());
      try {
        item = todayItems.firstWhere((x) => x.id == id);
      } catch (_) {}
    }

    // Special match for hydration alert or generic keywords if specific ID was dynamic
    if (item == null && id.contains('hydration')) {
      try {
        item = _currentRoutines.firstWhere(
          (x) =>
              (x.category == ActivityCategory.waterReminder ||
                  x.title.toLowerCase().contains('hydration')) &&
              x.status != ActivityStatus.completed,
        );
      } catch (_) {}
    }

    // Test item match
    if (item == null &&
        (id == 'test_breakfast_item' ||
            id.contains('test_') ||
            id.contains('lock_screen_test'))) {
      try {
        item = _currentRoutines.firstWhere(
          (x) => x.status != ActivityStatus.completed,
        );
      } catch (_) {
        if (_currentRoutines.isNotEmpty) item = _currentRoutines.first;
      }
    }

    // Fallback: match by partial ID
    if (item == null) {
      try {
        item = _currentRoutines.firstWhere(
          (x) => x.id.contains(id) || id.contains(x.id),
        );
      } catch (_) {}
    }

    if (item != null) {
      final newTime = _addMinutesToTimeString(item.time, minutes);
      final updated = item.copyWith(
        time: newTime,
        status: ActivityStatus.upcoming,
      );
      await updateRoutine(updated);
      // Automatically reschedule exact alarm with actions for the snoozed time
      await NotificationService().scheduleRoutineAlarm(updated);
      notifyListeners();
      return true;
    }
    return false;
  }

  String _addMinutesToTimeString(String timeStr, int minutes) {
    try {
      final tod = _parseTimeOfDay(timeStr);
      int totalMinutes = tod.hour * 60 + tod.minute + minutes;
      if (totalMinutes >= 24 * 60) totalMinutes %= (24 * 60);
      int newHour = totalMinutes ~/ 60;
      int newMinute = totalMinutes % 60;

      final isPm = newHour >= 12;
      int displayHour = newHour > 12
          ? newHour - 12
          : (newHour == 0 ? 12 : newHour);
      final padMin = newMinute.toString().padLeft(2, '0');
      final period = isPm ? 'PM' : 'AM';

      return '$displayHour:$padMin $period';
    } catch (_) {
      return timeStr;
    }
  }

  // Delete routine
  Future<void> deleteRoutine(String id) async {
    await repository.deleteRoutine(id);
    await loadRoutines();
  }

  // Copy yesterday's schedule
  Future<void> copyYesterdaySchedule() async {
    final yesterday = _selectedDate.subtract(const Duration(days: 1));
    await repository.copySchedule(yesterday, _selectedDate);
    await loadRoutines();
  }

  @override
  void dispose() {
    screenCareController.removeListener(_onScreenCareChanged);
    super.dispose();
  }
}
