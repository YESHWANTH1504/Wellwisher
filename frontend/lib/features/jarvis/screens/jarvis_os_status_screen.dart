import 'package:flutter/material.dart';
import '../../../services/api_client.dart';

class JarvisOsStatusScreen extends StatefulWidget {
  const JarvisOsStatusScreen({super.key});

  @override
  State<JarvisOsStatusScreen> createState() => _JarvisOsStatusScreenState();
}

class _JarvisOsStatusScreenState extends State<JarvisOsStatusScreen> {
  final ApiClient _apiClient = ApiClient();
  bool _isLoading = true;
  Map<String, dynamic>? _osStatus;
  List<dynamic> _capabilities = [];
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchStatus();
  }

  Future<void> _fetchStatus() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _apiClient.get('/api/jarvis/os/status');
      final capRes = await _apiClient.get('/api/jarvis/os/capabilities');

      if (mounted) {
        setState(() {
          _osStatus = res;
          _capabilities = (capRes['capabilities'] is List) ? capRes['capabilities'] as List<dynamic> : [];
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Row(
          children: [
            Icon(Icons.hub_outlined, color: Colors.cyanAccent),
            SizedBox(width: 8),
            Text(
              'JARVIS OS STATUS',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1.2),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.cyanAccent),
            onPressed: _fetchStatus,
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
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 48),
                        const SizedBox(height: 16),
                        Text(
                          'Failed to load OS status:\n$_errorMessage',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white70),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _fetchStatus,
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.cyanAccent),
                          child: const Text('RETRY', style: TextStyle(color: Colors.black)),
                        ),
                      ],
                    ),
                  ),
                )
              : _buildStatusContent(),
    );
  }

  Widget _buildStatusContent() {
    final fabrics = _osStatus?['fabrics'] as Map<String, dynamic>? ?? {};

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildHeroCard(),
        const SizedBox(height: 16),
        _buildSectionHeader('CORE FABRICS'),
        const SizedBox(height: 8),
        _buildFabricRow('Intent Fabric', fabrics['intentFabric'] == true, Icons.alt_route),
        _buildFabricRow('Capability Registry', fabrics['capabilityRegistry'] == true, Icons.inventory_2_outlined),
        _buildFabricRow('World Model Knowledge Graph', fabrics['worldModel'] == true, Icons.auto_graph_outlined),
        _buildFabricRow('Context Fabric', fabrics['contextFabric'] == true, Icons.account_tree_outlined),
        _buildFabricRow('Perception Fabric (Vision/Screen/Voice)', fabrics['perceptionFabric'] == true, Icons.remove_red_eye_outlined),
        _buildFabricRow('Model Fabric (On-device / Cloud)', fabrics['modelFabric'] == true, Icons.psychology_outlined),
        _buildFabricRow('Action Engine (Lifecycle Runtime)', fabrics['actionEngine'] == true, Icons.flash_on_outlined),
        _buildFabricRow('Verification Engine (Anti-Fabrication)', fabrics['verificationEngine'] == true, Icons.verified_user_outlined),
        _buildFabricRow('Permission Manager (4-Level Matrix)', fabrics['permissionManager'] == true, Icons.security),
        const SizedBox(height: 20),
        _buildSectionHeader('REGISTERED CAPABILITIES (${_capabilities.length})'),
        const SizedBox(height: 8),
        ..._capabilities.take(15).map((cap) {
          final domain = cap['domain'] ?? 'SYSTEM';
          final platform = cap['platform'] ?? 'BACKEND';
          final name = cap['name'] ?? '';
          final risk = cap['risk'] ?? 1;

          return Card(
            color: const Color(0xFF1E293B),
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Icon(
                platform == 'ANDROID' ? Icons.phone_android : Icons.cloud_outlined,
                color: platform == 'ANDROID' ? Colors.cyanAccent : Colors.lightBlueAccent,
              ),
              title: Text(name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              subtitle: Text('$domain • Risk L$risk • $platform', style: const TextStyle(color: Colors.white60, fontSize: 12)),
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: Colors.green),
                ),
                child: const Text('ACTIVE', style: TextStyle(color: Colors.greenAccent, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildHeroCard() {
    final status = _osStatus?['status'] ?? 'ONLINE';
    final version = _osStatus?['version'] ?? '7.0.0';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0284C7), Color(0xFF0F172A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.cyanAccent.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'JARVIS OS CORE',
                style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 1.5),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.greenAccent.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.greenAccent),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.circle, size: 8, color: Colors.greenAccent),
                    const SizedBox(width: 6),
                    Text(
                      status,
                      style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Universal Intelligence Fabric • v$version',
            style: const TextStyle(color: Colors.white70, fontSize: 13),
          ),
          const SizedBox(height: 12),
          const Text(
            'High-level operating system abstraction layer bridging on-device Android capabilities with multi-tier model fabrics.',
            style: TextStyle(color: Colors.white60, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(color: Colors.cyanAccent, fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1.1),
    );
  }

  Widget _buildFabricRow(String label, bool isOnline, IconData icon) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, color: isOnline ? Colors.cyanAccent : Colors.grey, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
          ),
          Icon(
            isOnline ? Icons.check_circle : Icons.error_outline,
            color: isOnline ? Colors.greenAccent : Colors.redAccent,
            size: 18,
          ),
        ],
      ),
    );
  }
}
