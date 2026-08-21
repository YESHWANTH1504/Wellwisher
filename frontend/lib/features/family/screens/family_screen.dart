import 'package:flutter/material.dart';
import '../../../services/api_client.dart';
import '../../../services/family_voice_note_service.dart';
import '../../../services/voice_assistant_service.dart';

class FamilyScreen extends StatefulWidget {
  const FamilyScreen({super.key});

  @override
  State<FamilyScreen> createState() => _FamilyScreenState();
}

class _FamilyScreenState extends State<FamilyScreen> {
  final ApiClient _apiClient = ApiClient();
  final FamilyVoiceNoteService _voiceNoteService = FamilyVoiceNoteService();

  List<dynamic> _feed = [
    {
      'memberName': 'Mom (Sarah)',
      'relation': 'Mother',
      'activity': 'Completed Morning Hydration Goal 💧',
      'timeAgo': '15 mins ago',
      'icon': Icons.water_drop_rounded,
      'color': Colors.blueAccent
    },
    {
      'memberName': 'Dad (Robert)',
      'relation': 'Father',
      'activity': 'Completed 20-Min Screen Care Break 👀',
      'timeAgo': '1 hour ago',
      'icon': Icons.remove_red_eye_rounded,
      'color': Colors.purpleAccent
    },
    {
      'memberName': 'Sister (Emily)',
      'relation': 'Sister',
      'activity': 'Finished 30-Min Evening Workout 🏃',
      'timeAgo': '3 hours ago',
      'icon': Icons.fitness_center_rounded,
      'color': Colors.orangeAccent
    },
  ];

  Future<void> _sendNudge(String memberName, String message) async {
    try {
      await _apiClient.post('/family/nudge', {
        'toUserName': memberName,
        'message': message,
      });
    } catch (_) {}

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Sent nudge "$message" to $memberName! ❤️'),
          backgroundColor: Colors.pinkAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _openNudgeDialog(String memberName) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Send Nudge to $memberName'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Text('💧', style: TextStyle(fontSize: 24)),
              title: const Text('Drink Water!'),
              onTap: () {
                Navigator.pop(ctx);
                _sendNudge(memberName, 'Drink Water! 💧');
              },
            ),
            ListTile(
              leading: const Text('👀', style: TextStyle(fontSize: 24)),
              title: const Text('Take Screen Break!'),
              onTap: () {
                Navigator.pop(ctx);
                _sendNudge(memberName, 'Take Screen Break! 👀');
              },
            ),
            ListTile(
              leading: const Text('👏', style: TextStyle(fontSize: 24)),
              title: const Text('Great Workout!'),
              onTap: () {
                Navigator.pop(ctx);
                _sendNudge(memberName, 'Great Workout! 👏');
              },
            ),
            ListTile(
              leading: const Text('🎙️', style: TextStyle(fontSize: 24)),
              title: const Text('Send Custom Voice Note'),
              onTap: () {
                Navigator.pop(ctx);
                _openRecordVoiceNoteDialog();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _openRecordVoiceNoteDialog() {
    final senderNameController = TextEditingController(text: 'Rahul');
    final senderRelationController = TextEditingController(text: 'Son');
    final messageController = TextEditingController(
      text: 'Hi Mom! Please take your medicine on time and drink warm water. Love you!',
    );
    bool isRecording = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.mic_rounded, color: Colors.pinkAccent, size: 28),
                        SizedBox(width: 10),
                        Text(
                          'Record Family Voice Note',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Your voice message will play out loud when your senior family member receives routine alerts.',
                  style: TextStyle(color: Colors.grey[700], fontSize: 12),
                ),
                const SizedBox(height: 18),

                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: senderNameController,
                        decoration: InputDecoration(
                          labelText: 'Your Name',
                          hintText: 'e.g. Rahul',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: senderRelationController,
                        decoration: InputDecoration(
                          labelText: 'Relation to Senior',
                          hintText: 'e.g. Son, Daughter',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                TextField(
                  controller: messageController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Voice Message Text / Speech Transcript',
                    hintText: 'Type what you want to say in your loving voice...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 16),

                // Simulated Audio Recorder Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isRecording ? Colors.red.shade50 : Colors.purple.shade50,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isRecording ? Colors.redAccent : Colors.purple.shade200,
                    ),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 22,
                        backgroundColor: isRecording ? Colors.redAccent : Colors.purpleAccent,
                        child: Icon(
                          isRecording ? Icons.stop_rounded : Icons.mic_rounded,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              isRecording ? '🔴 Recording Live Audio Voice Note...' : '🎙️ Tap to Record Audio Voice Message',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: isRecording ? Colors.red.shade900 : Colors.purple.shade900,
                              ),
                            ),
                            Text(
                              isRecording ? '00:06 • High-quality voice capture' : 'Captures warm voice audio note for Senior',
                              style: const TextStyle(fontSize: 11, color: Colors.black54),
                            ),
                          ],
                        ),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          setModalState(() {
                            isRecording = !isRecording;
                          });
                          if (!isRecording) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('🎙️ Voice recording captured! Ready to send.'),
                                backgroundColor: Colors.purple,
                                duration: Duration(seconds: 2),
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isRecording ? Colors.redAccent : Colors.purpleAccent,
                          foregroundColor: Colors.white,
                        ),
                        child: Text(isRecording ? 'Stop' : 'Record'),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Preview Voice Out Loud Button
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      final text = messageController.text.trim();
                      final sender = senderNameController.text.trim();
                      final rel = senderRelationController.text.trim();
                      if (text.isNotEmpty) {
                        VoiceAssistantService.speak('Message from your $rel $sender: "$text"');
                      }
                    },
                    icon: const Icon(Icons.volume_up_rounded, color: Colors.purpleAccent),
                    label: const Text('🔊 Preview Voice Note Out Loud', style: TextStyle(color: Colors.purpleAccent)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.purpleAccent),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                // Save & Send Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      final name = senderNameController.text.trim();
                      final relation = senderRelationController.text.trim();
                      final text = messageController.text.trim();

                      if (name.isEmpty || text.isEmpty) return;

                      final newNote = FamilyVoiceNote(
                        id: 'fn_${DateTime.now().millisecondsSinceEpoch}',
                        routineId: 'default',
                        senderName: name,
                        senderRelation: relation,
                        messageText: text,
                        durationStr: '0:06',
                        audioUrl: '',
                        createdAt: DateTime.now(),
                      );

                      _voiceNoteService.saveVoiceNote(newNote);

                      setState(() {
                        _feed.insert(0, {
                          'memberName': '$name ($relation)',
                          'relation': relation,
                          'activity': 'Recorded Voice Note: "$text" 🎙️❤️',
                          'timeAgo': 'Just now',
                          'icon': Icons.mic_rounded,
                          'color': Colors.pinkAccent
                        });
                      });

                      Navigator.pop(ctx);

                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('🎙️ Voice note saved & attached for Senior! ❤️'),
                          backgroundColor: Colors.pinkAccent,
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                    icon: const Icon(Icons.send_rounded, size: 20),
                    label: const Text('🎙️ Save & Send Voice Note to Senior', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.pinkAccent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;
    final defaultNote = _voiceNoteService.getVoiceNoteForRoutine('default');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Family Wellness Circle'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Banner
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [primaryColor, primaryColor.withValues(alpha: 0.8)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  const Icon(Icons.people_alt_rounded, color: Colors.white, size: 44),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Family Live Feed & Voice Notes',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Record voice messages & stay connected with family.',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Record Family Voice Note Card Shortcut
            InkWell(
              onTap: _openRecordVoiceNoteDialog,
              borderRadius: BorderRadius.circular(18),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Colors.pinkAccent, Colors.purpleAccent]),
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.pinkAccent.withValues(alpha: 0.3),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: const [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: Colors.white,
                      child: Icon(Icons.mic_rounded, color: Colors.pinkAccent, size: 28),
                    ),
                    SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '🎙️ Record Family Voice Note',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Record audio messages that play out loud during routine alerts.',
                            style: TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 18),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Saved Active Voice Note Player Banner
            if (defaultNote != null)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.pink.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.pink.shade200),
                ),
                child: Row(
                  children: [
                    const CircleAvatar(
                      radius: 20,
                      backgroundColor: Colors.pinkAccent,
                      child: Icon(Icons.record_voice_over_rounded, color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Active Voice Note by ${defaultNote.senderName} (${defaultNote.senderRelation})',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.black87),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '"${defaultNote.messageText}"',
                            style: TextStyle(fontSize: 11, color: Colors.pink.shade900, fontStyle: FontStyle.italic),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.play_circle_fill_rounded, color: Colors.pinkAccent, size: 32),
                      tooltip: 'Play Active Voice Note',
                      onPressed: () {
                        _voiceNoteService.playFamilyVoiceNote(defaultNote, 'en-US');
                      },
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 24),

            Text(
              'Recent Family Activity Feed',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),

            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _feed.length,
              itemBuilder: (context, index) {
                final item = _feed[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Colors.grey.shade200),
                  ),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: (item['color'] as Color).withValues(alpha: 0.2),
                      child: Icon(item['icon'] as IconData, color: item['color'] as Color, size: 20),
                    ),
                    title: Text(
                      item['memberName'] as String,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    subtitle: Text(
                      '${item['activity']}\n${item['timeAgo']}',
                      style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                    ),
                    trailing: OutlinedButton.icon(
                      onPressed: () => _openNudgeDialog(item['memberName'] as String),
                      icon: const Icon(Icons.favorite_border_rounded, size: 16, color: Colors.pinkAccent),
                      label: const Text('Nudge', style: TextStyle(fontSize: 12, color: Colors.pinkAccent)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.pinkAccent),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
