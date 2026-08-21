import 'package:flutter/material.dart';
import '../models/proactive_models.dart';
import '../services/proactive_api_service.dart';
import '../services/personalization_api_service.dart';
import 'jarvis_memories_screen.dart';
import 'document_list_screen.dart';

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
        const SnackBar(content: Text('JARVIS settings saved successfully.')),
      );
    }
  }

  Future<void> _resetPersonalization() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Reset Personalization?', style: TextStyle(color: Colors.white)),
        content: const Text(
          'This will reset your personal profile and learned habits to default values.',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Reset', style: TextStyle(color: Color(0xFFEF4444))),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _personalizationService.resetPersonalization();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Personalization profile reset to defaults.')),
        );
        _loadPreferences();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('JARVIS Personalization & Control', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          if (_isSaving)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))),
            )
          else
            TextButton(
              onPressed: _savePreferences,
              child: const Text('SAVE', style: TextStyle(color: Color(0xFF818CF8), fontWeight: FontWeight.bold)),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildSectionHeader('MEMORY & HABIT INTELLIGENCE'),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Material(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(12),
                    child: ListTile(
                      leading: const Icon(Icons.psychology, color: Color(0xFF818CF8)),
                      title: const Text('Manage AI Memories', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: const Text('View, edit, or delete explicit & learned habits', style: TextStyle(color: Colors.white60, fontSize: 12)),
                      trailing: const Icon(Icons.arrow_forward_ios, color: Colors.white38, size: 16),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const JarvisMemoriesScreen()),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                _buildSectionHeader('PROACTIVE ASSISTANCE'),
                _buildSwitchTile(
                  title: 'Enable Proactive Assistant',
                  subtitle: 'Allow JARVIS to predict needs and suggest actions',
                  value: _prefs.proactiveAssistanceEnabled,
                  onChanged: (v) => setState(() => _prefs = AiPreferenceModel(
                    assistantName: _prefs.assistantName,
                    voiceEnabled: _prefs.voiceEnabled,
                    ttsEnabled: _prefs.ttsEnabled,
                    proactiveAssistanceEnabled: v,
                    proactiveRemindersEnabled: _prefs.proactiveRemindersEnabled,
                    dailyBriefingEnabled: _prefs.dailyBriefingEnabled,
                    eveningSummaryEnabled: _prefs.eveningSummaryEnabled,
                    proactiveVoiceEnabled: _prefs.proactiveVoiceEnabled,
                    quietHoursEnabled: _prefs.quietHoursEnabled,
                    quietHoursStart: _prefs.quietHoursStart,
                    quietHoursEnd: _prefs.quietHoursEnd,
                    notificationFrequency: _prefs.notificationFrequency,
                    preferredResponseStyle: _prefs.preferredResponseStyle,
                  )),
                ),
                _buildSwitchTile(
                  title: 'Smart Reminders',
                  subtitle: 'Receive reminders for upcoming, due, and overdue routines',
                  value: _prefs.proactiveRemindersEnabled,
                  onChanged: (v) => setState(() => _prefs = AiPreferenceModel(
                    assistantName: _prefs.assistantName,
                    voiceEnabled: _prefs.voiceEnabled,
                    ttsEnabled: _prefs.ttsEnabled,
                    proactiveAssistanceEnabled: _prefs.proactiveAssistanceEnabled,
                    proactiveRemindersEnabled: v,
                    dailyBriefingEnabled: _prefs.dailyBriefingEnabled,
                    eveningSummaryEnabled: _prefs.eveningSummaryEnabled,
                    proactiveVoiceEnabled: _prefs.proactiveVoiceEnabled,
                    quietHoursEnabled: _prefs.quietHoursEnabled,
                    quietHoursStart: _prefs.quietHoursStart,
                    quietHoursEnd: _prefs.quietHoursEnd,
                    notificationFrequency: _prefs.notificationFrequency,
                    preferredResponseStyle: _prefs.preferredResponseStyle,
                  )),
                ),
                _buildSwitchTile(
                  title: 'Daily Morning Briefing',
                  subtitle: 'Receive a structured schedule summary every morning',
                  value: _prefs.dailyBriefingEnabled,
                  onChanged: (v) => setState(() => _prefs = AiPreferenceModel(
                    assistantName: _prefs.assistantName,
                    voiceEnabled: _prefs.voiceEnabled,
                    ttsEnabled: _prefs.ttsEnabled,
                    proactiveAssistanceEnabled: _prefs.proactiveAssistanceEnabled,
                    proactiveRemindersEnabled: _prefs.proactiveRemindersEnabled,
                    dailyBriefingEnabled: v,
                    eveningSummaryEnabled: _prefs.eveningSummaryEnabled,
                    proactiveVoiceEnabled: _prefs.proactiveVoiceEnabled,
                    quietHoursEnabled: _prefs.quietHoursEnabled,
                    quietHoursStart: _prefs.quietHoursStart,
                    quietHoursEnd: _prefs.quietHoursEnd,
                    notificationFrequency: _prefs.notificationFrequency,
                    preferredResponseStyle: _prefs.preferredResponseStyle,
                  )),
                ),
                _buildSwitchTile(
                  title: 'Evening Day Summary',
                  subtitle: 'Review completed tasks and preparation for tomorrow',
                  value: _prefs.eveningSummaryEnabled,
                  onChanged: (v) => setState(() => _prefs = AiPreferenceModel(
                    assistantName: _prefs.assistantName,
                    voiceEnabled: _prefs.voiceEnabled,
                    ttsEnabled: _prefs.ttsEnabled,
                    proactiveAssistanceEnabled: _prefs.proactiveAssistanceEnabled,
                    proactiveRemindersEnabled: _prefs.proactiveRemindersEnabled,
                    dailyBriefingEnabled: _prefs.dailyBriefingEnabled,
                    eveningSummaryEnabled: v,
                    proactiveVoiceEnabled: _prefs.proactiveVoiceEnabled,
                    quietHoursEnabled: _prefs.quietHoursEnabled,
                    quietHoursStart: _prefs.quietHoursStart,
                    quietHoursEnd: _prefs.quietHoursEnd,
                    notificationFrequency: _prefs.notificationFrequency,
                    preferredResponseStyle: _prefs.preferredResponseStyle,
                  )),
                ),
                const SizedBox(height: 16),
                _buildSectionHeader('QUIET HOURS & FATIGUE CONTROL'),
                _buildSwitchTile(
                  title: 'Quiet Hours',
                  subtitle: 'Mute non-critical proactive events during sleep/rest',
                  value: _prefs.quietHoursEnabled,
                  onChanged: (v) => setState(() => _prefs = AiPreferenceModel(
                    assistantName: _prefs.assistantName,
                    voiceEnabled: _prefs.voiceEnabled,
                    ttsEnabled: _prefs.ttsEnabled,
                    proactiveAssistanceEnabled: _prefs.proactiveAssistanceEnabled,
                    proactiveRemindersEnabled: _prefs.proactiveRemindersEnabled,
                    dailyBriefingEnabled: _prefs.dailyBriefingEnabled,
                    eveningSummaryEnabled: _prefs.eveningSummaryEnabled,
                    proactiveVoiceEnabled: _prefs.proactiveVoiceEnabled,
                    quietHoursEnabled: v,
                    quietHoursStart: _prefs.quietHoursStart,
                    quietHoursEnd: _prefs.quietHoursEnd,
                    notificationFrequency: _prefs.notificationFrequency,
                    preferredResponseStyle: _prefs.preferredResponseStyle,
                  )),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Material(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(12),
                    child: ListTile(
                      title: const Text('Notification Frequency', style: TextStyle(color: Colors.white, fontSize: 14)),
                      subtitle: Text(_prefs.notificationFrequency, style: const TextStyle(color: Color(0xFF818CF8), fontSize: 12)),
                      trailing: DropdownButton<String>(
                        dropdownColor: const Color(0xFF1E293B),
                        value: _prefs.notificationFrequency,
                        underline: const SizedBox(),
                        items: const [
                          DropdownMenuItem(value: 'LOW', child: Text('Low (Max 2/hr)', style: TextStyle(color: Colors.white))),
                          DropdownMenuItem(value: 'BALANCED', child: Text('Balanced (Max 4/hr)', style: TextStyle(color: Colors.white))),
                          DropdownMenuItem(value: 'HIGH', child: Text('High (Max 8/hr)', style: TextStyle(color: Colors.white))),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _prefs = AiPreferenceModel(
                              assistantName: _prefs.assistantName,
                              voiceEnabled: _prefs.voiceEnabled,
                              ttsEnabled: _prefs.ttsEnabled,
                              proactiveAssistanceEnabled: _prefs.proactiveAssistanceEnabled,
                              proactiveRemindersEnabled: _prefs.proactiveRemindersEnabled,
                              dailyBriefingEnabled: _prefs.dailyBriefingEnabled,
                              eveningSummaryEnabled: _prefs.eveningSummaryEnabled,
                              proactiveVoiceEnabled: _prefs.proactiveVoiceEnabled,
                              quietHoursEnabled: _prefs.quietHoursEnabled,
                              quietHoursStart: _prefs.quietHoursStart,
                              quietHoursEnd: _prefs.quietHoursEnd,
                              notificationFrequency: val,
                              preferredResponseStyle: _prefs.preferredResponseStyle,
                            ));
                          }
                        },
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                _buildSectionHeader('PRIVACY & DATA CONTROLS'),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Material(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(12),
                    child: ListTile(
                      leading: const Icon(Icons.analytics_outlined, color: Color(0xFF2DD4BF)),
                      title: const Text('Autonomous Health & Doctor Briefing', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: const Text('Biomarker trends, medication review, and doctor visit prep', style: TextStyle(color: Colors.white60, fontSize: 12)),
                      trailing: const Icon(Icons.chevron_right, color: Colors.white38),
                      onTap: () => Navigator.pushNamed(context, '/jarvis/health'),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Material(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(12),
                    child: ListTile(
                      leading: const Icon(Icons.document_scanner_rounded, color: Color(0xFF38BDF8)),
                      title: const Text('Health Documents & Vision Repository', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: const Text('Manage uploaded blood reports, prescriptions, and lab data', style: TextStyle(color: Colors.white60, fontSize: 12)),
                      trailing: const Icon(Icons.chevron_right, color: Colors.white38),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const DocumentListScreen()),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Material(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(12),
                    child: ListTile(
                      leading: const Icon(Icons.restart_alt_rounded, color: Color(0xFFEF4444)),
                      title: const Text('Reset Personalization', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: const Text('Restore factory persona and default habits', style: TextStyle(color: Colors.white60, fontSize: 12)),
                      onTap: _resetPersonalization,
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      child: Text(
        title,
        style: const TextStyle(color: Color(0xFF818CF8), fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1),
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Material(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        child: SwitchListTile(
          title: Text(title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
          subtitle: Text(subtitle, style: const TextStyle(color: Colors.white60, fontSize: 12)),
          value: value,
          activeTrackColor: const Color(0xFF6366F1),
          onChanged: onChanged,
        ),
      ),
    );
  }
}
