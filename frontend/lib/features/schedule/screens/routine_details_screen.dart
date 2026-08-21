import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/app_service_locator.dart';
import '../../../services/local_storage_service.dart';
import '../../../services/sound_service.dart';
import '../models/schedule_model.dart';
import '../controller/schedule_controller.dart';

class RoutineDetailsScreen extends StatefulWidget {
  final ScheduleItem item;

  const RoutineDetailsScreen({super.key, required this.item});

  @override
  State<RoutineDetailsScreen> createState() => _RoutineDetailsScreenState();
}

class _RoutineDetailsScreenState extends State<RoutineDetailsScreen> {
  late ScheduleItem _item;
  final LocalStorageService _storage = LocalStorageService();

  @override
  void initState() {
    super.initState();
    _item = widget.item;
  }

  ScheduleController get _controller => AppServiceLocator().scheduleController;

  bool get _isHydrationItem =>
      _item.category == ActivityCategory.waterReminder ||
      _item.title.toLowerCase().contains('hydration') ||
      _item.title.toLowerCase().contains('water');

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isCompleted = _item.status == ActivityStatus.completed;
    final isSkipped = _item.status == ActivityStatus.skipped;
    final isMissed = _item.status == ActivityStatus.missed;
    final isSenior = _storage.isSeniorCitizen;
    final primaryColor = isSenior ? Colors.purple.shade700 : AppColors.primary;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF121212) : Colors.grey.shade50,
      appBar: AppBar(
        title: Text(
          isSenior ? '👵 Activity & Care Details' : '💼 Schedule Item Details',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Edit Routine',
            onPressed: () {
              Navigator.pushReplacementNamed(
                context,
                '/edit-routine',
                arguments: _item,
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent),
            tooltip: 'Delete Routine',
            onPressed: () => _confirmDelete(context),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Hero Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: theme.cardColor,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
                border: Border.all(color: isDark ? Colors.white12 : Colors.grey.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _item.category.color.withValues(alpha: isDark ? 0.25 : 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(_item.category.icon, color: _item.category.color, size: 30),
                      ),
                      _buildStatusChip(_item.status),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _item.title,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : Colors.black87,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white10 : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.access_time_filled_rounded, color: Colors.blueGrey, size: 16),
                            const SizedBox(width: 6),
                            Text(
                              _item.time,
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white10 : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.calendar_month_rounded, color: isDark ? Colors.tealAccent : Colors.blueGrey, size: 16),
                            const SizedBox(width: 6),
                            Text(
                              "${_item.date.day}/${_item.date.month}/${_item.date.year}",
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isDark ? Colors.white : Colors.black87),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Hydration Quick Action Card (if water/hydration item)
            if (_isHydrationItem)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.blue.shade600, Colors.teal.shade500],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.blue.withValues(alpha: 0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.water_drop_rounded, color: Colors.blueAccent, size: 24),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '💧 Hydration Target: 250ml',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Drink 1 glass of fresh water to boost focus & energy',
                            style: TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: Colors.blue.shade900,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {
                        _updateStatus(ActivityStatus.completed);
                      },
                      child: const Text(
                        'Drink & Log',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),

            // Activity Description Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: theme.cardColor,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: isDark ? Colors.white12 : Colors.grey.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.notes_rounded, size: 18, color: isDark ? Colors.grey.shade400 : Colors.grey),
                      const SizedBox(width: 8),
                      Text(
                        'Activity Description & Notes',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: isDark ? Colors.grey.shade400 : Colors.grey),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    _item.description.isNotEmpty
                        ? _item.description
                        : 'No additional notes provided for this activity.',
                    style: TextStyle(fontSize: 15, color: isDark ? Colors.white : Colors.black87, height: 1.4),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // PRIMARY ACTIONS (Mark Complete / Snooze)
            Text(
              'Quick Actions',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87),
            ),
            const SizedBox(height: 12),

            // Big "Mark as Complete" Button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: isCompleted ? null : () => _updateStatus(ActivityStatus.completed),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isCompleted ? Colors.grey.shade400 : const Color(0xFF16A34A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: isCompleted ? 0 : 3,
                ),
                icon: Icon(isCompleted ? Icons.check_circle_rounded : Icons.check_circle_outline_rounded, size: 22),
                label: Text(
                  isCompleted ? 'Completed ✅' : 'Mark as Complete ✅',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Snooze Buttons & Time Adjust Row (Responsive layout)
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _snoozeMinutes(15),
                    icon: const Icon(Icons.snooze_rounded, color: Color(0xFFDC2626), size: 16),
                    label: const FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text('🔴 Snooze 15m', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFDC2626),
                      side: const BorderSide(color: Color(0xFFDC2626), width: 1.2),
                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _snoozeMinutes(30),
                    icon: const Icon(Icons.snooze_rounded, color: Color(0xFFDC2626), size: 16),
                    label: const FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text('🔴 Snooze 30m', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFDC2626),
                      side: const BorderSide(color: Color(0xFFDC2626), width: 1.2),
                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: _editTime,
                  icon: const Icon(Icons.edit_calendar_rounded, size: 15),
                  label: const FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text('Edit Time', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: primaryColor,
                    side: BorderSide(color: primaryColor, width: 1.2),
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // SECONDARY ACTIONS (In Progress / Skip / Missed)
            const Text(
              'Other Status Options',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(height: 10),

            Row(
              children: [
                Expanded(
                  child: _buildSecondaryActionButton(
                    label: 'Pending',
                    icon: Icons.pending_actions_rounded,
                    color: Colors.blue.shade700,
                    isSelected: _item.status == ActivityStatus.pending,
                    onPressed: () => _updateStatus(ActivityStatus.pending),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildSecondaryActionButton(
                    label: 'Skip',
                    icon: Icons.next_plan_rounded,
                    color: Colors.blueGrey,
                    isSelected: isSkipped,
                    onPressed: () => _updateStatus(ActivityStatus.skipped),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildSecondaryActionButton(
                    label: 'Missed',
                    icon: Icons.cancel_outlined,
                    color: Colors.red.shade600,
                    isSelected: isMissed,
                    onPressed: () => _updateStatus(ActivityStatus.missed),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Voice & Notification Reminder Tile
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: SwitchListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                title: const Text('Schedule Notifications', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                subtitle: const Text('Receive sound chime & status bar alerts for this routine', style: TextStyle(fontSize: 11)),
                secondary: Icon(
                  _item.reminderEnabled ? Icons.notifications_active_rounded : Icons.notifications_off_rounded,
                  color: _item.reminderEnabled ? primaryColor : Colors.grey,
                ),
                value: _item.reminderEnabled,
                onChanged: (val) {
                  final updated = _item.copyWith(reminderEnabled: val);
                  setState(() {
                    _item = updated;
                  });
                  _controller.updateRoutine(updated);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(val ? '🔔 Notification enabled' : '🔕 Notification disabled'),
                      duration: const Duration(seconds: 1),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(ActivityStatus status) {
    return Container(
      decoration: BoxDecoration(
        color: status.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.circle, color: status.color, size: 8),
          const SizedBox(width: 6),
          Text(
            status.displayName.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: status.color,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSecondaryActionButton({
    required String label,
    required IconData icon,
    required Color color,
    required bool isSelected,
    required VoidCallback onPressed,
  }) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, color: isSelected ? Colors.white : color, size: 16),
      label: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : color,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
      ),
      style: OutlinedButton.styleFrom(
        backgroundColor: isSelected ? color : color.withValues(alpha: 0.05),
        side: BorderSide(color: isSelected ? color : color.withValues(alpha: 0.3), width: 1.2),
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  void _updateStatus(ActivityStatus status) {
    final messenger = ScaffoldMessenger.of(context);
    Navigator.pop(context);

    final updated = _item.copyWith(status: status);
    _controller.updateRoutine(updated);

    if (status == ActivityStatus.completed) {
      SoundService.playChime();
    }

    messenger.showSnackBar(
      SnackBar(
        content: Text('Routine "${_item.title}" updated to ${status.displayName}!'),
        backgroundColor: status == ActivityStatus.completed ? const Color(0xFF16A34A) : Colors.teal,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _snoozeMinutes(int minutes) {
    try {
      final clean = _item.time.replaceAll(RegExp(r'[^\d:APMapm\s]'), '').trim();
      final parts = clean.split(RegExp(r'\s+'));
      final hm = parts[0].split(':');
      int hour = int.parse(hm[0]);
      int minute = int.parse(hm[1]);
      String period = parts.length > 1 ? parts[1].toUpperCase() : 'AM';

      minute += minutes;
      while (minute >= 60) {
        minute -= 60;
        hour += 1;
        if (hour == 12) {
          period = period == 'AM' ? 'PM' : 'AM';
        } else if (hour > 12) {
          hour = 1;
        }
      }

      final minuteStr = minute.toString().padLeft(2, '0');
      final hourStr = hour.toString().padLeft(2, '0');
      final newTimeStr = "$hourStr:$minuteStr $period";

      final messenger = ScaffoldMessenger.of(context);
      Navigator.pop(context);

      final updated = _item.copyWith(time: newTimeStr, status: ActivityStatus.upcoming);
      _controller.updateRoutine(updated);

      messenger.showSnackBar(
        SnackBar(
          content: Text('Routine snoozed by $minutes mins to $newTimeStr ⏰'),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to snooze routine')),
      );
    }
  }

  Future<void> _editTime() async {
    final initial = _parseTimeOfDay(_item.time);
    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
    );

    if (picked != null && mounted) {
      final localizations = MaterialLocalizations.of(context);
      final formattedTime = localizations.formatTimeOfDay(picked, alwaysUse24HourFormat: false);
      final updated = _item.copyWith(time: formattedTime, status: ActivityStatus.upcoming);
      setState(() {
        _item = updated;
      });
      _controller.updateRoutine(updated);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('🕒 Rescheduled "${_item.title}" to $formattedTime'),
            backgroundColor: Colors.teal.shade800,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  TimeOfDay _parseTimeOfDay(String timeStr) {
    try {
      final clean = timeStr.replaceAll(RegExp(r'[^\d:APMapm\s]'), '').trim();
      final parts = clean.split(RegExp(r'\s+'));
      final hm = parts[0].split(':');
      int hour = int.parse(hm[0]);
      final int minute = int.parse(hm[1]);
      final isPm = parts.length > 1 && parts[1].toUpperCase() == 'PM';
      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour == 12) hour = 0;
      return TimeOfDay(hour: hour, minute: minute);
    } catch (_) {
      return const TimeOfDay(hour: 9, minute: 0);
    }
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Delete Routine?'),
        content: Text('Are you sure you want to delete "${_item.title}"? This action cannot be undone.'),
        actions: [
          TextButton(
            child: const Text('Cancel'),
            onPressed: () => Navigator.pop(ctx),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Delete'),
            onPressed: () {
              _controller.deleteRoutine(_item.id);
              Navigator.pop(ctx); // Close dialog
              Navigator.pop(context); // Close details screen
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Routine deleted.')),
              );
            },
          ),
        ],
      ),
    );
  }
}
