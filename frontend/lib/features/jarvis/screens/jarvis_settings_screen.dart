import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../core/theme/jarvis_theme_manager.dart';
import '../../../services/local_storage_service.dart';
import '../../../core/routes/app_routes.dart';
import '../../../core/config/app_config.dart';
import '../../../services/jarvis_native_bridge.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../models/proactive_models.dart';
import '../services/proactive_api_service.dart';
import '../services/personalization_api_service.dart';
import 'jarvis_memories_screen.dart';
import 'document_list_screen.dart';
import 'jarvis_permission_center_screen.dart';
import 'jarvis_assistant_setup_screen.dart';
import '../services/jarvis_tts_service.dart';

/// Futuristic JARVIS Neural Core Settings screen.
/// Configures intelligence parameters, speech tuning, proactive briefing cadence, and memory matrix.
class JarvisSettingsScreen extends StatefulWidget {
  final ProactiveApiService? apiService;
  final PersonalizationApiService? personalizationApiService;

  const JarvisSettingsScreen({
    super.key,
    this.apiService,
    this.personalizationApiService,
  });

  @override
  State<JarvisSettingsScreen> createState() => _JarvisSettingsScreenState();
}

class _JarvisSettingsScreenState extends State<JarvisSettingsScreen> {
  late final ProactiveApiService _apiService;
  late final PersonalizationApiService _personalizationService;
  AiPreferenceModel _prefs = AiPreferenceModel();
  bool _isLoading = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _apiService = widget.apiService ?? ProactiveApiService();
    _personalizationService = widget.personalizationApiService ?? PersonalizationApiService();
    _loadPreferences();
  }

  void _showServerConfigDialog() {
    final storage = LocalStorageService();
    final urlController = TextEditingController(text: storage.customServerUrl ?? AppConfig.baseUrl);
    String testStatus = '';
    Color statusColor = Colors.grey;
    bool isTesting = false;

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setModalState) => AlertDialog(
          backgroundColor: const Color(0xFF0F172A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF334155)),
          ),
          title: const Row(
            children: [
              Icon(Icons.dns_rounded, color: Color(0xFF00D2FF), size: 22),
              SizedBox(width: 10),
              Text('Server Configuration', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Enter backend server address (e.g. LAN IP for physical device connection):',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: urlController,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'http://192.168.1.100:3000/api',
                  hintStyle: const TextStyle(color: Color(0xFF475569)),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
              ),
              if (testStatus.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: statusColor.withOpacity(0.4)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.info_outline, color: statusColor, size: 16),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          testStatus,
                          style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: isTesting ? null : () async {
                final input = urlController.text.trim();
                final normalized = AppConfig.normalizeBaseUrl(input);
                if (normalized.isEmpty) {
                  setModalState(() {
                    testStatus = 'INVALID URL';
                    statusColor = Colors.orange;
                  });
                  return;
                }
                setModalState(() {
                  isTesting = true;
                  testStatus = 'Testing connection...';
                  statusColor = const Color(0xFF00D2FF);
                });
                try {
                  final healthUri = AppConfig.buildUri(normalized, '/health');
                  final res = await http.get(healthUri).timeout(const Duration(seconds: 4));
                  if (res.statusCode == 200) {
                    setModalState(() {
                      testStatus = 'CONNECTED';
                      statusColor = Colors.greenAccent;
                      isTesting = false;
                    });
                  } else if (res.statusCode == 401 || res.statusCode == 403) {
                    setModalState(() {
                      testStatus = 'AUTHENTICATION REQUIRED';
                      statusColor = Colors.amber;
                      isTesting = false;
                    });
                  } else {
                    setModalState(() {
                      testStatus = 'HTTP ${res.statusCode}';
                      statusColor = Colors.orangeAccent;
                      isTesting = false;
                    });
                  }
                } catch (_) {
                  setModalState(() {
                    testStatus = 'UNREACHABLE';
                    statusColor = Colors.redAccent;
                    isTesting = false;
                  });
                }
              },
              child: isTesting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF00D2FF)))
                  : const Text('Test Connection', style: TextStyle(color: Color(0xFF00D2FF))),
            ),
            ElevatedButton(
              onPressed: () async {
                final input = urlController.text.trim();
                final normalized = AppConfig.normalizeBaseUrl(input);
                final oldUrl = storage.customServerUrl;
                final rootNav = Navigator.of(context);
                final rootMessenger = ScaffoldMessenger.of(context);
                storage.customServerUrl = normalized;
                JarvisNativeBridge.setBaseUrl(normalized);
                Navigator.pop(dialogCtx);
                if (oldUrl != null && oldUrl != normalized) {
                  await storage.logout();
                  rootNav.pushNamedAndRemoveUntil(AppRoutes.login, (route) => false);
                } else {
                  if (mounted) {
                    setState(() {});
                  }
                  rootMessenger.showSnackBar(
                    SnackBar(content: Text('Server URL set to $normalized')),
                  );
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00D2FF)),
              child: const Text('Save', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        final isDark = JarvisThemeManager().isDarkMode;
        return AlertDialog(
          backgroundColor: isDark ? const Color(0xFF0F172A) : Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          ),
          title: Text(
            'Log Out of JARVIS?',
            style: TextStyle(
              color: isDark ? Colors.white : const Color(0xFF0F172A),
              fontWeight: FontWeight.bold,
            ),
          ),
          content: Text(
            'This will clear your local authenticated session and return you to the login screen.',
            style: TextStyle(color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text('Cancel', style: TextStyle(color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Log Out', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      await LocalStorageService().logout();
      if (mounted) {
        Navigator.pushNamedAndRemoveUntil(context, AppRoutes.login, (route) => false);
      }
    }
  }

  Future<void> _loadPreferences() async {
    final res = await _apiService.getPreferences();
    if (mounted) {
      setState(() {
        _prefs = res;
        _isLoading = false;
      });
    }
  }

  Future<void> _savePreferences() async {
    setState(() => _isSaving = true);
    final updated = await _apiService.updatePreferences(_prefs);
    if (mounted) {
      setState(() {
        _prefs = updated;
        _isSaving = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('JARVIS neural configuration updated successfully.'),
          backgroundColor: JarvisColors.surfaceElevated,
        ),
      );
    }
  }

  Future<void> _resetPersonalization() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: JarvisColors.surfaceElevated,
        title: Text('Reset Personalization & Habits?', style: JarvisTypography.titleMedium),
        content: Text(
          'This will reset your personalized profile, speech preferences, and learned habits back to default.',
          style: JarvisTypography.bodyMedium.copyWith(color: JarvisColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: JarvisColors.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Reset', style: TextStyle(color: JarvisColors.rose)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await _personalizationService.resetPersonalization();
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Personal profile reset to baseline defaults.'),
            backgroundColor: JarvisColors.surfaceElevated,
          ),
        );
        _loadPreferences();
      }
    }
  }

  Future<void> _editUserName() async {
    final current = LocalStorageService().userName ?? '';
    final controller = TextEditingController(text: current.contains('@') ? '' : current);
    final isDark = JarvisThemeManager().isDarkMode;
    final newName = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? JarvisColors.surfaceElevated : Colors.white,
        title: Text('Edit Username', style: TextStyle(
          color: isDark ? Colors.white : const Color(0xFF0F172A),
          fontWeight: FontWeight.bold,
        )),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'JARVIS will address you by this username in all voice and text interactions.',
              style: TextStyle(
                color: isDark ? Colors.white70 : const Color(0xFF475569),
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              autofocus: true,
              textCapitalization: TextCapitalization.words,
              style: TextStyle(
                color: isDark ? Colors.white : const Color(0xFF0F172A),
              ),
              decoration: InputDecoration(
                hintText: 'Enter your name (e.g. Yeshwanth)',
                hintStyle: TextStyle(
                  color: isDark ? Colors.white38 : const Color(0xFF94A3B8),
                ),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, null),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final val = controller.text.trim();
              if (val.isNotEmpty) {
                Navigator.pop(ctx, val);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0284C7),
              foregroundColor: Colors.white,
            ),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (newName != null && newName.isNotEmpty && mounted) {
      LocalStorageService().userName = newName;
      await JarvisNativeBridge.setUserName(newName);
      if (!mounted) return;
      setState(() {});
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Username updated to "$newName". JARVIS will address you as $newName.'),
          backgroundColor: const Color(0xFF0284C7),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: JarvisThemeManager(),
      builder: (context, _) {
        final theme = JarvisThemeManager();
        final isDark = theme.isDarkMode;

        final sectionHeaderColor = isDark ? JarvisColors.cyan : const Color(0xFF0369A1);
        final titleColor = isDark ? Colors.white : const Color(0xFF0F172A);
        final subtitleColor = isDark ? JarvisColors.textSecondary : const Color(0xFF475569);
        final accentColor = isDark ? JarvisColors.cyan : const Color(0xFF0284C7);

        return Scaffold(
          backgroundColor: theme.background,
          appBar: AppBar(
            backgroundColor: theme.surface,
            elevation: 0,
            leading: Builder(
              builder: (ctx) {
                final canPop = Navigator.canPop(ctx);
                if (canPop) {
                  return IconButton(
                    icon: Icon(Icons.arrow_back_ios_new, color: accentColor, size: 18),
                    onPressed: () => Navigator.pop(ctx),
                  );
                }
                return Padding(
                  padding: const EdgeInsets.all(12),
                  child: Icon(Icons.tune_rounded, color: accentColor, size: 22),
                );
              },
            ),
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'JARVIS Personalization & Control',
                  style: JarvisTypography.titleMedium.copyWith(
                    color: titleColor,
                  ),
                ),
                Text('Neural Settings & Voice Parameters', style: JarvisTypography.bodySmall.copyWith(color: sectionHeaderColor)),
              ],
            ),
            actions: [
              IconButton(
                icon: Icon(
                  isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
                  color: accentColor,
                  size: 20,
                ),
                tooltip: isDark ? 'Switch to White Theme' : 'Switch to Dark Theme',
                onPressed: () => JarvisThemeManager().toggleTheme(),
              ),
              if (_isSaving)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: accentColor),
                    ),
                  ),
                )
              else
                TextButton(
                  onPressed: _savePreferences,
                  child: Text('SAVE', style: TextStyle(color: accentColor, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: accentColor))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Quick Subsystem Links
                Row(
                  children: [
                    Expanded(
                      child: _buildQuickLinkCard(
                        icon: Icons.psychology_outlined,
                        title: 'Memory Matrix',
                        subtitle: 'Semantic knowledge',
                        color: JarvisColors.cyan,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const JarvisMemoriesScreen()),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildQuickLinkCard(
                        icon: Icons.shield_outlined,
                        title: 'Autonomy & Permissions',
                        subtitle: 'Execution matrix',
                        color: JarvisColors.emerald,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const JarvisPermissionCenterScreen()),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildQuickLinkCard(
                        icon: Icons.document_scanner_outlined,
                        title: 'Document Lab',
                        subtitle: 'Multi-modal reports',
                        color: JarvisColors.indigo,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const DocumentListScreen()),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildQuickLinkCard(
                        icon: Icons.assistant_outlined,
                        title: 'Assistant Setup',
                        subtitle: 'OS integration & tile',
                        color: JarvisColors.purple,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const JarvisAssistantSetupScreen()),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Proactive Intelligence Toggles
                Text(
                  'PROACTIVE INTELLIGENCE & ASSISTANT',
                  style: JarvisTypography.labelSmall.copyWith(
                    color: sectionHeaderColor,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                _buildCard([
                  SwitchListTile(
                    activeColor: accentColor,
                    title: Text(
                      'Enable Proactive Assistant',
                      style: TextStyle(color: titleColor, fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      'Allow autonomous reminders, timeline synthesis, and context suggestions',
                      style: TextStyle(color: subtitleColor, fontSize: 12),
                    ),
                    value: _prefs.proactiveEnabled,
                    onChanged: (val) => setState(() => _prefs = _prefs.copyWith(proactiveEnabled: val)),
                  ),
                  Divider(color: theme.cardBorder),
                  SwitchListTile(
                    activeColor: accentColor,
                    title: Text(
                      'Smart Reminders',
                      style: TextStyle(color: titleColor, fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      'Context-aware nudges for hydration, habits, and tasks',
                      style: TextStyle(color: subtitleColor, fontSize: 12),
                    ),
                    value: _prefs.smartRemindersEnabled,
                    onChanged: (val) => setState(() => _prefs = _prefs.copyWith(smartRemindersEnabled: val)),
                  ),
                  Divider(color: theme.cardBorder),
                  SwitchListTile(
                    activeColor: accentColor,
                    title: Text(
                      'Daily Morning Briefing',
                      style: TextStyle(color: titleColor, fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      'Proactive daily synthesis of life timeline and health alerts',
                      style: TextStyle(color: subtitleColor, fontSize: 12),
                    ),
                    value: _prefs.dailyBriefingEnabled,
                    onChanged: (val) => setState(() => _prefs = _prefs.copyWith(dailyBriefingEnabled: val)),
                  ),
                  Divider(color: theme.cardBorder),
                  SwitchListTile(
                    activeColor: accentColor,
                    title: Text(
                      'Quiet Hours',
                      style: TextStyle(color: titleColor, fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      'Suppress non-critical voice interruptions during sleep',
                      style: TextStyle(color: subtitleColor, fontSize: 12),
                    ),
                    value: _prefs.quietHoursEnabled,
                    onChanged: (val) => setState(() => _prefs = _prefs.copyWith(quietHoursEnabled: val)),
                  ),
                ], theme),

                const SizedBox(height: 24),

                // Voice & Speech Tuning
                Text(
                  'VOICE & SPEECH SYNTHESIS (FEMALE DEFAULT)',
                  style: JarvisTypography.labelSmall.copyWith(
                    color: sectionHeaderColor,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                _buildCard([
                  SwitchListTile(
                    activeColor: accentColor,
                    title: Text(
                      'Voice Response Synthesis (TTS)',
                      style: TextStyle(color: titleColor, fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      'JARVIS speaks conversational replies aloud',
                      style: TextStyle(color: subtitleColor, fontSize: 12),
                    ),
                    value: _prefs.voiceResponseEnabled,
                    onChanged: (val) => setState(() => _prefs = _prefs.copyWith(voiceResponseEnabled: val)),
                  ),
                  Divider(color: theme.cardBorder),
                  ListTile(
                    title: Text(
                      'Assistant Voice Gender',
                      style: TextStyle(color: titleColor, fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      'Select female or male persona',
                      style: TextStyle(color: subtitleColor, fontSize: 12),
                    ),
                  ),
                  RadioListTile<String>(
                    title: Text(
                      'Female Voice',
                      style: TextStyle(color: titleColor, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    subtitle: Text(
                      'Natural female acoustic synthesis',
                      style: TextStyle(color: subtitleColor, fontSize: 12),
                    ),
                    value: 'female',
                    groupValue: LocalStorageService().selectedVoiceGender,
                    activeColor: accentColor,
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          LocalStorageService().selectedVoiceGender = val;
                          _prefs = _prefs.copyWith(voiceGender: val);
                        });
                        JarvisTtsService().setGender(JarvisVoiceGender.female);
                      }
                    },
                  ),
                  RadioListTile<String>(
                    title: Text(
                      'Male Voice',
                      style: TextStyle(color: titleColor, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    subtitle: Text(
                      'Natural male acoustic synthesis',
                      style: TextStyle(color: subtitleColor, fontSize: 12),
                    ),
                    value: 'male',
                    groupValue: LocalStorageService().selectedVoiceGender,
                    activeColor: accentColor,
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          LocalStorageService().selectedVoiceGender = val;
                          _prefs = _prefs.copyWith(voiceGender: val);
                        });
                        JarvisTtsService().setGender(JarvisVoiceGender.male);
                      }
                    },
                  ),
                  Divider(color: theme.cardBorder),
                  ListTile(
                    title: Text(
                      'Voice Tone Preset',
                      style: TextStyle(color: titleColor, fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      'Acoustic tone & demeanor for selected voice',
                      style: TextStyle(color: subtitleColor, fontSize: 12),
                    ),
                    trailing: DropdownButton<String>(
                      value: _prefs.voicePreset,
                      dropdownColor: isDark ? JarvisColors.surfaceElevated : Colors.white,
                      underline: const SizedBox(),
                      items: [
                        DropdownMenuItem(value: 'warm', child: Text('Warm (Natural)', style: TextStyle(color: accentColor, fontWeight: FontWeight.w600))),
                        DropdownMenuItem(value: 'calm', child: Text('Calm (Gentle)', style: TextStyle(color: titleColor))),
                        DropdownMenuItem(value: 'professional', child: Text('Professional', style: TextStyle(color: titleColor))),
                        DropdownMenuItem(value: 'energetic', child: Text('Energetic', style: TextStyle(color: titleColor))),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setState(() => _prefs = _prefs.copyWith(voicePreset: val));
                        }
                      },
                    ),
                  ),
                  Divider(color: theme.cardBorder),
                  ListTile(
                    title: Text(
                      'Speech Velocity (${_prefs.speechRate.toStringAsFixed(1)}x)',
                      style: TextStyle(color: titleColor, fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Slider(
                      value: _prefs.speechRate,
                      min: 0.5,
                      max: 2.0,
                      divisions: 15,
                      activeColor: accentColor,
                      inactiveColor: isDark ? JarvisColors.border : const Color(0xFFCBD5E1),
                      onChanged: (val) => setState(() => _prefs = _prefs.copyWith(speechRate: val)),
                    ),
                  ),
                  Divider(color: theme.cardBorder),
                  ListTile(
                    title: Text(
                      'Voice Pitch (${_prefs.voicePitch.toStringAsFixed(2)})',
                      style: TextStyle(color: titleColor, fontSize: 14, fontWeight: FontWeight.w600),
                    ),
                    subtitle: Slider(
                      value: _prefs.voicePitch,
                      min: 0.8,
                      max: 1.5,
                      divisions: 14,
                      activeColor: accentColor,
                      inactiveColor: isDark ? JarvisColors.border : const Color(0xFFCBD5E1),
                      onChanged: (val) => setState(() => _prefs = _prefs.copyWith(voicePitch: val)),
                    ),
                  ),
                  Divider(color: theme.cardBorder),
                  ListTile(
                    leading: Icon(Icons.volume_up, color: accentColor),
                    title: Text('Preview Voice', style: TextStyle(color: accentColor, fontWeight: FontWeight.bold)),
                    subtitle: Text('Audition the selected assistant voice persona', style: TextStyle(color: subtitleColor, fontSize: 12)),
                    onTap: () {
                      final tts = JarvisTtsService();
                      final currentGender = LocalStorageService().selectedVoiceGender;
                      if (currentGender == 'male') {
                        tts.setGender(JarvisVoiceGender.male);
                      } else {
                        tts.setGender(JarvisVoiceGender.female);
                      }
                      tts.setSpeechRate(_prefs.speechRate);
                      tts.setPitch(_prefs.voicePitch);
                      tts.previewVoice();
                    },
                  ),
                ], theme),

                const SizedBox(height: 24),

                // Theme & Visual Appearance (Dark/White Theme Switchable)
                Text(
                  'THEME & VISUAL APPEARANCE',
                  style: JarvisTypography.labelSmall.copyWith(
                    color: sectionHeaderColor,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                _buildCard([
                  ListTile(
                    leading: Icon(
                      isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                      color: accentColor,
                    ),
                    title: Text(
                      'Theme Appearance',
                      style: TextStyle(
                        color: titleColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    subtitle: Text(
                      'Real-time switchable dark and white theme',
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  Divider(color: theme.cardBorder),
                  RadioListTile<bool>(
                    title: Text(
                      'Dark Obsidian Mode (Cybernetic Neon)',
                      style: TextStyle(
                        color: titleColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    subtitle: Text(
                      'Futuristic dark backdrop with glowing cyan accents',
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 12,
                      ),
                    ),
                    value: true,
                    groupValue: isDark,
                    activeColor: accentColor,
                    onChanged: (val) {
                      if (val != null) {
                        JarvisThemeManager().setDarkMode(true);
                      }
                    },
                  ),
                  RadioListTile<bool>(
                    title: Text(
                      'Clean White Mode (High Clarity)',
                      style: TextStyle(
                        color: titleColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    subtitle: Text(
                      'Crisp white backdrop with sharp contrast & cyan highlights',
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 12,
                      ),
                    ),
                    value: false,
                    groupValue: isDark,
                    activeColor: accentColor,
                    onChanged: (val) {
                      if (val != null) {
                        JarvisThemeManager().setDarkMode(false);
                      }
                    },
                  ),
                ], theme),

                const SizedBox(height: 24),

                // System & Timeline Time Format
                Text(
                  'TIMELINE & DISPLAY CONFIGURATION',
                  style: JarvisTypography.labelSmall.copyWith(
                    color: sectionHeaderColor,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                _buildCard([
                  ListTile(
                    leading: Icon(Icons.access_time_rounded, color: accentColor),
                    title: Text(
                      'Time Presentation Format',
                      style: TextStyle(
                        color: titleColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    subtitle: Text(
                      'Authoritative format across JARVIS schedule and timeline',
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  Divider(color: theme.cardBorder),
                  RadioListTile<String>(
                    title: Text(
                      '12-Hour (AM/PM)',
                      style: TextStyle(
                        color: titleColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    subtitle: Text(
                      'Example: 8:30 PM',
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 12,
                      ),
                    ),
                    value: '12h',
                    groupValue: LocalStorageService().timeFormat,
                    activeColor: accentColor,
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          LocalStorageService().timeFormat = val;
                        });
                      }
                    },
                  ),
                  RadioListTile<String>(
                    title: Text(
                      '24-Hour (Military/Standard)',
                      style: TextStyle(
                        color: titleColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    subtitle: Text(
                      'Example: 20:30',
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 12,
                      ),
                    ),
                    value: '24h',
                    groupValue: LocalStorageService().timeFormat,
                    activeColor: accentColor,
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          LocalStorageService().timeFormat = val;
                        });
                      }
                    },
                  ),
                ], theme),

                const SizedBox(height: 24),

                // Account & Authentication Section
                Text(
                  'AUTHENTICATED ACCOUNT & IDENTITY',
                  style: JarvisTypography.labelSmall.copyWith(
                    color: sectionHeaderColor,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                _buildCard([
                  ListTile(
                    leading: CircleAvatar(
                      backgroundColor: accentColor,
                      child: const Icon(Icons.person, color: Colors.white),
                    ),
                    title: Row(
                      children: [
                        Expanded(
                          child: Text(
                            LocalStorageService().userName ?? 'Authenticated User',
                            style: TextStyle(
                              color: titleColor,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.edit_outlined, size: 18),
                          color: accentColor,
                          tooltip: 'Edit Username',
                          onPressed: _editUserName,
                        ),
                      ],
                    ),
                    subtitle: Text(
                      LocalStorageService().userEmail ?? 'No email associated',
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 13,
                      ),
                    ),
                    trailing: TextButton.icon(
                      onPressed: _logout,
                      icon: const Icon(Icons.logout, color: JarvisColors.rose, size: 18),
                      label: const Text('LOG OUT', style: TextStyle(color: JarvisColors.rose, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ], theme),

                const SizedBox(height: 24),

                // Universal Server Connection
                Text(
                  'UNIVERSAL SERVER CONNECTION',
                  style: JarvisTypography.labelSmall.copyWith(
                    color: sectionHeaderColor,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                _buildCard([
                  ListTile(
                    leading: Icon(Icons.dns_rounded, color: accentColor),
                    title: Text(
                      'Backend Server Endpoint',
                      style: TextStyle(
                        color: titleColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    subtitle: Text(
                      LocalStorageService().customServerUrl ?? AppConfig.baseUrl,
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 13,
                      ),
                    ),
                    trailing: ElevatedButton(
                      onPressed: _showServerConfigDialog,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                        foregroundColor: accentColor,
                        side: BorderSide(color: accentColor),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      child: const Text('Configure / Test', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ], theme),

                const SizedBox(height: 24),

                // Reset Section
                Text(
                  'DATA & SECURITY VAULT',
                  style: JarvisTypography.labelSmall.copyWith(
                    color: JarvisColors.rose,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                _buildCard([
                  ListTile(
                    leading: const Icon(Icons.restart_alt, color: JarvisColors.rose),
                    title: Text('Reset Personal Profile & Habits', style: TextStyle(color: JarvisColors.rose, fontSize: 14, fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      'Clear learned routines, preferences, and return to defaults',
                      style: TextStyle(
                        color: subtitleColor,
                        fontSize: 12,
                      ),
                    ),
                    onTap: _resetPersonalization,
                  ),
                ], theme),

                const SizedBox(height: 30),
                Center(
                  child: ElevatedButton.icon(
                    onPressed: _savePreferences,
                    icon: Icon(Icons.save, size: 18, color: isDark ? Colors.black : Colors.white),
                    label: Text('SAVE', style: TextStyle(color: isDark ? Colors.black : Colors.white, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accentColor,
                      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
        );
      },
    );
  }

  Widget _buildQuickLinkCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    final theme = JarvisThemeManager();
    final isDark = theme.isDarkMode;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.3)),
          boxShadow: isDark
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 10),
            Text(
              title,
              style: JarvisTypography.titleSmall.copyWith(
                color: isDark ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: JarvisTypography.bodySmall.copyWith(
                color: isDark ? JarvisColors.textSecondary : const Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard(List<Widget> children, [JarvisThemeManager? tm]) {
    final theme = tm ?? JarvisThemeManager();
    final isDark = theme.isDarkMode;

    return Container(
      decoration: BoxDecoration(
        color: theme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.cardBorder),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: Column(children: children),
      ),
    );
  }
}
