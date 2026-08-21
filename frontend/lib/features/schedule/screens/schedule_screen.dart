import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/sound_service.dart';
import '../../../services/voice_notification_service.dart';
import '../../screen_care/screens/screen_care_settings_screen.dart';
import '../controller/schedule_controller.dart';
import '../models/schedule_model.dart';
import '../widgets/schedule_item_options_sheet.dart';
import '../widgets/voice_schedule_composer_modal.dart';

class ScheduleScreen extends StatefulWidget {
  final ScheduleController controller;

  const ScheduleScreen({super.key, required this.controller});

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  late ScrollController _scrollController;
  final LocalStorageService _storage = LocalStorageService();

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: _buildAppBar(context),
      body: ListenableBuilder(
        listenable: widget.controller,
        builder: (context, _) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildVoiceNotificationBanner(context),
              _buildDateSelector(context),
              Divider(height: 1, color: isDark ? Colors.white12 : AppColors.outline),
              Expanded(
                child: widget.controller.isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : widget.controller.currentRoutines.isEmpty
                        ? _buildEmptyState(context)
                        : _buildTimelineList(context),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.pushNamed(context, '/add-routine').then((_) {
            widget.controller.loadRoutines();
          });
        },
        backgroundColor: _storage.isSeniorCitizen ? Colors.purple.shade700 : AppColors.primary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: const Icon(Icons.add, size: 28),
      ),
    );
  }

  // App Bar containing profile avatar, user greeting, and notification bell
  PreferredSizeWidget _buildAppBar(BuildContext context) {
    final isSenior = _storage.isSeniorCitizen;
    final primaryThemeColor = isSenior ? Colors.purple.shade700 : AppColors.primary;

    return AppBar(
      titleSpacing: 16,
      automaticallyImplyLeading: false,
      title: Row(
        children: [
          GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ScreenCareSettingsScreen(
                    controller: widget.controller.screenCareController,
                  ),
                ),
              );
            },
            child: CircleAvatar(
              radius: 20,
              backgroundColor: primaryThemeColor,
              child: Icon(
                isSenior ? Icons.elderly_rounded : Icons.badge_rounded,
                color: Colors.white,
                size: 22,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  isSenior ? '👵 Senior Routine Schedule' : '💼 Workday Schedule',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: primaryThemeColor,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  isSenior ? 'Medicine, meals & daily wellness' : 'Focus, screen care & daily wellness',
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.onSurfaceVariant.withValues(alpha: 0.8),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.mic_rounded, color: Color(0xFF4F46E5), size: 24),
          tooltip: 'AI Voice Schedule Assistant',
          onPressed: () {
            VoiceScheduleComposerModal.show(
              context,
              controller: widget.controller,
              initialDate: widget.controller.selectedDate,
            );
          },
        ),
        IconButton(
          icon: Icon(Icons.notifications_active_rounded, color: primaryThemeColor, size: 24),
          tooltip: 'Live Test Status Bar Pop-Up Notification',
          onPressed: () {
            VoiceNotificationService().showLiveTestSheet(context);
          },
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  Widget _buildDateSelector(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final selected = widget.controller.selectedDate;

    // Generate 7 days around selected date or start of current week
    final weekDates = List.generate(7, (index) {
      final monday = selected.subtract(Duration(days: selected.weekday - 1));
      return monday.add(Duration(days: index));
    });

    final monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    final monthStr = monthNames[selected.month - 1];
    final yearStr = selected.year.toString();

    return Container(
      color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '$monthStr $yearStr',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
                TextButton(
                  onPressed: () {
                    widget.controller.setSelectedDate(DateTime.now());
                  },
                  child: const Text(
                    'TODAY',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          SizedBox(
            height: 62,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12.0),
              itemCount: weekDates.length,
              itemBuilder: (context, index) {
                final date = weekDates[index];
                final isSelected = date.year == selected.year &&
                    date.month == selected.month &&
                    date.day == selected.day;

                final weekdayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
                final weekdayStr = weekdayNames[date.weekday - 1];

                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3.0),
                  child: GestureDetector(
                    onTap: () => widget.controller.setSelectedDate(date),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 48,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primary
                            : (isDark ? const Color(0xFF2C2C2E) : Colors.grey.shade100),
                        borderRadius: BorderRadius.circular(12),
                        border: isSelected
                            ? Border.all(color: AppColors.primary.withValues(alpha: 0.3), width: 1)
                            : (isDark ? Border.all(color: Colors.white10, width: 0.8) : null),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: AppColors.primary.withValues(alpha: 0.3),
                                  blurRadius: 6,
                                  offset: const Offset(0, 3),
                                )
                              ]
                            : null,
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            weekdayStr,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: isSelected
                                  ? Colors.white70
                                  : (isDark ? Colors.grey.shade400 : Colors.grey.shade500),
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            date.day.toString(),
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: isSelected
                                  ? Colors.white
                                  : (isDark ? Colors.white : Colors.black87),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // Vertical Timeline list view
  Widget _buildTimelineList(BuildContext context) {
    final routines = widget.controller.currentRoutines;
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.only(top: 8, bottom: 80, left: 12, right: 12),
      itemCount: routines.length,
      itemBuilder: (context, index) {
        final item = routines[index];
        return _buildTimelineItem(context, item, index == routines.length - 1);
      },
    );
  }

  // Safe time parts extraction
  (String, String) _safeTimeParts(String timeStr) {
    try {
      final clean = timeStr.trim();
      final parts = clean.split(RegExp(r'\s+'));
      if (parts.length >= 2) {
        return (parts[0], parts[1]);
      } else if (parts.length == 1 && parts[0].isNotEmpty) {
        return (parts[0], '');
      }
      return ('--:--', '');
    } catch (_) {
      return ('--:--', '');
    }
  }

  Widget _buildTimelineItem(BuildContext context, ScheduleItem item, bool isLast) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isHydrationBreak = item.title.contains('Hydration') || item.title.contains('Water') || item.category == ActivityCategory.waterReminder;
    final (timeDigits, timePeriod) = _safeTimeParts(item.time);

    if (isHydrationBreak && (item.title.contains('30-Min') || item.title.contains('20-Min'))) {
      final isCompleted = item.status == ActivityStatus.completed;
      return Padding(
        padding: const EdgeInsets.only(left: 48 + 16, bottom: 6, right: 4),
        child: GestureDetector(
          onTap: () {
            ScheduleItemOptionsSheet.show(context, item, widget.controller);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: isCompleted
                  ? (isDark ? Colors.green.shade900.withValues(alpha: 0.3) : Colors.green.shade50)
                  : (isDark ? Colors.blue.shade900.withValues(alpha: 0.3) : Colors.blue.shade50),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isCompleted
                    ? (isDark ? Colors.green.shade700 : Colors.green.shade200)
                    : (isDark ? Colors.blue.shade700 : Colors.blue.shade200),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.water_drop_rounded,
                  color: isCompleted ? (isDark ? Colors.greenAccent : Colors.green) : Colors.blueAccent,
                  size: 15,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    item.title,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      decoration: isCompleted ? TextDecoration.lineThrough : null,
                      color: isCompleted
                          ? (isDark ? Colors.greenAccent : Colors.green.shade800)
                          : (isDark ? Colors.blue.shade300 : Colors.blue.shade900),
                    ),
                  ),
                ),
                Text(
                  item.time,
                  style: TextStyle(fontSize: 10, color: isDark ? Colors.grey.shade400 : Colors.grey.shade600, fontWeight: FontWeight.bold),
                ),
                const SizedBox(width: 6),
                Icon(
                  isCompleted ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                  color: isCompleted ? (isDark ? Colors.greenAccent : Colors.green) : Colors.blue.shade300,
                  size: 14,
                ),
              ],
            ),
          ),
        ),
      );
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left Side: Time label and connecting timeline axis line
          SizedBox(
            width: 44,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 14),
                Text(
                  timeDigits,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black87,
                  ),
                ),
                if (timePeriod.isNotEmpty)
                  Text(
                    timePeriod,
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade500,
                    ),
                  ),
              ],
            ),
          ),
          
          // Timeline indicator (Vertical Line & Dot)
          SizedBox(
            width: 16,
            child: Column(
              children: [
                const SizedBox(height: 18),
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: item.category.color,
                    shape: BoxShape.circle,
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 1.5,
                      color: isDark ? Colors.white24 : Colors.grey.shade200,
                    ),
                  ),
              ],
            ),
          ),

          // Right Side: Ultra Compact Rounded Activity Card
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 6.0),
              child: GestureDetector(
                onTap: () {
                  ScheduleItemOptionsSheet.show(context, item, widget.controller);
                },
                child: TweenAnimationBuilder<double>(
                  duration: const Duration(milliseconds: 200),
                  tween: Tween(begin: 0.0, end: 1.0),
                  builder: (context, val, child) {
                    return Opacity(
                      opacity: val,
                      child: Transform.translate(
                        offset: Offset(0, (1 - val) * 8),
                        child: child,
                      ),
                    );
                  },
                  child: Card(
                    margin: EdgeInsets.zero,
                    elevation: isDark ? 0 : 0.5,
                    color: theme.cardColor,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: isDark ? Colors.white12 : Colors.grey.shade200),
                    ),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border(
                          left: BorderSide(
                            color: item.requiresCompletionStatus
                                ? (item.status == ActivityStatus.completed ? const Color(0xFF16A34A) : Colors.orange.shade800)
                                : item.category.color,
                            width: item.requiresCompletionStatus ? 3.5 : 2.5,
                          ),
                        ),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 6.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          if (item.requiresCompletionStatus)
                            IconButton(
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(minWidth: 22, minHeight: 22),
                              icon: Icon(
                                item.status == ActivityStatus.completed
                                    ? Icons.check_circle_rounded
                                    : Icons.radio_button_unchecked_rounded,
                                color: item.status == ActivityStatus.completed ? const Color(0xFF16A34A) : Colors.orange.shade800,
                                size: 20,
                              ),
                              tooltip: item.status == ActivityStatus.completed ? 'Mark Upcoming' : 'Mark Complete',
                              onPressed: () async {
                                final newStatus = item.status == ActivityStatus.completed
                                    ? ActivityStatus.upcoming
                                    : ActivityStatus.completed;
                                final updated = item.copyWith(status: newStatus);
                                await widget.controller.updateRoutine(updated);
                                if (newStatus == ActivityStatus.completed) {
                                  SoundService.playChime();
                                }
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        newStatus == ActivityStatus.completed
                                            ? '✅ Completed "${item.title}"!'
                                            : 'Marked "${item.title}" as upcoming',
                                      ),
                                      backgroundColor: newStatus == ActivityStatus.completed
                                          ? const Color(0xFF16A34A)
                                          : Colors.teal.shade800,
                                      duration: const Duration(seconds: 1),
                                      behavior: SnackBarBehavior.floating,
                                    ),
                                  );
                                }
                              },
                            )
                          else
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 4.0),
                              child: Icon(
                                Icons.notifications_active_outlined,
                                color: item.category.color,
                                size: 16,
                              ),
                            ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        item.title,
                                        style: TextStyle(
                                          fontSize: 12.5,
                                          fontWeight: item.requiresCompletionStatus ? FontWeight.bold : FontWeight.w600,
                                          decoration: item.status == ActivityStatus.completed ? TextDecoration.lineThrough : null,
                                          color: item.status == ActivityStatus.completed
                                              ? (isDark ? Colors.grey.shade500 : Colors.grey.shade600)
                                              : (isDark ? Colors.white : Colors.black87),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if (item.requiresCompletionStatus)
                                      Container(
                                        margin: const EdgeInsets.only(left: 4),
                                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                        decoration: BoxDecoration(
                                          color: isDark ? Colors.amber.shade900.withValues(alpha: 0.4) : Colors.amber.shade100,
                                          borderRadius: BorderRadius.circular(4),
                                          border: Border.all(color: isDark ? Colors.amber.shade700 : Colors.amber.shade400, width: 0.8),
                                        ),
                                        child: Text(
                                          '⭐ MAIN',
                                          style: TextStyle(
                                            fontSize: 8.5,
                                            fontWeight: FontWeight.bold,
                                            color: isDark ? Colors.amber.shade300 : Colors.amber.shade900,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                if (item.description.isNotEmpty) ...[
                                  const SizedBox(height: 1),
                                  Text(
                                    item.description,
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                                const SizedBox(height: 3),
                                Row(
                                  children: [
                                    if (item.requiresCompletionStatus)
                                      _buildStatusChip(item.status)
                                    else
                                      Container(
                                        decoration: BoxDecoration(
                                          color: isDark ? Colors.white10 : Colors.blueGrey.withValues(alpha: 0.08),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(Icons.alarm_rounded, size: 9, color: isDark ? Colors.tealAccent : Colors.blueGrey),
                                            const SizedBox(width: 3),
                                            Text(
                                              'REMINDER',
                                              style: TextStyle(
                                                fontSize: 9,
                                                fontWeight: FontWeight.w600,
                                                color: isDark ? Colors.tealAccent : Colors.blueGrey,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    const SizedBox(width: 4),
                                    if (item.reminderEnabled)
                                      Icon(
                                        Icons.notifications_active_rounded,
                                        size: 11,
                                        color: AppColors.primary.withValues(alpha: 0.7),
                                      )
                                    else
                                      Icon(
                                        Icons.notifications_off_rounded,
                                        size: 11,
                                        color: Colors.grey.shade400,
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 4),
                          Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
                                icon: Icon(
                                  _storage.isSeniorCitizen
                                      ? Icons.record_voice_over_rounded
                                      : Icons.more_vert_rounded,
                                  color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                                  size: 16,
                                ),
                                tooltip: _storage.isSeniorCitizen ? 'Voice Alert' : 'Routine Options',
                                onPressed: () {
                                  ScheduleItemOptionsSheet.show(context, item, widget.controller);
                                },
                              ),
                              const SizedBox(height: 1),
                              Icon(
                                item.category.icon,
                                color: item.category.color.withValues(alpha: 0.6),
                                size: 14,
                              ),
                            ],
                          ),
                        ],
                      ),
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

  // Top Banner for Routine Pop-up Notifications (both Senior & Worker)
  Widget _buildVoiceNotificationBanner(BuildContext context) {
    final isSenior = _storage.isSeniorCitizen;
    final enabled = isSenior ? _storage.voicePopupsEnabled : true;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isSenior
              ? (enabled ? [const Color(0xFF4A148C), const Color(0xFF7B1FA2)] : [Colors.grey.shade700, Colors.grey.shade600])
              : [const Color(0xFF00695C), const Color(0xFF00897B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: (isSenior ? Colors.purple : Colors.teal).withValues(alpha: 0.25),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: Colors.white.withValues(alpha: 0.2),
            child: Icon(
              isSenior ? Icons.record_voice_over_rounded : Icons.alarm_on_rounded,
              color: Colors.white,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isSenior ? 'Voice Companion Alerts' : 'Workday Routine Pop-ups',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                Text(
                  isSenior
                    ? (enabled ? 'Spoken Hindi/English reminders active' : 'Voice alerts currently disabled')
                    : 'Focus & health pop-up alerts active',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 10.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton.icon(
            onPressed: () {
              if (isSenior) {
                VoiceNotificationService().testVoicePopup(context, controller: widget.controller);
              } else {
                VoiceNotificationService().testWorkerPopup(
                  context,
                  controller: widget.controller,
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: isSenior ? Colors.black : Colors.teal.shade900,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              visualDensity: VisualDensity.compact,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            icon: const Icon(Icons.play_arrow_rounded, size: 16),
            label: const Text(
              'Test Alert',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(ActivityStatus status) {
    return Container(
      decoration: BoxDecoration(
        color: status.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
      child: Text(
        status.displayName,
        style: TextStyle(
          fontSize: 9.5,
          fontWeight: FontWeight.bold,
          color: status.color,
        ),
      ),
    );
  }

  // Clean empty state with illustration and dual options
  Widget _buildEmptyState(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.calendar_today_outlined,
              size: 80,
              color: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
            ),
            const SizedBox(height: 24),
            Text(
              'No routines scheduled today.',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Add a wellness routine or copy yesterday\'s schedule to stay on track.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pushNamed(context, '/add-routine').then((_) {
                  widget.controller.loadRoutines();
                });
              },
              icon: const Icon(Icons.add),
              label: const Text('Add Routine'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () async {
                await widget.controller.copyYesterdaySchedule();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Copied yesterday\'s routines!')),
                  );
                }
              },
              icon: const Icon(Icons.copy_rounded),
              label: const Text('Copy Yesterday\'s Schedule'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: const BorderSide(color: AppColors.primary),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
