import 'package:flutter/material.dart';
import '../../../services/api_client.dart';

class JarvisWorkflowCenterScreen extends StatefulWidget {
  const JarvisWorkflowCenterScreen({super.key});

  @override
  State<JarvisWorkflowCenterScreen> createState() => _JarvisWorkflowCenterScreenState();
}

class _JarvisWorkflowCenterScreenState extends State<JarvisWorkflowCenterScreen> with SingleTickerProviderStateMixin {
  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  late TabController _tabController;

  List<dynamic> _workflows = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _loadWorkflows();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadWorkflows() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final res = await _apiClient.get('/api/jarvis/workflows');
      if (mounted) {
        setState(() {
          _workflows = (res['workflows'] is List) ? res['workflows'] as List<dynamic> : [];
          _isLoading = false;
        });
      }
    } catch (_) {
      // Mock / fallback sample workflows if backend route is in-process
      if (mounted) {
        setState(() {
          _workflows = [
            {
              'workflowId': 'wf_01_nav_msg',
              'goal': 'Find RMK College and prepare directions',
              'status': 'COMPLETED',
              'currentStep': 'open_directions',
              'totalSteps': 2,
              'completedSteps': 2,
              'targetApp': 'com.google.android.apps.maps',
              'safetyLevel': 1,
              'privacyLevel': 'LOCAL_ONLY',
              'verification': 'VERIFIED',
              'elapsedMs': 1853,
              'createdAt': 'Just now'
            },
            {
              'workflowId': 'wf_02_wa_msg',
              'goal': 'Send message to Arun that I will be late',
              'status': 'AWAITING_CONFIRMATION',
              'currentStep': 'send_whatsapp_message',
              'totalSteps': 2,
              'completedSteps': 1,
              'targetApp': 'com.whatsapp',
              'safetyLevel': 2,
              'privacyLevel': 'PRIVATE_DEVICE',
              'verification': 'PENDING_CONFIRMATION',
              'elapsedMs': 840,
              'createdAt': '2 mins ago'
            },
            {
              'workflowId': 'wf_03_cal_rem',
              'goal': 'Create meeting tomorrow and remind 1h before',
              'status': 'COMPLETED',
              'currentStep': 'create_reminder',
              'totalSteps': 2,
              'completedSteps': 2,
              'targetApp': 'Calendar & Alarms',
              'safetyLevel': 1,
              'privacyLevel': 'LOCAL_ONLY',
              'verification': 'VERIFIED',
              'elapsedMs': 32,
              'createdAt': '5 mins ago'
            }
          ];
          _isLoading = false;
        });
      }
    }
  }

  List<dynamic> _filterWorkflows(String statusFilter) {
    if (statusFilter == 'ALL') return _workflows;
    if (statusFilter == 'ACTIVE') {
      return _workflows.where((w) {
        final st = w['status']?.toString() ?? '';
        return st == 'EXECUTING' || st == 'PLANNING' || st == 'READY';
      }).toList();
    }
    if (statusFilter == 'PENDING') {
      return _workflows.where((w) {
        final st = w['status']?.toString() ?? '';
        return st == 'AWAITING_CONFIRMATION' || st == 'AWAITING_PERMISSION' || st == 'AWAITING_USER_INPUT';
      }).toList();
    }
    if (statusFilter == 'COMPLETED') {
      return _workflows.where((w) => w['status'] == 'COMPLETED').toList();
    }
    if (statusFilter == 'FAILED') {
      return _workflows.where((w) {
        final st = w['status']?.toString() ?? '';
        return st == 'FAILED' || st == 'CANCELLED' || st == 'PARTIALLY_COMPLETED';
      }).toList();
    }
    return _workflows;
  }

  Color _getSafetyBadgeColor(int level) {
    switch (level) {
      case 0:
        return const Color(0xFF10B981); // Emerald
      case 1:
        return const Color(0xFF3B82F6); // Blue
      case 2:
        return const Color(0xFFF59E0B); // Amber
      case 3:
      default:
        return const Color(0xFFEF4444); // Red
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'COMPLETED':
        return const Color(0xFF10B981);
      case 'EXECUTING':
      case 'PLANNING':
        return const Color(0xFF6366F1);
      case 'AWAITING_CONFIRMATION':
      case 'AWAITING_PERMISSION':
      case 'AWAITING_USER_INPUT':
        return const Color(0xFFF59E0B);
      case 'FAILED':
      case 'CANCELLED':
        return const Color(0xFFEF4444);
      case 'PARTIALLY_COMPLETED':
        return const Color(0xFF8B5CF6);
      default:
        return const Color(0xFF94A3B8);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: const Row(
          children: [
            Icon(Icons.account_tree_outlined, color: Color(0xFF60A5FA), size: 22),
            SizedBox(width: 10),
            Text(
              'JARVIS Workflow Center',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
                letterSpacing: 0.5,
                color: Colors.white,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF94A3B8)),
            onPressed: _loadWorkflows,
            tooltip: 'Refresh Workflows',
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: const Color(0xFF38BDF8),
          labelColor: const Color(0xFF38BDF8),
          unselectedLabelColor: const Color(0xFF94A3B8),
          tabs: const [
            Tab(text: 'All'),
            Tab(text: 'Active'),
            Tab(text: 'Pending Approval'),
            Tab(text: 'Completed'),
            Tab(text: 'Failed / Cancelled'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF38BDF8)))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildWorkflowList(_filterWorkflows('ALL')),
                _buildWorkflowList(_filterWorkflows('ACTIVE')),
                _buildWorkflowList(_filterWorkflows('PENDING')),
                _buildWorkflowList(_filterWorkflows('COMPLETED')),
                _buildWorkflowList(_filterWorkflows('FAILED')),
              ],
            ),
    );
  }

  Widget _buildWorkflowList(List<dynamic> items) {
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox_outlined, size: 48, color: Colors.white.withValues(alpha: 0.2)),
            const SizedBox(height: 12),
            const Text(
              'No workflows found in this view',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final wf = items[index] as Map<String, dynamic>;
        final goal = wf['goal'] ?? 'Untitled Workflow';
        final status = wf['status'] ?? 'UNKNOWN';
        final currentStep = wf['currentStep'] ?? 'Planning';
        final totalSteps = wf['totalSteps'] ?? 1;
        final completedSteps = wf['completedSteps'] ?? 0;
        final targetApp = wf['targetApp'] ?? 'System';
        final safety = wf['safetyLevel'] ?? 1;
        final privacy = wf['privacyLevel'] ?? 'LOCAL_ONLY';
        final verification = wf['verification'] ?? 'PENDING';
        final elapsedMs = wf['elapsedMs'] ?? 0;

        final double progress = totalSteps > 0 ? (completedSteps / totalSteps).clamp(0.0, 1.0) : 0.0;
        final statusColor = _getStatusColor(status);
        final safetyColor = _getSafetyBadgeColor(safety);

        return Container(
          margin: const EdgeInsets.only(bottom: 14),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B).withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        goal,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: statusColor.withValues(alpha: 0.5)),
                      ),
                      child: Text(
                        status,
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    backgroundColor: Colors.white.withValues(alpha: 0.1),
                    valueColor: AlwaysStoppedAnimation<Color>(
                      status == 'COMPLETED' ? const Color(0xFF10B981) : const Color(0xFF38BDF8),
                    ),
                    minHeight: 5,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Step: $currentStep ($completedSteps/$totalSteps)',
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                    ),
                    Text(
                      '${elapsedMs}ms',
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _buildPill(Icons.apps, targetApp, const Color(0xFF94A3B8)),
                    _buildPill(Icons.shield_outlined, 'Safety L$safety', safetyColor),
                    _buildPill(Icons.lock_outline, privacy, const Color(0xFF818CF8)),
                    _buildPill(
                      Icons.verified_outlined,
                      verification,
                      verification == 'VERIFIED' ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPill(IconData icon, String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}
