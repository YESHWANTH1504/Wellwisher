import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/app_service_locator.dart';
import '../../../services/hydration_service.dart';
import '../../../services/sound_service.dart';
import '../../../services/voice_notification_service.dart';
import '../controller/schedule_controller.dart';
import '../models/schedule_model.dart';

class WorkerNotificationDialog extends StatefulWidget {
  final ScheduleItem item;
  final ScheduleController? controller;

  const WorkerNotificationDialog({
    super.key,
    required this.item,
    this.controller,
  });

  static Future<void> show(
    BuildContext context,
    ScheduleItem item, {
    ScheduleController? controller,
  }) async {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => WorkerNotificationDialog(
        item: item,
        controller: controller,
      ),
    );
  }

  @override
  State<WorkerNotificationDialog> createState() => _WorkerNotificationDialogState();
}

class _WorkerNotificationDialogState extends State<WorkerNotificationDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  late ScheduleItem _currentItem;

  @override
  void initState() {
    super.initState();
    _currentItem = widget.item;

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.12).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  ScheduleController get _controller => widget.controller ?? AppServiceLocator().scheduleController;

  bool get _isHydrationItem =>
      _currentItem.category == ActivityCategory.waterReminder ||
      _currentItem.title.toLowerCase().contains('hydration') ||
      _currentItem.title.toLowerCase().contains('water');

  Future<void> _markCompleted() async {
    final messenger = ScaffoldMessenger.of(context);
    Navigator.of(context, rootNavigator: true).pop();

    if (_isHydrationItem) {
      final portion = HydrationService().portionMl;
      await HydrationService().logWater(
        portion,
        playSound: true,
        checkGoal: true,
        source: 'worker_dialog',
      );
    } else {
      SoundService.playChime();
    }

    final updated = _currentItem.copyWith(status: ActivityStatus.completed);
    _controller.updateRoutine(updated);
    VoiceNotificationService().resetAlertedItem(_currentItem.id);

    messenger.showSnackBar(
      SnackBar(
        content: Text(_isHydrationItem
            ? '💧 +${HydrationService().portionMl}ml Water logged! Total: ${HydrationService().dailyHydrationTotalMl}ml'
            : '✅ Completed "${_currentItem.title}"!'),
        backgroundColor: const Color(0xFF16A34A),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _snooze(int minutes) async {
    final messenger = ScaffoldMessenger.of(context);
    Navigator.of(context, rootNavigator: true).pop();

    final updatedTime = _addMinutesToTimeString(_currentItem.time, minutes);
    final updated = _currentItem.copyWith(
      time: updatedTime,
      status: ActivityStatus.upcoming,
    );
    _controller.updateRoutine(updated);
    VoiceNotificationService().resetAlertedItem(_currentItem.id);

    messenger.showSnackBar(
      SnackBar(
        content: Text('⏰ Snoozed "${_currentItem.title}" for $minutes mins (New time: $updatedTime)'),
        backgroundColor: const Color(0xFFDC2626),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _editTime() async {
    final initial = _parseTimeOfDay(_currentItem.time);
    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
    );

    if (picked != null && mounted) {
      final localizations = MaterialLocalizations.of(context);
      final formattedTime = localizations.formatTimeOfDay(picked, alwaysUse24HourFormat: false);
      final updated = _currentItem.copyWith(
        time: formattedTime,
        status: ActivityStatus.upcoming,
      );
      await _controller.updateRoutine(updated);
      VoiceNotificationService().resetAlertedItem(_currentItem.id);

      if (mounted && context.mounted) {
        Navigator.of(context, rootNavigator: true).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('🕒 Rescheduled "${_currentItem.title}" to $formattedTime'),
            backgroundColor: Colors.teal.shade800,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  String _addMinutesToTimeString(String timeStr, int minutes) {
    try {
      final tod = _parseTimeOfDay(timeStr);
      int totalMinutes = tod.hour * 60 + tod.minute + minutes;
      int newHour = (totalMinutes ~/ 60) % 24;
      int newMinute = totalMinutes % 60;

      final isPm = newHour >= 12;
      int displayHour = newHour > 12 ? newHour - 12 : (newHour == 0 ? 12 : newHour);
      final minuteStr = newMinute.toString().padLeft(2, '0');
      final hourStr = displayHour.toString().padLeft(2, '0');
      final period = isPm ? 'PM' : 'AM';
      return '$hourStr:$minuteStr $period';
    } catch (_) {
      return timeStr;
    }
  }

  TimeOfDay _parseTimeOfDay(String timeStr) {
    try {
      final clean = timeStr.trim();
      final parts = clean.split(RegExp(r'\s+'));
      final hm = parts[0].split(':');
      int hour = int.parse(hm[0]);
      int minute = int.parse(hm[1]);
      final isPm = parts.length > 1 && parts[1].toUpperCase() == 'PM';
      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour == 12) hour = 0;
      return TimeOfDay(hour: hour, minute: minute);
    } catch (_) {
      return TimeOfDay.now();
    }
  }

  LinearGradient _getGradient(ActivityCategory category) {
    switch (category) {
      case ActivityCategory.waterReminder:
        return const LinearGradient(
          colors: [Color(0xFF00796B), Color(0xFF00ACC1)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case ActivityCategory.eyeCare:
        return const LinearGradient(
          colors: [Color(0xFF0D47A1), Color(0xFF1976D2)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case ActivityCategory.meal:
      case ActivityCategory.breakfast:
        return const LinearGradient(
          colors: [Color(0xFFE65100), Color(0xFFFB8C00)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case ActivityCategory.stretchBreak:
      case ActivityCategory.exercise:
        return const LinearGradient(
          colors: [Color(0xFF2E7D32), Color(0xFF43A047)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      default:
        return const LinearGradient(
          colors: [Color(0xFF004D40), Color(0xFF00897B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final gradient = _getGradient(_currentItem.category);

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      elevation: 12,
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top Header
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                decoration: BoxDecoration(gradient: gradient),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: _currentItem.requiresCompletionStatus
                                ? Colors.amber.shade400.withValues(alpha: 0.95)
                                : Colors.white.withValues(alpha: 0.22),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                _currentItem.requiresCompletionStatus ? Icons.star_rounded : Icons.notifications_active_rounded,
                                color: _currentItem.requiresCompletionStatus ? Colors.black87 : Colors.white,
                                size: 14,
                              ),
                              const SizedBox(width: 5),
                              Text(
                                _currentItem.requiresCompletionStatus
                                    ? '⭐ MAIN MEAL (STATUS REQUIRED)'
                                    : '🔔 NOTIFICATION REMINDER',
                                style: TextStyle(
                                  color: _currentItem.requiresCompletionStatus ? Colors.black87 : Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 10,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          constraints: const BoxConstraints(),
                          padding: EdgeInsets.zero,
                          icon: const Icon(Icons.close_rounded, color: Colors.white, size: 20),
                          tooltip: 'Dismiss',
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ScaleTransition(
                      scale: _pulseAnimation,
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.15),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Icon(
                          _currentItem.category.icon,
                          size: 26,
                          color: _currentItem.category.color,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.95),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '⏰ ${_currentItem.time}',
                        style: const TextStyle(
                          color: Colors.black87,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Content Body
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 14, 18, 16),
                child: Column(
                  children: [
                    Text(
                      _currentItem.title,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    if (_currentItem.description.isNotEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Text(
                          _currentItem.description,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade800,
                            height: 1.3,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    const SizedBox(height: 14),

                    // Action Buttons:
                    // For the 3 Main Meals (Breakfast, Lunch, Dinner): Green (Mark Complete) & Red (Snooze 10m)
                    // For Reminders: "Got it / Dismiss" & Snooze
                    if (_currentItem.requiresCompletionStatus || _isHydrationItem)
                      Row(
                        children: [
                          // 1. Green Button: Mark as Complete / Drank Water
                          Expanded(
                            child: SizedBox(
                              height: 46,
                              child: ElevatedButton.icon(
                                onPressed: _markCompleted,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF16A34A), // Vibrant Green
                                  foregroundColor: Colors.white,
                                  elevation: 3,
                                  padding: const EdgeInsets.symmetric(horizontal: 6),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                icon: Icon(_isHydrationItem ? Icons.water_drop_rounded : Icons.check_circle_rounded, size: 17, color: Colors.white),
                                label: FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    _isHydrationItem ? '💧 +${HydrationService().portionMl}ml Drank' : 'Mark Complete ✅',
                                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // 2. Red Button: Snooze (10m)
                          Expanded(
                            child: SizedBox(
                              height: 46,
                              child: ElevatedButton.icon(
                                onPressed: () => _snooze(10),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFDC2626), // Vibrant Red
                                  foregroundColor: Colors.white,
                                  elevation: 3,
                                  padding: const EdgeInsets.symmetric(horizontal: 6),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                icon: const Icon(Icons.snooze_rounded, size: 17, color: Colors.white),
                                label: const FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    'Snooze (10m) ⏰',
                                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      )
                    else
                      Row(
                        children: [
                          // Primary Dismiss / Acknowledge Reminder
                          Expanded(
                            flex: 6,
                            child: SizedBox(
                              height: 46,
                              child: ElevatedButton.icon(
                                onPressed: () => Navigator.of(context, rootNavigator: true).pop(),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  elevation: 2,
                                  padding: const EdgeInsets.symmetric(horizontal: 6),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                icon: const Icon(Icons.notifications_off_rounded, size: 16, color: Colors.white),
                                label: const FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    'Got it / Dismiss 🔔',
                                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Red Snooze
                          Expanded(
                            flex: 4,
                            child: SizedBox(
                              height: 46,
                              child: ElevatedButton.icon(
                                onPressed: () => _snooze(10),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFDC2626),
                                  foregroundColor: Colors.white,
                                  elevation: 2,
                                  padding: const EdgeInsets.symmetric(horizontal: 4),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                icon: const Icon(Icons.snooze_rounded, size: 15, color: Colors.white),
                                label: const FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    'Snooze 10m',
                                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),

                    const SizedBox(height: 10),

                    // Secondary Options Row: Edit Time & Dismiss
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        OutlinedButton.icon(
                          onPressed: _editTime,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: const BorderSide(color: AppColors.primary, width: 1.2),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          icon: const Icon(Icons.edit_calendar_rounded, size: 15),
                          label: const Text(
                            'Edit Time 🕒',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                          ),
                        ),
                        TextButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: Text(
                            'Dismiss Alert',
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
