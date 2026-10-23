import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../services/api_client.dart';
import '../core/jarvis_colors.dart';

/// Phase 12 On-Device & Offline Intelligence Fabric Center Screen
class JarvisOfflineIntelligenceScreen extends StatefulWidget {
  const JarvisOfflineIntelligenceScreen({super.key});

  @override
  State<JarvisOfflineIntelligenceScreen> createState() => _JarvisOfflineIntelligenceScreenState();
}

class _JarvisOfflineIntelligenceScreenState extends State<JarvisOfflineIntelligenceScreen> {
  static const MethodChannel _platform = MethodChannel('com.example.wellwisher/jarvis_native');
  final ApiClient _apiClient = ApiClient();

  bool _isLoading = true;
  String _networkState = 'ONLINE'; // ONLINE, HYBRID, OFFLINE, DEGRADED

  // Reachability
  Map<String, dynamic> _reachability = {
    'internet': true,
    'backend': true,
    'gemini': true,
    'openai': true,
    'realtime': true,
    'tts_cloud': true,
  };

  // Local AI Capabilities
  List<dynamic> _localModels = [];

  // Hardware Status
  Map<String, dynamic> _deviceHardware = {
    'osVersion': 'Detecting...',
    'deviceModel': 'Detecting...',
    'cpuArchitecture': 'Detecting...',
    'batteryPercentage': 100,
    'isCharging': false,
    'thermalStatus': 'NORMAL',
    'totalRamMb': 0,
    'availableRamMb': 0,
    'availableStorageMb': 0,
    'aiCoreAvailable': false,
    'localSpeechRecognitionAvailable': false,
    'localTtsAvailable': true,
    'cameraAvailable': true,
    'hardwareAcceleration': false,
  };

  @override
  void initState() {
    super.initState();
    _loadAllStatus();
  }

  Future<void> _loadAllStatus() async {
    setState(() => _isLoading = true);

    // 1. Fetch hardware status from native bridge
    try {
      final nativeStatus = await _platform.invokeMethod<Map<dynamic, dynamic>>('getLocalAIStatus');
      if (nativeStatus != null) {
        setState(() {
          _deviceHardware = Map<String, dynamic>.from(nativeStatus);
        });
      }
    } catch (e) {
      debugPrint('[OfflineScreen] Native bridge error: $e');
    }

    // 2. Fetch backend system & offline status
    try {
      final res = await _apiClient.get('/api/jarvis/offline/status');
      if (res['success'] == true) {
        setState(() {
          _networkState = res['networkState'] ?? 'ONLINE';
          _reachability = res['reachability'] != null ? Map<String, dynamic>.from(res['reachability']) : _reachability;
          _localModels = res['localModels'] ?? [];
        });
      }
    } catch (e) {
      // If backend unreachable, mark offline
      setState(() {
        _networkState = 'OFFLINE';
        _reachability['backend'] = false;
        _reachability['internet'] = false;
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Color _getStateColor(String state) {
    switch (state.toUpperCase()) {
      case 'ONLINE':
        return Colors.greenAccent;
      case 'HYBRID':
        return Colors.cyanAccent;
      case 'OFFLINE':
        return Colors.orangeAccent;
      case 'DEGRADED':
        return Colors.redAccent;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final stateColor = _getStateColor(_networkState);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Offline Intelligence Fabric', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAllStatus,
            tooltip: 'Refresh Status',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: JarvisColors.cyan))
          : RefreshIndicator(
              onRefresh: _loadAllStatus,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Mode Header Card
                  _buildModeHeaderCard(stateColor),
                  const SizedBox(height: 16),

                  // Connection Reachability Card
                  _buildConnectionCard(),
                  const SizedBox(height: 16),

                  // On-Device Intelligence Card
                  _buildLocalAiCard(),
                  const SizedBox(height: 16),

                  // Hardware Telemetry Card
                  _buildHardwareCard(),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }

  Widget _buildModeHeaderCard(Color stateColor) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: stateColor.withOpacity(0.4), width: 1.5),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: stateColor.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(
              _networkState == 'ONLINE'
                  ? Icons.cloud_done
                  : (_networkState == 'OFFLINE' ? Icons.cloud_off : Icons.wifi_protected_setup),
              color: stateColor,
              size: 28,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text('ACTIVE OPERATING MODE', style: TextStyle(color: Colors.white70, fontSize: 11, letterSpacing: 1.1)),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: stateColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _networkState,
                        style: TextStyle(color: stateColor, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  _networkState == 'ONLINE'
                      ? 'Maximum intelligence, cloud foundation reasoning & local capabilities active.'
                      : (_networkState == 'OFFLINE'
                          ? 'Zero cloud connection. Operating strictly via deterministic on-device intelligence.'
                          : 'Hybrid execution. Cloud partially degraded, local fallbacks engaged.'),
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConnectionCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('ENDPOINT REACHABILITY', style: TextStyle(color: JarvisColors.cyan, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 1.1)),
          const SizedBox(height: 12),
          _buildEndpointRow('Internet Gateway', _reachability['internet'] == true),
          _buildEndpointRow('Local Backend Server', _reachability['backend'] == true),
          _buildEndpointRow('Google Gemini AI', _reachability['gemini'] == true),
          _buildEndpointRow('OpenAI Fallback', _reachability['openai'] == true),
          _buildEndpointRow('LiveKit Realtime Voice', _reachability['realtime'] == true),
          _buildEndpointRow('Cloud Neural TTS', _reachability['tts_cloud'] == true),
        ],
      ),
    );
  }

  Widget _buildEndpointRow(String name, bool isReachable) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(
            isReachable ? Icons.check_circle : Icons.cancel,
            color: isReachable ? Colors.greenAccent : Colors.redAccent,
            size: 16,
          ),
          const SizedBox(width: 10),
          Text(name, style: const TextStyle(color: Colors.white, fontSize: 13)),
          const Spacer(),
          Text(
            isReachable ? 'REACHABLE' : 'UNREACHABLE',
            style: TextStyle(
              color: isReachable ? Colors.greenAccent : Colors.redAccent,
              fontSize: 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocalAiCard() {
    final aiCore = _deviceHardware['aiCoreAvailable'] == true;
    final localStt = _deviceHardware['localSpeechRecognitionAvailable'] == true;
    final localTts = _deviceHardware['localTtsAvailable'] == true;
    final nnapi = _deviceHardware['hardwareAcceleration'] == true;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('ON-DEVICE AI RUNTIMES', style: TextStyle(color: JarvisColors.cyan, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 1.1)),
              const Spacer(),
              if (_localModels.isNotEmpty)
                Text('${_localModels.length} models', style: const TextStyle(color: Colors.white54, fontSize: 11)),
            ],
          ),
          const SizedBox(height: 12),
          _buildAiRow('Deterministic Rule NLU', true, 'Active / 1ms Latency'),
          _buildAiRow('Local Vector & Keyword Index', true, 'Active / MySQL Stored'),
          _buildAiRow('Android Native TTS', localTts, localTts ? 'Ready' : 'Not Configured'),
          _buildAiRow('Android SpeechRecognizer (STT)', localStt, localStt ? 'Supported' : 'Unavailable on Hardware'),
          _buildAiRow('Google AICore / Gemini Nano', aiCore, aiCore ? 'Installed' : 'Unavailable on Hardware'),
          _buildAiRow('Neural Acceleration (NNAPI)', nnapi, nnapi ? 'Enabled' : 'Disabled'),
        ],
      ),
    );
  }

  Widget _buildAiRow(String name, bool available, String note) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(
            available ? Icons.check_circle_outline : Icons.highlight_off,
            color: available ? Colors.cyanAccent : Colors.white30,
            size: 16,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(color: Colors.white, fontSize: 13)),
                Text(note, style: TextStyle(color: available ? Colors.white70 : Colors.white38, fontSize: 11)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: available ? Colors.cyan.withOpacity(0.2) : Colors.white10,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              available ? 'ACTIVE' : 'OFFLINE',
              style: TextStyle(
                color: available ? Colors.cyanAccent : Colors.white38,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHardwareCard() {
    final battery = _deviceHardware['batteryPercentage'] ?? 100;
    final charging = _deviceHardware['isCharging'] == true;
    final thermal = _deviceHardware['thermalStatus'] ?? 'NORMAL';
    final ramTotal = _deviceHardware['totalRamMb'] ?? 0;
    final ramAvail = _deviceHardware['availableRamMb'] ?? 0;
    final storageAvail = _deviceHardware['availableStorageMb'] ?? 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('DEVICE TELEMETRY & RESOURCES', style: TextStyle(color: JarvisColors.cyan, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 1.1)),
          const SizedBox(height: 12),
          _buildTelemetryRow(
            'Hardware Model',
            _deviceHardware['deviceModel'] ?? 'Unknown',
            Icons.phone_android,
          ),
          _buildTelemetryRow(
            'OS Architecture',
            '${_deviceHardware['osVersion']} (${_deviceHardware['cpuArchitecture']})',
            Icons.memory,
          ),
          _buildTelemetryRow(
            'Battery State',
            '$battery% ${charging ? '(Charging)' : '(Discharging)'}',
            charging ? Icons.battery_charging_full : Icons.battery_std,
            valueColor: battery < 20 ? Colors.orangeAccent : Colors.greenAccent,
          ),
          _buildTelemetryRow(
            'Thermal Status',
            thermal,
            Icons.thermostat,
            valueColor: thermal == 'NORMAL' ? Colors.greenAccent : Colors.redAccent,
          ),
          _buildTelemetryRow(
            'RAM Budget',
            '$ramAvail MB free of $ramTotal MB',
            Icons.storage,
          ),
          _buildTelemetryRow(
            'Free Storage',
            '${(storageAvail / 1024).toStringAsFixed(1)} GB Available',
            Icons.folder,
          ),
        ],
      ),
    );
  }

  Widget _buildTelemetryRow(String title, String value, IconData icon, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, color: Colors.white60, size: 16),
          const SizedBox(width: 10),
          Text(title, style: const TextStyle(color: Colors.white70, fontSize: 12)),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              color: valueColor ?? Colors.white,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
