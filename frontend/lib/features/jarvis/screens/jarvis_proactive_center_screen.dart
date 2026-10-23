import 'package:flutter/material.dart';
import '../../../services/api_client.dart';
import '../core/jarvis_colors.dart';

/// Phase 11 Anticipatory Execution & Proactive Intelligence Center Screen
class JarvisProactiveCenterScreen extends StatefulWidget {
  const JarvisProactiveCenterScreen({super.key});

  @override
  State<JarvisProactiveCenterScreen> createState() => _JarvisProactiveCenterScreenState();
}

class _JarvisProactiveCenterScreenState extends State<JarvisProactiveCenterScreen> with SingleTickerProviderStateMixin {
  final ApiClient _apiClient = ApiClient();
  late TabController _tabController;

  bool _isLoading = true;

  // Preferences
  String _proactiveMode = 'BALANCED';
  bool _quietHoursEnabled = true;
  String _quietStart = '22:00';
  String _quietEnd = '07:00';
  int _batteryThreshold = 20;
  int _travelLeadMins = 45;
  List<String> _authorizedCategories = ['LOCAL_REMINDERS', 'BRIEFING_PREP', 'MEETING_PREP'];

  // Feed & Suggestions
  List<dynamic> _suggestions = [];
  Map<String, dynamic>? _briefing;
  Map<String, dynamic>? _recap;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAll();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final prefsRes = await _apiClient.get('/api/jarvis/proactive/preferences');
      if (prefsRes['preferences'] != null) {
        final p = prefsRes['preferences'];
        _proactiveMode = p['proactiveMode'] ?? 'BALANCED';
        _quietHoursEnabled = p['quietHoursEnabled'] ?? true;
        _quietStart = p['quietHoursStart'] ?? '22:00';
        _quietEnd = p['quietHoursEnd'] ?? '07:00';
        _batteryThreshold = p['batteryThreshold'] ?? 20;
        _travelLeadMins = p['travelAnticipationLeadMins'] ?? 45;
        if (p['authorizedCategories'] is List) {
          _authorizedCategories = List<String>.from(p['authorizedCategories']);
        }
      }

      final feedRes = await _apiClient.get('/api/jarvis/proactive/feed?limit=15');
      if (feedRes['feed'] is List) {
        _suggestions = feedRes['feed'];
      }

      final briefingRes = await _apiClient.get('/api/jarvis/proactive/briefing');
      if (briefingRes['briefing'] != null) {
        _briefing = briefingRes['briefing'];
      }

      final recapRes = await _apiClient.get('/api/jarvis/proactive/recap');
      if (recapRes['recap'] != null) {
        _recap = recapRes['recap'];
      }

      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _updateMode(String newMode) async {
    setState(() => _proactiveMode = newMode);
    try {
      await _apiClient.put('/api/jarvis/proactive/preferences', {
        'proactiveMode': newMode,
        'quietHoursEnabled': _quietHoursEnabled,
        'quietHoursStart': _quietStart,
        'quietHoursEnd': _quietEnd,
        'authorizedCategories': _authorizedCategories,
        'batteryThreshold': _batteryThreshold,
        'travelAnticipationLeadMins': _travelLeadMins
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Proactive Mode updated to $newMode')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update mode: $e')),
      );
    }
  }

  Future<void> _submitFeedback(int suggestionId, String type) async {
    try {
      await _apiClient.post('/api/jarvis/proactive/feedback', {
        'suggestionId': suggestionId,
        'feedbackType': type
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Feedback recorded: $type')),
      );
      _loadAll();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Feedback submission failed: $e')),
      );
    }
  }

  Future<void> _showExplanation(int suggestionId) async {
    try {
      final res = await _apiClient.get('/api/jarvis/proactive/$suggestionId/explain');
      final text = res['explanation'] ?? 'No explanation available.';
      if (!mounted) return;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF161B22),
          title: const Text('Why JARVIS Suggested This', style: TextStyle(color: Colors.white)),
          content: Text(text, style: const TextStyle(color: Colors.white70, height: 1.4)),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Understood', style: TextStyle(color: JarvisColors.cyan)),
            )
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not load explanation: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF161B22),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'JARVIS PROACTIVE CENTER',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
              ),
            ),
            Text(
              'Phase 11 Anticipatory Intelligence & Policy Control',
              style: TextStyle(
                color: JarvisColors.cyan.withOpacity(0.8),
                fontSize: 11,
              ),
            ),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: JarvisColors.cyan,
          labelColor: JarvisColors.cyan,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(icon: Icon(Icons.bolt), text: 'Suggestions'),
            Tab(icon: Icon(Icons.wb_sunny_outlined), text: 'Briefings'),
            Tab(icon: Icon(Icons.tune), text: 'Preferences'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: JarvisColors.cyan))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildSuggestionsTab(),
                _buildBriefingsTab(),
                _buildPreferencesTab(),
              ],
            ),
    );
  }

  Widget _buildSuggestionsTab() {
    return RefreshIndicator(
      onRefresh: _loadAll,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildModeSelectorCard(),
          const SizedBox(height: 16),
          const Text(
            'ACTIVE ANTICIPATION FEED',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 8),
          if (_suggestions.isEmpty)
            _buildEmptyCard('No pending proactive suggestions.', 'JARVIS is observing context according to your policy.')
          else
            ..._suggestions.map((s) => _buildSuggestionCard(s)),
        ],
      ),
    );
  }

  Widget _buildModeSelectorCard() {
    final modes = ['OFF', 'ASSISTED', 'BALANCED', 'PROACTIVE'];
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.shield_outlined, color: JarvisColors.cyan, size: 20),
              SizedBox(width: 8),
              Text(
                'PROACTIVE AUTONOMY MODE',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: modes.map((m) {
              final isSelected = _proactiveMode == m;
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2.0),
                  child: ElevatedButton(
                    onPressed: () => _updateMode(m),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isSelected ? JarvisColors.cyan : const Color(0xFF21262D),
                      foregroundColor: isSelected ? Colors.black : Colors.white70,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      elevation: 0,
                    ),
                    child: Text(
                      m,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 10),
          Text(
            _getModeDescription(_proactiveMode),
            style: const TextStyle(color: Colors.white60, fontSize: 11),
          ),
        ],
      ),
    );
  }

  String _getModeDescription(String mode) {
    switch (mode) {
      case 'OFF':
        return 'Observation only. No proactive suggestions, popups, or background staging.';
      case 'ASSISTED':
        return 'Informational suggestions and daily briefing. No side-effect execution.';
      case 'BALANCED':
        return 'Prepares context and stages drafts; always requests voice confirmation before executing.';
      case 'PROACTIVE':
        return 'Autonomous execution of verified, reversible, low-risk routines. Safety Level 2/3 always gated.';
      default:
        return '';
    }
  }

  Widget _buildSuggestionCard(dynamic item) {
    final title = item['title'] ?? 'Suggestion';
    final speech = item['speech_text'] ?? item['display_message'] ?? '';
    final level = item['decision_level'] ?? 'SUGGEST';
    final conf = ((item['confidence_score'] ?? 0.5) * 100).toInt();
    final suggId = item['suggestion_id'] ?? 0;

    return Card(
      color: const Color(0xFF161B22),
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _getLevelColor(level).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: _getLevelColor(level).withOpacity(0.5)),
                  ),
                  child: Text(
                    '$level • $conf%',
                    style: TextStyle(color: _getLevelColor(level), fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              speech,
              style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.3),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: () => _showExplanation(suggId),
                  icon: const Icon(Icons.info_outline, size: 14, color: JarvisColors.cyan),
                  label: const Text('Why this?', style: TextStyle(color: JarvisColors.cyan, fontSize: 11)),
                ),
                const Spacer(),
                OutlinedButton(
                  onPressed: () => _submitFeedback(suggId, 'DISMISSED'),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.white24),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  ),
                  child: const Text('Dismiss', style: TextStyle(color: Colors.white60, fontSize: 11)),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () => _submitFeedback(suggId, 'ACCEPTED'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: JarvisColors.cyan,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  ),
                  child: const Text('Accept', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }

  Color _getLevelColor(String level) {
    switch (level) {
      case 'EXECUTE':
        return Colors.greenAccent;
      case 'ASK':
        return Colors.orangeAccent;
      case 'PREPARE':
        return JarvisColors.cyan;
      case 'SUGGEST':
        return Colors.blueAccent;
      default:
        return Colors.grey;
    }
  }

  Widget _buildBriefingsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildBriefingCard(
          'MORNING BRIEFING',
          Icons.wb_sunny,
          _briefing?['speechText'] ?? 'Good morning! No calendar events scheduled for today.',
          _briefing?['displayMessage'] ?? 'Clear schedule.',
          Colors.amberAccent,
        ),
        const SizedBox(height: 16),
        _buildBriefingCard(
          'EVENING RECAP',
          Icons.nights_stay,
          _recap?['speechText'] ?? 'Good evening. All daily routines logged successfully.',
          _recap?['displayMessage'] ?? 'Routines completed.',
          Colors.indigoAccent,
        ),
      ],
    );
  }

  Widget _buildBriefingCard(String title, IconData icon, String speech, String display, Color accent) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: accent, size: 20),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            speech,
            style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 8),
          Text(
            display,
            style: TextStyle(color: accent.withOpacity(0.8), fontSize: 11, fontStyle: FontStyle.italic),
          ),
        ],
      ),
    );
  }

  Widget _buildPreferencesTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        SwitchListTile(
          title: const Text('Quiet Hours (Do Not Disturb)', style: TextStyle(color: Colors.white)),
          subtitle: Text('Suppresses non-critical suggestions between $_quietStart and $_quietEnd', style: const TextStyle(color: Colors.white60, fontSize: 11)),
          value: _quietHoursEnabled,
          activeColor: JarvisColors.cyan,
          onChanged: (val) {
            setState(() => _quietHoursEnabled = val);
            _updateMode(_proactiveMode);
          },
        ),
        const Divider(color: Colors.white10),
        ListTile(
          title: const Text('Low Battery Proactive Threshold', style: TextStyle(color: Colors.white)),
          subtitle: Text('Suggest Power Saving when battery drops below $_batteryThreshold%', style: const TextStyle(color: Colors.white60, fontSize: 11)),
          trailing: Text('$_batteryThreshold%', style: const TextStyle(color: JarvisColors.cyan, fontWeight: FontWeight.bold)),
        ),
        const Divider(color: Colors.white10),
        ListTile(
          title: const Text('Travel Anticipation Lead Time', style: TextStyle(color: Colors.white)),
          subtitle: Text('Alert navigation routes $_travelLeadMins minutes before meetings', style: const TextStyle(color: Colors.white60, fontSize: 11)),
          trailing: Text('${_travelLeadMins}m', style: const TextStyle(color: JarvisColors.cyan, fontWeight: FontWeight.bold)),
        ),
        const Divider(color: Colors.white10),
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 8),
          child: Text('AUTHORIZED PROACTIVE CATEGORIES', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
        ),
        ...['LOCAL_REMINDERS', 'BRIEFING_PREP', 'MEETING_PREP', 'DEVICE_OPTIMIZATION'].map((cat) {
          final isChecked = _authorizedCategories.contains(cat);
          return CheckboxListTile(
            title: Text(cat, style: const TextStyle(color: Colors.white, fontSize: 13)),
            value: isChecked,
            activeColor: JarvisColors.cyan,
            checkColor: Colors.black,
            onChanged: (bool? val) {
              setState(() {
                if (val == true) {
                  _authorizedCategories.add(cat);
                } else {
                  _authorizedCategories.remove(cat);
                }
              });
              _updateMode(_proactiveMode);
            },
          );
        }),
      ],
    );
  }

  Widget _buildEmptyCard(String title, String subtitle) {
    return Container(
      padding: const EdgeInsets.all(24),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          const Icon(Icons.check_circle_outline, color: JarvisColors.cyan, size: 36),
          const SizedBox(height: 8),
          Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(color: Colors.white60, fontSize: 11), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
