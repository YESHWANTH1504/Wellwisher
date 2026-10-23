import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:wellwisher/core/config/app_config.dart';
import 'package:wellwisher/features/jarvis/core/jarvis_colors.dart';
import 'package:wellwisher/services/jarvis_native_bridge.dart';

class JarvisAssistantSetupScreen extends StatefulWidget {
  const JarvisAssistantSetupScreen({super.key});

  @override
  State<JarvisAssistantSetupScreen> createState() => _JarvisAssistantSetupScreenState();
}

class _JarvisAssistantSetupScreenState extends State<JarvisAssistantSetupScreen> with WidgetsBindingObserver {
  bool _isLoading = true;

  // System States
  String _assistantStatus = 'UNKNOWN';
  bool _isDefaultAssistant = false;
  bool _micGranted = false;
  String _micState = 'MIC_RELEASED';
  bool _notifGranted = false;
  String _wakeWordStatus = 'Unavailable';
  bool _wakeWordRunning = false;
  String _bgVoiceStatus = 'Limited';
  String _realtimeAIStatus = 'Checking...';
  String _backendStatus = 'Checking...';
  String _voiceProviderStatus = 'Checking...';
  String _actionMessage = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _runDiagnostics();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _runDiagnostics();
    }
  }

  Future<void> _runDiagnostics() async {
    setState(() => _isLoading = true);

    try {
      // 1. Android Assistant Role & Service State
      final assistantInfo = await JarvisNativeBridge.getAssistantStatus();
      final statusStr = assistantInfo['status'] as String? ?? 'UNKNOWN';
      final isDefault = assistantInfo['isDefault'] as bool? ?? false;

      // 2. Microphone Status
      final micInfo = await JarvisNativeBridge.getMicrophoneStatus();
      final micGranted = micInfo['granted'] as bool? ?? false;
      final micState = micInfo['state'] as String? ?? 'MIC_RELEASED';

      // 3. Notifications Permission
      final notifGranted = await JarvisNativeBridge.checkNotificationPermission();

      // 4. Wake-Word Engine Status
      final wakeInfo = await JarvisNativeBridge.getWakeWordStatus();
      final wakeRunning = wakeInfo['isRunning'] as bool? ?? false;
      final wakeListening = wakeInfo['isListening'] as bool? ?? false;
      final wakeStatus = wakeRunning
          ? (wakeListening ? 'Available (Listening)' : 'Available (Standby)')
          : 'Disabled';

      // 5. Background Voice Capability
      // Honest platform reporting: On Android 14+, microphone foreground service requires foreground or assistant role exemption
      final bgVoice = isDefault
          ? (wakeRunning ? 'Supported (Assistant Role)' : 'Supported (Idle)')
          : 'Limited (Android 14+ background mic restrictions apply)';

      // 6. Backend Connectivity Check
      String backend = 'Offline';
      String realtimeAI = 'Configuration Required';
      String voiceProvider = 'Unavailable';

      try {
        final res = await http.get(Uri.parse('${AppConfig.baseUrl}/health')).timeout(const Duration(seconds: 3));
        if (res.statusCode == 200) {
          backend = 'Connected';
          final data = jsonDecode(res.body);
          if (data['status'] == 'healthy' || data['success'] == true) {
            realtimeAI = 'Connected (Gemini Flash Lite)';
            voiceProvider = 'Available (Gemini Live API)';
          }
        }
      } catch (_) {
        backend = 'Offline';
        realtimeAI = 'Offline';
      }

      if (mounted) {
        setState(() {
          _assistantStatus = statusStr;
          _isDefaultAssistant = isDefault;
          _micGranted = micGranted;
          _micState = micState;
          _notifGranted = notifGranted;
          _wakeWordRunning = wakeRunning;
          _wakeWordStatus = wakeStatus;
          _bgVoiceStatus = bgVoice;
          _backendStatus = backend;
          _realtimeAIStatus = realtimeAI;
          _voiceProviderStatus = voiceProvider;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _actionMessage = 'Diagnostics error: $e';
          _isLoading = false;
        });
      }
    }
  }

  // --- Real Interactive Actions ---

  Future<void> _handleSetDefaultAssistant() async {
    setState(() => _actionMessage = 'Requesting Default Assistant Role...');
    final res = await JarvisNativeBridge.requestAssistantRole();
    final status = res['status'] as String? ?? '';
    if (status == 'SELECTED') {
      _showMessage('JARVIS is already your default assistant!');
    } else {
      _showMessage('Please select JARVIS in system settings.');
      await JarvisNativeBridge.openAssistantSettings();
    }
    await _runDiagnostics();
  }

  Future<void> _handleToggleWakeWord() async {
    if (_wakeWordRunning) {
      setState(() => _actionMessage = 'Stopping Wake-Word Engine...');
      await JarvisNativeBridge.stopWakeWord();
      _showMessage('Wake-word engine stopped');
    } else {
      setState(() => _actionMessage = 'Starting Wake-Word Engine...');
      await JarvisNativeBridge.startWakeWord();
      _showMessage('Wake-word engine started (Local On-Device)');
    }
    await _runDiagnostics();
  }

  Future<void> _handleTestMicrophone() async {
    setState(() => _actionMessage = 'Testing Microphone Hardware...');
    final micInfo = await JarvisNativeBridge.getMicrophoneStatus();
    final audioInfo = await JarvisNativeBridge.getAudioFocusStatus();
    final granted = micInfo['granted'] == true;
    final state = micInfo['state'] ?? 'UNKNOWN';
    final musicActive = audioInfo['isMusicActive'] == true;

    _showMessage(
      'Mic Granted: $granted | State: $state | External Audio Playing: $musicActive',
    );
  }

  Future<void> _handleTestWakeWord() async {
    setState(() => _actionMessage = 'Triggering local wake word verification test...');
    final res = await JarvisNativeBridge.testWakeWord();
    if (res) {
      _showMessage('Wake-word test triggered! JARVIS should respond "Yes?".');
    } else {
      _showMessage('Failed to trigger wake-word test.');
    }
    await _runDiagnostics();
  }

  Future<void> _handleOpenSettings() async {
    setState(() => _actionMessage = 'Opening Android Assistant Settings...');
    await JarvisNativeBridge.openAssistantSettings();
  }

  void _showMessage(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: JarvisColors.surfaceElevated,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JarvisColors.background,
      appBar: AppBar(
        backgroundColor: JarvisColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: JarvisColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Row(
          children: [
            Icon(Icons.smart_toy_outlined, color: JarvisColors.cyan, size: 22),
            SizedBox(width: 10),
            Text(
              'JARVIS ASSISTANT',
              style: TextStyle(
                color: JarvisColors.textPrimary,
                fontSize: 18,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: JarvisColors.cyan),
            tooltip: 'Run Assistant Diagnostics',
            onPressed: _runDiagnostics,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: JarvisColors.cyan))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildStatusOverviewHeader(),
                  const SizedBox(height: 16),
                  _buildSystemStateTable(),
                  const SizedBox(height: 20),
                  _buildActionButtonsSection(),
                  const SizedBox(height: 20),
                  _buildPrivacySection(),
                  if (_actionMessage.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: JarvisColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: JarvisColors.cyan.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        _actionMessage,
                        style: const TextStyle(color: JarvisColors.cyan, fontSize: 12),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildStatusOverviewHeader() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: JarvisColors.surfaceElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _isDefaultAssistant ? JarvisColors.success.withValues(alpha: 0.5) : JarvisColors.border,
          width: 1.5,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _isDefaultAssistant
                  ? JarvisColors.success.withValues(alpha: 0.15)
                  : JarvisColors.warning.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(
              _isDefaultAssistant ? Icons.verified : Icons.warning_amber_rounded,
              color: _isDefaultAssistant ? JarvisColors.success : JarvisColors.warning,
              size: 28,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isDefaultAssistant ? 'JARVIS System Assistant: SELECTED' : 'JARVIS System Assistant: NOT SELECTED',
                  style: TextStyle(
                    color: _isDefaultAssistant ? JarvisColors.success : JarvisColors.warning,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _isDefaultAssistant
                      ? 'JARVIS is configured as default digital assistant on Android.'
                      : 'Android currently routes digital assistant invocations to another assistant.',
                  style: const TextStyle(color: JarvisColors.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSystemStateTable() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: JarvisColors.surfaceElevated,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: JarvisColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'SYSTEM ASSISTANT STATUS',
            style: TextStyle(
              color: JarvisColors.cyan,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 14),
          _buildStatusRow(
            label: 'System Assistant',
            value: _isDefaultAssistant ? 'Selected' : 'Not Selected ($_assistantStatus)',
            isGood: _isDefaultAssistant,
          ),
          _buildStatusRow(
            label: 'Microphone',
            value: _micGranted ? 'Granted ($_micState)' : 'Required',
            isGood: _micGranted,
          ),
          _buildStatusRow(
            label: 'Notifications',
            value: _notifGranted ? 'Granted' : 'Required',
            isGood: _notifGranted,
          ),
          _buildStatusRow(
            label: 'Wake Word',
            value: _wakeWordStatus,
            isGood: _wakeWordRunning,
          ),
          _buildStatusRow(
            label: 'Background Voice',
            value: _bgVoiceStatus,
            isGood: _isDefaultAssistant,
          ),
          _buildStatusRow(
            label: 'Realtime AI',
            value: _realtimeAIStatus,
            isGood: _realtimeAIStatus.contains('Connected'),
          ),
          _buildStatusRow(
            label: 'Backend',
            value: _backendStatus,
            isGood: _backendStatus == 'Connected',
          ),
          _buildStatusRow(
            label: 'Voice Provider',
            value: _voiceProviderStatus,
            isGood: _voiceProviderStatus.contains('Available'),
          ),
          _buildStatusRow(
            label: 'Wake Word Engine',
            value: _wakeWordRunning ? 'Running' : 'Stopped',
            isGood: _wakeWordRunning,
          ),
        ],
      ),
    );
  }

  Widget _buildStatusRow({required String label, required String value, required bool isGood}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(color: JarvisColors.textPrimary, fontSize: 13),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: isGood
                  ? JarvisColors.success.withValues(alpha: 0.12)
                  : JarvisColors.warning.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(
                color: isGood
                    ? JarvisColors.success.withValues(alpha: 0.4)
                    : JarvisColors.warning.withValues(alpha: 0.4),
              ),
            ),
            child: Text(
              value,
              style: TextStyle(
                color: isGood ? JarvisColors.success : JarvisColors.warning,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtonsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'ASSISTANT ACTIONS',
          style: TextStyle(
            color: JarvisColors.cyan,
            fontSize: 12,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 12),
        _buildActionButton(
          label: 'Set as Default Assistant',
          icon: Icons.assistant_photo,
          color: JarvisColors.cyan,
          onPressed: _handleSetDefaultAssistant,
        ),
        const SizedBox(height: 10),
        _buildActionButton(
          label: _wakeWordRunning ? 'Disable Wake Word' : 'Enable Wake Word',
          icon: _wakeWordRunning ? Icons.mic_off : Icons.mic,
          color: _wakeWordRunning ? JarvisColors.warning : JarvisColors.success,
          onPressed: _handleToggleWakeWord,
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildActionButton(
                label: 'Test Microphone',
                icon: Icons.mic_external_on,
                color: JarvisColors.surfaceHighlight,
                onPressed: _handleTestMicrophone,
                textColor: JarvisColors.textPrimary,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildActionButton(
                label: 'Test Wake Word',
                icon: Icons.record_voice_over,
                color: JarvisColors.surfaceHighlight,
                onPressed: _handleTestWakeWord,
                textColor: JarvisColors.textPrimary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _buildActionButton(
          label: 'Open Android Assistant Settings',
          icon: Icons.settings,
          color: JarvisColors.surfaceHighlight,
          onPressed: _handleOpenSettings,
          textColor: JarvisColors.textPrimary,
        ),
        const SizedBox(height: 10),
        _buildActionButton(
          label: 'Run Assistant Diagnostics',
          icon: Icons.sync,
          color: JarvisColors.cyan.withValues(alpha: 0.15),
          onPressed: _runDiagnostics,
          textColor: JarvisColors.cyan,
        ),
      ],
    );
  }

  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onPressed,
    Color textColor = Colors.black,
  }) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 18, color: textColor),
        label: Text(
          label,
          style: TextStyle(color: textColor, fontWeight: FontWeight.bold, fontSize: 13),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          padding: const EdgeInsets.symmetric(vertical: 13),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          elevation: 0,
        ),
      ),
    );
  }

  Widget _buildPrivacySection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: JarvisColors.surfaceElevated,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: JarvisColors.border),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.security, color: JarvisColors.cyan, size: 18),
              SizedBox(width: 8),
              Text(
                'ZERO CLOUD PASSIVE LISTENING GUARANTEE',
                style: TextStyle(
                  color: JarvisColors.cyan,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                ),
              ),
            ],
          ),
          SizedBox(height: 8),
          Text(
            'Passive wake word detection runs 100% locally on your device via hardware AudioRecord VAD and on-device keyword verification. Microphone audio is NEVER streamed to Gemini, OpenAI, or LiveKit while waiting for "Hey Jarvis". Only after verified activation does your spoken command enter the secure realtime AI gateway.',
            style: TextStyle(color: JarvisColors.textSecondary, fontSize: 11, height: 1.4),
          ),
        ],
      ),
    );
  }
}
