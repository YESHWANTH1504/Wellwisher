import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/jarvis_colors.dart';
import '../../../core/theme/jarvis_theme_manager.dart';
import '../../../core/utils/time_format_helper.dart';
import '../../../core/widgets/jarvis/jarvis_empty_state.dart';
import '../../../services/app_service_locator.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/notification_service.dart';
import '../../schedule/controller/schedule_controller.dart';
import '../../schedule/models/schedule_model.dart';
import '../controller/jarvis_home_controller.dart';

/// Interactive Calendar & Schedule Screen for JARVIS.
///
/// Serves as the visual control and schedule timeline surface for JARVIS.
/// The schedule database remains authoritative: zero duplicate schedule state,
/// zero fake synchronization, and all mutations immediately persist to MySQL,
/// update AlarmManager alarms, and notify JARVIS's active conversational memory.
class JarvisCalendarScheduleScreen extends StatefulWidget {
  final ScheduleController? scheduleController;
  final JarvisHomeController? jarvisController;

  const JarvisCalendarScheduleScreen({
    super.key,
    this.scheduleController,
    this.jarvisController,
  });

  @override
  State<JarvisCalendarScheduleScreen> createState() =>
      _JarvisCalendarScheduleScreenState();
}

class _JarvisCalendarScheduleScreenState
    extends State<JarvisCalendarScheduleScreen> {
  late final ScheduleController _scheduleController;
  late final JarvisHomeController _jarvisController;
  late final ScrollController _dateStripScrollController;
  String _selectedFilter = 'All';

  @override
  void initState() {
    super.initState();
    _scheduleController = widget.scheduleController ??
        AppServiceLocator().scheduleController;
    _jarvisController = widget.jarvisController ??
        JarvisHomeController();
    _dateStripScrollController = ScrollController();
    _scheduleController.loadRoutines();
    _scrollToCenter();
  }

  void _scrollToCenter() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_dateStripScrollController.hasClients) {
        // Center the selected date (index 10 in 21 items, item width ~60)
        final maxScroll = _dateStripScrollController.position.maxScrollExtent;
        final target = (maxScroll / 2).clamp(0.0, maxScroll);
        _dateStripScrollController.jumpTo(target);
      }
    });
  }

  @override
  void dispose() {
    _dateStripScrollController.dispose();
    super.dispose();
  }

  /// Format date strictly in local calendar time (YYYY-MM-DD)
  /// Prevents UTC conversions from shifting date to previous/next day.
  String _formatLocalDate(DateTime dt) {
    final y = dt.year.toString().padLeft(4, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  void _onDateSelected(DateTime date) {
    HapticFeedback.selectionClick();
    _scheduleController.setSelectedDate(date);
  }

  Future<void> _pickDateFromCalendar() async {
    final current = _scheduleController.selectedDate;
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF00E5FF),
              onPrimary: Colors.black,
              surface: Color(0xFF0B1120),
              onSurface: Colors.white,
            ),
            dialogBackgroundColor: const Color(0xFF0B1120),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      _onDateSelected(picked);
    }
  }

  // =========================================================================
  // ACTIONS: RESCHEDULE, EDIT, ADD, COMPLETE, CANCEL
  // =========================================================================

  Future<void> _editTaskTiming(ScheduleItem item) async {
    HapticFeedback.mediumImpact();
    final currentTod = _parseTimeStringToTimeOfDay(item.time);
    final picked = await showTimePicker(
      context: context,
      initialTime: currentTod,
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF00E5FF),
              onPrimary: Colors.black,
              surface: Color(0xFF0B1120),
              onSurface: Colors.white,
            ),
            dialogBackgroundColor: const Color(0xFF0B1120),
          ),
          child: child!,
        );
      },
    );

    if (picked == null) return;

    final formatted = _formatTimeOfDay(picked);
    if (formatted == item.time) return;

    final updated = item.copyWith(
      time: formatted,
      updatedAt: DateTime.now(),
    );

    // 1. Persist to authoritative database
    await _scheduleController.updateRoutine(updated);

    // 2. Synchronize Android AlarmManager (cancels previous alarm and registers new exact alarm)
    final bool alarmSuccess = await NotificationService().scheduleRoutineAlarm(updated);

    // 3. Notify JARVIS working context
    final localDateStr = _formatLocalDate(item.date);
    _jarvisController.recordScheduleChanged(
      action: 'RESCHEDULED',
      scheduleId: item.id,
      title: item.title,
      previousDate: localDateStr,
      previousTime: item.time,
      newDate: localDateStr,
      newTime: formatted,
    );

    if (mounted) {
      final alarmNotice = alarmSuccess ? '' : ' (Alarm sync pending)';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Rescheduled "${item.title}" to $formatted$alarmNotice'),
          backgroundColor: alarmSuccess ? const Color(0xFF0E7490) : const Color(0xFFD97706),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _showEditDetailsDialog(ScheduleItem item) async {
    HapticFeedback.mediumImpact();
    final titleCtrl = TextEditingController(text: item.title);
    final descCtrl = TextEditingController(text: item.description);
    ActivityCategory category = item.category;

    final updated = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF0B1120),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
                side: const BorderSide(color: Color(0xFF1E293B)),
              ),
              title: const Row(
                children: [
                  Icon(Icons.edit_note_rounded, color: Color(0xFF00E5FF), size: 24),
                  SizedBox(width: 10),
                  Text('Edit Task Details', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: titleCtrl,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: 'Title *',
                        labelStyle: const TextStyle(color: Color(0xFF64748B)),
                        filled: true,
                        fillColor: const Color(0xFF050811),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF050811),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<ActivityCategory>(
                          dropdownColor: const Color(0xFF0B1120),
                          value: category,
                          isExpanded: true,
                          items: ActivityCategory.values.map((c) {
                            return DropdownMenuItem(
                              value: c,
                              child: Text(c.name.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 13)),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) setModalState(() => category = val);
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: descCtrl,
                      style: const TextStyle(color: Colors.white),
                      maxLines: 2,
                      decoration: InputDecoration(
                        labelText: 'Notes',
                        labelStyle: const TextStyle(color: Color(0xFF64748B)),
                        filled: true,
                        fillColor: const Color(0xFF050811),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00E5FF),
                    foregroundColor: Colors.black,
                  ),
                  onPressed: () {
                    if (titleCtrl.text.trim().isEmpty) return;
                    Navigator.pop(ctx, true);
                  },
                  child: const Text('Save Details', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );

    if (updated == true && titleCtrl.text.trim().isNotEmpty) {
      final updatedItem = item.copyWith(
        title: titleCtrl.text.trim(),
        description: descCtrl.text.trim(),
        category: category,
        updatedAt: DateTime.now(),
      );

      // 1. Authoritative MySQL update
      await _scheduleController.updateRoutine(updatedItem);

      // 2. Synchronize AlarmManager
      final bool alarmSuccess = await NotificationService().scheduleRoutineAlarm(updatedItem);

      // 3. Notify JARVIS working context
      final localDateStr = _formatLocalDate(updatedItem.date);
      _jarvisController.recordScheduleChanged(
        action: 'UPDATED',
        scheduleId: updatedItem.id,
        title: updatedItem.title,
        previousDate: localDateStr,
        previousTime: item.time,
        newDate: localDateStr,
        newTime: updatedItem.time,
      );

      if (mounted) {
        final alarmNotice = alarmSuccess ? '' : ' (Alarm sync pending)';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Updated "${updatedItem.title}"$alarmNotice'),
            backgroundColor: const Color(0xFF0E7490),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  Future<void> _toggleTaskComplete(ScheduleItem item) async {
    HapticFeedback.selectionClick();
    final isNowCompleted = item.status != ActivityStatus.completed;
    final newStatus = isNowCompleted
        ? ActivityStatus.completed
        : ActivityStatus.upcoming;

    final updated = item.copyWith(
      status: newStatus,
      updatedAt: DateTime.now(),
    );

    // 1. Persist status update to authoritative database
    await _scheduleController.updateRoutine(updated);

    // 2. Synchronize AlarmManager
    if (isNowCompleted) {
      // Completed items should cancel active alarms
      await NotificationService().cancelRoutineAlarm(item.id);
    } else {
      // Re-activated items re-schedule the alarm
      await NotificationService().scheduleRoutineAlarm(updated);
    }

    // 3. Notify JARVIS context
    final localDateStr = _formatLocalDate(item.date);
    _jarvisController.recordScheduleChanged(
      action: isNowCompleted ? 'COMPLETED' : 'PENDING',
      scheduleId: item.id,
      title: item.title,
      newDate: localDateStr,
      newTime: item.time,
    );
  }

  Future<void> _deleteTask(ScheduleItem item) async {
    HapticFeedback.heavyImpact();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0B1120),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFF1E293B)),
        ),
        title: const Text('Cancel Schedule Task', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: Text('Remove "${item.title}" at ${item.time} from your authoritative schedule?',
            style: const TextStyle(color: Color(0xFF94A3B8))),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Back', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Remove', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    // 1. Authoritative MySQL deletion
    await _scheduleController.deleteRoutine(item.id);

    // 2. Cancel AlarmManager reminder
    await NotificationService().cancelRoutineAlarm(item.id);

    // 3. Notify JARVIS context
    final localDateStr = _formatLocalDate(item.date);
    _jarvisController.recordScheduleChanged(
      action: 'CANCELLED',
      scheduleId: item.id,
      title: item.title,
      previousDate: localDateStr,
      previousTime: item.time,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Cancelled "${item.title}"'),
          backgroundColor: const Color(0xFF7F1D1D),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _showAddTaskDialog() async {
    HapticFeedback.mediumImpact();
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    TimeOfDay selectedTime = TimeOfDay.now();
    ActivityCategory category = ActivityCategory.custom;

    final added = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF0B1120),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
                side: const BorderSide(color: Color(0xFF1E293B)),
              ),
              title: const Row(
                children: [
                  Icon(Icons.add_task_rounded, color: Color(0xFF00E5FF), size: 24),
                  SizedBox(width: 10),
                  Text('New Schedule Task', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: titleCtrl,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: 'Task Title *',
                        labelStyle: const TextStyle(color: Color(0xFF64748B)),
                        hintText: 'e.g. Meeting with Arun',
                        hintStyle: const TextStyle(color: Color(0xFF334155)),
                        filled: true,
                        fillColor: const Color(0xFF050811),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Timing Selector
                    InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () async {
                        final picked = await showTimePicker(
                          context: context,
                          initialTime: selectedTime,
                        );
                        if (picked != null) {
                          setModalState(() => selectedTime = picked);
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF050811),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFF1E293B)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.access_time_rounded, color: Color(0xFF00E5FF), size: 20),
                                SizedBox(width: 8),
                                Text('Time:', style: TextStyle(color: Color(0xFF94A3B8))),
                              ],
                            ),
                            Text(
                              _formatTimeOfDay(selectedTime),
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Category Dropdown
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF050811),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<ActivityCategory>(
                          dropdownColor: const Color(0xFF0B1120),
                          value: category,
                          isExpanded: true,
                          items: ActivityCategory.values.map((c) {
                            return DropdownMenuItem(
                              value: c,
                              child: Text(c.name.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 13)),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) setModalState(() => category = val);
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: descCtrl,
                      style: const TextStyle(color: Colors.white),
                      maxLines: 2,
                      decoration: InputDecoration(
                        labelText: 'Notes (Optional)',
                        labelStyle: const TextStyle(color: Color(0xFF64748B)),
                        filled: true,
                        fillColor: const Color(0xFF050811),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00E5FF),
                    foregroundColor: Colors.black,
                  ),
                  onPressed: () {
                    if (titleCtrl.text.trim().isEmpty) return;
                    Navigator.pop(ctx, true);
                  },
                  child: const Text('Add Task', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );

    if (added == true && titleCtrl.text.trim().isNotEmpty) {
      final activeDate = _scheduleController.selectedDate;
      final timeStr = _formatTimeOfDay(selectedTime);
      final newItem = ScheduleItem(
        id: 'rot_${DateTime.now().millisecondsSinceEpoch}_${titleCtrl.text.hashCode.abs().toString().substring(0, 4)}',
        title: titleCtrl.text.trim(),
        description: descCtrl.text.trim(),
        time: timeStr,
        category: category,
        status: ActivityStatus.upcoming,
        date: activeDate,
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      // 1. Authoritative MySQL insertion via API
      await _scheduleController.addNewRoutine(newItem);

      // 2. Schedule AlarmManager
      final bool alarmSuccess = await NotificationService().scheduleRoutineAlarm(newItem);

      // 3. Notify JARVIS context
      final localDateStr = _formatLocalDate(activeDate);
      _jarvisController.recordScheduleChanged(
        action: 'CREATED',
        scheduleId: newItem.id,
        title: newItem.title,
        newDate: localDateStr,
        newTime: newItem.time,
      );

      if (mounted) {
        final alarmNotice = alarmSuccess ? '' : ' (Alarm sync pending)';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Added "${newItem.title}" at ${newItem.time}$alarmNotice'),
            backgroundColor: const Color(0xFF00E5FF),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  // =========================================================================
  // =========================================================================
  // UI BUILDERS (REFERENCE MATCHED)
  // =========================================================================

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: JarvisThemeManager(),
      builder: (context, _) {
        final theme = JarvisThemeManager();
        final isDark = theme.isDarkMode;

        return Scaffold(
          backgroundColor: theme.background,
          body: SafeArea(
            child: ListenableBuilder(
              listenable: _scheduleController,
              builder: (context, _) {
                final allRoutines = _scheduleController.currentRoutines;
                final routines = _filterRoutines(allRoutines);
                final selectedDate = _scheduleController.selectedDate;

                return Column(
                  children: [
                    // 1. Top Header: Avatar, "Schedule", "Stay on track, every day", Theme toggle, Search & Add buttons
                    _buildReferenceScheduleHeader(isDark),

                    // 2. Date Navigator: "Mon, 28 Jul 2025" + < Today >
                    _buildDateNavigatorRow(selectedDate, isDark),

                    const SizedBox(height: 6),

                    // 3. Day Pill Strip (Sun 27 ... Sat 2)
                    _buildReferenceDayStrip(selectedDate, isDark),

                    const SizedBox(height: 10),

                    // 4. Category Filter Chips: All, Meetings, Tasks, Reminders
                    _buildFilterChipsRow(isDark),

                    const SizedBox(height: 6),

                    // 5. Connected Timeline with Unified Schedule Colored Cards + Bottom Suggestion Box
                    Expanded(
                      child: _scheduleController.isLoading
                          ? const Center(child: CircularProgressIndicator(color: Color(0xFF00F0FF)))
                          : routines.isEmpty
                              ? _buildEmptyState(selectedDate)
                              : _buildTimeline(routines, isDark),
                    ),
                  ],
                );
              },
            ),
          ),
        );
      },
    );
  }

  List<ScheduleItem> _filterRoutines(List<ScheduleItem> items) {
    if (_selectedFilter == 'Meetings') {
      return items.where((i) => i.category == ActivityCategory.office || i.title.toLowerCase().contains('meet')).toList();
    } else if (_selectedFilter == 'Tasks') {
      return items.where((i) => i.category == ActivityCategory.office || i.category == ActivityCategory.custom || i.category == ActivityCategory.stretchBreak || i.category == ActivityCategory.eyeCare).toList();
    } else if (_selectedFilter == 'Reminders') {
      return items.where((i) => i.category == ActivityCategory.medicine || i.category == ActivityCategory.waterReminder || i.reminderEnabled).toList();
    }
    return items;
  }

  Widget _buildReferenceScheduleHeader(bool isDark) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              // User Avatar
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isDark ? const Color(0x6638BDF8) : const Color(0xFF38BDF8),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: isDark ? const Color(0x3338BDF8) : const Color(0x1A0284C7),
                      blurRadius: 6,
                    ),
                  ],
                ),
                child: CircleAvatar(
                  backgroundColor: isDark ? const Color(0xFF10192E) : const Color(0xFFE0F2FE),
                  child: Icon(
                    Icons.person_rounded,
                    color: isDark ? const Color(0xFF38BDF8) : const Color(0xFF0284C7),
                    size: 20,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Title and Subtitle
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Schedule',
                    style: TextStyle(
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Stay on track, every day',
                    style: TextStyle(
                      color: isDark ? JarvisColors.textSecondary : const Color(0xFF64748B),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ],
          ),
          // Action Buttons: Theme Toggle, Search & Add
          Row(
            children: [
              _buildCircleIconButton(
                icon: isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                tooltip: isDark ? 'Switch to White Theme' : 'Switch to Dark Theme',
                isDark: isDark,
                onTap: () {
                  JarvisThemeManager().toggleTheme();
                },
              ),
              const SizedBox(width: 8),
              _buildCircleIconButton(
                icon: Icons.search_rounded,
                tooltip: 'Search events',
                isDark: isDark,
                onTap: _pickDateFromCalendar,
              ),
              const SizedBox(width: 8),
              _buildCircleIconButton(
                icon: Icons.add_rounded,
                tooltip: 'Add Task',
                isDark: isDark,
                onTap: _showAddTaskDialog,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCircleIconButton({
    required IconData icon,
    required String tooltip,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () {
          HapticFeedback.lightImpact();
          onTap();
        },
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isDark ? const Color(0x660D1527) : const Color(0xFFF1F5F9),
            border: Border.all(
              color: isDark ? const Color(0x3338BDF8) : const Color(0xFFCBD5E1),
              width: 1.2,
            ),
          ),
          child: Icon(
            icon,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
            size: 18,
          ),
        ),
      ),
    );
  }

  Widget _buildDateNavigatorRow(DateTime selectedDate, bool isDark) {
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final weekday = weekdays[selectedDate.weekday - 1];
    final month = months[selectedDate.month - 1];
    final formatted = '$weekday, ${selectedDate.day} $month ${selectedDate.year}';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left: Calendar Icon + Formatted Date
          GestureDetector(
            onTap: _pickDateFromCalendar,
            child: Row(
              children: [
                Icon(
                  Icons.calendar_month_outlined,
                  color: isDark ? const Color(0xFF38BDF8) : const Color(0xFF0284C7),
                  size: 18,
                ),
                const SizedBox(width: 8),
                Text(
                  formatted,
                  style: TextStyle(
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),

          // Right: < Today > controls
          Row(
            children: [
              IconButton(
                icon: Icon(
                  Icons.chevron_left_rounded,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  size: 20,
                ),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: () {
                  HapticFeedback.lightImpact();
                  _onDateSelected(selectedDate.subtract(const Duration(days: 1)));
                },
              ),
              const SizedBox(width: 6),
              GestureDetector(
                onTap: () {
                  HapticFeedback.lightImpact();
                  _onDateSelected(DateTime.now());
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF10192E) : const Color(0xFFE0F2FE),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark ? const Color(0x3338BDF8) : const Color(0xFFBAE6FD),
                      width: 1,
                    ),
                  ),
                  child: Text(
                    'Today',
                    style: TextStyle(
                      color: isDark ? const Color(0xFF38BDF8) : const Color(0xFF0284C7),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              IconButton(
                icon: Icon(
                  Icons.chevron_right_rounded,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  size: 20,
                ),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: () {
                  HapticFeedback.lightImpact();
                  _onDateSelected(selectedDate.add(const Duration(days: 1)));
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildReferenceDayStrip(DateTime selectedDate, bool isDark) {
    // 7 days around the active week
    final startOfWeek = selectedDate.subtract(Duration(days: selectedDate.weekday - 1));
    final days = List.generate(7, (i) => startOfWeek.add(Duration(days: i)));

    const weekdaysShort = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: days.map((dt) {
          final isSelected = _isSameDay(dt, selectedDate);
          final weekdayStr = weekdaysShort[dt.weekday - 1];

          return GestureDetector(
            onTap: () => _onDateSelected(dt),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 44,
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFF3B82F6)
                    : (isDark ? Colors.transparent : const Color(0xFFF1F5F9)),
                borderRadius: BorderRadius.circular(14),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: const Color(0xFF3B82F6).withValues(alpha: 0.4),
                          blurRadius: 10,
                          spreadRadius: 1,
                        ),
                      ]
                    : null,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    weekdayStr,
                    style: TextStyle(
                      color: isSelected
                          ? Colors.white
                          : (isDark ? JarvisColors.textSecondary : const Color(0xFF64748B)),
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${dt.day}',
                    style: TextStyle(
                      color: isSelected
                          ? Colors.white
                          : (isDark ? Colors.white70 : const Color(0xFF0F172A)),
                      fontSize: 15,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildFilterChipsRow(bool isDark) {
    final filters = ['All', 'Meetings', 'Tasks', 'Reminders'];

    return SizedBox(
      height: 34,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final f = filters[i];
          final isActive = _selectedFilter == f;

          return GestureDetector(
            onTap: () {
              HapticFeedback.selectionClick();
              setState(() => _selectedFilter = f);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: isActive
                    ? const Color(0xFF3B82F6)
                    : (isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9)),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isActive
                      ? const Color(0xFF3B82F6)
                      : (isDark ? const Color(0x3338BDF8) : const Color(0xFFCBD5E1)),
                  width: 1,
                ),
              ),
              child: Center(
                child: Text(
                  f,
                  style: TextStyle(
                    color: isActive
                        ? Colors.white
                        : (isDark ? JarvisColors.textSecondary : const Color(0xFF475569)),
                    fontSize: 12,
                    fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState(DateTime selectedDate) {
    return JarvisEmptyState(
      icon: Icons.event_available_rounded,
      title: 'No Events Scheduled',
      description:
          'Your schedule is clear for ${_formatLocalDate(selectedDate)}.\nTap "+" or ask JARVIS by voice.',
      actionLabel: 'Add Task',
      onAction: _showAddTaskDialog,
      accentColor: JarvisColors.neonEmerald,
    );
  }

  Widget _buildTimeline(List<ScheduleItem> routines, bool isDark) {
    return ListView.builder(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 80),
      itemCount: routines.length + 1,
      itemBuilder: (context, idx) {
        if (idx == routines.length) {
          return _buildVoiceSuggestionBox(isDark);
        }
        final item = routines[idx];
        return _buildReferenceTimelineRow(item, isDark, isLast: idx == routines.length - 1);
      },
    );
  }

  Color _getCategoryColor(ActivityCategory category) {
    final theme = JarvisThemeManager();
    switch (category) {
      case ActivityCategory.office:
        return theme.meetingColor;
      case ActivityCategory.exercise:
      case ActivityCategory.medicine:
      case ActivityCategory.eyeCare:
      case ActivityCategory.stretchBreak:
        return theme.healthColor;
      case ActivityCategory.waterReminder:
        return theme.reminderColor;
      case ActivityCategory.wakeUp:
      case ActivityCategory.breakfast:
      case ActivityCategory.meal:
      case ActivityCategory.sleep:
      case ActivityCategory.family:
        return theme.personalColor;
      case ActivityCategory.custom:
        return theme.taskColor;
    }
  }

  IconData _getCategoryIcon(ActivityCategory category) {
    switch (category) {
      case ActivityCategory.exercise:
        return Icons.fitness_center_rounded;
      case ActivityCategory.office:
        return Icons.groups_rounded;
      case ActivityCategory.medicine:
        return Icons.medical_services_outlined;
      case ActivityCategory.breakfast:
      case ActivityCategory.meal:
        return Icons.restaurant_rounded;
      case ActivityCategory.waterReminder:
        return Icons.water_drop_rounded;
      case ActivityCategory.family:
        return Icons.people_outline_rounded;
      case ActivityCategory.stretchBreak:
        return Icons.self_improvement_rounded;
      case ActivityCategory.eyeCare:
        return Icons.visibility_outlined;
      case ActivityCategory.wakeUp:
        return Icons.wb_sunny_outlined;
      case ActivityCategory.sleep:
        return Icons.bedtime_outlined;
      case ActivityCategory.custom:
        return Icons.alarm_rounded;
    }
  }

  Widget _buildReferenceTimelineRow(ScheduleItem item, bool isDark, {bool isLast = false}) {
    final categoryColor = _getCategoryColor(item.category);
    final isCompleted = item.status == ActivityStatus.completed;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Left Time Label & Vertical Node Line
          SizedBox(
            width: 70,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 14),
                Text(
                  TimeFormatHelper.format(item.time, is24Hour: LocalStorageService().is24HourTime),
                  style: TextStyle(
                    color: isCompleted
                        ? (isDark ? JarvisColors.textTertiary : const Color(0xFF94A3B8))
                        : (isDark ? JarvisColors.textSecondary : const Color(0xFF475569)),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),

          // Timeline Node and Connecting Line
          Column(
            children: [
              const SizedBox(height: 18),
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: categoryColor,
                  boxShadow: [
                    BoxShadow(
                      color: categoryColor.withValues(alpha: isDark ? 0.6 : 0.3),
                      blurRadius: 6,
                      spreadRadius: 1,
                    ),
                  ],
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 1.5,
                    color: categoryColor.withValues(alpha: isDark ? 0.3 : 0.4),
                  ),
                ),
            ],
          ),

          const SizedBox(width: 12),

          // 2. Right Event Card with unified schedule color
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => _showTaskOptionsSheet(item, isDark),
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: isDark
                          ? categoryColor.withValues(alpha: 0.12)
                          : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isDark
                            ? categoryColor.withValues(alpha: 0.4)
                            : categoryColor.withValues(alpha: 0.35),
                        width: 1.2,
                      ),
                      boxShadow: isDark
                          ? null
                          : [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.04),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                    ),
                    child: Row(
                      children: [
                        // Left Category Icon inside box
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: categoryColor.withValues(alpha: isDark ? 0.2 : 0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(_getCategoryIcon(item.category), color: categoryColor, size: 20),
                        ),
                        const SizedBox(width: 12),
                        // Title + Location/Duration subtitle
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                item.title,
                                style: TextStyle(
                                  color: isCompleted
                                      ? (isDark ? JarvisColors.textSecondary : const Color(0xFF94A3B8))
                                      : (isDark ? Colors.white : const Color(0xFF0F172A)),
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  decoration: isCompleted ? TextDecoration.lineThrough : null,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  if (item.description.isNotEmpty) ...[
                                    Icon(
                                      Icons.location_on_outlined,
                                      size: 12,
                                      color: isDark ? JarvisColors.textSecondary : const Color(0xFF64748B),
                                    ),
                                    const SizedBox(width: 3),
                                    Flexible(
                                      child: Text(
                                        item.description,
                                        style: TextStyle(
                                          color: isDark ? JarvisColors.textSecondary : const Color(0xFF64748B),
                                          fontSize: 11,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                  ],
                                  Icon(
                                    Icons.access_time_rounded,
                                    size: 12,
                                    color: isDark ? JarvisColors.textSecondary : const Color(0xFF64748B),
                                  ),
                                  const SizedBox(width: 3),
                                  Text(
                                    '30 min',
                                    style: TextStyle(
                                      color: isDark ? JarvisColors.textSecondary : const Color(0xFF64748B),
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        // Right checkmark or menu button
                        if (isCompleted)
                          Container(
                            width: 26,
                            height: 26,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color(0xFF10B981),
                            ),
                            child: const Icon(Icons.check, color: Colors.white, size: 16),
                          )
                        else
                          IconButton(
                            icon: Icon(
                              Icons.more_vert_rounded,
                              color: isDark ? JarvisColors.textSecondary : const Color(0xFF64748B),
                              size: 20,
                            ),
                            visualDensity: VisualDensity.compact,
                            onPressed: () => _showTaskOptionsSheet(item, isDark),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showTaskOptionsSheet(ScheduleItem item, bool isDark) {
    HapticFeedback.mediumImpact();
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF0B1120) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        final textColor = isDark ? Colors.white : const Color(0xFF0F172A);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: Icon(
                    item.status == ActivityStatus.completed ? Icons.undo_rounded : Icons.check_circle_outline_rounded,
                    color: const Color(0xFF10B981),
                  ),
                  title: Text(
                    item.status == ActivityStatus.completed ? 'Mark as Pending' : 'Mark as Completed',
                    style: TextStyle(color: textColor),
                  ),
                  onTap: () {
                    Navigator.pop(ctx);
                    _toggleTaskComplete(item);
                  },
                ),
                ListTile(
                  leading: Icon(
                    Icons.access_time_rounded,
                    color: JarvisThemeManager().unifiedScheduleColor,
                  ),
                  title: Text('Reschedule Timing', style: TextStyle(color: textColor)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _editTaskTiming(item);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.edit_note_rounded, color: Color(0xFF38BDF8)),
                  title: Text('Edit Details', style: TextStyle(color: textColor)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _showEditDetailsDialog(item);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444)),
                  title: const Text('Delete Task', style: TextStyle(color: Color(0xFFEF4444))),
                  onTap: () {
                    Navigator.pop(ctx);
                    _deleteTask(item);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildVoiceSuggestionBox(bool isDark) {
    final prompts = [
      'Add a meeting tomorrow at 10 AM',
      'Move my 4 PM meeting to 5 PM',
      'Cancel my doctor appointment',
    ];

    return Container(
      margin: const EdgeInsets.only(top: 12, bottom: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0x990D1527) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDark ? const Color(0x2638BDF8) : const Color(0xFFE2E8F0),
          width: 1.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0x2638BDF8) : const Color(0xFFE0F2FE),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.calendar_month_rounded,
                  color: isDark ? const Color(0xFF38BDF8) : const Color(0xFF0284C7),
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                'Try saying:',
                style: TextStyle(
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ...prompts.map(
            (p) => Padding(
              padding: const EdgeInsets.only(left: 32, bottom: 6),
              child: InkWell(
                onTap: () {
                  HapticFeedback.lightImpact();
                  _jarvisController.submitMessage(p);
                },
                child: Text(
                  '“$p”',
                  style: TextStyle(
                    color: isDark ? JarvisColors.textSecondary : const Color(0xFF475569),
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // TIME UTILITIES
  // =========================================================================

  TimeOfDay _parseTimeStringToTimeOfDay(String timeStr) {
    try {
      final clean = timeStr.trim().toUpperCase();
      final parts = clean.split(' ');
      final hm = parts[0].split(':');
      int hour = int.parse(hm[0]);
      final minute = int.parse(hm[1]);
      final isPm = parts.length > 1 && parts[1] == 'PM';

      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour == 12) hour = 0;

      return TimeOfDay(hour: hour, minute: minute);
    } catch (_) {
      return TimeOfDay.now();
    }
  }

  String _formatTimeOfDay(TimeOfDay tod) {
    final hour = tod.hourOfPeriod == 0 ? 12 : tod.hourOfPeriod;
    final minute = tod.minute.toString().padLeft(2, '0');
    final period = tod.period == DayPeriod.pm ? 'PM' : 'AM';
    return '$hour:$minute $period';
  }
}
