import 'package:flutter/material.dart';
import '../../../services/api_client.dart';
import '../../../services/family_voice_note_service.dart';
import '../../../services/local_storage_service.dart';
import '../widgets/voice_note_composer_sheet.dart';
import '../widgets/whatsapp_voice_note_bubble.dart';

class CaregiverHubScreen extends StatefulWidget {
  const CaregiverHubScreen({super.key});

  @override
  State<CaregiverHubScreen> createState() => _CaregiverHubScreenState();
}

class _CaregiverHubScreenState extends State<CaregiverHubScreen> {
  final ApiClient _apiClient = ApiClient();
  final LocalStorageService _storage = LocalStorageService();
  final FamilyVoiceNoteService _voiceNoteService = FamilyVoiceNoteService();

  bool _isLoading = true;
  List<Map<String, dynamic>> _complianceList = [];
  List<Map<String, dynamic>> _quickDialContacts = [];

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final compRes = await _apiClient.get('/api/family/compliance');
      final dialRes = await _apiClient.get('/api/family/quick-dial');

      setState(() {
        if (compRes['success'] == true) {
          _complianceList = List<Map<String, dynamic>>.from(compRes['data'] ?? []);
        }
        if (dialRes['success'] == true) {
          _quickDialContacts = List<Map<String, dynamic>>.from(dialRes['data'] ?? []);
        }
      });
    } catch (e) {
      setState(() {
        _complianceList = [
          {
            'id': 1,
            'title': 'Morning Blood Pressure Medication',
            'memberName': 'Mom (Sarah)',
            'time': '08:00 AM',
            'status': 'Completed 💊',
            'isUrgent': false
          },
          {
            'id': 2,
            'title': 'Hydration & Water Break (1,500ml)',
            'memberName': 'Mom (Sarah)',
            'time': '12:00 PM',
            'status': 'On Track 💧',
            'isUrgent': false
          },
          {
            'id': 3,
            'title': 'Evening Garden Walk',
            'memberName': 'Mom (Sarah)',
            'time': '05:30 PM',
            'status': 'Upcoming 🚶',
            'isUrgent': false
          }
        ];
        _quickDialContacts = [
          {'name': 'Rahul (Son)', 'relation': 'Son', 'phone': '+91 98765 43210', 'color': Colors.blue.value},
          {'name': 'Priya (Daughter)', 'relation': 'Daughter', 'phone': '+91 98765 43211', 'color': Colors.purple.value},
          {'name': 'Dr. Michael (Doctor)', 'relation': 'Primary Doctor', 'phone': '+91 98765 43212', 'color': Colors.teal.value}
        ];
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _simulateCall(String name, String phone) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.phone_in_talk, color: Colors.green),
            const SizedBox(width: 10),
            Expanded(child: Text('Calling $name')),
          ],
        ),
        content: Text('Connecting high-clarity voice call to $phone...'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('End Call', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isFamilyMode = _storage.familyVoiceModeEnabled;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Caregiver & Family Hub 👨‍👩‍👧'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.purple.shade900,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchData,
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Family Voice Mode Master Switch Card (Overflow-Free)
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: isFamilyMode
                              ? [const Color(0xFFD81B60), const Color(0xFF8E24AA)]
                              : [Colors.grey.shade700, Colors.grey.shade600],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.purple.withValues(alpha: 0.2),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const CircleAvatar(
                                backgroundColor: Colors.white,
                                radius: 16,
                                child: Icon(Icons.record_voice_over_rounded, color: Colors.pink, size: 18),
                              ),
                              const SizedBox(width: 8),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '👨‍👩‍👧 Family Voice Mode',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15,
                                      ),
                                    ),
                                    Text(
                                      'Play Loved Ones\' Voice Memos',
                                      style: TextStyle(color: Colors.white70, fontSize: 10),
                                    ),
                                  ],
                                ),
                              ),
                              Switch(
                                value: isFamilyMode,
                                activeThumbColor: Colors.amberAccent,
                                onChanged: (val) {
                                  setState(() {
                                    _storage.familyVoiceModeEnabled = val;
                                  });
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(val
                                          ? '🎙️ Family Voice Mode Active! Loved ones\' voices will pop up at schedule intervals.'
                                          : 'Standard AI Voice mode active.'),
                                      duration: const Duration(seconds: 2),
                                    ),
                                  );
                                },
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            isFamilyMode
                                ? 'Active: Mom hears the voices of Son Rahul, Daughter Priya & Ananya at scheduled times (breakfast, medicine, walks, dinner, health check)!'
                                : 'Disabled: Standard AI assistant voice will be used for schedule pop-ups.',
                            style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 11),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 18),

                    // WhatsApp-style Voice Note Actions Header
                    Row(
                      children: [
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Voice Notes & Schedules 🎙️',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                'Send WhatsApp-like voice notes to Mom or schedule them',
                                style: TextStyle(fontSize: 11, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Dual Action Quick Buttons: Send Now vs Schedule Later
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF25D366), // WhatsApp green
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () {
                              VoiceNoteComposerSheet.show(context, initialIsScheduled: false);
                            },
                            icon: const Icon(Icons.mic_rounded, size: 18),
                            label: const Text(
                              '⚡ Send Voice Note',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF075E54), // WhatsApp dark green
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () {
                              VoiceNoteComposerSheet.show(context, initialIsScheduled: true);
                            },
                            icon: const Icon(Icons.alarm_on_rounded, size: 18),
                            label: const Text(
                              '⏰ Schedule Memo',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    // WhatsApp Voice Notes Stream / Feed
                    ListenableBuilder(
                      listenable: _voiceNoteService,
                      builder: (context, _) {
                        final notes = _voiceNoteService.voiceNotesFeed;
                        return Column(
                          children: notes.map((note) {
                            return WhatsAppVoiceNoteBubble(
                              note: note,
                              isFromCaregiver: true,
                              onScheduleEdit: () {
                                VoiceNoteComposerSheet.show(
                                  context,
                                  initialRoutineKey: note.routineKey,
                                  initialIsScheduled: true,
                                );
                              },
                            );
                          }).toList(),
                        );
                      },
                    ),

                    const SizedBox(height: 18),

                    // Senior Quick-Dial Call Section (Overflow-Free)
                    const Text(
                      'One-Touch Family Quick-Dial 📞',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 90,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: _quickDialContacts.length,
                        itemBuilder: (context, index) {
                          final c = _quickDialContacts[index];
                          final colorVal = c['color'] is int ? c['color'] as int : Colors.purple.value;
                          return GestureDetector(
                            onTap: () => _simulateCall(c['name'] ?? 'Contact', c['phone'] ?? ''),
                            child: Container(
                              width: 105,
                              margin: const EdgeInsets.only(right: 8),
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Color(colorVal).withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: Color(colorVal).withValues(alpha: 0.3)),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  CircleAvatar(
                                    backgroundColor: Color(colorVal),
                                    radius: 18,
                                    child: const Icon(Icons.phone, color: Colors.white, size: 16),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    c['name']?.toString().split(' ')[0] ?? '',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    c['relation']?.toString() ?? '',
                                    style: const TextStyle(fontSize: 9, color: Colors.grey),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Senior Routine Compliance Status
                    const Text(
                      'Senior Routine Compliance & Status 📋',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 10),
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _complianceList.length,
                      itemBuilder: (context, index) {
                        final item = _complianceList[index];
                        final isUrgent = item['isUrgent'] == true;
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                          color: isUrgent ? Colors.red.shade50 : Colors.grey.shade50,
                          child: ListTile(
                            dense: true,
                            leading: CircleAvatar(
                              backgroundColor: isUrgent ? Colors.red[100] : Colors.green[100],
                              child: Icon(
                                isUrgent ? Icons.error_outline : Icons.check_circle_outline,
                                color: isUrgent ? Colors.red : Colors.green,
                                size: 18,
                              ),
                            ),
                            title: Text(
                              item['title'] ?? '',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(
                              '${item['memberName']} • Scheduled ${item['time']}',
                              style: const TextStyle(fontSize: 10),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                              decoration: BoxDecoration(
                                color: isUrgent ? Colors.red[100] : Colors.green[100],
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                item['status'] ?? '',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: isUrgent ? Colors.red[900] : Colors.green[900],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
