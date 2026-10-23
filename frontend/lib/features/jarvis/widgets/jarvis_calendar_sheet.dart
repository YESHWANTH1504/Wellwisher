import 'package:flutter/material.dart';
import '../../../../services/api_client.dart';

class JarvisCalendarSheet extends StatefulWidget {
  const JarvisCalendarSheet({super.key});

  @override
  State<JarvisCalendarSheet> createState() => _JarvisCalendarSheetState();
}

class _JarvisCalendarSheetState extends State<JarvisCalendarSheet> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ApiClient _apiClient = ApiClient();

  bool _isLoading = true;
  String? _errorMessage;

  List<dynamic> _todayEvents = [];
  List<dynamic> _tomorrowEvents = [];
  List<dynamic> _weekDays = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadCalendarData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadCalendarData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final todayRes = await _apiClient.get('/jarvis/calendar/today');
      final tomorrowRes = await _apiClient.get('/jarvis/calendar/date/tomorrow');
      final weekRes = await _apiClient.get('/jarvis/calendar/week');

      if (mounted) {
        setState(() {
          _todayEvents = todayRes['events'] as List<dynamic>? ?? [];
          _tomorrowEvents = tomorrowRes['events'] as List<dynamic>? ?? [];
          _weekDays = weekRes['week'] as List<dynamic>? ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load schedule: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _completeEvent(String eventId) async {
    try {
      final res = await _apiClient.post('/jarvis/calendar/events/$eventId/complete', {});
      if (res['success'] == true) {
        _loadCalendarData();
      }
    } catch (_) {}
  }

  Future<void> _skipEvent(String eventId) async {
    try {
      final res = await _apiClient.post('/jarvis/calendar/events/$eventId/skip', {});
      if (res['success'] == true) {
        _loadCalendarData();
      }
    } catch (_) {}
  }

  Future<void> _deleteEvent(String eventId) async {
    try {
      final res = await _apiClient.delete('/jarvis/calendar/events/$eventId');
      if (res['success'] == true) {
        _loadCalendarData();
      }
    } catch (_) {}
  }

  Color _getCategoryColor(String? category) {
    switch ((category ?? '').toLowerCase()) {
      case 'sleep':
        return const Color(0xFF6366F1); // Indigo
      case 'meal':
        return const Color(0xFFF59E0B); // Amber
      case 'work':
      case 'commute':
        return const Color(0xFF3B82F6); // Blue
      case 'break':
        return const Color(0xFF10B981); // Emerald
      case 'exercise':
        return const Color(0xFFEC4899); // Pink
      default:
        return const Color(0xFF8B5CF6); // Purple
    }
  }

  Widget _buildEventCard(Map<String, dynamic> event, {bool isReadOnly = false}) {
    final title = event['title']?.toString() ?? 'Event';
    final time = event['formattedTime']?.toString() ?? event['time']?.toString() ?? '';
    final category = event['category']?.toString() ?? 'routine';
    final status = event['status']?.toString() ?? 'scheduled';
    final isCompleted = status == 'completed';
    final isSkipped = status == 'skipped';
    final isCancelled = status == 'cancelled';
    final isRecurring = event['templateId'] != null;
    final eventId = event['id']?.toString() ?? '';
    final catColor = _getCategoryColor(category);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCompleted
              ? const Color(0xFF10B981).withOpacity(0.4)
              : (isSkipped
                  ? const Color(0xFF64748B).withOpacity(0.3)
                  : catColor.withOpacity(0.2)),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Time badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: catColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              time,
              style: TextStyle(
                color: catColor,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: TextStyle(
                          color: isCompleted
                              ? const Color(0xFF94A3B8)
                              : (isSkipped ? const Color(0xFF64748B) : Colors.white),
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          decoration: isCompleted
                              ? TextDecoration.lineThrough
                              : (isSkipped ? TextDecoration.lineThrough : null),
                        ),
                      ),
                    ),
                    if (isCompleted)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Done',
                          style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      )
                    else if (isSkipped)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF64748B).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Skipped',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: catColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        category.toUpperCase(),
                        style: TextStyle(color: catColor.withOpacity(0.8), fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    ),
                    if (isRecurring) ...[
                      const SizedBox(width: 6),
                      Icon(Icons.repeat_rounded, color: const Color(0xFF94A3B8).withOpacity(0.7), size: 12),
                      const SizedBox(width: 2),
                      Text('Recurring', style: TextStyle(color: const Color(0xFF94A3B8).withOpacity(0.7), fontSize: 10)),
                    ],
                  ],
                ),
              ],
            ),
          ),

          // Actions
          if (!isReadOnly && !isCompleted && !isSkipped && !isCancelled && eventId.isNotEmpty)
            PopupMenuButton<String>(
              icon: const Icon(Icons.more_vert, color: Color(0xFF64748B), size: 18),
              color: const Color(0xFF1E293B),
              onSelected: (val) {
                if (val == 'complete') _completeEvent(eventId);
                if (val == 'skip') _skipEvent(eventId);
                if (val == 'delete') _deleteEvent(eventId);
              },
              itemBuilder: (_) => [
                const PopupMenuItem(
                  value: 'complete',
                  child: Row(
                    children: [
                      Icon(Icons.check_circle_outline, color: Color(0xFF10B981), size: 16),
                      SizedBox(width: 8),
                      Text('Mark Complete', style: TextStyle(color: Colors.white, fontSize: 13)),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'skip',
                  child: Row(
                    children: [
                      Icon(Icons.skip_next, color: Color(0xFFF59E0B), size: 16),
                      SizedBox(width: 8),
                      Text('Skip Today', style: TextStyle(color: Colors.white, fontSize: 13)),
                    ],
                  ),
                ),
                const PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 16),
                      SizedBox(width: 8),
                      Text('Cancel Event', style: TextStyle(color: Colors.white, fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildEventList(List<dynamic> events, {bool isReadOnly = false}) {
    if (events.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.event_available, color: const Color(0xFF475569), size: 48),
            const SizedBox(height: 12),
            const Text(
              'Schedule is clear',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 15, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      itemCount: events.length,
      itemBuilder: (context, index) {
        final ev = events[index] as Map<String, dynamic>;
        return _buildEventCard(ev, isReadOnly: isReadOnly);
      },
    );
  }

  Widget _buildWeekView() {
    if (_weekDays.isEmpty) {
      return const Center(child: Text('No weekly schedule available.', style: TextStyle(color: Color(0xFF94A3B8))));
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      itemCount: _weekDays.length,
      itemBuilder: (context, index) {
        final day = _weekDays[index] as Map<String, dynamic>;
        final dayName = day['dayOfWeek']?.toString() ?? '';
        final date = day['date']?.toString() ?? '';
        final isWeekend = day['isWeekend'] == true;
        final events = day['events'] as List<dynamic>? ?? [];

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Theme(
            data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
            child: ExpansionTile(
              initiallyExpanded: index == 0,
              leading: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isWeekend ? const Color(0xFFEC4899).withOpacity(0.15) : const Color(0xFF3B82F6).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  dayName.substring(0, 3).toUpperCase(),
                  style: TextStyle(
                    color: isWeekend ? const Color(0xFFEC4899) : const Color(0xFF3B82F6),
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
              title: Text(
                '$dayName, $date',
                style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600),
              ),
              subtitle: Text(
                '${events.length} routine${events.length == 1 ? '' : 's'}',
                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              ),
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  child: Column(
                    children: events.map((ev) => _buildEventCard(ev as Map<String, dynamic>, isReadOnly: true)).toList(),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.78,
      decoration: const BoxDecoration(
        color: Color(0xFF0B1120),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFF334155),
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Row(
              children: [
                const Icon(Icons.calendar_month_rounded, color: Color(0xFF38BDF8), size: 22),
                const SizedBox(width: 10),
                const Text(
                  'Personal Schedule',
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.refresh_rounded, color: Color(0xFF94A3B8), size: 20),
                  onPressed: _loadCalendarData,
                ),
              ],
            ),
          ),

          // Tabs
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(12),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: const Color(0xFF2563EB),
                borderRadius: BorderRadius.circular(10),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              labelColor: Colors.white,
              unselectedLabelColor: const Color(0xFF94A3B8),
              dividerColor: Colors.transparent,
              tabs: const [
                Tab(text: 'Today'),
                Tab(text: 'Tomorrow'),
                Tab(text: 'Week'),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF38BDF8)))
                : (_errorMessage != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(_errorMessage!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                            const SizedBox(height: 12),
                            ElevatedButton(onPressed: _loadCalendarData, child: const Text('Retry')),
                          ],
                        ),
                      )
                    : TabBarView(
                        controller: _tabController,
                        children: [
                          _buildEventList(_todayEvents),
                          _buildEventList(_tomorrowEvents),
                          _buildWeekView(),
                        ],
                      )),
          ),
        ],
      ),
    );
  }
}
