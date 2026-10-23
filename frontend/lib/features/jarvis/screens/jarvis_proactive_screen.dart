import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../services/jarvis_context_api_service.dart';

/// Phase 5 Proactive Center
/// Displays Daily Morning Briefing, Deduplication State, Proactive Recommendations,
/// and Autonomous Workflows with Verification Levels.
class JarvisProactiveScreen extends StatefulWidget {
  final JarvisContextApiService? apiService;

  const JarvisProactiveScreen({super.key, this.apiService});

  @override
  State<JarvisProactiveScreen> createState() => _JarvisProactiveScreenState();
}

class _JarvisProactiveScreenState extends State<JarvisProactiveScreen> with SingleTickerProviderStateMixin {
  late final JarvisContextApiService _apiService;
  late final TabController _tabController;

  Map<String, dynamic>? _briefing;
  List<Map<String, dynamic>> _proactiveEvents = [];
  List<Map<String, dynamic>> _workflows = [];
  bool _isLoading = true;
  bool _isBriefingLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _apiService = widget.apiService ?? JarvisContextApiService();
    _tabController = TabController(length: 3, vsync: this);
    _loadAll();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final feedFuture = _apiService.getProactiveFeed();
      final workflowsFuture = _apiService.getWorkflows();
      final results = await Future.wait([feedFuture, workflowsFuture]);

      if (mounted) {
        setState(() {
          _proactiveEvents = results[0];
          _workflows = results[1];
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

  Future<void> _fetchMorningBriefing({bool force = false}) async {
    setState(() => _isBriefingLoading = true);
    try {
      final res = await _apiService.getMorningBriefing(force: force);
      if (mounted) {
        setState(() {
          _briefing = res;
          _isBriefingLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isBriefingLoading = false);
      }
    }
  }

  Future<void> _handleEventAction(String eventId, String action) async {
    final success = await _apiService.acknowledgeProactiveEvent(eventId, action: action);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Proactive suggestion $action executed.'),
          backgroundColor: JarvisColors.surfaceElevated,
        ),
      );
      _loadAll();
    }
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
            Text('JARVIS Proactive Center', style: JarvisTypography.titleMedium),
            Text('Autonomous Intelligence & Morning Briefing', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.cyan)),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: JarvisColors.cyan,
          labelColor: JarvisColors.cyan,
          unselectedLabelColor: Colors.white54,
          tabs: const [
            Tab(text: 'Briefing', icon: Icon(Icons.wb_sunny_outlined, size: 18)),
            Tab(text: 'Suggestions', icon: Icon(Icons.lightbulb_outline, size: 18)),
            Tab(text: 'Workflows', icon: Icon(Icons.account_tree_outlined, size: 18)),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: JarvisColors.cyan))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Error loading proactive feed: $_error', style: const TextStyle(color: JarvisColors.error)),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: _loadAll, child: const Text('Retry')),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildBriefingTab(),
                    _buildSuggestionsTab(),
                    _buildWorkflowsTab(),
                  ],
                ),
    );
  }

  Widget _buildBriefingTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: JarvisColors.surfaceElevated,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: JarvisColors.borderMedium),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.wb_sunny, color: JarvisColors.amber, size: 24),
                      const SizedBox(width: 8),
                      Text('DAILY MORNING BRIEFING', style: JarvisTypography.titleSmall.copyWith(color: JarvisColors.amber)),
                    ],
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: JarvisColors.cyan.withAlpha(40),
                      foregroundColor: JarvisColors.cyan,
                      elevation: 0,
                    ),
                    icon: _isBriefingLoading
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: JarvisColors.cyan))
                        : const Icon(Icons.play_arrow, size: 18),
                    label: const Text('Play Briefing'),
                    onPressed: _isBriefingLoading ? null : () => _fetchMorningBriefing(force: false),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (_briefing != null) ...[
                if (_briefing!['alreadyDelivered'] == true)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: JarvisColors.cyan.withAlpha(30),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: JarvisColors.cyan.withAlpha(80)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, size: 14, color: JarvisColors.cyan),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Already delivered today (${_briefing!['deduplicationKey'] ?? "active"}). Showing cached briefing.',
                            style: const TextStyle(color: JarvisColors.cyan, fontSize: 11),
                          ),
                        ),
                      ],
                    ),
                  ),
                Text(
                  _briefing!['briefingText'] ?? _briefing!['speech'] ?? _briefing!['message'] ?? 'No briefing text.',
                  style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.5),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    icon: const Icon(Icons.refresh, size: 14, color: Colors.white54),
                    label: const Text('Force Regenerate', style: TextStyle(color: Colors.white54, fontSize: 11)),
                    onPressed: () => _fetchMorningBriefing(force: true),
                  ),
                ),
              ] else
                const Text(
                  'Tap "Play Briefing" to listen to your morning briefing synthesized from real schedule and health signals.',
                  style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSuggestionsTab() {
    if (_proactiveEvents.isEmpty) {
      return const Center(
        child: Text('No proactive suggestions active at this moment.', style: TextStyle(color: Colors.white38)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _proactiveEvents.length,
      itemBuilder: (ctx, i) {
        final ev = _proactiveEvents[i];
        final id = ev['id'] ?? '';
        final title = ev['title'] ?? 'Suggestion';
        final message = ev['message'] ?? '';
        final type = ev['event_type'] ?? 'SUGGESTION';
        final priority = ev['priority'] ?? 'MEDIUM';
        final status = ev['status'] ?? 'PENDING';

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: JarvisColors.surfaceElevated,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: JarvisColors.borderSubtle),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.lightbulb, color: JarvisColors.cyan, size: 18),
                      const SizedBox(width: 8),
                      Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                    ],
                  ),
                  _buildPriorityBadge(priority),
                ],
              ),
              const SizedBox(height: 8),
              Text(message, style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4)),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text('Type: $type • Status: $status', style: const TextStyle(color: Colors.white38, fontSize: 11)),
                  const Spacer(),
                  TextButton(
                    onPressed: () => _handleEventAction(id, 'DISMISS'),
                    child: const Text('Dismiss', style: TextStyle(color: Colors.white54, fontSize: 12)),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: JarvisColors.cyan,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    ),
                    onPressed: () => _handleEventAction(id, 'ACT'),
                    child: const Text('Act', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildWorkflowsTab() {
    if (_workflows.isEmpty) {
      return const Center(
        child: Text('No autonomous workflows registered.', style: TextStyle(color: Colors.white38)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _workflows.length,
      itemBuilder: (ctx, i) {
        final wf = _workflows[i];
        final actionType = wf['action_type'] ?? 'ACTION';
        final entityType = wf['entity_type'] ?? 'ENTITY';
        final status = wf['status'] ?? 'PENDING';
        final requiresConfirmation = wf['requires_confirmation'] == 1 || wf['requires_confirmation'] == true;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: JarvisColors.surfaceElevated,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: requiresConfirmation ? JarvisColors.amber.withAlpha(100) : JarvisColors.borderSubtle),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(actionType, style: const TextStyle(color: JarvisColors.cyan, fontWeight: FontWeight.bold, fontSize: 14)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: (status == 'EXECUTED' ? JarvisColors.success : JarvisColors.amber).withAlpha(40),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      status,
                      style: TextStyle(
                        color: status == 'EXECUTED' ? JarvisColors.success : JarvisColors.amber,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text('Entity: $entityType', style: const TextStyle(color: Colors.white70, fontSize: 12)),
              const SizedBox(height: 4),
              Text(
                requiresConfirmation ? 'Requires Level 2 User Confirmation' : 'Autonomous Execution Permitted (Level 0/1)',
                style: TextStyle(
                  color: requiresConfirmation ? JarvisColors.amber : JarvisColors.cyan,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPriorityBadge(String priority) {
    Color col;
    switch (priority) {
      case 'CRITICAL':
        col = JarvisColors.error;
        break;
      case 'HIGH':
        col = JarvisColors.amber;
        break;
      default:
        col = JarvisColors.cyan;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: col.withAlpha(30),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: col),
      ),
      child: Text(priority, style: TextStyle(color: col, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}
