import 'package:flutter/material.dart';
import '../../../services/family_voice_note_service.dart';
import '../../../services/local_storage_service.dart';

class WhatsAppVoiceNoteBubble extends StatefulWidget {
  final FamilyVoiceNote note;
  final bool isFromCaregiver;
  final VoidCallback? onScheduleEdit;

  const WhatsAppVoiceNoteBubble({
    super.key,
    required this.note,
    this.isFromCaregiver = true,
    this.onScheduleEdit,
  });

  @override
  State<WhatsAppVoiceNoteBubble> createState() => _WhatsAppVoiceNoteBubbleState();
}

class _WhatsAppVoiceNoteBubbleState extends State<WhatsAppVoiceNoteBubble> {
  bool _isPlaying = false;
  final LocalStorageService _storage = LocalStorageService();

  Future<void> _play() async {
    setState(() => _isPlaying = true);
    await FamilyVoiceNoteService().playFamilyVoiceNote(
      widget.note,
      _storage.selectedLanguage,
    );
    if (mounted) {
      setState(() => _isPlaying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final note = widget.note;
    final isScheduled = note.isScheduled;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: widget.isFromCaregiver ? const Color(0xFFE7FFDB) : Colors.white, // WhatsApp green bubble tint
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(16),
          topRight: const Radius.circular(16),
          bottomLeft: Radius.circular(widget.isFromCaregiver ? 16 : 4),
          bottomRight: Radius.circular(widget.isFromCaregiver ? 4 : 16),
        ),
        border: Border.all(color: const Color(0xFFC8E6C9), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Sender & Tag
          Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: const Color(0xFF075E54), // WhatsApp dark green
                child: const Icon(Icons.person, color: Colors.white, size: 16),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${note.senderName} (${note.senderRelation})',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Color(0xFF075E54),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (isScheduled && note.scheduledTime != null)
                      Text(
                        '⏰ Scheduled for ${note.scheduledTime} • ${note.scheduledRoutineTitle ?? note.routineKey}',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFD81B60),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      )
                    else
                      const Text(
                        '⚡ Instant Voice Message',
                        style: TextStyle(fontSize: 10, color: Colors.teal),
                      ),
                  ],
                ),
              ),
              if (isScheduled)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.pink.shade50,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.pink.shade200),
                  ),
                  child: const Text(
                    'Scheduled ⏰',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.pink),
                  ),
                ),
            ],
          ),

          const SizedBox(height: 10),

          // WhatsApp Audio Player Bar
          Row(
            children: [
              InkWell(
                onTap: _play,
                borderRadius: BorderRadius.circular(20),
                child: CircleAvatar(
                  radius: 18,
                  backgroundColor: const Color(0xFF25D366), // WhatsApp bright green
                  child: Icon(
                    _isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                    color: Colors.white,
                    size: 22,
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Audio Waveform Visualization
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: List.generate(24, (index) {
                        final heights = [
                          6, 12, 18, 10, 22, 16, 8, 20, 14, 24, 18, 12,
                          16, 22, 10, 18, 14, 20, 8, 16, 12, 18, 10, 6
                        ];
                        final h = heights[index % heights.length].toDouble();
                        return Container(
                          width: 2.5,
                          height: h,
                          decoration: BoxDecoration(
                            color: _isPlaying ? const Color(0xFF25D366) : const Color(0xFF075E54).withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          note.durationStr,
                          style: TextStyle(fontSize: 10, color: Colors.grey.shade700, fontWeight: FontWeight.w600),
                        ),
                        const Icon(Icons.done_all_rounded, size: 14, color: Color(0xFF34B7F1)), // WhatsApp blue double check
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 6),

          // Spoken Transcript preview
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.7),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '"${note.messageText}"',
              style: TextStyle(
                fontSize: 11,
                fontStyle: FontStyle.italic,
                color: Colors.grey.shade900,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
