import 'package:flutter/material.dart';
import '../../schedule/controller/schedule_controller.dart';
import '../../schedule/models/schedule_model.dart';
import '../../schedule/widgets/voice_schedule_composer_modal.dart';

class PlanningScreen extends StatefulWidget {
  final ScheduleController controller;

  const PlanningScreen({super.key, required this.controller});

  @override
  State<PlanningScreen> createState() => _PlanningScreenState();
}

class _PlanningScreenState extends State<PlanningScreen> {
  DateTime get _selectedDate => widget.controller.selectedDate;
  late DateTime _focusedMonth;

  @override
  void initState() {
    super.initState();
    _focusedMonth = DateTime(widget.controller.selectedDate.year, widget.controller.selectedDate.month, 1);
    widget.controller.addListener(_onControllerUpdated);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      widget.controller.loadRoutines();
    });
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onControllerUpdated);
    super.dispose();
  }

  void _onControllerUpdated() {
    if (mounted) {
      setState(() {});
    }
  }

  void _changeDate(DateTime date) {
    setState(() {
      _focusedMonth = DateTime(date.year, date.month, 1);
    });
    widget.controller.setSelectedDate(date);
  }

  void _prevMonth() {
    setState(() {
      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month - 1, 1);
    });
  }

  void _nextMonth() {
    setState(() {
      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 1);
    });
  }

  void _jumpToToday() {
    final now = DateTime.now();
    _changeDate(now);
  }

  void _openAddPlanBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddPlanBottomSheet(
        selectedDate: _selectedDate,
        onPlansAdded: (List<ScheduleItem> newItems, String scopeDescription) async {
          await widget.controller.addMultipleRoutines(newItems);
          if (mounted) {
            final title = newItems.isNotEmpty ? newItems.first.title : 'Plan';
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Plan "$title" scheduled for $scopeDescription (${newItems.length} days)! ✅'),
                backgroundColor: Colors.teal.shade700,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
      ),
    );
  }

  Future<void> _quickAddTemplate(String title, String time, ActivityCategory category, String description) async {
    final newItem = ScheduleItem(
      id: '${DateTime.now().millisecondsSinceEpoch}_tpl',
      title: title,
      description: description,
      time: time,
      category: category,
      status: ActivityStatus.upcoming,
      date: _selectedDate,
      reminderEnabled: true,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    await widget.controller.addNewRoutine(newItem);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Scheduled "$title" at $time for ${_formatDateShort(_selectedDate)}!'),
          backgroundColor: Colors.teal,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  String _formatDateShort(DateTime dt) {
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  String _formatDateFull(DateTime dt) {
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final weekday = weekdays[dt.weekday - 1];
    final month = months[dt.month - 1];
    return '$weekday, $month ${dt.day}, ${dt.year}';
  }

  String _getMonthYearHeader(DateTime dt) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return '${months[dt.month - 1]} ${dt.year}';
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  List<DateTime> _getMonthDaysGrid(DateTime monthDate) {
    final firstDayOfMonth = DateTime(monthDate.year, monthDate.month, 1);
    final lastDayOfMonth = DateTime(monthDate.year, monthDate.month + 1, 0);

    // Monday-first grid: Monday=1 -> offset=0, Sunday=7 -> offset=6
    final leadingOffset = firstDayOfMonth.weekday - 1;
    final startDate = firstDayOfMonth.subtract(Duration(days: leadingOffset));

    final totalDays = ((leadingOffset + lastDayOfMonth.day) / 7).ceil() * 7;
    final List<DateTime> days = [];
    for (int i = 0; i < totalDays; i++) {
      days.add(DateTime(startDate.year, startDate.month, startDate.day + i));
    }
    return days;
  }

  List<ScheduleItem> _getTasksForDay(DateTime day) {
    return widget.controller.repository.allLocalItems.where((item) =>
      item.date.year == day.year &&
      item.date.month == day.month &&
      item.date.day == day.day &&
      item.deletedAt == null
    ).toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final routines = widget.controller.currentRoutines;
    final isLoading = widget.controller.isLoading;

    final completedCount = routines.where((r) => r.status == ActivityStatus.completed).length;
    final totalCount = routines.length;
    final progress = totalCount == 0 ? 0.0 : completedCount / totalCount;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Daily Wellness Planner'),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.today_rounded),
            tooltip: 'Jump to Today',
            onPressed: _jumpToToday,
          ),
        ],
      ),
      body: SafeArea(
        child: isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Full Interactive Calendar Chart Card
                    _buildCalendarChartCard(theme, primaryColor),

                    const SizedBox(height: 16),

                    // Daily Target Summary Card for Selected Date
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [primaryColor, primaryColor.withBlue(230)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: primaryColor.withValues(alpha: 0.28),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.event_note_rounded, color: Colors.white70, size: 14),
                                    const SizedBox(width: 5),
                                    Text(
                                      _isSameDay(_selectedDate, DateTime.now())
                                          ? "Today's Target"
                                          : 'Target for ${_formatDateShort(_selectedDate)}',
                                      style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '$completedCount of $totalCount Completed',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 17,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              SizedBox(
                                width: 48,
                                height: 48,
                                child: CircularProgressIndicator(
                                  value: progress,
                                  strokeWidth: 5.5,
                                  backgroundColor: Colors.white24,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                '${(progress * 100).toInt()}%',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),

                    // + Schedule Tasks Row: Manual Plan and AI Voice Plan
                    Row(
                      children: [
                        Expanded(
                          flex: 5,
                          child: ElevatedButton.icon(
                            onPressed: _openAddPlanBottomSheet,
                            icon: const Icon(Icons.add_task_rounded, size: 17),
                            label: Text(
                              _isSameDay(_selectedDate, DateTime.now())
                                  ? '+ Plan for Today'
                                  : '+ Plan (${_formatDateShort(_selectedDate)})',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: primaryColor,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              elevation: 2,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 5,
                          child: ElevatedButton.icon(
                            onPressed: () {
                              VoiceScheduleComposerModal.show(
                                context,
                                controller: widget.controller,
                                initialDate: _selectedDate,
                              );
                            },
                            icon: const Icon(Icons.mic_rounded, size: 18),
                            label: const Text(
                              '🎙️ Speak Plan',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF4F46E5),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              elevation: 2,
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 18),

                    // Quick Templates Header
                    Text(
                      'Quick Wellness Templates (1-Tap Add)',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Responsive Quick Template Cards Row
                    Row(
                      children: [
                        Expanded(
                          child: _QuickTemplateCard(
                            title: 'Hydration Target',
                            time: '10:00 AM',
                            icon: Icons.water_drop_rounded,
                            color: Colors.teal,
                            onTap: () => _quickAddTemplate(
                              'Drink Water (500ml)',
                              '10:00 AM',
                              ActivityCategory.breakfast,
                              'Hydration break',
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _QuickTemplateCard(
                            title: '30-Min Workout',
                            time: '06:00 PM',
                            icon: Icons.fitness_center_rounded,
                            color: Colors.amber.shade800,
                            onTap: () => _quickAddTemplate(
                              '30-Min Workout',
                              '06:00 PM',
                              ActivityCategory.exercise,
                              'Daily exercise session',
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 18),

                    // Scheduled Plans Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            'Scheduled Plans ($totalCount)',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: primaryColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _formatDateFull(_selectedDate),
                            style: TextStyle(
                              color: primaryColor,
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Routines List
                    if (routines.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(22),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          children: [
                            Icon(Icons.event_available_rounded, size: 40, color: Colors.grey[400]),
                            const SizedBox(height: 8),
                            Text(
                              'No plans scheduled for ${_formatDateShort(_selectedDate)}',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black54, fontSize: 13),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Tap "+ Schedule Task" or tap any template above to plan this day!',
                              style: TextStyle(fontSize: 11.5, color: Colors.grey),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      )
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: routines.length,
                        itemBuilder: (context, index) {
                          final item = routines[index];
                          return _PlanItemTile(
                            item: item,
                            onToggleStatus: () async {
                              final newStatus = item.status == ActivityStatus.completed
                                  ? ActivityStatus.upcoming
                                  : ActivityStatus.completed;
                              final updated = item.copyWith(status: newStatus);
                              await widget.controller.updateRoutine(updated);
                            },
                            onDelete: () async {
                              await widget.controller.deleteRoutine(item.id);
                            },
                          );
                        },
                      ),
                  ],
                ),
              ),
      ),
    );
  }

  // Interactive Month Calendar Chart Card Widget
  Widget _buildCalendarChartCard(ThemeData theme, Color primaryColor) {
    final isDark = theme.brightness == Brightness.dark;
    final daysInGrid = _getMonthDaysGrid(_focusedMonth);
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return Container(
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white12 : Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      child: Column(
        children: [
          // Calendar Header: Month + Navigation Controls
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: primaryColor.withValues(alpha: isDark ? 0.25 : 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(Icons.calendar_month_rounded, color: primaryColor, size: 18),
                  ),
                    const SizedBox(width: 8),
                    Text(
                      _getMonthYearHeader(_focusedMonth),
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : Colors.black87,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    // Jump to today chip if not viewing current month
                    if (!_isSameDay(_selectedDate, DateTime.now()))
                      Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: InkWell(
                          onTap: _jumpToToday,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.white10 : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isDark ? Colors.white24 : Colors.grey.shade300),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.today_rounded, size: 12, color: isDark ? Colors.white : Colors.black87),
                                const SizedBox(width: 4),
                                Text(
                                  'Today',
                                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black87),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    // Previous Month Button
                    IconButton(
                      icon: const Icon(Icons.chevron_left_rounded, size: 22),
                      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                      padding: EdgeInsets.zero,
                      tooltip: 'Previous Month',
                      onPressed: _prevMonth,
                    ),
                    // Next Month Button
                    IconButton(
                      icon: const Icon(Icons.chevron_right_rounded, size: 22),
                      constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                      padding: EdgeInsets.zero,
                      tooltip: 'Next Month',
                      onPressed: _nextMonth,
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Weekday Header Row
            Container(
              padding: const EdgeInsets.symmetric(vertical: 6),
              decoration: BoxDecoration(
                color: isDark ? Colors.white10 : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: weekdays.map((day) {
                  final isWeekend = day == 'Sat' || day == 'Sun';
                  return Expanded(
                    child: Text(
                      day,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isWeekend ? Colors.red.shade400 : (isDark ? Colors.grey.shade400 : Colors.grey.shade700),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 8),

            // Month Days Grid (7 Columns)
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: daysInGrid.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 7,
                mainAxisSpacing: 4,
                crossAxisSpacing: 4,
                childAspectRatio: 1.15,
              ),
              itemBuilder: (context, index) {
                final day = daysInGrid[index];
                final isCurrentMonth = day.month == _focusedMonth.month;
                final isSelected = _isSameDay(day, _selectedDate);
                final isToday = _isSameDay(day, DateTime.now());
                final dayTasks = _getTasksForDay(day);
                final hasTasks = dayTasks.isNotEmpty;
                final hasCompletedTasks = dayTasks.any((x) => x.status == ActivityStatus.completed);

                return InkWell(
                  onTap: () => _changeDate(day),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isSelected
                          ? primaryColor
                          : (isToday ? primaryColor.withValues(alpha: isDark ? 0.2 : 0.1) : Colors.transparent),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? primaryColor
                            : (isToday ? primaryColor.withValues(alpha: 0.6) : Colors.transparent),
                        width: isToday && !isSelected ? 1.4 : 1.0,
                      ),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: primaryColor.withValues(alpha: 0.35),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ]
                          : null,
                    ),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Padding(
                        padding: const EdgeInsets.all(2.0),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${day.day}',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: isSelected || isToday ? FontWeight.bold : FontWeight.w500,
                                color: isSelected
                                    ? Colors.white
                                    : (!isCurrentMonth
                                        ? (isDark ? Colors.grey.shade700 : Colors.grey.shade300)
                                        : (isToday ? primaryColor : (isDark ? Colors.white : Colors.black87))),
                              ),
                            ),
                            const SizedBox(height: 2),
                            // Task Indicator Dot(s)
                            if (hasTasks)
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 4.5,
                                    height: 4.5,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: isSelected
                                          ? Colors.white
                                          : (hasCompletedTasks ? const Color(0xFF16A34A) : Colors.orange.shade700),
                                    ),
                                  ),
                                  if (dayTasks.length > 1) ...[
                                    const SizedBox(width: 2),
                                    Container(
                                      width: 3.5,
                                      height: 3.5,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: isSelected
                                            ? Colors.white70
                                            : (isCurrentMonth ? primaryColor : Colors.grey.shade400),
                                      ),
                                    ),
                                  ],
                                ],
                              )
                            else
                              const SizedBox(height: 4.5),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),

            const SizedBox(height: 6),
            // Quick Calendar Footer / Selected Date Indicator
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: isDark ? Colors.white10 : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.touch_app_rounded, size: 12, color: isDark ? Colors.grey.shade400 : Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        'Selected: ${_formatDateFull(_selectedDate)}',
                        style: TextStyle(fontSize: 10.5, color: isDark ? Colors.grey.shade300 : Colors.grey.shade800, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  Text(
                    '${_getTasksForDay(_selectedDate).length} task(s)',
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.bold,
                      color: _getTasksForDay(_selectedDate).isNotEmpty ? primaryColor : (isDark ? Colors.grey.shade400 : Colors.grey),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }
}

class _QuickTemplateCard extends StatelessWidget {
  final String title;
  final String time;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _QuickTemplateCard({
    required this.title,
    required this.time,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    time,
                    style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
            Icon(Icons.add_circle_outline_rounded, color: color, size: 18),
          ],
        ),
      ),
    );
  }
}

class _PlanItemTile extends StatelessWidget {
  final ScheduleItem item;
  final VoidCallback onToggleStatus;
  final VoidCallback onDelete;

  const _PlanItemTile({
    required this.item,
    required this.onToggleStatus,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final isCompleted = item.status == ActivityStatus.completed;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: ListTile(
        dense: true,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isCompleted ? Colors.green.shade50 : Colors.blue.shade50,
            shape: BoxShape.circle,
          ),
          child: Icon(
            _getCategoryIcon(item.category),
            color: isCompleted ? Colors.green : Colors.blueAccent,
            size: 20,
          ),
        ),
        title: Text(
          item.title,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
            decoration: isCompleted ? TextDecoration.lineThrough : null,
            color: isCompleted ? Colors.grey : Colors.black87,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          '${item.time} • ${item.category.displayName}',
          style: TextStyle(fontSize: 11, color: Colors.grey[600]),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: Icon(
                isCompleted ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                color: isCompleted ? Colors.green : Colors.grey,
              ),
              onPressed: onToggleStatus,
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent, size: 20),
              onPressed: onDelete,
            ),
          ],
        ),
      ),
    );
  }

  IconData _getCategoryIcon(ActivityCategory category) {
    switch (category) {
      case ActivityCategory.wakeUp:
        return Icons.wb_sunny_rounded;
      case ActivityCategory.breakfast:
        return Icons.restaurant_rounded;
      case ActivityCategory.medicine:
        return Icons.medication_rounded;
      case ActivityCategory.exercise:
        return Icons.fitness_center_rounded;
      case ActivityCategory.meal:
        return Icons.lunch_dining_rounded;
      case ActivityCategory.office:
        return Icons.work_rounded;
      case ActivityCategory.sleep:
        return Icons.bedtime_rounded;
      case ActivityCategory.eyeCare:
        return Icons.remove_red_eye_rounded;
      case ActivityCategory.stretchBreak:
        return Icons.directions_walk_rounded;
      default:
        return Icons.event_note_rounded;
    }
  }
}

enum PlanRepeatOption {
  todayOnly,
  specificDay,
  wholeWeek,
  selectiveDays,
}

class _AddPlanBottomSheet extends StatefulWidget {
  final DateTime selectedDate;
  final Function(List<ScheduleItem> newItems, String scopeDescription) onPlansAdded;

  const _AddPlanBottomSheet({
    required this.selectedDate,
    required this.onPlansAdded,
  });

  @override
  State<_AddPlanBottomSheet> createState() => _AddPlanBottomSheetState();
}

class _AddPlanBottomSheetState extends State<_AddPlanBottomSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  TimeOfDay _selectedTime = TimeOfDay.now();
  ActivityCategory _selectedCategory = ActivityCategory.custom;
  bool _reminderEnabled = true;

  PlanRepeatOption _repeatOption = PlanRepeatOption.todayOnly;
  late DateTime _specificDate;
  final Set<int> _selectedWeekdays = {1, 2, 3, 4, 5}; // Default Mon-Fri

  final List<Map<String, dynamic>> _weekdaysList = [
    {'day': 1, 'label': 'Mon', 'fullName': 'Monday'},
    {'day': 2, 'label': 'Tue', 'fullName': 'Tuesday'},
    {'day': 3, 'label': 'Wed', 'fullName': 'Wednesday'},
    {'day': 4, 'label': 'Thu', 'fullName': 'Thursday'},
    {'day': 5, 'label': 'Fri', 'fullName': 'Friday'},
    {'day': 6, 'label': 'Sat', 'fullName': 'Saturday'},
    {'day': 7, 'label': 'Sun', 'fullName': 'Sunday'},
  ];

  @override
  void initState() {
    super.initState();
    _specificDate = widget.selectedDate;
    _selectedWeekdays.add(widget.selectedDate.weekday);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );
    if (picked != null) {
      setState(() {
        _selectedTime = picked;
      });
    }
  }

  Future<void> _pickSpecificDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _specificDate,
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (picked != null) {
      setState(() {
        _specificDate = picked;
      });
    }
  }

  String _formatTimeOfDay(TimeOfDay tod) {
    final hour = tod.hourOfPeriod == 0 ? 12 : tod.hourOfPeriod;
    final minute = tod.minute.toString().padLeft(2, '0');
    final period = tod.period == DayPeriod.am ? 'AM' : 'PM';
    return '${hour.toString().padLeft(2, '0')}:$minute $period';
  }

  String _formatDateShort(DateTime dt) {
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      final List<DateTime> targetDates = [];
      String scopeDescription = '';

      final mondayOfSelectedWeek = widget.selectedDate.subtract(
        Duration(days: widget.selectedDate.weekday - 1),
      );

      switch (_repeatOption) {
        case PlanRepeatOption.todayOnly:
          targetDates.add(widget.selectedDate);
          scopeDescription = _formatDateShort(widget.selectedDate);
          break;

        case PlanRepeatOption.specificDay:
          targetDates.add(_specificDate);
          scopeDescription = _formatDateShort(_specificDate);
          break;

        case PlanRepeatOption.wholeWeek:
          for (int i = 0; i < 7; i++) {
            targetDates.add(mondayOfSelectedWeek.add(Duration(days: i)));
          }
          scopeDescription = 'Whole Week (Mon - Sun)';
          break;

        case PlanRepeatOption.selectiveDays:
          if (_selectedWeekdays.isEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Please select at least 1 day of the week')),
            );
            return;
          }
          final List<String> dayNames = [];
          for (final dayNum in [1, 2, 3, 4, 5, 6, 7]) {
            if (_selectedWeekdays.contains(dayNum)) {
              final d = mondayOfSelectedWeek.add(Duration(days: dayNum - 1));
              targetDates.add(d);
              final match = _weekdaysList.firstWhere((x) => x['day'] == dayNum);
              dayNames.add(match['label'] as String);
            }
          }
          scopeDescription = dayNames.join(', ');
          break;
      }

      final formattedTime = _formatTimeOfDay(_selectedTime);
      final titleText = _titleController.text.trim();
      final descText = _descriptionController.text.trim();
      final baseId = DateTime.now().millisecondsSinceEpoch;

      final List<ScheduleItem> items = [];
      for (int i = 0; i < targetDates.length; i++) {
        final d = targetDates[i];
        items.add(
          ScheduleItem(
            id: '${baseId}_plan_$i',
            title: titleText,
            description: descText,
            time: formattedTime,
            category: _selectedCategory,
            status: ActivityStatus.upcoming,
            date: d,
            reminderEnabled: _reminderEnabled,
            createdAt: DateTime.now(),
            updatedAt: DateTime.now(),
          ),
        );
      }

      widget.onPlansAdded(items, scopeDescription);
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Add New Plan',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              TextFormField(
                controller: _titleController,
                decoration: InputDecoration(
                  labelText: 'Plan Title',
                  hintText: 'e.g. 30-Min Gym Workout, Reading, Hydration',
                  prefixIcon: const Icon(Icons.edit_outlined),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Please enter a plan title';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 14),

              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: _pickTime,
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade400),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.access_time_rounded, color: primaryColor, size: 20),
                            const SizedBox(width: 10),
                            Text(
                              _formatTimeOfDay(_selectedTime),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<ActivityCategory>(
                      initialValue: _selectedCategory,
                      decoration: InputDecoration(
                        labelText: 'Category',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                      ),
                      items: ActivityCategory.values.map((cat) {
                        return DropdownMenuItem(
                          value: cat,
                          child: Text(cat.displayName, style: const TextStyle(fontSize: 12)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _selectedCategory = val;
                          });
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              TextFormField(
                controller: _descriptionController,
                decoration: InputDecoration(
                  labelText: 'Description / Goal (Optional)',
                  hintText: 'e.g. 500ml water intake or 3 sets of pull-ups',
                  prefixIcon: const Icon(Icons.notes_rounded),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 18),

              // REPEAT / IMPLEMENTATION SCOPE SECTION
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.calendar_today_rounded, size: 18, color: primaryColor),
                        const SizedBox(width: 8),
                        const Text(
                          'Schedule Implementation',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Choose whether to implement this plan only for today or across schedule days:',
                      style: TextStyle(fontSize: 11, color: Colors.black54),
                    ),
                    const SizedBox(height: 12),

                    // 4 Scope Options
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildScopeChip(
                          label: 'Only for Today',
                          option: PlanRepeatOption.todayOnly,
                          primaryColor: primaryColor,
                        ),
                        _buildScopeChip(
                          label: 'A Particular Day',
                          option: PlanRepeatOption.specificDay,
                          primaryColor: primaryColor,
                        ),
                        _buildScopeChip(
                          label: 'Whole Week (7 Days)',
                          option: PlanRepeatOption.wholeWeek,
                          primaryColor: primaryColor,
                        ),
                        _buildScopeChip(
                          label: 'Selective Days',
                          option: PlanRepeatOption.selectiveDays,
                          primaryColor: primaryColor,
                        ),
                      ],
                    ),

                    // Specific Date Picker Button
                    if (_repeatOption == PlanRepeatOption.specificDay) ...[
                      const SizedBox(height: 12),
                      InkWell(
                        onTap: _pickSpecificDate,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: primaryColor),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.event_rounded, color: primaryColor, size: 18),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Selected Date: ${_formatDateShort(_specificDate)}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                              ),
                              const Text('Change Date', style: TextStyle(color: Colors.blue, fontSize: 12, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                    ],

                    // Selective Days Multi-picker
                    if (_repeatOption == PlanRepeatOption.selectiveDays) ...[
                      const SizedBox(height: 12),
                      const Text(
                        'Select the days to add this plan:',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: _weekdaysList.map((wd) {
                          final dayNum = wd['day'] as int;
                          final isSelected = _selectedWeekdays.contains(dayNum);
                          return Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 2.0),
                              child: InkWell(
                                onTap: () {
                                  setState(() {
                                    if (isSelected) {
                                      if (_selectedWeekdays.length > 1) {
                                        _selectedWeekdays.remove(dayNum);
                                      }
                                    } else {
                                      _selectedWeekdays.add(dayNum);
                                    }
                                  });
                                },
                                borderRadius: BorderRadius.circular(10),
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 150),
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: isSelected ? primaryColor : Colors.white,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: isSelected ? primaryColor : Colors.grey.shade300,
                                    ),
                                  ),
                                  child: Text(
                                    wd['label'] as String,
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.bold,
                                      color: isSelected ? Colors.white : Colors.black87,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 14),

              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Enable Schedule Reminder', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                subtitle: const Text('Receive notifications when it is time', style: TextStyle(fontSize: 11)),
                value: _reminderEnabled,
                activeThumbColor: primaryColor,
                onChanged: (val) {
                  setState(() {
                    _reminderEnabled = val;
                  });
                },
              ),
              const SizedBox(height: 16),

              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: _submit,
                  icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  label: Text(
                    _repeatOption == PlanRepeatOption.wholeWeek
                        ? 'Save Plan for Whole Week (7 Days)'
                        : _repeatOption == PlanRepeatOption.selectiveDays
                            ? 'Save Plan for ${_selectedWeekdays.length} Selected Days'
                            : 'Save Plan to Schedule',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildScopeChip({
    required String label,
    required PlanRepeatOption option,
    required Color primaryColor,
  }) {
    final isSelected = _repeatOption == option;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: primaryColor.withValues(alpha: 0.15),
      backgroundColor: Colors.white,
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        color: isSelected ? primaryColor : Colors.black87,
      ),
      side: BorderSide(
        color: isSelected ? primaryColor : Colors.grey.shade300,
        width: isSelected ? 1.5 : 1,
      ),
      onSelected: (_) {
        setState(() {
          _repeatOption = option;
        });
      },
    );
  }
}
