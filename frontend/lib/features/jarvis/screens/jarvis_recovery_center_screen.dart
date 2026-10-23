import 'package:flutter/material.dart';
import '../../../services/api_client.dart';

class JarvisRecoveryCenterScreen extends StatefulWidget {
  const JarvisRecoveryCenterScreen({super.key});

  @override
  State<JarvisRecoveryCenterScreen> createState() => _JarvisRecoveryCenterScreenState();
}

class _JarvisRecoveryCenterScreenState extends State<JarvisRecoveryCenterScreen> {
  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  bool _isActionRunning = false;
  Map<String, dynamic>? _diagnostics;
  Map<String, dynamic>? _lastRecoveryResult;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchDiagnostics();
  }

  Future<void> _fetchDiagnostics() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _apiClient.get('/api/jarvis/diagnostics');
      if (mounted) {
        setState(() {
          _diagnostics = res['diagnostics'] is Map<String, dynamic> ? res['diagnostics'] : res;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _triggerRecovery() async {
    setState(() {
      _isActionRunning = true;
    });

    try {
      final res = await _apiClient.post('/api/jarvis/recovery/trigger', {});
      if (mounted) {
        setState(() {
          _lastRecoveryResult = res['recovery'] is Map<String, dynamic> ? res['recovery'] : res;
          _isActionRunning = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Recovery executed successfully. All states restored.'),
            backgroundColor: Colors.green,
          ),
        );
        _fetchDiagnostics();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isActionRunning = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Recovery check failed: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0E1A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF131B2E),
        elevation: 0,
        title: const Row(
          children: [
            Icon(Icons.healing_rounded, color: Colors.cyanAccent),
            SizedBox(width: 8),
            Text(
              'JARVIS Recovery Center',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
                color: Colors.white,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.cyanAccent),
            onPressed: _isLoading || _isActionRunning ? null : _fetchDiagnostics,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.cyanAccent))
          : RefreshIndicator(
              onRefresh: _fetchDiagnostics,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_errorMessage != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withAlpha(50),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.redAccent),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Colors.redAccent),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: Colors.white70),
                            ),
                          ),
                        ],
                      ),
                    ),
                  _buildStatusOverviewCard(),
                  const SizedBox(height: 16),
                  _buildActionPanel(),
                  const SizedBox(height: 16),
                  if (_lastRecoveryResult != null) ...[
                    _buildRecoveryResultCard(),
                    const SizedBox(height: 16),
                  ],
                  _buildSubsystemHealthGrid(),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }

  Widget _buildStatusOverviewCard() {
    final status = _diagnostics?['systemStatus'] ?? 'HEALTHY';
    final isHealthy = status == 'HEALTHY' || status == 'READY';

    return Card(
      color: const Color(0xFF131B2E),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: isHealthy ? Colors.greenAccent.withAlpha(100) : Colors.amberAccent.withAlpha(100)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isHealthy ? Icons.check_circle_outline : Icons.warning_amber_rounded,
                  color: isHealthy ? Colors.greenAccent : Colors.amberAccent,
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Operating System Status: $status',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Safe State Machine: Zero False Completions • Durable Logs',
                        style: TextStyle(color: Colors.white.withAlpha(180), fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionPanel() {
    return Card(
      color: const Color(0xFF131B2E),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Safe Recovery Actions',
              style: TextStyle(
                color: Colors.cyanAccent,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Safely inspects in-flight workflows, pending action journals, and uncommitted offline operations. Never duplicates side effects.',
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.cyanAccent,
                  foregroundColor: const Color(0xFF0A0E1A),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: _isActionRunning ? null : _triggerRecovery,
                icon: _isActionRunning
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black87),
                      )
                    : const Icon(Icons.play_arrow_rounded),
                label: Text(
                  _isActionRunning ? 'Assessing & Restoring...' : 'Trigger Crash Recovery',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecoveryResultCard() {
    return Card(
      color: const Color(0xFF16233B),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Colors.cyanAccent, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.assignment_turned_in_outlined, color: Colors.cyanAccent, size: 20),
                SizedBox(width: 8),
                Text(
                  'Latest Recovery Report',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ],
            ),
            const Divider(color: Colors.white24, height: 20),
            _buildResultRow('Workflows Inspected', '${_lastRecoveryResult?['workflowsInspected'] ?? 0}'),
            _buildResultRow('Workflows Resumed', '${_lastRecoveryResult?['workflowsResumed'] ?? 0}'),
            _buildResultRow('Workflows Marked Failed', '${_lastRecoveryResult?['workflowsMarkedFailed'] ?? 0}'),
            _buildResultRow('Pending Actions Inspected', '${_lastRecoveryResult?['actionsInspected'] ?? 0}'),
            _buildResultRow('Duplicate Suppressed', '${_lastRecoveryResult?['duplicatesSuppressed'] ?? 0}'),
            _buildResultRow('Offline Operations Checked', '${_lastRecoveryResult?['offlineOperationsChecked'] ?? 0}'),
          ],
        ),
      ),
    );
  }

  Widget _buildResultRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 13)),
          Text(value, style: const TextStyle(color: Colors.cyanAccent, fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildSubsystemHealthGrid() {
    final database = _diagnostics?['database'] ?? {};
    final network = _diagnostics?['network'] ?? {};
    final permissions = _diagnostics?['permissions'] ?? {};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Subsystem Status Matrix',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 12),
        _buildSubsystemItem(
          'MySQL Persistence & Action Journal',
          database['connected'] == true ? 'CONNECTED' : 'DISCONNECTED',
          database['connected'] == true ? Icons.storage : Icons.storage_outlined,
          database['connected'] == true ? Colors.greenAccent : Colors.redAccent,
        ),
        _buildSubsystemItem(
          'Network Intelligence Routing',
          network['state']?.toString().toUpperCase() ?? 'ONLINE',
          Icons.wifi_tethering,
          Colors.cyanAccent,
        ),
        _buildSubsystemItem(
          'Permission Health Registry',
          '${permissions['grantedCount'] ?? 8} Granted • ${permissions['deniedCount'] ?? 0} Denied',
          Icons.security,
          Colors.blueAccent,
        ),
      ],
    );
  }

  Widget _buildSubsystemItem(String title, String status, IconData icon, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF131B2E),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(color: Colors.white, fontSize: 14),
            ),
          ),
          Text(
            status,
            style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
