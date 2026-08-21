import 'dart:async';
import 'package:flutter/material.dart';
import '../../../services/family_voice_note_service.dart';
import '../../../services/local_storage_service.dart';

class VoiceNoteComposerSheet extends StatefulWidget {
  final String initialRoutineKey;
  final bool initialIsScheduled;

  const VoiceNoteComposerSheet({
    super.key,
    this.initialRoutineKey = 'breakfast',
    this.initialIsScheduled = false,
  });

  static Future<void> show(
    BuildContext context, {
    String initialRoutineKey = 'breakfast',
    bool initialIsScheduled = false,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => VoiceNoteComposerSheet(
        initialRoutineKey: initialRoutineKey,
        initialIsScheduled: initialIsScheduled,
      ),
    );
  }

  @override
  State<VoiceNoteComposerSheet> createState() => _VoiceNoteComposerSheetState();
}

class _VoiceNoteComposerSheetState extends State<VoiceNoteComposerSheet> {
  final LocalStorageService _storage = LocalStorageService();
  final FamilyVoiceNoteService _voiceService = FamilyVoiceNoteService();

  late TextEditingController _nameController;
  late TextEditingController _relationController;
  late TextEditingController _messageController;

  late bool _isScheduled;
  late String _selectedRoutineKey;
  String _selectedTime = '08:00 AM';

  bool _isRecording = false;
  int _recordSeconds = 0;
  Timer? _recordTimer;

  final List<Map<String, String>> _routinePresets = [
    {
      'key': 'breakfast',
      'title': '🥣 Breakfast & Morning Pill',
      'time': '08:00 AM',
      'defaultMsg': 'Hi Mom! It\'s Rahul. Time for your warm breakfast and morning BP tablet. Love you! ❤️',
    },
    {
      'key': 'health_check',
      'title': '🩺 Health Check-in',
      'time': '11:00 AM',
      'defaultMsg': 'Hello Mom! Just checking in on you. How is your health today mom? Did you drink warm water? ❤️',
    },
    {
      'key': 'medicine',
      'title': '💊 Lunch & Afternoon Medicine',
      'time': '01:00 PM',
      'defaultMsg': 'Mom, it\'s Priya! Please take your noon medicine and have a wholesome lunch. Take care! 💊',
    },
    {
      'key': 'walk',
      'title': '🚶 Evening Garden Walk',
      'time': '05:30 PM',
      'defaultMsg': 'Grandma, it\'s Ananya! Time for your fresh air evening garden walk. Wear your walking shoes! 🚶‍♀️',
    },
    {
      'key': 'dinner',
      'title': '🌙 Dinner & Night Medicine',
      'time': '08:00 PM',
      'defaultMsg': 'Amma, Rahul here! Finish your light dinner and take your night pills. Good night! 🌙',
    },
  ];

  @override
  void initState() {
    super.initState();
    _isScheduled = widget.initialIsScheduled;
    _selectedRoutineKey = widget.initialRoutineKey;

    final preset = _routinePresets.firstWhere(
      (p) => p['key'] == _selectedRoutineKey,
      orElse: () => _routinePresets[0],
    );

    _nameController = TextEditingController(text: 'Rahul');
    _relationController = TextEditingController(text: 'Son (மகன்)');
    _messageController = TextEditingController(text: preset['defaultMsg']);
    _selectedTime = preset['time']!;
  }

  @override
  void dispose() {
    _recordTimer?.cancel();
    _nameController.dispose();
    _relationController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  void _toggleRecording() {
    if (_isRecording) {
      _recordTimer?.cancel();
      setState(() => _isRecording = false);
    } else {
      setState(() {
        _isRecording = true;
        _recordSeconds = 0;
      });
      _recordTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (mounted) {
          setState(() {
            _recordSeconds++;
            if (_recordSeconds >= 30) {
              _toggleRecording();
            }
          });
        }
      });
    }
  }

  Future<void> _pickCustomTime() async {
    final now = TimeOfDay.now();
    final picked = await showTimePicker(
      context: context,
      initialTime: now,
    );
    if (picked != null) {
      final hourStr = picked.hourOfPeriod == 0 ? '12' : picked.hourOfPeriod.toString().padLeft(2, '0');
      final minStr = picked.minute.toString().padLeft(2, '0');
      final period = picked.period == DayPeriod.am ? 'AM' : 'PM';
      setState(() {
        _selectedTime = '$hourStr:$minStr $period';
      });
    }
  }

  void _testPlayPreview() {
    final tempNote = FamilyVoiceNote(
      id: 'temp_${DateTime.now().millisecondsSinceEpoch}',
      routineKey: _selectedRoutineKey,
      senderName: _nameController.text.trim(),
      senderRelation: _relationController.text.trim(),
      messageText: _messageController.text.trim(),
      durationStr: _recordSeconds > 0 ? '0:${_recordSeconds.toString().padLeft(2, '0')}' : '0:06',
      audioUrl: '',
      createdAt: DateTime.now(),
      isScheduled: _isScheduled,
      scheduledTime: _selectedTime,
    );
    _voiceService.playFamilyVoiceNote(tempNote, _storage.selectedLanguage);
  }

  void _submitVoiceNote() {
    final name = _nameController.text.trim();
    final relation = _relationController.text.trim();
    final text = _messageController.text.trim();

    if (name.isEmpty || text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your name and message!')),
      );
      return;
    }

    final durationStr = _recordSeconds > 0 ? '0:${_recordSeconds.toString().padLeft(2, '0')}' : '0:07';

    if (_isScheduled) {
      final preset = _routinePresets.firstWhere(
        (p) => p['key'] == _selectedRoutineKey,
        orElse: () => {'title': 'Custom Routine'},
      );

      _voiceService.scheduleVoiceNoteForSenior(
        senderName: name,
        senderRelation: relation,
        messageText: text,
        scheduledTime: _selectedTime,
        routineTitle: preset['title'] ?? 'Scheduled Reminder',
        routineKey: _selectedRoutineKey,
        durationStr: durationStr,
      );

      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('⏰ Voice note scheduled for $_selectedTime (${preset['title']})! Mom will hear your voice! ❤️'),
          backgroundColor: const Color(0xFF075E54),
        ),
      );
    } else {
      _voiceService.sendInstantVoiceNote(
        senderName: name,
        senderRelation: relation,
        messageText: text,
        durationStr: durationStr,
      );

      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('⚡ Instant WhatsApp Voice Note sent to Mom! 🎙️'),
          backgroundColor: const Color(0xFF25D366),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        top: 16, left: 16, right: 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // WhatsApp-style Top Header Bar
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF075E54),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.mic, color: Colors.white, size: 22),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Caregiver Voice Note Studio 🎙️',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF075E54),
                        ),
                      ),
                      Text(
                        'Send instant WhatsApp voice memo or schedule for routine alarms',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.grey),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Mode Selector: Instant vs Scheduled
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _isScheduled = false),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: !_isScheduled ? const Color(0xFF25D366) : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '⚡ Send Now (Instant)',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            color: !_isScheduled ? Colors.white : Colors.black87,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _isScheduled = true),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: _isScheduled ? const Color(0xFF075E54) : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '⏰ Schedule for Later',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            color: _isScheduled ? Colors.white : Colors.black87,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // If Scheduled Mode is chosen, show routine interval and time selector
            if (_isScheduled) ...[
              const Text('Select Routine & Alarm Time:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    isExpanded: true,
                    value: _selectedRoutineKey,
                    items: _routinePresets.map((preset) {
                      return DropdownMenuItem<String>(
                        value: preset['key'],
                        child: Text(
                          '${preset['title']} (${preset['time']})',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          _selectedRoutineKey = val;
                          final chosen = _routinePresets.firstWhere((p) => p['key'] == val);
                          _selectedTime = chosen['time']!;
                          _messageController.text = chosen['defaultMsg']!;
                        });
                      }
                    },
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Alarm Pop-up Time: $_selectedTime',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF075E54)),
                  ),
                  TextButton.icon(
                    onPressed: _pickCustomTime,
                    icon: const Icon(Icons.access_time, size: 16),
                    label: const Text('Change Time', style: TextStyle(fontSize: 11)),
                  ),
                ],
              ),
              const SizedBox(height: 10),
            ],

            // Sender Details Row
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      labelText: 'Your Name (e.g. Rahul)',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.person, size: 18),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _relationController,
                    decoration: const InputDecoration(
                      labelText: 'Relation (Son/Daughter)',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.favorite, color: Colors.pink, size: 18),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 10),

            // Message Spoken Transcript
            TextField(
              controller: _messageController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Voice Note Spoken Message',
                hintText: 'e.g. Hi Mom! Take your medicines on time. Love you!',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.chat, size: 18),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),

            const SizedBox(height: 14),

            // Interactive Recording Studio / Waveform Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: _isRecording ? Colors.red.shade50 : const Color(0xFFE7FFDB),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _isRecording ? Colors.redAccent : const Color(0xFFC8E6C9),
                ),
              ),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: _toggleRecording,
                    child: CircleAvatar(
                      radius: 20,
                      backgroundColor: _isRecording ? Colors.red : const Color(0xFF25D366),
                      child: Icon(
                        _isRecording ? Icons.stop : Icons.mic,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            if (_isRecording) ...[
                              Container(
                                width: 8, height: 8,
                                decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.red),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Recording: 0:${_recordSeconds.toString().padLeft(2, '0')}',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red, fontSize: 12),
                              ),
                            ] else ...[
                              const Text(
                                '🎙️ Tap mic to record voice',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF075E54)),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Simulates WhatsApp voice memo with high clarity speech synthesis',
                          style: TextStyle(fontSize: 10, color: Colors.grey),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.play_circle_fill, color: Color(0xFF25D366), size: 30),
                    tooltip: 'Test Play Voice',
                    onPressed: _testPlayPreview,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _isScheduled ? const Color(0xFF075E54) : const Color(0xFF25D366),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: _submitVoiceNote,
                icon: Icon(
                  _isScheduled ? Icons.alarm_on : Icons.send_rounded,
                  color: Colors.white,
                  size: 20,
                ),
                label: Text(
                  _isScheduled
                      ? '⏰ Schedule Voice Note for $_selectedTime'
                      : '⚡ Send WhatsApp Voice Note to Mom',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
