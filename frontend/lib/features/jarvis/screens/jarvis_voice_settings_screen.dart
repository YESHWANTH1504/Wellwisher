import 'package:flutter/material.dart';
import '../../../services/jarvis_native_bridge.dart';
import '../../../services/local_storage_service.dart';
import '../services/jarvis_tts_service.dart';
import 'jarvis_voice_diagnostics_screen.dart';
import 'jarvis_os_status_screen.dart';

class JarvisVoiceSettingsScreen extends StatefulWidget {
  const JarvisVoiceSettingsScreen({super.key});

  @override
  State<JarvisVoiceSettingsScreen> createState() => _JarvisVoiceSettingsScreenState();
}

class _JarvisVoiceSettingsScreenState extends State<JarvisVoiceSettingsScreen> {
  bool _isServiceRunning = false;
  String _currentState = 'IDLE';
  bool _micPermission = false;
  bool _notifPermission = false;
  bool _batteryIgnored = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _refreshStatus();
  }

  Future<void> _refreshStatus() async {
    setState(() => _isLoading = true);
    final status = await JarvisNativeBridge.getVoiceAssistantStatus();
    final mic = await JarvisNativeBridge.checkMicrophonePermission();
    final notif = await JarvisNativeBridge.checkNotificationPermission();
    final battery = await JarvisNativeBridge.isBatteryOptimizationIgnored();

    if (mounted) {
      setState(() {
        _isServiceRunning = status['isRunning'] ?? false;
        _currentState = status['state'] ?? 'IDLE';
        _micPermission = mic;
        _notifPermission = notif;
        _batteryIgnored = battery;
        _isLoading = false;
      });
    }
  }

  Future<void> _toggleAssistant(bool enable) async {
    if (enable) {
      if (!_micPermission || !_notifPermission) {
        await JarvisNativeBridge.requestVoicePermissions();
      }
      final success = await JarvisNativeBridge.startVoiceAssistant();
      if (!success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to start voice service. Check permissions.')),
        );
      }
    } else {
      await JarvisNativeBridge.stopVoiceAssistant();
    }
    await _refreshStatus();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('JARVIS Voice Assistant', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.cyanAccent),
            onPressed: _refreshStatus,
          ),
          IconButton(
            icon: const Icon(Icons.health_and_safety, color: Colors.cyanAccent),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const JarvisVoiceDiagnosticsScreen()),
              );
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.cyanAccent))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildHeaderCard(),
                const SizedBox(height: 16),
                _buildVoiceGenderSection(),
                const SizedBox(height: 16),
                _buildStatusSection(),
                const SizedBox(height: 16),
                _buildPermissionsSection(),
                const SizedBox(height: 16),
                _buildActionButtons(),
              ],
            ),
    );
  }

  Widget _buildVoiceGenderSection() {
    final storage = LocalStorageService();
    final currentGender = storage.selectedVoiceGender;
    final tts = JarvisTtsService();

    return Card(
      color: const Color(0xFF1E293B),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('VOICE GENDER SELECTION', style: TextStyle(color: Colors.cyanAccent, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 1.0)),
            const SizedBox(height: 8),
            RadioListTile<String>(
              title: const Text('Female Voice', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              subtitle: const Text('Natural female acoustic synthesis', style: TextStyle(color: Colors.white60, fontSize: 12)),
              value: 'female',
              groupValue: currentGender,
              activeColor: Colors.cyanAccent,
              onChanged: (val) {
                if (val != null) {
                  storage.selectedVoiceGender = val;
                  tts.setGender(JarvisVoiceGender.female);
                  setState(() {});
                }
              },
            ),
            RadioListTile<String>(
              title: const Text('Male Voice', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              subtitle: const Text('Natural male acoustic synthesis', style: TextStyle(color: Colors.white60, fontSize: 12)),
              value: 'male',
              groupValue: currentGender,
              activeColor: Colors.cyanAccent,
              onChanged: (val) {
                if (val != null) {
                  storage.selectedVoiceGender = val;
                  tts.setGender(JarvisVoiceGender.male);
                  setState(() {});
                }
              },
            ),
            const Divider(color: Colors.white10),
            ElevatedButton.icon(
              onPressed: () {
                tts.previewVoice();
              },
              icon: const Icon(Icons.volume_up, color: Colors.black),
              label: const Text('Preview Voice', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.cyanAccent,
                minimumSize: const Size.fromHeight(40),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.cyan.shade900.withValues(alpha: 0.4), Colors.indigo.shade900.withValues(alpha: 0.3)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.cyan.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Always-On Voice Assistant', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(
                _isServiceRunning ? 'Listening for "Hey Jarvis"' : 'Service Offline',
                style: TextStyle(color: _isServiceRunning ? Colors.cyanAccent : Colors.grey, fontSize: 13),
              ),
            ],
          ),
          Switch(
            value: _isServiceRunning,
            onChanged: _toggleAssistant,
            activeThumbColor: Colors.cyanAccent,
            activeTrackColor: Colors.cyan.shade700,
          ),
        ],
      ),
    );
  }

  Widget _buildStatusSection() {
    return Card(
      color: const Color(0xFF1E293B),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('System Status', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 14)),
            const Divider(color: Colors.white10),
            _buildStatusRow('Wake Word', 'Hey Jarvis', Colors.cyanAccent),
            _buildStatusRow('LiveKit Realtime Transport', 'Ready (WebRTC)', Colors.cyanAccent),
            _buildStatusRow('Voice Engine State', _currentState, Colors.white),
            _buildStatusRow('Background Voice', _isServiceRunning ? 'Enabled' : 'Disabled', _isServiceRunning ? Colors.greenAccent : Colors.grey),
            _buildStatusRow('Voice Responses (TTS)', 'Active', Colors.greenAccent),
          ],
        ),
      ),
    );
  }

  Widget _buildPermissionsSection() {
    return Card(
      color: const Color(0xFF1E293B),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Permissions & Battery Policy', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 14)),
            const Divider(color: Colors.white10),
            _buildStatusRow('Microphone', _micPermission ? 'Granted' : 'Denied', _micPermission ? Colors.greenAccent : Colors.redAccent),
            _buildStatusRow('Notifications', _notifPermission ? 'Granted' : 'Denied', _notifPermission ? Colors.greenAccent : Colors.orangeAccent),
            _buildStatusRow('Battery Optimization', _batteryIgnored ? 'Exempt (Unrestricted)' : 'Optimized (May throttle)', _batteryIgnored ? Colors.greenAccent : Colors.orangeAccent),
            if (!_batteryIgnored) ...[
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () async {
                  await JarvisNativeBridge.requestBatteryOptimizationExemption();
                  await _refreshStatus();
                },
                style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.cyanAccent)),
                child: const Text('Request Battery Exemption', style: TextStyle(color: Colors.cyanAccent)),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Column(
      children: [
        ElevatedButton.icon(
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const JarvisOsStatusScreen()),
            );
          },
          icon: const Icon(Icons.hub_outlined, color: Colors.white),
          label: const Text('Open JARVIS OS Core Status Center', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF0284C7),
            minimumSize: const Size.fromHeight(48),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
        const SizedBox(height: 10),
        ElevatedButton.icon(
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const JarvisVoiceDiagnosticsScreen()),
            );
          },
          icon: const Icon(Icons.troubleshoot, color: Colors.black),
          label: const Text('Open Voice Diagnostics Center', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.cyanAccent,
            minimumSize: const Size.fromHeight(48),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: () async {
            await JarvisNativeBridge.testTts(text: 'Hello! JARVIS always-on voice assistant is ready.');
          },
          icon: const Icon(Icons.volume_up, color: Colors.white70),
          label: const Text('Test Text-To-Speech (TTS)', style: TextStyle(color: Colors.white70)),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(44),
            side: const BorderSide(color: Colors.white24),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusRow(String label, String value, Color valueColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 13)),
          Text(value, style: TextStyle(color: valueColor, fontWeight: FontWeight.bold, fontSize: 13)),
        ],
      ),
    );
  }
}
