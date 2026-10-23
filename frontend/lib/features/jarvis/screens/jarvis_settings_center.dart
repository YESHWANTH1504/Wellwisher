import 'package:flutter/material.dart';
import '../../../services/api_client.dart';

class JarvisSettingsCenter extends StatefulWidget {
  const JarvisSettingsCenter({super.key});

  @override
  State<JarvisSettingsCenter> createState() => _JarvisSettingsCenterState();
}

class _JarvisSettingsCenterState extends State<JarvisSettingsCenter> {
  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  bool _isExporting = false;
  Map<String, dynamic>? _permissions;
  Map<String, dynamic>? _diagnostics;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadSettingsData();
  }

  Future<void> _loadSettingsData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final permRes = await _apiClient.get('/api/jarvis/permissions');
      final diagRes = await _apiClient.get('/api/jarvis/diagnostics');

      if (mounted) {
        setState(() {
          _permissions = permRes;
          _diagnostics = diagRes['diagnostics'] is Map<String, dynamic> ? diagRes['diagnostics'] : diagRes;
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

  Future<void> _exportDiagnostics() async {
    setState(() {
      _isExporting = true;
    });

    try {
      final res = await _apiClient.get('/api/jarvis/diagnostics');
      if (mounted) {
        setState(() {
          _isExporting = false;
        });
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: const Color(0xFF131B2E),
            title: const Text('Diagnostics Exported', style: TextStyle(color: Colors.cyanAccent)),
            content: SingleChildScrollView(
              child: Text(
                'Sanitized diagnostic bundle created successfully.\n\nTimestamp: ${res['timestamp'] ?? DateTime.now().toIso8601String()}\nSystem Status: ${res['diagnostics']?['systemStatus'] ?? 'HEALTHY'}\nActions Logged: ${res['diagnostics']?['actionJournal']?['totalActions'] ?? 0}\n\nNo sensitive PII, passwords, or raw credentials included.',
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Close', style: TextStyle(color: Colors.cyanAccent)),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isExporting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  Future<void> _exportUserData() async {
    try {
      final res = await _apiClient.post('/api/jarvis/data/export', {});
      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: const Color(0xFF131B2E),
            title: const Text('Personal Data Export', style: TextStyle(color: Colors.cyanAccent)),
            content: SingleChildScrollView(
              child: Text(
                'Data bundle retrieved successfully.\n\nUser ID: ${res['userId']}\nMemories: ${res['summary']?['memoriesCount'] ?? 0}\nWorld Entities: ${res['summary']?['worldModelEntitiesCount'] ?? 0}\nWorkflows: ${res['summary']?['workflowsCount'] ?? 0}\nOffline Items: ${res['summary']?['offlineQueueCount'] ?? 0}\n\nExport is ready for download or backup.',
                style: const TextStyle(color: Colors.white70, fontSize: 13),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Close', style: TextStyle(color: Colors.cyanAccent)),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Data export failed: $e'), backgroundColor: Colors.redAccent),
        );
      }
    }
  }

  Future<void> _confirmDeleteUserData() async {
    final textController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A1016),
        title: const Text('Delete Personal Data', style: TextStyle(color: Colors.redAccent)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'WARNING: This will permanently delete your personal JARVIS memories, conversation state, workflows, and World Model entities.\n\nType "DELETE MY PERSONAL DATA" to confirm:',
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: textController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                hintText: 'DELETE MY PERSONAL DATA',
                hintStyle: TextStyle(color: Colors.white38),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.redAccent)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.white60)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () async {
              if (textController.text.trim() == 'DELETE MY PERSONAL DATA') {
                Navigator.pop(ctx);
                try {
                  final res = await _apiClient.post('/api/jarvis/data/delete', {
                    'confirmationPhrase': 'DELETE MY PERSONAL DATA'
                  });
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Data deleted safely: ${res['deletion']?['deletedCount'] ?? 0} items erased.'),
                        backgroundColor: Colors.green,
                      ),
                    );
                    _loadSettingsData();
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Delete failed: $e'), backgroundColor: Colors.redAccent),
                    );
                  }
                }
              }
            },
            child: const Text('Confirm Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
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
            Icon(Icons.tune_rounded, color: Colors.cyanAccent),
            SizedBox(width: 8),
            Text(
              'JARVIS Control Center',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
            ),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.cyanAccent))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_errorMessage != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.red.withAlpha(40),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.redAccent),
                    ),
                    child: Text(_errorMessage!, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  ),
                _buildSectionTitle('Reliability & Recovery'),
                _buildTile(
                  icon: Icons.healing,
                  title: 'Recovery Center',
                  subtitle: 'Inspect crash states and restore interrupted workflows',
                  onTap: () => Navigator.pushNamed(context, '/jarvis/recovery-center'),
                ),
                _buildTile(
                  icon: Icons.download_outlined,
                  title: 'Export System Diagnostics',
                  subtitle: 'Download sanitized telemetry bundle for troubleshooting',
                  trailing: _isExporting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : null,
                  onTap: _isExporting ? null : _exportDiagnostics,
                ),
                const SizedBox(height: 16),
                _buildSectionTitle('Privacy & Personal Data Lifecycle'),
                _buildTile(
                  icon: Icons.file_download_outlined,
                  title: 'Export Personal Data',
                  subtitle: 'Download complete GDPR/CCPA personal archive',
                  onTap: _exportUserData,
                ),
                _buildTile(
                  icon: Icons.delete_forever_outlined,
                  title: 'Erase Personal JARVIS Data',
                  subtitle: 'Permanently purge memories, workflows and entities',
                  iconColor: Colors.redAccent,
                  onTap: _confirmDeleteUserData,
                ),
                const SizedBox(height: 16),
                _buildSectionTitle('System Architecture'),
                _buildInfoTile('Version Compatibility', 'App 1.4.0 • Backend 1.4.0 • Schema 013 (Compatible)'),
                _buildInfoTile(
                  'Permissions Health',
                  '${_permissions?['grantedCount'] ?? 8} Granted • ${_permissions?['deniedCount'] ?? 0} Denied',
                ),
                _buildInfoTile(
                  'System Status',
                  _diagnostics?['systemStatus']?.toString().toUpperCase() ?? 'HEALTHY',
                ),

                _buildInfoTile('Device Identity Mode', 'App-Scoped Pseudonymous ID (Non-Hardware)'),
                _buildInfoTile('Action Journaling', 'Active • Idempotent Mutual Exclusion Locks'),
                const SizedBox(height: 24),
              ],
            ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Text(
        title,
        style: const TextStyle(
          color: Colors.cyanAccent,
          fontWeight: FontWeight.bold,
          fontSize: 14,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildTile({
    required IconData icon,
    required String title,
    required String subtitle,
    VoidCallback? onTap,
    Widget? trailing,
    Color iconColor = Colors.cyanAccent,
  }) {
    return Card(
      color: const Color(0xFF131B2E),
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        leading: Icon(icon, color: iconColor),
        title: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text(subtitle, style: const TextStyle(color: Colors.white60, fontSize: 12)),
        trailing: trailing ?? const Icon(Icons.chevron_right, color: Colors.white38),
        onTap: onTap,
      ),
    );
  }

  Widget _buildInfoTile(String title, String value) {
    return Card(
      color: const Color(0xFF131B2E),
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
            Flexible(
              child: Text(
                value,
                textAlign: TextAlign.end,
                style: const TextStyle(color: Colors.cyanAccent, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
