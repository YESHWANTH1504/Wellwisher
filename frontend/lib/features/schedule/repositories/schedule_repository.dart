import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/schedule_service.dart';
import '../models/schedule_model.dart';

class ScheduleRepository {
  final ScheduleService scheduleService;

  // Local caching and persistence layer
  final List<ScheduleItem> _localItems = [];
  bool _isLoadedFromStorage = false;

  ScheduleRepository({required this.scheduleService}) {
    _populateDefaultMockData();
    _initStorage();
  }

  Future<void> init() async {
    await _initStorage();
  }

  Future<void> _initStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString('wellwisher_persisted_routines');
      if (jsonStr != null && jsonStr.isNotEmpty) {
        final List<dynamic> decoded = jsonDecode(jsonStr);
        for (var item in decoded) {
          try {
            final parsed = ScheduleItem.fromJson(Map<String, dynamic>.from(item));
            final idx = _localItems.indexWhere((x) => x.id == parsed.id);
            if (idx != -1) {
              _localItems[idx] = parsed;
            } else {
              _localItems.add(parsed);
            }
          } catch (_) {}
        }
        _isLoadedFromStorage = true;
      }
    } catch (_) {}
  }

  Future<void> _loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString('wellwisher_persisted_routines');
      if (jsonStr != null && jsonStr.isNotEmpty) {
        final List<dynamic> decoded = jsonDecode(jsonStr);
        _localItems.clear();
        for (var item in decoded) {
          try {
            _localItems.add(ScheduleItem.fromJson(Map<String, dynamic>.from(item)));
          } catch (_) {}
        }
        _isLoadedFromStorage = true;
      }
    } catch (_) {}
  }

  Future<void> _saveToStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = _localItems.map((x) => x.toJson()).toList();
      await prefs.setString('wellwisher_persisted_routines', jsonEncode(jsonList));
    } catch (_) {}
  }

  // Fetch list of items for a specific date (Instant response from local cache + async sync)
  Future<List<ScheduleItem>> getScheduleForDate(DateTime date, {bool? isSeniorMode}) async {
    if (!_isLoadedFromStorage && _localItems.isEmpty) {
      await _loadFromStorage();
      if (_localItems.isEmpty) {
        _populateDefaultMockData();
        await _saveToStorage();
      }
    }

    final activeSeniorMode = isSeniorMode ?? LocalStorageService().isSeniorCitizen;
    final dateStr = "${date.year}-${date.month}-${date.day}";

    // Non-blocking background sync
    scheduleService.fetchSchedule(dateStr).then((remoteData) {
      if (remoteData.isNotEmpty) {
        for (var item in remoteData) {
          final scheduleItem = ScheduleItem.fromJson(item);
          final index = _localItems.indexWhere((x) => x.id == scheduleItem.id);
          if (index != -1) {
            _localItems[index] = scheduleItem;
          } else {
            _localItems.add(scheduleItem);
          }
        }
        _saveToStorage();
      }
    }).catchError((_) {});

    final dateMatches = _localItems.where((item) =>
      item.date.year == date.year &&
      item.date.month == date.month &&
      item.date.day == date.day &&
      item.deletedAt == null
    ).toList();

    // Ensure strict role isolation between Worker and Senior Citizen
    final roleFilteredMatches = dateMatches.where((item) {
      if (activeSeniorMode && item.id.contains('_w')) return false;
      if (!activeSeniorMode && item.id.contains('_s')) return false;
      return true;
    }).toList();

    // If selected date has no items for this role, dynamically generate default routine templates
    if (roleFilteredMatches.isEmpty) {
      final generated = _generateDefaultRoutinesForDate(date, isSeniorMode: activeSeniorMode);
      _localItems.addAll(generated);
      _saveToStorage();
      return generated..sort((a, b) => _compareTimeStrings(a.time, b.time));
    }

    return roleFilteredMatches..sort((a, b) => _compareTimeStrings(a.time, b.time));
  }

  List<ScheduleItem> get allLocalItems => List.unmodifiable(_localItems);

  ScheduleItem? getItemById(String id) {
    try {
      return _localItems.firstWhere((x) => x.id == id && x.deletedAt == null);
    } catch (_) {
      return null;
    }
  }

  // Regenerate schedule routines when user switches mode (Working vs Senior)
  Future<List<ScheduleItem>> resetRoutinesForMode(DateTime date, bool isSeniorMode) async {
    _localItems.removeWhere((item) =>
      item.date.year == date.year &&
      item.date.month == date.month &&
      item.date.day == date.day
    );
    final generated = _generateDefaultRoutinesForDate(date, isSeniorMode: isSeniorMode);
    _localItems.addAll(generated);
    await _saveToStorage();
    return generated..sort((a, b) => _compareTimeStrings(a.time, b.time));
  }

  int _compareTimeStrings(String a, String b) {
    int parseMinutes(String t) {
      try {
        final clean = t.replaceAll(RegExp(r'[^\d:APMapm\s]'), '').trim();
        final parts = clean.split(' ');
        final hm = parts[0].split(':');
        int h = int.parse(hm[0]);
        int m = int.parse(hm[1]);
        final isPm = parts.length > 1 && parts[1].toUpperCase() == 'PM';
        if (isPm && h < 12) h += 12;
        if (!isPm && h == 12) h = 0;
        return h * 60 + m;
      } catch (_) {
        return 0;
      }
    }
    return parseMinutes(a).compareTo(parseMinutes(b));
  }

  List<ScheduleItem> _generateDefaultRoutinesForDate(DateTime day, {bool isSeniorMode = false}) {
    if (isSeniorMode) {
      return [
        ScheduleItem(
          id: 'senior_wake_${day.year}_${day.month}_${day.day}_s',
          title: '🌅 Morning Wake Up & Warm Water',
          description: 'Drink 1 glass of warm water right after waking up.',
          time: '07:30 AM',
          category: ActivityCategory.wakeUp,
          status: ActivityStatus.upcoming,
          date: day,
          reminderEnabled: true,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ),
        ScheduleItem(
          id: 'senior_med_am_${day.year}_${day.month}_${day.day}_s',
          title: '💊 Morning Medication & Breakfast',
          description: 'Take blood pressure pills after healthy breakfast.',
          time: '08:30 AM',
          category: ActivityCategory.medicine,
          status: ActivityStatus.upcoming,
          date: day,
          reminderEnabled: true,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ),
        ScheduleItem(
          id: 'senior_walk_${day.year}_${day.month}_${day.day}_s',
          title: '🚶 Gentle Garden Walk',
          description: '15-minute relaxed morning walk for fresh air.',
          time: '10:30 AM',
          category: ActivityCategory.exercise,
          status: ActivityStatus.upcoming,
          date: day,
          reminderEnabled: true,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ),
        ScheduleItem(
          id: 'senior_lunch_${day.year}_${day.month}_${day.day}_s',
          title: '🍲 Nutritious Lunch & Water',
          description: 'Warm lunch followed by 1 glass of water.',
          time: '01:00 PM',
          category: ActivityCategory.meal,
          status: ActivityStatus.upcoming,
          date: day,
          reminderEnabled: true,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ),
        ScheduleItem(
          id: 'senior_nap_${day.year}_${day.month}_${day.day}_s',
          title: '😴 Afternoon Rest & Nap',
          description: '45-minute restorative afternoon rest.',
          time: '02:30 PM',
          category: ActivityCategory.sleep,
          status: ActivityStatus.upcoming,
          date: day,
          reminderEnabled: true,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ),
        ScheduleItem(
          id: 'senior_dinner_${day.year}_${day.month}_${day.day}_s',
          title: '🍽️ Light Dinner & Evening Medicine',
          description: 'Nourishing light dinner followed by night medication.',
          time: '07:30 PM',
          category: ActivityCategory.meal,
          status: ActivityStatus.upcoming,
          date: day,
          reminderEnabled: true,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ),
        ScheduleItem(
          id: 'senior_sleep_${day.year}_${day.month}_${day.day}_s',
          title: '🌙 Restful Night Sleep',
          description: 'Prepare for deep restful sleep.',
          time: '09:30 PM',
          category: ActivityCategory.sleep,
          status: ActivityStatus.upcoming,
          date: day,
          reminderEnabled: true,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        ),
      ];
    }

    // Exact Weekday Working Schedule (Monday to Friday) requested by user
    return [
      // 1. 6:00 AM - Wake up
      ScheduleItem(
        id: 'worker_wake_${day.year}_${day.month}_${day.day}_w',
        title: '⏰ Wake Up & Morning Hydration',
        description: 'Wake up, drink 1 fresh glass of water, and get ready for the day.',
        time: '06:00 AM',
        category: ActivityCategory.wakeUp,
        status: ActivityStatus.upcoming,
        date: day,
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      // 2. 8:00 AM - Breakfast
      ScheduleItem(
        id: 'worker_breakfast_${day.year}_${day.month}_${day.day}_w',
        title: '🍳 Healthy Breakfast',
        description: 'High-protein breakfast to fuel your workday energy.',
        time: '08:00 AM',
        category: ActivityCategory.breakfast,
        status: ActivityStatus.upcoming,
        date: day,
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      // 3. 9:00 AM - Commute to work
      ScheduleItem(
        id: 'worker_commute_${day.year}_${day.month}_${day.day}_w',
        title: '🚗 Commute to Work',
        description: 'Head to workplace / start morning office hours.',
        time: '09:00 AM',
        category: ActivityCategory.office,
        status: ActivityStatus.upcoming,
        date: day,
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      // 4. 10:30 AM - Tea break / relaxation break
      ScheduleItem(
        id: 'worker_tea1030_${day.year}_${day.month}_${day.day}_w',
        title: '☕ Morning Tea & Relaxation Break',
        description: '10-minute tea break to relax, stretch, and refresh.',
        time: '10:30 AM',
        category: ActivityCategory.custom,
        status: ActivityStatus.upcoming,
        date: day,
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      // 5. 11:30 AM - Hydration break
      ScheduleItem(
        id: 'worker_hyd1130_${day.year}_${day.month}_${day.day}_w',
        title: '💧 Mid-Morning Hydration Break',
        description: 'Drink 250ml water to stay focused and hydrated.',
        time: '11:30 AM',
        category: ActivityCategory.waterReminder,
        status: ActivityStatus.upcoming,
        date: day,
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      // 6. 1:00 PM - Lunch time
      ScheduleItem(
        id: 'worker_lunch_${day.year}_${day.month}_${day.day}_w',
        title: '🍱 Lunch Time & Screen Break',
        description: 'Step away from your workstation for a balanced, nourishing meal.',
        time: '01:00 PM',
        category: ActivityCategory.meal,
        status: ActivityStatus.upcoming,
        date: day,
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      // 7. 2:30 PM - Hydration break
      ScheduleItem(
        id: 'worker_hyd230_${day.year}_${day.month}_${day.day}_w',
        title: '💧 Afternoon Hydration Break',
        description: 'Drink 1 glass of water and take 5 deep breaths.',
        time: '02:30 PM',
        category: ActivityCategory.waterReminder,
        status: ActivityStatus.upcoming,
        date: day,
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      // 8. 4:00 PM - Another tea break
      ScheduleItem(
        id: 'worker_tea4pm_${day.year}_${day.month}_${day.day}_w',
        title: '☕ Afternoon Tea Break',
        description: 'Energizing tea break & posture stretch to beat the afternoon slump.',
        time: '04:00 PM',
        category: ActivityCategory.custom,
        status: ActivityStatus.upcoming,
        date: day,
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      // 9. 4:45 PM - Hydration break
      ScheduleItem(
        id: 'worker_hyd445_${day.year}_${day.month}_${day.day}_w',
        title: '💧 Late Afternoon Hydration Recharge',
        description: 'Drink water before wrapping up the final workday tasks.',
        time: '04:45 PM',
        category: ActivityCategory.waterReminder,
        status: ActivityStatus.upcoming,
        date: day,
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      // 10. 5:30 PM - End of the workday
      ScheduleItem(
        id: 'worker_endwork_${day.year}_${day.month}_${day.day}_w',
        title: '🏁 End of Workday',
        description: 'Review daily accomplishments, log off work, and head home.',
        time: '05:30 PM',
        category: ActivityCategory.office,
        status: ActivityStatus.upcoming,
        date: day,
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      // 11. 6:00 PM - Evening relaxation time
      ScheduleItem(
        id: 'worker_relax6pm_${day.year}_${day.month}_${day.day}_w',
        title: '🧘 Evening Relaxation Time',
        description: 'Gentle walk, listening to music, meditation or spending time with family.',
        time: '06:00 PM',
        category: ActivityCategory.stretchBreak,
        status: ActivityStatus.upcoming,
        date: day,
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      // 12. 8:00 PM - Dinner
      ScheduleItem(
        id: 'worker_dinner8pm_${day.year}_${day.month}_${day.day}_w',
        title: '🍽️ Dinner Time',
        description: 'Nourishing dinner with family or mindful evening meal.',
        time: '08:00 PM',
        category: ActivityCategory.meal,
        status: ActivityStatus.upcoming,
        date: day,
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      // 13. 10:00 PM - Go to bed
      ScheduleItem(
        id: 'worker_bed10pm_${day.year}_${day.month}_${day.day}_w',
        title: '🛌 Go to Bed & Sleep',
        description: 'Turn off all screens for 8 hours of deep restorative sleep.',
        time: '10:00 PM',
        category: ActivityCategory.sleep,
        status: ActivityStatus.upcoming,
        date: day,
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    ];
  }

  // Create new routine
  Future<ScheduleItem> addRoutine(ScheduleItem item) async {
    _localItems.add(item);
    await _saveToStorage();
    try {
      final response = await scheduleService.createScheduleItem(item.toJson());
      if (response != null) {
        final syncedItem = item.copyWith(isSynced: true);
        final index = _localItems.indexWhere((x) => x.id == item.id);
        if (index != -1) {
          _localItems[index] = syncedItem;
          await _saveToStorage();
          return syncedItem;
        }
      }
    } catch (_) {}
    return item;
  }

  // Create multiple routines (e.g. for whole week or selective days)
  Future<List<ScheduleItem>> addRoutines(List<ScheduleItem> items) async {
    final List<ScheduleItem> results = [];
    for (var item in items) {
      final added = await addRoutine(item);
      results.add(added);
    }
    return results;
  }

  // Update routine status or text with instant 1-click persistence and non-blocking sync
  Future<ScheduleItem> updateRoutine(ScheduleItem item) async {
    final index = _localItems.indexWhere((x) => x.id == item.id);
    ScheduleItem updated;
    if (index != -1) {
      updated = item.copyWith(updatedAt: DateTime.now());
      _localItems[index] = updated;
    } else {
      // If not found by exact ID, try matching by title and date
      final titleMatchIndex = _localItems.indexWhere((x) =>
        x.title == item.title &&
        x.date.year == item.date.year &&
        x.date.month == item.date.month &&
        x.date.day == item.date.day
      );
      if (titleMatchIndex != -1) {
        updated = item.copyWith(
          id: _localItems[titleMatchIndex].id,
          updatedAt: DateTime.now(),
        );
        _localItems[titleMatchIndex] = updated;
      } else {
        // If completely new, add it
        updated = item;
        _localItems.add(item);
      }
    }

    // Instant local save (1-click immediate response)
    await _saveToStorage();

    // Fire and forget non-blocking remote sync so UI is 100% responsive
    scheduleService.updateScheduleItem(updated.id, updated.toJson()).then((response) {
      if (response != null) {
        final synced = updated.copyWith(isSynced: true);
        final idx = _localItems.indexWhere((x) => x.id == updated.id);
        if (idx != -1) {
          _localItems[idx] = synced;
          _saveToStorage();
        }
      }
    }).catchError((_) {});

    return updated;
  }

  // Delete routine
  Future<bool> deleteRoutine(String id) async {
    final index = _localItems.indexWhere((x) => x.id == id);
    if (index != -1) {
      final item = _localItems[index];
      _localItems[index] = item.copyWith(deletedAt: DateTime.now());
      await _saveToStorage();

      try {
        final success = await scheduleService.deleteScheduleItem(id);
        if (success) {
          _localItems.removeAt(index);
          await _saveToStorage();
          return true;
        }
      } catch (_) {}
      return true;
    }
    return false;
  }

  // Copy schedule from one day to another
  Future<void> copySchedule(DateTime fromDate, DateTime toDate) async {
    final sourceItems = _localItems.where((item) => 
      item.date.year == fromDate.year &&
      item.date.month == fromDate.month &&
      item.date.day == fromDate.day &&
      item.deletedAt == null
    ).toList();

    for (var item in sourceItems) {
      final newItem = ScheduleItem(
        id: DateTime.now().microsecondsSinceEpoch.toString() + item.id,
        title: item.title,
        description: item.description,
        time: item.time,
        category: item.category,
        status: ActivityStatus.upcoming,
        date: DateTime(toDate.year, toDate.month, toDate.day),
        reminderEnabled: item.reminderEnabled,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      await addRoutine(newItem);
    }
  }

  void _populateDefaultMockData() {
    final now = DateTime.now();
    final monday = now.subtract(Duration(days: now.weekday - 1));
    final isSenior = LocalStorageService().isSeniorCitizen;
    for (int d = -7; d <= 14; d++) {
      final day = DateTime(monday.year, monday.month, monday.day).add(Duration(days: d));
      _localItems.addAll(_generateDefaultRoutinesForDate(day, isSeniorMode: isSenior));
    }
  }
}
