import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../services/sound_service.dart';
import '../../../services/voice_notification_service.dart';
import '../controller/schedule_controller.dart';
import '../models/schedule_model.dart';
import '../screens/edit_routine_screen.dart';

class ScheduleItemOptionsSheet extends StatefulWidget {
  final ScheduleItem item;
  final ScheduleController controller;

  const ScheduleItemOptionsSheet({
    super.key,
    required this.item,
    required this.controller,
  });

  static Future<void> show(
    BuildContext context,
    ScheduleItem item,
    ScheduleController controller,
  ) async {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ScheduleItemOptionsSheet(
        item: item,
        controller: controller,
      ),
    );
  }

  @override
  State<ScheduleItemOptionsSheet> createState() => _ScheduleItemOptionsSheetState();
}

class _ScheduleItemOptionsSheetState extends State<ScheduleItemOptionsSheet> {
  late ScheduleItem _item;

  @override
  void initState() {
    super.initState();
    _item = widget.item;
  }

  Future<void> _updateStatus(ActivityStatus status) async {
    final messenger = ScaffoldMessenger.of(context);
    Navigator.pop(context);

    final updated = _item.copyWith(status: status);
    widget.controller.updateRoutine(updated);

    if (status == ActivityStatus.completed) {
      SoundService.playChime();
    }

    messenger.showSnackBar(
      SnackBar(
        content: Text('Routine "${_item.title}" updated to ${status.displayName}!'),
        backgroundColor: status == ActivityStatus.completed ? const Color(0xFF16A34A) : Colors.teal.shade800,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _snoozeMinutes(int minutes) async {
    final messenger = ScaffoldMessenger.of(context);
    Navigator.pop(context);

    final updatedTime = _addMinutesToTimeString(_item.time, minutes);
    final updated = _item.copyWith(time: updatedTime, status: ActivityStatus.upcoming);
    widget.controller.updateRoutine(updated);
    VoiceNotificationService().resetAlertedItem(_item.id);

    messenger.showSnackBar(
      SnackBar(
        content: Text('⏰ Snoozed "${_item.title}" by $minutes mins to $updatedTime'),
        backgroundColor: const Color(0xFFDC2626),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
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
      await widget.controller.updateRoutine(updated);
      VoiceNotificationService().resetAlertedItem(_item.id);

      if (mounted && context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('🕒 Time updated to $formattedTime for "${_item.title}"'),
            backgroundColor: Colors.teal.shade800,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _toggleReminder(bool val) async {
    final updated = _item.copyWith(reminderEnabled: val);
    setState(() {
      _item = updated;
    });
    await widget.controller.updateRoutine(updated);
    if (!val) {
      VoiceNotificationService().resetAlertedItem(_item.id);
    }
    if (mounted && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(val ? '🔔 Reminder notification enabled' : '🔕 Reminder notification disabled'),
          duration: const Duration(seconds: 1),
        ),
      );
    }
  }

  Future<void> _triggerTestAlert() async {
    Navigator.pop(context);
    await VoiceNotificationService().showWorkerPopup(
      context,
      _item,
      controller: widget.controller,
    );
  }

  void _openFullEdit() {
    Navigator.pop(context);
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => EditRoutineScreen(item: _item),
      ),
    ).then((_) {
      widget.controller.loadRoutines();
    });
  }

  void _confirmDelete() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Delete Routine?'),
        content: Text('Are you sure you want to delete "${_item.title}"?'),
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
            onPressed: () async {
              await widget.controller.deleteRoutine(_item.id);
              if (ctx.mounted) Navigator.pop(ctx);
              if (mounted && context.mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Routine deleted.')),
                );
              }
            },
          ),
        ],
      ),
    );
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isCompleted = _item.status == ActivityStatus.completed;

    return Container(
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        top: 12,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // Header Section
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _item.category.color.withValues(alpha: isDark ? 0.25 : 0.12),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(_item.category.icon, color: _item.category.color, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _item.title,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.black87,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.white10 : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.access_time_filled_rounded, size: 13, color: AppColors.primary),
                                const SizedBox(width: 4),
                                Text(
                                  _item.time,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? Colors.white : Colors.black87,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: _item.status.color.withValues(alpha: isDark ? 0.25 : 0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _item.status.displayName,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: _item.status.color,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),

            if (_item.description.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark ? Colors.white10 : Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isDark ? Colors.white12 : Colors.grey.shade200),
                ),
                child: Text(
                  _item.description,
                  style: TextStyle(fontSize: 13, color: isDark ? Colors.grey.shade300 : Colors.grey.shade700, height: 1.3),
                ),
              ),
            ],

            const SizedBox(height: 18),

            // PRIMARY ACTION: Mark Complete Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: isCompleted ? null : () => _updateStatus(ActivityStatus.completed),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isCompleted ? Colors.grey.shade400 : const Color(0xFF16A34A),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: isCompleted ? 0 : 2,
                ),
                icon: Icon(isCompleted ? Icons.check_circle_rounded : Icons.check_circle_outline_rounded, size: 22),
                label: Text(
                  isCompleted ? 'Completed ✅' : 'Mark as Complete ✅',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ),
            ),

            const SizedBox(height: 18),

            // SNOOZE SECTION
            Text(
              '⏰ Snooze Options (Red Alerts)',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _snoozeMinutes(10),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFDC2626),
                      side: const BorderSide(color: Color(0xFFDC2626), width: 1.3),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('🔴 +10m', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _snoozeMinutes(15),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFDC2626),
                      side: const BorderSide(color: Color(0xFFDC2626), width: 1.3),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('🔴 +15m', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _snoozeMinutes(30),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFDC2626),
                      side: const BorderSide(color: Color(0xFFDC2626), width: 1.3),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('🔴 +30m', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _snoozeMinutes(60),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFDC2626),
                      side: const BorderSide(color: Color(0xFFDC2626), width: 1.3),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('🔴 +1h', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 18),

            // TIME & EDIT SECTION
            Text(
              '🛠️ Edit & Reschedule',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _editTime,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.blue.shade50,
                      foregroundColor: isDark ? Colors.blue.shade300 : Colors.blue.shade900,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: isDark ? Colors.blue.shade800 : Colors.blue.shade200),
                      ),
                    ),
                    icon: const Icon(Icons.edit_calendar_rounded, size: 18),
                    label: const Text('Edit Time 🕒', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _openFullEdit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isDark ? Colors.white10 : Colors.grey.shade100,
                      foregroundColor: isDark ? Colors.white : Colors.black87,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: isDark ? Colors.white24 : Colors.grey.shade300),
                      ),
                    ),
                    icon: const Icon(Icons.edit_note_rounded, size: 18),
                    label: const Text('Edit Routine ✏️', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // STATUS & NOTIFICATION TILES
            Container(
              decoration: BoxDecoration(
                color: isDark ? Colors.white10 : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? Colors.white12 : Colors.grey.shade200),
              ),
              child: Column(
                children: [
                  SwitchListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14),
                    dense: true,
                    title: const Text('Reminder Notification', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: const Text('Trigger chime & pop-up alert at routine time', style: TextStyle(fontSize: 11)),
                    secondary: Icon(
                      _item.reminderEnabled ? Icons.notifications_active_rounded : Icons.notifications_off_rounded,
                      color: _item.reminderEnabled ? Colors.teal : Colors.grey,
                      size: 20,
                    ),
                    value: _item.reminderEnabled,
                    onChanged: _toggleReminder,
                  ),
                  const Divider(height: 1),
                  ListTile(
                    dense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14),
                    leading: const Icon(Icons.play_circle_outline_rounded, color: Colors.purple, size: 20),
                    title: const Text('Test Pop-Up Alert Now', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: const Text('Preview how this routine alerts on screen', style: TextStyle(fontSize: 11)),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.grey),
                    onTap: _triggerTestAlert,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // OTHER STATUS & DELETE
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    TextButton.icon(
                      onPressed: () => _updateStatus(ActivityStatus.upcoming),
                      icon: const Icon(Icons.pending_actions_rounded, size: 16, color: Colors.blueGrey),
                      label: const Text('Pending', style: TextStyle(color: Colors.blueGrey, fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                    TextButton.icon(
                      onPressed: () => _updateStatus(ActivityStatus.skipped),
                      icon: const Icon(Icons.next_plan_rounded, size: 16, color: Colors.orange),
                      label: const Text('Skip', style: TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                TextButton.icon(
                  onPressed: _confirmDelete,
                  icon: const Icon(Icons.delete_outline_rounded, size: 16, color: Colors.redAccent),
                  label: const Text('Delete', style: TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
