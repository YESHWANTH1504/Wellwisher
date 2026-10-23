import 'package:flutter/material.dart';
import '../core/jarvis_colors.dart';
import '../core/jarvis_typography.dart';
import '../models/proactive_models.dart';
import '../services/proactive_api_service.dart';

class JarvisPermissionCenterScreen extends StatefulWidget {
  final ProactiveApiService? apiService;

  const JarvisPermissionCenterScreen({super.key, this.apiService});

  @override
  State<JarvisPermissionCenterScreen> createState() => _JarvisPermissionCenterScreenState();
}

class _JarvisPermissionCenterScreenState extends State<JarvisPermissionCenterScreen> {
  late final ProactiveApiService _apiService;
  AiPreferenceModel _prefs = AiPreferenceModel();
  bool _isLoading = true;
  bool _isSaving = false;

  // Granular Automation Toggles
  bool _canCreateEvents = true;
  bool _canModifyEvents = true;
  bool _canDeleteEvents = false;
  bool _canSendExternalComms = false;
  bool _canAccessHealthVault = true;
  bool _canAccessDocuments = true;
  bool _canAccessSemanticMemory = true;

  @override
  void initState() {
    super.initState();
    _apiService = widget.apiService ?? ProactiveApiService();
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
        const SnackBar(
          content: Text('JARVIS Autonomy & Permission Matrix saved.'),
          backgroundColor: JarvisColors.surfaceElevated,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: JarvisColors.background,
      appBar: AppBar(
        backgroundColor: JarvisColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: JarvisColors.cyan, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('JARVIS Autonomy & Permissions', style: JarvisTypography.titleMedium),
            Text('Transparent Execution Policy Control', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.cyan)),
          ],
        ),
        actions: [
          if (_isSaving)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: JarvisColors.cyan),
                ),
              ),
            )
          else
            TextButton(
              onPressed: _savePreferences,
              child: const Text('SAVE', style: TextStyle(color: JarvisColors.cyan, fontWeight: FontWeight.bold)),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: JarvisColors.cyan))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Autonomy Tier Banner
                _buildAutonomyLevelSelector(),

                const SizedBox(height: 24),

                // Core System Permissions
                Text('SYSTEM & HARDWARE SENSORS', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan)),
                const SizedBox(height: 8),
                _buildCard([
                  _buildStatusRow(
                    icon: Icons.mic_outlined,
                    title: 'Microphone & Wake-Word Stream',
                    subtitle: 'Allows "Hey JARVIS" passive & active voice capture',
                    granted: true,
                  ),
                  const Divider(color: JarvisColors.border),
                  _buildStatusRow(
                    icon: Icons.notifications_active_outlined,
                    title: 'Interactive Notifications',
                    subtitle: 'Allows 15-min alerts, snooze, & proactive briefings',
                    granted: true,
                  ),
                  const Divider(color: JarvisColors.border),
                  _buildStatusRow(
                    icon: Icons.calendar_today_outlined,
                    title: 'System Calendar & Schedules',
                    subtitle: 'Allows reading and synchronizing calendar events',
                    granted: true,
                  ),
                ]),

                const SizedBox(height: 24),

                // Data Vault Access
                Text('INTELLIGENCE DATA VAULT PERMISSIONS', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan)),
                const SizedBox(height: 8),
                _buildCard([
                  SwitchListTile(
                    activeThumbColor: JarvisColors.cyan,
                    title: Text('Semantic Memory & Habit Learning', style: JarvisTypography.bodyMedium),
                    subtitle: Text('Allows remembering workout times, routine preferences, & people', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
                    value: _canAccessSemanticMemory,
                    onChanged: (val) => setState(() => _canAccessSemanticMemory = val),
                  ),
                  const Divider(color: JarvisColors.border),
                  SwitchListTile(
                    activeThumbColor: JarvisColors.cyan,
                    title: Text('Health Trends & Vitals Intelligence', style: JarvisTypography.bodyMedium),
                    subtitle: Text('Allows non-diagnostic vitals synthesis & anomaly alerts', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
                    value: _canAccessHealthVault,
                    onChanged: (val) => setState(() => _canAccessHealthVault = val),
                  ),
                  const Divider(color: JarvisColors.border),
                  SwitchListTile(
                    activeThumbColor: JarvisColors.cyan,
                    title: Text('Multi-Modal Medical Documents', style: JarvisTypography.bodyMedium),
                    subtitle: Text('Allows summarizing lab reports, prescriptions, & discharge sheets', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
                    value: _canAccessDocuments,
                    onChanged: (val) => setState(() => _canAccessDocuments = val),
                  ),
                ]),

                const SizedBox(height: 24),

                // Action Automation Policy
                Text('AUTOMATION PERMISSIONS & DISPATCH', style: JarvisTypography.labelSmall.copyWith(color: JarvisColors.cyan)),
                const SizedBox(height: 8),
                _buildCard([
                  SwitchListTile(
                    activeThumbColor: JarvisColors.cyan,
                    title: Text('Create Calendar Events & Routines', style: JarvisTypography.bodyMedium),
                    subtitle: Text('Auto-executes non-conflicting schedule additions', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
                    value: _canCreateEvents,
                    onChanged: (val) => setState(() => _canCreateEvents = val),
                  ),
                  const Divider(color: JarvisColors.border),
                  SwitchListTile(
                    activeThumbColor: JarvisColors.cyan,
                    title: Text('Modify / Reschedule Existing Events', style: JarvisTypography.bodyMedium),
                    subtitle: Text('Allows moving meetings and adjusting routine slots', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
                    value: _canModifyEvents,
                    onChanged: (val) => setState(() => _canModifyEvents = val),
                  ),
                  const Divider(color: JarvisColors.border),
                  SwitchListTile(
                    activeThumbColor: JarvisColors.rose,
                    title: Text('Delete / Cancel Events & Routines', style: JarvisTypography.bodyMedium.copyWith(color: JarvisColors.rose)),
                    subtitle: Text('Requires cryptographic confirmation when disabled', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
                    value: _canDeleteEvents,
                    onChanged: (val) => setState(() => _canDeleteEvents = val),
                  ),
                  const Divider(color: JarvisColors.border),
                  SwitchListTile(
                    activeThumbColor: JarvisColors.rose,
                    title: Text('External Communications & Family Alerts', style: JarvisTypography.bodyMedium.copyWith(color: JarvisColors.rose)),
                    subtitle: Text('Strictly requires user approval token before dispatch', style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
                    value: _canSendExternalComms,
                    onChanged: (val) => setState(() => _canSendExternalComms = val),
                  ),
                ]),

                const SizedBox(height: 30),
                Center(
                  child: ElevatedButton.icon(
                    onPressed: _savePreferences,
                    icon: const Icon(Icons.shield_outlined, size: 18, color: Colors.black),
                    label: const Text('SAVE PERMISSION MATRIX', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: JarvisColors.cyan,
                      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
    );
  }

  Widget _buildAutonomyLevelSelector() {
    final levels = [
      {'key': 'LEVEL_0_INFORM', 'title': 'Level 0 — Inform', 'desc': 'Reports information only; zero autonomous changes.'},
      {'key': 'LEVEL_1_SUGGEST', 'title': 'Level 1 — Suggest', 'desc': 'Proposes actions and asks for user tap.'},
      {'key': 'LEVEL_2_AUTO_EXECUTE', 'title': 'Level 2 — Auto Execute (Default)', 'desc': 'Executes low-risk authorized tasks autonomously.'},
      {'key': 'LEVEL_3_CONFIRM', 'title': 'Level 3 — Confirm', 'desc': 'Requires explicit confirmation for every state mutation.'},
      {'key': 'LEVEL_4_RESTRICTED', 'title': 'Level 4 — Restricted', 'desc': 'Strict read-only lock down; all mutations blocked.'},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: JarvisColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: JarvisColors.cyan.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.psychology, color: JarvisColors.cyan, size: 22),
              const SizedBox(width: 8),
              Text('AUTONOMY LEVEL', style: JarvisTypography.titleSmall.copyWith(color: JarvisColors.cyan)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Select how proactively JARVIS can act on your behalf:',
            style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary),
          ),
          const SizedBox(height: 12),
          for (final lvl in levels)
            RadioListTile<String>(
              value: lvl['key']!,
              groupValue: _prefs.autonomyLevel,
              activeColor: JarvisColors.cyan,
              contentPadding: EdgeInsets.zero,
              title: Text(lvl['title']!, style: JarvisTypography.bodyMedium),
              subtitle: Text(lvl['desc']!, style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
              onChanged: (val) {
                if (val != null) {
                  setState(() => _prefs = _prefs.copyWith(autonomyLevel: val));
                }
              },
            ),
        ],
      ),
    );
  }

  Widget _buildStatusRow({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool granted,
  }) {
    return ListTile(
      leading: Icon(icon, color: granted ? JarvisColors.cyan : JarvisColors.rose),
      title: Text(title, style: JarvisTypography.bodyMedium),
      subtitle: Text(subtitle, style: JarvisTypography.bodySmall.copyWith(color: JarvisColors.textSecondary)),
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: (granted ? JarvisColors.cyan : JarvisColors.rose).withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: (granted ? JarvisColors.cyan : JarvisColors.rose).withValues(alpha: 0.4)),
        ),
        child: Text(
          granted ? 'ACTIVE' : 'DENIED',
          style: TextStyle(
            color: granted ? JarvisColors.cyan : JarvisColors.rose,
            fontSize: 11,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: JarvisColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: JarvisColors.border),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: Column(children: children),
      ),
    );
  }
}
