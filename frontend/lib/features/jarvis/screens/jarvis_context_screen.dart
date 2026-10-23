import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../services/jarvis_context_api_service.dart';

/// Phase 5 Personal Context Dashboard
/// Displays Unified Context Snapshot, Device Telemetry, Authoritative Schedule,
/// Zero-Fabrication Health Connect Signals, Active Tasks, and Stored Preferences.
class JarvisContextScreen extends StatefulWidget {
  final JarvisContextApiService? apiService;

  const JarvisContextScreen({super.key, this.apiService});

  @override
  State<JarvisContextScreen> createState() => _JarvisContextScreenState();
}

class _JarvisContextScreenState extends State<JarvisContextScreen> {
  late final JarvisContextApiService _apiService;
  Map<String, dynamic>? _snapshot;
  List<Map<String, dynamic>> _memories = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _apiService = widget.apiService ?? JarvisContextApiService();
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final snapshotFuture = _apiService.getContextSnapshot();
      final memoriesFuture = _apiService.getMemories();

      final results = await Future.wait([snapshotFuture, memoriesFuture]);
      if (mounted) {
        setState(() {
          _snapshot = results[0] as Map<String, dynamic>?;
          _memories = results[1] as List<Map<String, dynamic>>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _forgetMemory(dynamic id) async {
    final success = await _apiService.deleteMemory(id);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Memory forgotten and removed from durable storage.'),
          backgroundColor: JarvisColors.surfaceElevated,
        ),
      );
      _loadAll();
    }
  }

  void _showAddPreferenceDialog() {
    final keyController = TextEditingController();
    final valueController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: JarvisColors.surfaceElevated,
        title: Text('Store Preference', style: JarvisTypography.titleMedium),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: keyController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Preference Key (e.g. time_format)',
                labelStyle: TextStyle(color: JarvisColors.cyan),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: valueController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Value (e.g. 24-hour)',
                labelStyle: TextStyle(color: JarvisColors.cyan),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: JarvisColors.cyan),
            onPressed: () async {
              if (keyController.text.isNotEmpty && valueController.text.isNotEmpty) {
                Navigator.pop(ctx);
                await _apiService.storeMemory(
                  key: keyController.text.trim(),
                  value: valueController.text.trim(),
                );
                _loadAll();
              }
            },
            child: const Text('Save', style: TextStyle(color: Colors.black)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JarvisColors.background,
      appBar: AppBar(
        backgroundColor: JarvisColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: JarvisColors.cyan, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Personal Context Matrix', style: JarvisTypography.titleMedium),
            Text('Phase 5 Unified Living State', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.cyan)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: JarvisColors.cyan),
            tooltip: 'Sync Context',
            onPressed: _loadAll,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: JarvisColors.cyan,
        foregroundColor: Colors.black,
        icon: const Icon(Icons.add_circle_outline),
        label: const Text('Add Memory'),
        onPressed: _showAddPreferenceDialog,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: JarvisColors.cyan))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Failed to load personal context: $_error', style: const TextStyle(color: JarvisColors.error)),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: _loadAll, child: const Text('Retry')),
                    ],
                  ),
                )
              : _buildBody(),
    );
  }

  Widget _buildBody() {
    final snap = _snapshot ?? {};
    final isQuiet = snap['isQuietHours'] == true;
    final timeStr = snap['currentTime'] ?? '--:--';
    final tzStr = snap['timezone'] ?? 'UTC';
    final identity = (snap['identity'] as Map<String, dynamic>?) ?? {};
    final userName = identity['name'] ?? 'User';
    final freshness = (snap['freshness'] as Map<String, dynamic>?) ?? {};

    final device = (snap['deviceState'] as Map<String, dynamic>?) ?? {};
    final schedule = (snap['upcomingSchedule'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final activeTasks = (snap['activeTasks'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final health = (snap['healthSummary'] as Map<String, dynamic>?) ?? {};

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // 1. Live Context Banner
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: JarvisColors.surfaceElevated,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: JarvisColors.borderMedium),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isQuiet ? JarvisColors.purple.withAlpha(50) : JarvisColors.cyan.withAlpha(50),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isQuiet ? Icons.bedtime : Icons.wb_sunny,
                  color: isQuiet ? JarvisColors.purple : JarvisColors.cyan,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome, $userName',
                      style: JarvisTypography.titleMedium.copyWith(color: Colors.white),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Local Time: $timeStr ($tzStr) • ${isQuiet ? "Quiet Hours Active (22:00-07:00)" : "Active Day"}',
                      style: JarvisTypography.bodySmall.copyWith(
                        color: isQuiet ? JarvisColors.purple : JarvisColors.cyan,
                      ),
                    ),
                  ],
                ),
              ),
              _buildFreshnessBadge(freshness['schedule'] ?? 'fresh'),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // 2. Device Telemetry
        _buildSectionHeader('DEVICE TELEMETRY', Icons.phone_android),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: JarvisColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: JarvisColors.borderSubtle),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildTelemetryItem(
                icon: Icons.battery_charging_full,
                label: 'Battery',
                value: device['batteryLevel'] != null ? '${device['batteryLevel']}%' : 'N/A',
              ),
              _buildTelemetryItem(
                icon: Icons.lock_outline,
                label: 'Screen',
                value: device['screenState'] ?? 'UNKNOWN',
              ),
              _buildTelemetryItem(
                icon: Icons.wifi,
                label: 'Network',
                value: device['network'] ?? 'CONNECTED',
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // 3. Authoritative Upcoming Schedule
        _buildSectionHeader('TODAY\'S SCHEDULE (${schedule.length})', Icons.calendar_today),
        if (schedule.isEmpty)
          _buildEmptyCard('No events scheduled for today.')
        else
          ...schedule.map((item) => _buildScheduleCard(item)),
        const SizedBox(height: 16),

        // 4. Active Tasks
        if (activeTasks.isNotEmpty) ...[
          _buildSectionHeader('ACTIVE MULTI-TURN TASK', Icons.pending_actions),
          ...activeTasks.map((t) => _buildActiveTaskCard(t)),
          const SizedBox(height: 16),
        ],

        // 5. Health Connect Live Metrics (Strict Zero Fabrication)
        _buildSectionHeader('HEALTH CONNECT AUTHORIZED DATA', Icons.favorite_border),
        _buildHealthGrid(health),
        const SizedBox(height: 16),

        // 6. Durable Personal Memories
        _buildSectionHeader('DURABLE PERSONAL MEMORIES (${_memories.length})', Icons.psychology),
        if (_memories.isEmpty)
          _buildEmptyCard('No personal memories stored yet. Speak "Remember that..."')
        else
          ..._memories.map((m) => _buildMemoryCard(m)),
        const SizedBox(height: 40),
      ],
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: JarvisColors.cyan),
          const SizedBox(width: 8),
          Text(
            title,
            style: JarvisTypography.labelMedium.copyWith(color: JarvisColors.cyan, letterSpacing: 1.1),
          ),
        ],
      ),
    );
  }

  Widget _buildFreshnessBadge(String status) {
    Color color;
    switch (status) {
      case 'fresh':
        color = JarvisColors.success;
        break;
      case 'stale':
        color = JarvisColors.warning;
        break;
      case 'expired':
        color = JarvisColors.error;
        break;
      default:
        color = Colors.white38;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(40),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildTelemetryItem({required IconData icon, required String label, required String value}) {
    return Column(
      children: [
        Icon(icon, color: JarvisColors.cyan, size: 22),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
        Text(label, style: const TextStyle(color: Colors.white54, fontSize: 11)),
      ],
    );
  }

  Widget _buildScheduleCard(Map<String, dynamic> item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: JarvisColors.surfaceElevated,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: JarvisColors.borderSubtle),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: JarvisColors.cyan.withAlpha(30),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              item['time'] ?? 'All Day',
              style: const TextStyle(color: JarvisColors.cyan, fontWeight: FontWeight.bold, fontSize: 12),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item['title'] ?? 'Untitled Event',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                ),
                if (item['reminderEnabled'] == true)
                  const Text('⏰ Reminder Active', style: TextStyle(color: JarvisColors.amber, fontSize: 11)),
              ],
            ),
          ),
          const Icon(Icons.check_circle_outline, color: JarvisColors.success, size: 18),
        ],
      ),
    );
  }

  Widget _buildActiveTaskCard(Map<String, dynamic> task) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: JarvisColors.surfaceElevated,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: JarvisColors.warning),
      ),
      child: Row(
        children: [
          const Icon(Icons.bolt, color: JarvisColors.warning, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Task: ${task['intent'] ?? "IN_PROGRESS"}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                Text('Awaiting: ${task['missingSlot'] ?? "Confirmation"}', style: const TextStyle(color: Colors.white70, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHealthGrid(Map<String, dynamic> health) {
    final steps = (health['steps'] as Map<String, dynamic>?) ?? {};
    final hr = (health['heartRate'] as Map<String, dynamic>?) ?? {};
    final sleep = (health['sleep'] as Map<String, dynamic>?) ?? {};

    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 8,
      mainAxisSpacing: 8,
      childAspectRatio: 1.2,
      children: [
        _buildHealthItem(
          title: 'Steps',
          status: steps['status'] ?? 'NO_DATA',
          value: steps['value'] != null ? '${steps['value']}' : null,
          icon: Icons.directions_walk,
        ),
        _buildHealthItem(
          title: 'Heart Rate',
          status: hr['status'] ?? 'NO_DATA',
          value: hr['value'] != null ? '${hr['value']} bpm' : null,
          icon: Icons.favorite,
        ),
        _buildHealthItem(
          title: 'Sleep',
          status: sleep['status'] ?? 'NO_DATA',
          value: sleep['value'] != null ? '${sleep['value']} hrs' : null,
          icon: Icons.nightlight_round,
        ),
      ],
    );
  }

  Widget _buildHealthItem({required String title, required String status, String? value, required IconData icon}) {
    final hasData = status == 'AVAILABLE' && value != null;

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: JarvisColors.surfaceElevated,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: hasData ? JarvisColors.success.withAlpha(100) : JarvisColors.borderSubtle),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 20, color: hasData ? JarvisColors.success : Colors.white38),
          const SizedBox(height: 4),
          Text(title, style: const TextStyle(color: Colors.white70, fontSize: 11)),
          const SizedBox(height: 2),
          Text(
            hasData ? value : 'NO DATA',
            style: TextStyle(
              color: hasData ? Colors.white : Colors.white38,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMemoryCard(Map<String, dynamic> memory) {
    final key = memory['memory_key'] ?? memory['key'] ?? 'unknown';
    final val = memory['memory_value'] ?? memory['value'] ?? '';
    final id = memory['id'];
    final source = memory['source'] ?? 'USER_EXPLICIT';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: JarvisColors.surfaceElevated,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: JarvisColors.borderSubtle),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(key, style: const TextStyle(color: JarvisColors.cyan, fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white10,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(source, style: const TextStyle(color: Colors.white54, fontSize: 9)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(val, style: const TextStyle(color: Colors.white, fontSize: 13)),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: JarvisColors.error, size: 18),
            tooltip: 'Forget this preference',
            onPressed: id != null ? () => _forgetMemory(id) : null,
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyCard(String msg) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: JarvisColors.surface,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Center(
        child: Text(msg, style: const TextStyle(color: Colors.white38, fontSize: 13)),
      ),
    );
  }
}
