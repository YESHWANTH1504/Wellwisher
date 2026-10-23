import 'package:flutter/material.dart';
import '../../../services/api_client.dart';
import '../../../services/jarvis_native_bridge.dart';

class JarvisCapabilityCenterScreen extends StatefulWidget {
  const JarvisCapabilityCenterScreen({super.key});

  @override
  State<JarvisCapabilityCenterScreen> createState() => _JarvisCapabilityCenterScreenState();
}

class _JarvisCapabilityCenterScreenState extends State<JarvisCapabilityCenterScreen> {
  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  String? _errorMessage;

  List<dynamic> _apps = [];
  Map<String, dynamic> _currentApp = {};
  List<dynamic> _capabilities = [];
  Map<String, dynamic> _deviceStatus = {};

  @override
  void initState() {
    super.initState();
    _loadDiagnostics();
  }

  Future<void> _loadDiagnostics() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // 1. Fetch apps and capabilities from backend
      final appsRes = await _apiClient.get('/api/jarvis/apps');
      final capRes = await _apiClient.get('/api/jarvis/os/capabilities');

      // 2. Query native Android bridge for current application and device status
      final currentAppRes = await JarvisNativeBridge.getForegroundApplication();
      final statusRes = await JarvisNativeBridge.getDeviceStatus();

      if (mounted) {
        setState(() {
          _apps = (appsRes['apps'] is List) ? appsRes['apps'] as List<dynamic> : [];
          _capabilities = (capRes['capabilities'] is List) ? capRes['capabilities'] as List<dynamic> : [];
          _currentApp = currentAppRes;
          _deviceStatus = statusRes;
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

  Future<void> _syncWithDevice() async {
    setState(() => _isLoading = true);
    try {
      final deviceApps = await JarvisNativeBridge.getInstalledApplications();
      if (deviceApps.isNotEmpty) {
        await _apiClient.post('/api/jarvis/apps/sync', {
          'applications': deviceApps,
        });
      }
      await _loadDiagnostics();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sync failed: $e'), backgroundColor: Colors.redAccent),
        );
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Row(
          children: [
            Icon(Icons.apps_rounded, color: Colors.cyanAccent),
            SizedBox(width: 8),
            Text(
              'JARVIS CAPABILITY CENTER',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
                letterSpacing: 1.1,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync, color: Colors.cyanAccent),
            tooltip: 'Sync Device Apps',
            onPressed: _syncWithDevice,
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.cyanAccent),
            tooltip: 'Refresh',
            onPressed: _loadDiagnostics,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.cyanAccent))
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
                        const SizedBox(height: 12),
                        Text(
                          _errorMessage!,
                          style: const TextStyle(color: Colors.white70),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _loadDiagnostics,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.cyanAccent.shade700),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  color: Colors.cyanAccent,
                  backgroundColor: const Color(0xFF1E293B),
                  onRefresh: _loadDiagnostics,
                  child: ListView(
                    padding: const EdgeInsets.all(16.0),
                    children: [
                      _buildCurrentStatusCard(),
                      const SizedBox(height: 16),
                      _buildCapabilityStatsRow(),
                      const SizedBox(height: 20),
                      const Text(
                        'INSTALLED APPLICATIONS & CAPABILITIES',
                        style: TextStyle(
                          color: Colors.cyanAccent,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ..._buildApplicationCards(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildCurrentStatusCard() {
    final curPkg = _currentApp['packageName'] ?? 'None';
    final battery = _deviceStatus['batteryLevel'] ?? '--';
    final net = _deviceStatus['networkType'] ?? 'ONLINE';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.cyanAccent.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.phonelink_setup, color: Colors.cyanAccent, size: 20),
              const SizedBox(width: 8),
              const Text(
                'ACTIVE OPERATING LAYER',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF10B981).withOpacity(0.6)),
                ),
                child: const Text(
                  'DETERMINISTIC OS',
                  style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Foreground Focus: $curPkg',
            style: const TextStyle(color: Colors.white70, fontSize: 13),
          ),
          const SizedBox(height: 4),
          Text(
            'Telemetry: Battery $battery% • Network: $net',
            style: const TextStyle(color: Colors.white54, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildCapabilityStatsRow() {
    return Row(
      children: [
        Expanded(
          child: _buildMiniStat(
            'Apps Tracked',
            '${_apps.length}',
            Icons.grid_view_rounded,
            Colors.cyanAccent,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildMiniStat(
            'Capabilities',
            '${_capabilities.length}',
            Icons.bolt_rounded,
            Colors.greenAccent,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildMiniStat(
            'Safety Rating',
            'Level 0–3',
            Icons.verified_user_rounded,
            Colors.amberAccent,
          ),
        ),
      ],
    );
  }

  Widget _buildMiniStat(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 15),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(color: Colors.white54, fontSize: 10),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  List<Widget> _buildApplicationCards() {
    if (_apps.isEmpty) {
      return [
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 24.0),
          child: Center(
            child: Text(
              'No applications cataloged. Tap Sync to discover device apps.',
              style: TextStyle(color: Colors.white54),
            ),
          ),
        )
      ];
    }

    return _apps.map((app) {
      final name = app['applicationLabel'] ?? app['appName'] ?? 'App';
      final pkg = app['packageName'] ?? '';
      final isInstalled = app['installed'] != false;
      final isSystem = app['systemApp'] == true;

      return Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isInstalled ? Colors.white12 : Colors.redAccent.withOpacity(0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor: isInstalled ? Colors.cyanAccent.withOpacity(0.15) : Colors.white10,
                  child: Icon(
                    isInstalled ? Icons.android : Icons.cloud_off,
                    color: isInstalled ? Colors.cyanAccent : Colors.white38,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        pkg,
                        style: const TextStyle(color: Colors.white54, fontSize: 11),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: isInstalled ? const Color(0xFF10B981).withOpacity(0.2) : Colors.red.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    isInstalled ? '✓ INSTALLED' : '✗ NOT INSTALLED',
                    style: TextStyle(
                      color: isInstalled ? Colors.greenAccent : Colors.redAccent,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                _buildActionChip('Launch', isInstalled, isInstalled ? Colors.cyanAccent : Colors.white30),
                if (pkg.contains('whatsapp') || pkg.contains('messaging')) ...[
                  _buildActionChip('Contact Chat', isInstalled, Colors.cyanAccent),
                  _buildActionChip('Message (Needs Review)', isInstalled, Colors.amberAccent),
                ],
                if (pkg.contains('maps')) ...[
                  _buildActionChip('Directions', isInstalled, Colors.cyanAccent),
                  _buildActionChip('Search Nearby', isInstalled, Colors.cyanAccent),
                ],
                if (pkg.contains('camera')) ...[
                  _buildActionChip('Viewfinder', isInstalled, Colors.cyanAccent),
                  _buildActionChip('Capture Photo', isInstalled, Colors.amberAccent),
                ],
                if (pkg.contains('chrome')) ...[
                  _buildActionChip('Browse URL', isInstalled, Colors.cyanAccent),
                  _buildActionChip('Web Search', isInstalled, Colors.cyanAccent),
                ],
                if (pkg.contains('settings')) ...[
                  _buildActionChip('Wi-Fi', isInstalled, Colors.cyanAccent),
                  _buildActionChip('Bluetooth', isInstalled, Colors.cyanAccent),
                  _buildActionChip('Battery', isInstalled, Colors.cyanAccent),
                ],
                if (isSystem)
                  _buildActionChip('System App', true, Colors.white60),
              ],
            ),
          ],
        ),
      );
    }).toList();
  }

  Widget _buildActionChip(String label, bool active, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600),
      ),
    );
  }
}
