import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/schedule_service.dart';
import '../models/schedule_model.dart';
import '../events/schedule_event_bus.dart';

class ScheduleRepository {
  final ScheduleService scheduleService;

  // Local caching and persistence layer
  final List<ScheduleItem> _localItems = [];
  bool _isLoadedFromStorage = false;

  ScheduleRepository({required this.scheduleService}) {
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

  /// Invalidate local cache for a specific date or entirely.
  /// Safely flags storage refresh without wiping in-memory routines.
  void invalidateCache({DateTime? date}) {
    _isLoadedFromStorage = false;
  }

  /// Authoritatively reconcile local state with backend /api/schedule
  Future<List<ScheduleItem>> reconcileWithRemote(String dateStr) async {
    try {
      final remoteData = await scheduleService.fetchSchedule(dateStr);
      final parts = dateStr.split('-');
      if (parts.length == 3) {
        final targetYear = int.parse(parts[0]);
        final targetMonth = int.parse(parts[1]);
        final targetDay = int.parse(parts[2]);

        if (remoteData.isNotEmpty) {
          final remoteIds = <String>{};
          final parsedRemote = <ScheduleItem>[];

          for (var raw in remoteData) {
            final item = ScheduleItem.fromJson(raw);
            remoteIds.add(item.id);
            parsedRemote.add(item);
          }

          // Invariant: Remove local items ONLY if they are marked as synced with remote and absent from remote
          // NEVER delete unsynced items, local routines, or newly created/modified items!
          final now = DateTime.now();
          _localItems.removeWhere((local) =>
            local.date.year == targetYear &&
            local.date.month == targetMonth &&
            local.date.day == targetDay &&
            local.isSynced &&
            !remoteIds.contains(local.id) &&
            now.difference(local.updatedAt).inMinutes >= 5
          );

          // Update or add remote items, but preserve any local updates that occurred after remote item was generated
          for (var remoteItem in parsedRemote) {
            final idx = _localItems.indexWhere((x) => x.id == remoteItem.id);
            if (idx != -1) {
              final local = _localItems[idx];
              if (local.updatedAt.isAfter(remoteItem.updatedAt)) {
                continue;
              }
              _localItems[idx] = remoteItem.copyWith(isSynced: true);
            } else {
              _localItems.add(remoteItem.copyWith(isSynced: true));
            }
          }
        } else {
          // If remote returned an empty list for this date, do NOT wipe local or newly modified items.
          // Only remove stale synced items that haven't been modified in the last 5 minutes.
          final now = DateTime.now();
          _localItems.removeWhere((local) =>
            local.date.year == targetYear &&
            local.date.month == targetMonth &&
            local.date.day == targetDay &&
            local.isSynced &&
            now.difference(local.updatedAt).inMinutes >= 5
          );
        }

        await _saveToStorage();
      }
    } catch (e) {
      // Remote fetch failed, continue with local cache
    }

    final parts = dateStr.split('-');
    if (parts.length == 3) {
      final targetYear = int.parse(parts[0]);
      final targetMonth = int.parse(parts[1]);
      final targetDay = int.parse(parts[2]);
      return _localItems.where((item) =>
        item.date.year == targetYear &&
        item.date.month == targetMonth &&
        item.date.day == targetDay &&
        item.deletedAt == null
      ).toList()..sort((a, b) => _compareTimeStrings(a.time, b.time));
    }
    return [];
  }

  /// Authoritative refresh from server
  Future<List<ScheduleItem>> refreshFromAuthoritativeSource(DateTime date, {bool? isSeniorMode}) async {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    final dateStr = "$y-$m-$d";
    return await reconcileWithRemote(dateStr);
  }

  // Fetch list of items for a specific date (Instant response from local cache + authoritative reconciliation)
  Future<List<ScheduleItem>> getScheduleForDate(DateTime date, {bool? isSeniorMode, bool forceRefresh = false}) async {
    if (!_isLoadedFromStorage && _localItems.isEmpty) {
      await _loadFromStorage();
    }

    final activeSeniorMode = isSeniorMode ?? LocalStorageService().isSeniorCitizen;
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    final dateStr = "$y-$m-$d";

    // Authoritative remote reconciliation
    await reconcileWithRemote(dateStr);

    final dateMatches = _localItems.where((item) =>
      item.date.year == date.year &&
      item.date.month == date.month &&
      item.date.day == date.day &&
      item.deletedAt == null
    ).toList();

    // Ensure strict role isolation ONLY for local fallback routine templates
    final roleFilteredMatches = dateMatches.where((item) {
      final isLocalWorkerTemplate = item.id.startsWith('worker_') || item.id.endsWith('_w');
      final isLocalSeniorTemplate = item.id.startsWith('senior_') || item.id.endsWith('_s');
      if (activeSeniorMode && isLocalWorkerTemplate) return false;
      if (!activeSeniorMode && isLocalSeniorTemplate) return false;
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

    ScheduleEventBus().publishMutation(
      action: ScheduleActionType.create,
      source: ScheduleChangeSource.ui,
      entityId: item.id,
      date: item.date,
    );

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

    ScheduleEventBus().publishMutation(
      action: ScheduleActionType.update,
      source: ScheduleChangeSource.ui,
      entityId: updated.id,
      date: updated.date,
    );

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

  /// Authoritatively find routine by query (e.g. "gentle garden walk") and update title, time, or status
  Future<ScheduleItem?> updateRoutineByQuery({
    required String query,
    String? newTitle,
    String? newTime,
    ActivityStatus? status,
    DateTime? targetDate,
  }) async {
    final cleanQuery = query.toLowerCase().replaceAll(RegExp(r'^[^\w]+'), '').trim();
    final d = targetDate ?? DateTime.now();

    // 1. Search matching routine on target date
    int matchIdx = _localItems.indexWhere((x) {
      if (x.deletedAt != null) return false;
      if (x.date.year != d.year || x.date.month != d.month || x.date.day != d.day) return false;
      final cleanTitle = x.title.toLowerCase().replaceAll(RegExp(r'^[^\w]+'), '').trim();
      return cleanTitle.contains(cleanQuery) || cleanQuery.contains(cleanTitle);
    });

    // 2. If not found on target date, search across all dates
    if (matchIdx == -1) {
      matchIdx = _localItems.indexWhere((x) {
        if (x.deletedAt != null) return false;
        final cleanTitle = x.title.toLowerCase().replaceAll(RegExp(r'^[^\w]+'), '').trim();
        return cleanTitle.contains(cleanQuery) || cleanQuery.contains(cleanTitle);
      });
    }

    if (matchIdx != -1) {
      final existing = _localItems[matchIdx];
      final updated = existing.copyWith(
        title: (newTitle != null && newTitle.trim().isNotEmpty) ? newTitle.trim() : existing.title,
        time: (newTime != null && newTime.trim().isNotEmpty) ? newTime.trim() : existing.time,
        status: status ?? existing.status,
        updatedAt: DateTime.now(),
      );
      _localItems[matchIdx] = updated;
      await _saveToStorage();

      ScheduleEventBus().publishMutation(
        action: ScheduleActionType.update,
        source: ScheduleChangeSource.voice,
        entityId: updated.id,
        date: updated.date,
      );

      // Fire and forget remote update
      scheduleService.updateScheduleItem(updated.id, updated.toJson()).catchError((_) => null);

      return updated;
    }
    return null;
  }

  // Delete routine
  Future<bool> deleteRoutine(String id) async {
    final index = _localItems.indexWhere((x) => x.id == id);
    if (index != -1) {
      final item = _localItems[index];
      _localItems[index] = item.copyWith(deletedAt: DateTime.now());
      await _saveToStorage();

      ScheduleEventBus().publishMutation(
        action: ScheduleActionType.delete,
        source: ScheduleChangeSource.ui,
        entityId: id,
        date: item.date,
      );

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
}

